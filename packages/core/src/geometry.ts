import type { GridMetrics, LayoutNode, LayoutRect, Rect } from './types'

export function expandRect(rect: Rect, deltaX: number, deltaY: number): Rect {
  return {
    left: rect.left - deltaX,
    top: rect.top - deltaY,
    width: rect.width + deltaX * 2,
    height: rect.height + deltaY * 2,
  }
}

export function intersectsRect(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  )
}

export function projectNodeToRect<TData = unknown>(
  node: LayoutNode<TData>,
  metrics: GridMetrics
): LayoutRect<TData> {
  const gapX = metrics.gapX ?? 0
  const gapY = metrics.gapY ?? 0
  const paddingLeft = metrics.paddingLeft ?? 0
  const paddingTop = metrics.paddingTop ?? 0

  return {
    id: node.id,
    node,
    gridHeight: node.h,
    gridWidth: node.w,
    gridX: node.x,
    gridY: node.y,
    height: node.h * metrics.rowHeight + Math.max(0, node.h - 1) * gapY,
    left: paddingLeft + node.x * (metrics.columnWidth + gapX),
    top: paddingTop + node.y * (metrics.rowHeight + gapY),
    width: node.w * metrics.columnWidth + Math.max(0, node.w - 1) * gapX,
  }
}

/**
 * Reverse project pixel rect to grid coordinates.
 * This is an approximation - it finds the grid cell that contains the point.
 */
export function unprojectRectToGrid(
  rect: Rect,
  metrics: GridMetrics
): { x: number; y: number; w: number; h: number } {
  const gapX = metrics.gapX ?? 0
  const gapY = metrics.gapY ?? 0
  const paddingLeft = metrics.paddingLeft ?? 0
  const paddingTop = metrics.paddingTop ?? 0

  // Calculate grid coordinates
  const x = Math.floor((rect.left - paddingLeft) / (metrics.columnWidth + gapX))
  const y = Math.floor((rect.top - paddingTop) / (metrics.rowHeight + gapY))

  // Calculate grid dimensions (approximate)
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const maxX = Math.ceil((right - paddingLeft) / (metrics.columnWidth + gapX))
  const maxY = Math.ceil((bottom - paddingTop) / (metrics.rowHeight + gapY))

  return {
    h: Math.max(1, maxY - y),
    w: Math.max(1, maxX - x),
    x: Math.max(0, x),
    y: Math.max(0, y),
  }
}

export function estimateLayoutBounds<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  metrics: GridMetrics
): Rect {
  let maxRight = metrics.paddingLeft ?? 0
  let maxBottom = metrics.paddingTop ?? 0

  for (const node of nodes) {
    const rect = projectNodeToRect(node, metrics)

    maxRight = Math.max(maxRight, rect.left + rect.width)
    maxBottom = Math.max(maxBottom, rect.top + rect.height)
  }

  return {
    height: maxBottom,
    left: 0,
    top: 0,
    width: maxRight,
  }
}
