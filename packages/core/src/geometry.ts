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
    left: 0,
    top: 0,
    width: maxRight,
    height: maxBottom,
  }
}
