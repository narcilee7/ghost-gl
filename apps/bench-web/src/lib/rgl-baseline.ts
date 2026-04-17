import type { GridMetrics, LayoutNode, Rect } from 'ghost-gl-core'

export function rglViewportQuery(nodes: LayoutNode[], viewport: Rect, metrics: GridMetrics): number {
  const start = performance.now()
  for (const node of nodes) {
    const gapX = metrics.gapX ?? 0
    const gapY = metrics.gapY ?? 0
    const left = (metrics.paddingLeft ?? 0) + node.x * (metrics.columnWidth + gapX)
    const top = (metrics.paddingTop ?? 0) + node.y * (metrics.rowHeight + gapY)
    const width = node.w * metrics.columnWidth + Math.max(0, node.w - 1) * gapX
    const height = node.h * metrics.rowHeight + Math.max(0, node.h - 1) * gapY

    const intersects =
      left < viewport.left + viewport.width &&
      left + width > viewport.left &&
      top < viewport.top + viewport.height &&
      top + height > viewport.top

    // Simulate RGL storing result
    if (intersects) {
      void node.id
    }
  }
  return performance.now() - start
}

export function rglMoveNode(nodes: LayoutNode[], id: string, newX: number, newY: number): number {
  const start = performance.now()
  const target = nodes.find((n) => n.id === id)
  if (!target) return 0

  const moved = { ...target, x: newX, y: newY }

  // O(n) collision detection
  for (const node of nodes) {
    if (node.id === id) continue
    const collide =
      moved.x < node.x + node.w &&
      moved.x + moved.w > node.x &&
      moved.y < node.y + node.h &&
      moved.y + moved.h > node.y
    if (collide) {
      void node.id
    }
  }

  return performance.now() - start
}

export function rglCollisionDetect(nodes: LayoutNode[], target: LayoutNode): number {
  const start = performance.now()
  for (const node of nodes) {
    if (node.id === target.id) continue
    const collide =
      target.x < node.x + node.w &&
      target.x + target.w > node.x &&
      target.y < node.y + node.h &&
      target.y + target.h > node.y
    if (collide) {
      void node.id
    }
  }
  return performance.now() - start
}
