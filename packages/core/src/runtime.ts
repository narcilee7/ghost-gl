import { estimateLayoutBounds, projectNodeToRect } from './geometry'
import {
  type PlanMaterializationInput,
  planMaterialization as planInternalMaterialization,
  type SchedulerNodeCandidate,
  type SchedulerViewport,
} from './internal/scheduler'
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
  private lastInteractionAt = new Map<string, number>()
  private lastVisibleAt = new Map<string, number>()
  private metrics: GridMetrics
  private modeById = new Map<string, MaterializationMode>()
  private nodeMap: Map<string, LayoutNode<TData>>
  private nodes: LayoutNode<TData>[]

  constructor(options: LayoutRuntimeOptions<TData>) {
    this.metrics = options.metrics
    this.nodes = [...(options.nodes ?? [])]
    this.nodeMap = createNodeMap(this.nodes)
    this.bounds = estimateLayoutBounds(this.nodes, this.metrics)
  }

  getBounds(): Rect {
    return this.bounds
  }

  getMetrics(): GridMetrics {
    return { ...this.metrics }
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
    this.nodes = [...nodes]
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
