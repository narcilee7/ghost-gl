import RBush from 'rbush'
import { expandRect } from '../geometry'
import type { LayoutNode, Rect } from '../types'
import type {
  CollisionQuery,
  SpatialItem,
  SpatialQuery,
  SpatialSearchResult,
  ViewportSpatialQuery,
} from './types'

/**
 * Unified spatial index kernel for ghost-gl.
 *
 * Goals:
 * - Provide O(log n) spatial queries for viewport, collision, and bounds
 * - Unify read/write paths - both use the same spatial index
 * - Automatic cache invalidation on mutations
 * - Zero-allocation query paths where possible
 */
export class SpatialKernel<TData = unknown> {
  private itemById: Map<string, SpatialItem<TData>>
  private tree: RBush<SpatialItem<TData>>

  constructor(nodes: readonly LayoutNode<TData>[] = []) {
    this.itemById = new Map()
    this.tree = new RBush()
    this.load(nodes)
  }

  /**
   * Load nodes into spatial index (bulk insert for efficiency)
   */
  load(nodes: readonly LayoutNode<TData>[]): void {
    this.clear()

    const items: SpatialItem<TData>[] = []

    for (const node of nodes) {
      const item = createSpatialItem(node)
      this.itemById.set(node.id, item)
      items.push(item)
    }

    if (items.length > 0) {
      this.tree.load(items)
    }
  }

  /**
   * Clear all items from index
   */
  clear(): void {
    this.itemById.clear()
    this.tree.clear()
  }

  /**
   * Get total count of indexed items
   */
  get size(): number {
    return this.itemById.size
  }

  /**
   * Check if node exists in index
   */
  has(id: string): boolean {
    return this.itemById.has(id)
  }

  /**
   * Get spatial item by id
   */
  get(id: string): SpatialItem<TData> | undefined {
    return this.itemById.get(id)
  }

  /**
   * Get all spatial items
   */
  getAll(): SpatialItem<TData>[] {
    return this.tree.all()
  }

  /**
   * Insert or update a node in the index
   */
  upsert(node: LayoutNode<TData>): void {
    const existing = this.itemById.get(node.id)

    if (existing != null) {
      // Update: remove old, insert new
      this.tree.remove(existing)
      updateSpatialItem(existing, node)
      this.tree.insert(existing)
    } else {
      // Insert new
      const item = createSpatialItem(node)
      this.itemById.set(node.id, item)
      this.tree.insert(item)
    }
  }

  /**
   * Remove a node from the index
   */
  remove(id: string): boolean {
    const item = this.itemById.get(id)

    if (item == null) {
      return false
    }

    this.tree.remove(item)
    this.itemById.delete(id)
    return true
  }

  /**
   * Query items within a rectangular region
   */
  search(query: SpatialQuery): SpatialItem<TData>[] {
    return this.tree.search(query)
  }

  /**
   * Query items intersecting with viewport (with optional overscan)
   */
  queryViewport(options: ViewportSpatialQuery): SpatialItem<TData>[] {
    const { viewport, overscanX = 0, overscanY = 0 } = options
    const searchRect = expandRect(viewport, overscanX, overscanY)

    return this.tree.search({
      minX: searchRect.left,
      minY: searchRect.top,
      maxX: searchRect.left + searchRect.width,
      maxY: searchRect.top + searchRect.height,
    })
  }

  /**
   * Query items that collide with given rect
   */
  queryCollisions(query: CollisionQuery): SpatialItem<TData>[] {
    const searchRect = {
      maxX: query.x + query.w,
      maxY: query.y + query.h,
      minX: query.x,
      minY: query.y,
    }

    const candidates = this.tree.search(searchRect)

    // Precise collision test
    return candidates.filter((item) => {
      if (item.id === query.excludeId) {
        return false
      }

      return (
        query.x < item.maxX &&
        query.x + query.w > item.minX &&
        query.y < item.maxY &&
        query.y + query.h > item.minY
      )
    })
  }

  /**
   * Query k-nearest neighbors to a point
   */
  queryKNearest(x: number, y: number, k: number): SpatialSearchResult<TData>[] {
    // RBush doesn't have native k-NN, so we use a growing search
    // Start with a small box and expand until we have enough results
    let step = 100
    const maxStep = 10000

    while (step <= maxStep) {
      const candidates = this.tree.search({
        maxX: x + step,
        maxY: y + step,
        minX: x - step,
        minY: y - step,
      })

      if (candidates.length >= k) {
        // Sort by distance and return top k
        const sorted = candidates
          .map((item) => ({
            distance: squaredDistanceToRect(x, y, item),
            item,
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, k)

        return sorted
      }

      step *= 2
    }

    // Return all if we hit max step
    return this.tree
      .all()
      .map((item) => ({
        distance: squaredDistanceToRect(x, y, item),
        item,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
  }

  /**
   * Calculate bounding box of all items
   */
  computeBounds(): Rect | null {
    const all = this.tree.all()

    if (all.length === 0) {
      return null
    }

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const item of all) {
      minX = Math.min(minX, item.minX)
      minY = Math.min(minY, item.minY)
      maxX = Math.max(maxX, item.maxX)
      maxY = Math.max(maxY, item.maxY)
    }

    return {
      height: maxY - minY,
      left: minX,
      top: minY,
      width: maxX - minX,
    }
  }

  /**
   * Iterate over all items in index order (by y, then x)
   */
  *itemsInOrder(): Generator<SpatialItem<TData>> {
    const all = this.tree.all().sort((a, b) => {
      // Sort by y, then x, then id for determinism
      if (a.minY !== b.minY) return a.minY - b.minY
      if (a.minX !== b.minX) return a.minX - b.minX
      return a.id.localeCompare(b.id)
    })

    for (const item of all) {
      yield item
    }
  }
}

/**
 * Create a spatial item from layout node
 */
function createSpatialItem<TData>(node: LayoutNode<TData>): SpatialItem<TData> {
  return {
    id: node.id,
    maxX: node.x + node.w,
    maxY: node.y + node.h,
    minX: node.x,
    minY: node.y,
    node: { ...node },
  }
}

/**
 * Update spatial item from layout node
 */
function updateSpatialItem<TData>(item: SpatialItem<TData>, node: LayoutNode<TData>): void {
  item.id = node.id
  item.minX = node.x
  item.minY = node.y
  item.maxX = node.x + node.w
  item.maxY = node.y + node.h
  item.node = { ...node }
}

/**
 * Calculate squared distance from point to spatial item
 */
function squaredDistanceToRect<TData>(x: number, y: number, item: SpatialItem<TData>): number {
  // Find closest point on rect to (x, y)
  const closestX = clamp(x, item.minX, item.maxX)
  const closestY = clamp(y, item.minY, item.maxY)

  const dx = x - closestX
  const dy = y - closestY

  return dx * dx + dy * dy
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
