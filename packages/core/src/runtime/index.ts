import {
  assertLayoutNodes,
  createLayoutViolationError,
  type LayoutConstraints,
} from '../constraints'
import { estimateLayoutBounds, projectNodeToRect, unprojectRectToGrid } from '../geometry'
import type { LayoutInteractionSession } from '../interaction'
import { collectInteractionActiveIds, resolvePlanningNodes } from '../internal/interaction-bridge'
import {
  type PlanMaterializationInput,
  planMaterializationFromKernel,
  type SchedulerViewport,
} from '../internal/scheduler'
import { createNodeMap } from '../node-map'
import {
  applyLayoutOperation,
  type LayoutOperation,
  type LayoutOperationResult,
} from '../operations'
import { SpatialKernel } from '../spatial'
import { applyLayoutTransaction, type LayoutTransactionResult } from '../transactions'
import type {
  GridMetrics,
  LayoutNode,
  LayoutRect,
  MaterializationMode,
  MaterializedNode,
  Rect,
} from '../types'
import { queryViewport } from '../viewport'

export interface LayoutRuntimeOptions<T = unknown> {
  constraints?: LayoutConstraints
  metrics: GridMetrics
  nodes?: readonly LayoutNode<T>[]
}

export interface MaterializationPlanInput<T = unknown> extends Rect {
  activeIds?: readonly string[]
  interactionSession?: LayoutInteractionSession<T>
  overscanX?: number
  overscanY?: number
  timestamp?: number
  velocityX?: number
  velocityY?: number
}

export interface MaterializationPlanResult<T = unknown> {
  bounds: Rect
  materialized: MaterializedNode<T>[]
  summary: {
    ghost: number
    live: number
    shell: number
  }
  visible: LayoutRect<T>[]
}

/**
 * LayoutRuntime with unified spatial kernel.
 *
 * All spatial operations (viewport query, collision detection, bounds calculation)
 * use the internal RBush spatial index for O(log n) performance.
 */
export class LayoutRuntime<T = unknown> {
  private bounds: Rect
  private constraints: LayoutConstraints
  private kernel: SpatialKernel<T>
  private lastInteractionAt = new Map<string, number>()
  private lastVisibleAt = new Map<string, number>()
  private metrics: GridMetrics
  private modeById = new Map<string, MaterializationMode>()
  private nodeMap: Map<string, LayoutNode<T>>
  private nodes: LayoutNode<T>[]

  constructor(options: LayoutRuntimeOptions<T>) {
    const nodes = [...(options.nodes ?? [])]

    this.constraints = options.constraints ?? {}
    this.metrics = options.metrics
    assertLayoutNodes(nodes, this.constraints)
    this.nodes = nodes
    this.nodeMap = createNodeMap(this.nodes)
    // Initialize spatial kernel - this is the unified read/write path
    this.kernel = new SpatialKernel(this.nodes)
    this.bounds = estimateLayoutBounds(this.nodes, this.metrics)
  }

  getBounds(): Rect {
    return { ...this.bounds }
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

  getNode(id: string): LayoutNode<T> | undefined {
    return cloneOptionalNode(this.nodeMap.get(id))
  }

  getNodeMap(): ReadonlyMap<string, LayoutNode<T>> {
    return createNodeMap(this.getNodes())
  }

  getNodes(): readonly LayoutNode<T>[] {
    return cloneNodes(this.nodes)
  }

  /**
   * Get the internal spatial kernel for advanced queries.
   * This allows direct access to O(log n) spatial operations.
   */
  getSpatialKernel(): SpatialKernel<T> {
    return this.kernel
  }

  dispatch(operation: LayoutOperation<T>): LayoutOperationResult<T> {
    const result = applyLayoutOperation(this.nodes, operation, {
      constraints: this.constraints,
    })

    if (result.status === 'rejected') {
      return result
    }

    this.nodes = [...result.nextNodes]
    this.syncOperationCaches(operation)
    this.rebuildState(operation)

    return result
  }

  dispatchAll(operations: readonly LayoutOperation<T>[]): LayoutTransactionResult<T> {
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

    // For batch operations, use the last operation as hint,
    // or could pass all operations if needed
    this.rebuildState(operations.length > 0 ? operations[operations.length - 1] : undefined)

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

  planMaterialization(input: MaterializationPlanInput<T>): MaterializationPlanResult<T> {
    const timestamp = input.timestamp ?? Date.now()
    const activeIds = new Set(input.activeIds ?? [])
    const interactionActiveIds = collectInteractionActiveIds(input.interactionSession)

    for (const id of interactionActiveIds) {
      activeIds.add(id)
    }

    // Get planning nodes (considering interaction preview)
    const planningNodes = resolvePlanningNodes(this.nodes, input.interactionSession)

    // Viewport query uses planning nodes to account for interaction preview
    // Note: For O(log n) with large datasets, we could maintain a secondary spatial index
    // for preview state. For now, linear scan is acceptable as viewport queries are
    // typically on visible nodes only.
    const visible = queryViewport(
      planningNodes,
      {
        height: input.height,
        left: input.left,
        top: input.top,
        width: input.width,
      },
      this.metrics,
      {
        overscanX: input.overscanX ?? 0,
        overscanY: input.overscanY ?? 0,
      }
    )

    // Build cooldown data map from runtime state
    const cooldownData = new Map<string, { lastInteractionAt?: number; lastVisibleAt?: number }>()
    for (const [id, lastInteractionAt] of this.lastInteractionAt) {
      const existing = cooldownData.get(id) ?? {}
      existing.lastInteractionAt = lastInteractionAt
      cooldownData.set(id, existing)
    }
    for (const [id, lastVisibleAt] of this.lastVisibleAt) {
      const existing = cooldownData.get(id) ?? {}
      existing.lastVisibleAt = lastVisibleAt
      cooldownData.set(id, existing)
    }

    // Use spatial kernel for efficient scheduler planning
    // Create a temporary kernel from planning nodes to account for interaction preview
    const planningKernel = new SpatialKernel(planningNodes)

    // Convert pixel viewport to grid coordinates for scheduler
    // The scheduler operates on grid coordinates when using spatial kernel
    const pixelViewport = {
      height: input.height,
      left: input.left,
      top: input.top,
      width: input.width,
    }
    const gridViewport = unprojectRectToGrid(pixelViewport, this.metrics)
    const gridOverscanX = input.overscanX
      ? Math.ceil(input.overscanX / (this.metrics.columnWidth + (this.metrics.gapX ?? 0)))
      : 0
    const gridOverscanY = input.overscanY
      ? Math.ceil(input.overscanY / (this.metrics.rowHeight + (this.metrics.gapY ?? 0)))
      : 0

    const plan = planMaterializationFromKernel({
      activeIds,
      config: {
        ...toSchedulerConfig(input),
        overscanX: gridOverscanX,
        overscanY: gridOverscanY,
      },
      cooldownData,
      kernel: planningKernel,
      modeById: this.modeById,
      timestamp,
      viewport: {
        height: gridViewport.h,
        left: gridViewport.x,
        top: gridViewport.y,
        ...(input.velocityX !== undefined && { velocityX: input.velocityX }),
        ...(input.velocityY !== undefined && { velocityY: input.velocityY }),
        width: gridViewport.w,
      },
    })

    const _decisions = new Map(plan.decisions.map((decision) => [decision.id, decision]))
    const materialized: MaterializedNode<T>[] = []
    const visibleRectIds = new Set(visible.map((rect) => rect.id))

    // Use planning nodes so interaction previews (drag/resize) produce correct rects
    const planningNodeMap = createNodeMap(planningNodes)

    // Process all decisions from the scheduler plan
    for (const decision of plan.decisions) {
      const node = planningNodeMap.get(decision.id)
      if (node == null) continue

      this.modeById.set(decision.id, decision.mode)

      const rect = projectNodeToRect(node, this.metrics)

      if (decision.mode !== 'ghost') {
        materialized.push({
          id: decision.id,
          mode: decision.mode,
          node,
          reason: decision.reason,
          rect,
        })
      }

      if (activeIds.has(decision.id)) {
        this.lastInteractionAt.set(decision.id, timestamp)
      }

      if (visibleRectIds.has(decision.id)) {
        this.lastVisibleAt.set(decision.id, timestamp)
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
  ): LayoutRect<T>[] {
    return queryViewport(this.nodes, viewport, this.metrics, options)
  }

  /**
   * Query nodes that collide with given rect using spatial index.
   */
  queryCollisions(
    rect: { x: number; y: number; w: number; h: number },
    excludeId?: string
  ): LayoutNode<T>[] {
    const query: { excludeId?: string; h: number; w: number; x: number; y: number } = {
      h: rect.h,
      w: rect.w,
      x: rect.x,
      y: rect.y,
    }
    if (excludeId !== undefined) {
      query.excludeId = excludeId
    }
    const items = this.kernel.queryCollisions(query)
    return items.map((item) => item.node)
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

  replaceNodes(nodes: readonly LayoutNode<T>[]): void {
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

  upsertNode(node: LayoutNode<T>): void {
    const result = this.dispatch({ node, type: 'upsert' })

    if (result.status === 'rejected') {
      throwRejectedOperation(result, this.constraints)
    }
  }

  /**
   * Rebuild derived state after mutations.
   * This is the unified cache invalidation point.
   *
   * Note: For spatial index, we do incremental updates rather than full rebuild
   * to maintain O(log n) performance characteristics.
   */
  private rebuildState(operation?: LayoutOperation<T>): void {
    this.nodeMap = createNodeMap(this.nodes)

    if (operation == null || requiresFullSpatialRebuild(operation)) {
      this.kernel.load(this.nodes)
    } else {
      this.updateSpatialIndexIncremental(operation)
    }

    // Recompute bounds using metrics (converted to pixel space)
    this.bounds = estimateLayoutBounds(this.nodes, this.metrics)
  }

  /**
   * Incrementally update spatial index based on operation type.
   * This avoids O(n) rebuild cost for single node changes.
   */
  private updateSpatialIndexIncremental(operation: LayoutOperation<T>): void {
    switch (operation.type) {
      case 'move':
      case 'resize': {
        const node = this.nodeMap.get(operation.id)
        if (node) {
          this.kernel.upsert(node)
        }
        break
      }
      case 'upsert':
        this.kernel.upsert(this.nodeMap.get(operation.node.id) ?? operation.node)
        break
      case 'remove':
        this.kernel.remove(operation.id)
        break
      case 'replace':
        // Replace is a bulk operation - do full rebuild
        this.kernel.load(this.nodes)
        break
    }
  }

  private syncOperationCaches(operation: LayoutOperation<T>): void {
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

function cloneOptionalNode<T = unknown>(
  node: LayoutNode<T> | undefined
): LayoutNode<T> | undefined {
  return node == null ? undefined : cloneNode(node)
}

function cloneNode<T = unknown>(node: LayoutNode<T>): LayoutNode<T> {
  return { ...node }
}

function cloneNodes<T = unknown>(nodes: readonly LayoutNode<T>[]): LayoutNode<T>[] {
  return nodes.map(cloneNode)
}

function requiresFullSpatialRebuild<T = unknown>(operation: LayoutOperation<T>): boolean {
  return operation.type === 'move' || operation.type === 'resize' || operation.type === 'replace'
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

function _toSchedulerViewport(input: MaterializationPlanInput): SchedulerViewport {
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

function throwRejectedOperation<T = unknown>(
  result: LayoutOperationResult<T>,
  constraints: LayoutConstraints
): never {
  if (result.violation != null) {
    throw createLayoutViolationError(result.violation, constraints)
  }

  throw new Error(`Layout operation "${result.operation.type}" was rejected.`)
}
