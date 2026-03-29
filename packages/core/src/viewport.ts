import { expandRect, intersectsRect, projectNodeToRect } from './geometry'
import type { GridMetrics, LayoutNode, LayoutRect, Rect } from './types'

export interface ViewportQueryOptions {
  overscanX?: number
  overscanY?: number
}

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
