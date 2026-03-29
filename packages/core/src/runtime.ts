import {
  assertLayoutNode,
  assertLayoutNodes,
  type LayoutConstraints,
  validatePlacement,
  validateSize,
} from './constraints'
import { estimateLayoutBounds, projectNodeToRect } from './geometry'
import {
  type PlanMaterializationInput,
  planMaterialization as planInternalMaterialization,
  type SchedulerNodeCandidate,
  type SchedulerViewport,
} from './internal/scheduler'
import { moveNode as moveLayoutNode, resizeNode as resizeLayoutNode } from './layout'
import { createNodeMap } from './node-map'
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

export interface MaterializationPlanInput extends Rect {
  activeIds?: readonly string[]
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

  moveNode(id: string, nextPlacement: { x: number; y: number }): boolean {
    const node = this.nodeMap.get(id)

    if (node == null) {
      return false
    }

    if (validatePlacement(node, nextPlacement, this.constraints) != null) {
      return false
    }

    this.nodes = moveLayoutNode(this.nodes, id, nextPlacement)
    this.rebuildState()

    return true
  }

  planMaterialization(input: MaterializationPlanInput): MaterializationPlanResult<TData> {
    const timestamp = input.timestamp ?? Date.now()
    const activeIds = new Set(input.activeIds ?? [])
    const rects = this.nodes.map((node) => projectNodeToRect(node, this.metrics))
    const visible = queryViewport(
      this.nodes,
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
    const node = this.nodeMap.get(id)

    if (node == null) {
      return false
    }

    if (validateSize(node, nextSize, this.constraints) != null) {
      return false
    }

    this.nodes = resizeLayoutNode(this.nodes, id, nextSize)
    this.rebuildState()

    return true
  }

  removeNode(id: string): boolean {
    const index = this.nodes.findIndex((node) => node.id === id)

    if (index === -1) {
      return false
    }

    this.nodes.splice(index, 1)
    this.lastInteractionAt.delete(id)
    this.lastVisibleAt.delete(id)
    this.modeById.delete(id)
    this.rebuildState()

    return true
  }

  replaceNodes(nodes: readonly LayoutNode<TData>[]): void {
    const nextNodes = [...nodes]

    assertLayoutNodes(nextNodes, this.constraints)
    this.nodes = nextNodes
    this.lastInteractionAt.clear()
    this.lastVisibleAt.clear()
    this.modeById.clear()
    this.rebuildState()
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
    assertLayoutNode(node, this.constraints)

    const index = this.nodes.findIndex((candidate) => candidate.id === node.id)

    if (index === -1) {
      this.nodes.push(node)
    } else {
      this.nodes[index] = node
    }

    this.rebuildState()
  }

  private rebuildState(): void {
    this.nodeMap = createNodeMap(this.nodes)
    this.bounds = estimateLayoutBounds(this.nodes, this.metrics)
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
