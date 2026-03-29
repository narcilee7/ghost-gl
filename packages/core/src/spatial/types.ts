import type { LayoutNode, Rect } from '../types'

/**
 * Spatial item with RBush-compatible bounding box
 */
export interface SpatialItem<TData = unknown> {
  id: string
  minX: number
  minY: number
  maxX: number
  maxY: number
  node: LayoutNode<TData>
}

/**
 * Search query for spatial index
 */
export interface SpatialQuery {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Viewport query options
 */
export interface ViewportSpatialQuery {
  viewport: Rect
  overscanX?: number
  overscanY?: number
}

/**
 * Collision detection options
 */
export interface CollisionQuery {
  x: number
  y: number
  w: number
  h: number
  excludeId?: string
}

/**
 * Spatial search result with distance info
 */
export interface SpatialSearchResult<TData = unknown> {
  item: SpatialItem<TData>
  distance: number
}
