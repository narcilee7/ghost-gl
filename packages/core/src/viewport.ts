import { expandRect, intersectsRect, projectNodeToRect, unprojectRectToGrid } from './geometry'
import type { SpatialKernel } from './spatial'
import type { GridMetrics, LayoutNode, LayoutRect, Rect } from './types'

export interface ViewportQueryOptions {
  overscanX?: number
  overscanY?: number
}

/**
 * Query viewport using linear scan (fallback for simple cases)
 * @deprecated Use SpatialKernel for O(log n) queries
 */
export function queryViewport<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  viewport: Rect,
  metrics: GridMetrics,
  options: ViewportQueryOptions = {}
): LayoutRect<TData>[] {
  const target = expandRect(viewport, options.overscanX ?? 0, options.overscanY ?? 0)

  return nodes
    .map((node) => projectNodeToRect(node, metrics))
    .filter((rect) => intersectsRect(rect, target))
}

/**
 * Query viewport using spatial index (O(log n))
 *
 * Note: This converts the pixel viewport to grid coordinates for the spatial query,
 * then converts results back to pixel coordinates.
 */
export function queryViewportWithKernel<TData = unknown>(
  kernel: SpatialKernel<TData>,
  viewport: Rect,
  metrics: GridMetrics,
  options: ViewportQueryOptions = {}
): LayoutRect<TData>[] {
  // Convert pixel viewport to grid coordinates for spatial query
  const gridViewport = unprojectRectToGrid(viewport, metrics)
  const gridOverscanX = options.overscanX
    ? Math.ceil(options.overscanX / (metrics.columnWidth + (metrics.gapX ?? 0)))
    : 0
  const gridOverscanY = options.overscanY
    ? Math.ceil(options.overscanY / (metrics.rowHeight + (metrics.gapY ?? 0)))
    : 0

  // Query kernel in grid coordinate space
  const items = kernel.queryViewport({
    overscanX: gridOverscanX,
    overscanY: gridOverscanY,
    viewport: {
      height: gridViewport.h,
      left: gridViewport.x,
      top: gridViewport.y,
      width: gridViewport.w,
    },
  })

  // Convert results back to pixel coordinates
  return items.map((item) => projectNodeToRect(item.node, metrics))
}

/**
 * Check if rect is within viewport bounds
 */
export function isInViewport(rect: Rect, viewport: Rect, overscan = 0): boolean {
  const halfOverscan = overscan / 2

  return (
    rect.left + rect.width >= viewport.left - halfOverscan &&
    rect.left <= viewport.left + viewport.width + halfOverscan &&
    rect.top + rect.height >= viewport.top - halfOverscan &&
    rect.top <= viewport.top + viewport.height + halfOverscan
  )
}

/**
 * Calculate viewport coverage ratio
 */
export function computeViewportCoverage(rect: Rect, viewport: Rect): number {
  const left = Math.max(rect.left, viewport.left)
  const right = Math.min(rect.left + rect.width, viewport.left + viewport.width)
  const top = Math.max(rect.top, viewport.top)
  const bottom = Math.min(rect.top + rect.height, viewport.top + viewport.height)

  if (left >= right || top >= bottom) {
    return 0
  }

  const intersectionArea = (right - left) * (bottom - top)
  const rectArea = rect.width * rect.height

  return rectArea > 0 ? intersectionArea / rectArea : 0
}
