import {
  assertLayoutNodes,
  createLayoutViolationError,
  type LayoutConstraints,
} from './constraints'
import { estimateLayoutBounds } from './geometry'
import type { LayoutInteractionSession } from './interaction'
import {
  collectInteractionActiveIds,
  resolvePlanningNodes,
  resolvePlanningRects,
} from './internal/interaction-bridge'
import {
  type PlanMaterializationInput,
  planMaterialization as planInternalMaterialization,
  type SchedulerNodeCandidate,
  type SchedulerViewport,
} from './internal/scheduler'
import { createNodeMap } from './node-map'
import {
  applyLayoutOperation,
  type LayoutOperation,
  type LayoutOperationResult,
} from './operations'
import { applyLayoutTransaction, type LayoutTransactionResult } from './transactions'
import type {
  GridMetrics,
  LayoutNode,
  LayoutRect,
  MaterializationMode,
  MaterializedNode,
  Rect,
} from './types'
import { queryViewport } from './viewport'

export interface LayoutRuntimeOptions<TData = unknown> {
  constraints?: LayoutConstraints
  metrics: GridMetrics
  nodes?: readonly LayoutNode<TData>[]
}

export interface MaterializationPlanInput<TData = unknown> extends Rect {
  activeIds?: readonly string[]
  interactionSession?: LayoutInteractionSession<TData>
  overscanX?: number
  overscanY?: number
  timestamp?: number
  velocityX?: number
  velocityY?: number
}

export interface MaterializationPlanResult<TData = unknown> {
  bounds: Rect
  materialized: MaterializedNode<TData>[]
  summary: {
    ghost: number
    live: number
    shell: number
  }
  visible: LayoutRect<TData>[]
}

export class LayoutRuntime<TData = unknown> {
  private bounds: Rect
  private constraints: LayoutConstraints
  private lastInteractionAt = new Map<string, number>()
  private lastVisibleAt = new Map<string, number>()
  private metrics: GridMetrics
  private modeById = new Map<string, MaterializationMode>()
  private nodeMap: Map<string, LayoutNode<TData>>
  private nodes: LayoutNode<TData>[]

  constructor(options: LayoutRuntimeOptions<TData>) {
    const nodes = [...(options.nodes ?? [])]

    this.constraints = options.constraints ?? {}
    this.metrics = options.metrics
    assertLayoutNodes(nodes, this.constraints)
    this.nodes = nodes
    this.nodeMap = createNodeMap(this.nodes)
    this.bounds = estimateLayoutBounds(this.nodes, this.metrics)
  }

  getBounds(): Rect {
    return this.bounds
  }

  getMetrics(): GridMetrics {
    return { ...this.metrics }
  }

  getConstraints(): LayoutConstraints {
    return { ...this.constraints }
  }

  getMaterializationMode(id: string): MaterializationMode | undefined {
    return this.modeById.get(id)
  }

  getNode(id: string): LayoutNode<TData> | undefined {
    return this.nodeMap.get(id)
  }

  getNodeMap(): ReadonlyMap<string, LayoutNode<TData>> {
    return this.nodeMap
  }

  getNodes(): readonly LayoutNode<TData>[] {
    return this.nodes
  }

  dispatch(operation: LayoutOperation<TData>): LayoutOperationResult<TData> {
    const result = applyLayoutOperation(this.nodes, operation, {
      constraints: this.constraints,
    })

    if (result.status === 'rejected') {
      return result
    }

    this.nodes = [...result.nextNodes]
    this.syncOperationCaches(operation)
    this.rebuildState()

    return result
  }

  dispatchAll(operations: readonly LayoutOperation<TData>[]): LayoutTransactionResult<TData> {
    const result = applyLayoutTransaction(this.nodes, operations, {
      constraints: this.constraints,
    })

    if (!result.committed) {
      return result
    }

    this.nodes = [...result.nextNodes]

    for (const operation of operations) {
      this.syncOperationCaches(operation)
    }

    this.rebuildState()

    return result
  }

  moveNode(id: string, nextPlacement: { x: number; y: number }): boolean {
    return (
      this.dispatch({
        id,
        placement: nextPlacement,
        type: 'move',
      }).status === 'applied'
    )
  }

  planMaterialization(input: MaterializationPlanInput<TData>): MaterializationPlanResult<TData> {
    const timestamp = input.timestamp ?? Date.now()
    const planningNodes = resolvePlanningNodes(this.nodes, input.interactionSession)
    const activeIds = new Set(input.activeIds ?? [])
    const interactionActiveIds = collectInteractionActiveIds(input.interactionSession)
    const rects = resolvePlanningRects(this.nodes, this.metrics, input.interactionSession)

    for (const id of interactionActiveIds) {
      activeIds.add(id)
    }

    const visible = queryViewport(
      planningNodes,
      {
        left: input.left,
        top: input.top,
        width: input.width,
        height: input.height,
      },
      this.metrics
    )
    const internalInput: PlanMaterializationInput = {
      config: toSchedulerConfig(input),
      nodes: rects.map((rect) =>
        toSchedulerNodeCandidate(rect, {
          activeIds,
          mode: this.modeById.get(rect.id) ?? 'ghost',
          lastInteractionAt: this.lastInteractionAt.get(rect.id),
          lastVisibleAt: this.lastVisibleAt.get(rect.id),
        })
      ),
      timestamp,
      viewport: toSchedulerViewport(input),
    }

    const plan = planInternalMaterialization(internalInput)
    const decisions = new Map(plan.decisions.map((decision) => [decision.id, decision]))
    const materialized: MaterializedNode<TData>[] = []
    const visibleRectIds = new Set(visible.map((rect) => rect.id))

    for (const rect of rects) {
      const decision = decisions.get(rect.id)

      if (decision == null) {
        continue
      }

      this.modeById.set(rect.id, decision.mode)

      if (decision.mode !== 'ghost') {
        materialized.push({
          id: rect.id,
          mode: decision.mode,
          node: rect.node,
          reason: decision.reason,
          rect,
        })
      }

      if (activeIds.has(rect.id)) {
        this.lastInteractionAt.set(rect.id, timestamp)
      }

      if (visibleRectIds.has(rect.id)) {
        this.lastVisibleAt.set(rect.id, timestamp)
      }
    }

    return {
      bounds: this.bounds,
      materialized,
      summary: plan.summary,
      visible,
    }
  }

  queryViewport(
    viewport: Rect,
    options?: {
      overscanX?: number
      overscanY?: number
    }
  ): LayoutRect<TData>[] {
    return queryViewport(this.nodes, viewport, this.metrics, options)
  }

  resizeNode(id: string, nextSize: { w: number; h: number }): boolean {
    return (
      this.dispatch({
        id,
        size: nextSize,
        type: 'resize',
      }).status === 'applied'
    )
  }

  removeNode(id: string): boolean {
    return this.dispatch({ id, type: 'remove' }).status === 'applied'
  }

  replaceNodes(nodes: readonly LayoutNode<TData>[]): void {
    const result = this.dispatch({ nodes, type: 'replace' })

    if (result.status === 'rejected') {
      throwRejectedOperation(result, this.constraints)
    }
  }

  setMetrics(metrics: GridMetrics): void {
    this.metrics = metrics
    this.bounds = estimateLayoutBounds(this.nodes, this.metrics)
  }

  touchNode(id: string, timestamp = Date.now()): void {
    if (!this.nodeMap.has(id)) {
      return
    }

    this.lastInteractionAt.set(id, timestamp)
  }

  upsertNode(node: LayoutNode<TData>): void {
    const result = this.dispatch({ node, type: 'upsert' })

    if (result.status === 'rejected') {
      throwRejectedOperation(result, this.constraints)
    }
  }

  private rebuildState(): void {
    this.nodeMap = createNodeMap(this.nodes)
    this.bounds = estimateLayoutBounds(this.nodes, this.metrics)
  }

  private syncOperationCaches(operation: LayoutOperation<TData>): void {
    switch (operation.type) {
      case 'move':
      case 'resize':
      case 'upsert':
        return
      case 'remove':
        this.lastInteractionAt.delete(operation.id)
        this.lastVisibleAt.delete(operation.id)
        this.modeById.delete(operation.id)
        return
      case 'replace':
        this.lastInteractionAt.clear()
        this.lastVisibleAt.clear()
        this.modeById.clear()
        return
    }
  }
}

function toSchedulerConfig(
  input: MaterializationPlanInput
): NonNullable<PlanMaterializationInput['config']> {
  const config: NonNullable<PlanMaterializationInput['config']> = {}

  if (input.overscanX !== undefined) {
    config.overscanX = input.overscanX
  }

  if (input.overscanY !== undefined) {
    config.overscanY = input.overscanY
  }

  return config
}

function toSchedulerNodeCandidate<TData>(
  rect: LayoutRect<TData>,
  input: {
    activeIds: ReadonlySet<string>
    lastInteractionAt: number | undefined
    lastVisibleAt: number | undefined
    mode: MaterializationMode
  }
): SchedulerNodeCandidate {
  const candidate: SchedulerNodeCandidate = {
    id: rect.id,
    mode: input.mode,
    rect,
  }

  if (input.activeIds.has(rect.id)) {
    candidate.isActive = true
  }

  if (input.lastInteractionAt !== undefined) {
    candidate.lastInteractionAt = input.lastInteractionAt
  }

  if (input.lastVisibleAt !== undefined) {
    candidate.lastVisibleAt = input.lastVisibleAt
  }

  return candidate
}

function toSchedulerViewport(input: MaterializationPlanInput): SchedulerViewport {
  const viewport: SchedulerViewport = {
    height: input.height,
    left: input.left,
    top: input.top,
    width: input.width,
  }

  if (input.velocityX !== undefined) {
    viewport.velocityX = input.velocityX
  }

  if (input.velocityY !== undefined) {
    viewport.velocityY = input.velocityY
  }

  return viewport
}

function throwRejectedOperation<TData = unknown>(
  result: LayoutOperationResult<TData>,
  constraints: LayoutConstraints
): never {
  if (result.violation != null) {
    throw createLayoutViolationError(result.violation, constraints)
  }

  throw new Error(`Layout operation "${result.operation.type}" was rejected.`)
}
