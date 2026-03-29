/**
 * React-Grid-Layout (RGL) Baseline Implementation
 *
 * This module simulates the behavior of react-grid-layout for benchmark comparison.
 * It uses naive algorithms (O(n) collision detection, full re-renders) to represent
 * traditional grid layout performance characteristics.
 */

import type { GridMetrics, LayoutNode, Rect } from '../../src'

export interface RGLNode extends LayoutNode {
  /** RGL tracks additional state */
  isDragging?: boolean
  isResizing?: boolean
}

export interface RGLState {
  nodes: RGLNode[]
  isDragging: boolean
  isResizing: boolean
}

export interface RGLMetrics {
  /** Time spent in collision detection (ms) */
  collisionTime: number
  /** Time spent in layout calculation (ms) */
  layoutTime: number
  /** Number of collision checks performed */
  collisionChecks: number
  /** Number of nodes that needed re-render */
  nodesReRendered: number
}

/**
 * Simulates RGL's O(n) collision detection.
 * Checks every node against every other node.
 */
export function detectCollisionsRGL(nodes: RGLNode[], target: RGLNode): RGLNode[] {
  const collisions: RGLNode[] = []

  for (const node of nodes) {
    if (node.id === target.id) continue

    // Simple AABB collision check
    if (
      target.x < node.x + node.w &&
      target.x + target.w > node.x &&
      target.y < node.y + node.h &&
      target.y + target.h > node.y
    ) {
      collisions.push(node)
    }
  }

  return collisions
}

/**
 * Simulates RGL's compact algorithm.
 * Moves all nodes up as far as possible.
 */
export function compactLayoutRGL(nodes: RGLNode[]): RGLNode[] {
  const sorted = [...nodes].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    if (a.x !== b.x) return a.x - b.x
    return a.id.localeCompare(b.id)
  })

  const result: RGLNode[] = []

  for (const node of sorted) {
    if (node.static) {
      result.push(node)
      continue
    }

    // Try to move node up
    let newY = node.y
    while (newY > 0) {
      const testNode = { ...node, y: newY - 1 }
      const collisions = detectCollisionsRGL(result, testNode)
      if (collisions.length === 0) {
        newY--
      } else {
        break
      }
    }

    result.push({ ...node, y: newY })
  }

  return result
}

/**
 * Simulates RGL's move operation with collision resolution.
 */
export function moveNodeRGL(
  nodes: RGLNode[],
  id: string,
  newX: number,
  newY: number
): { metrics: RGLMetrics; nodes: RGLNode[] } {
  const metrics: RGLMetrics = {
    collisionChecks: 0,
    collisionTime: 0,
    layoutTime: 0,
    nodesReRendered: 0,
  }

  const startTime = performance.now()

  const targetIndex = nodes.findIndex((n) => n.id === id)
  if (targetIndex === -1) {
    return { metrics, nodes }
  }

  const target: RGLNode = { ...nodes[targetIndex]!, x: newX, y: newY }
  const result = [...nodes]
  result[targetIndex] = target

  metrics.nodesReRendered++

  // Check collisions (O(n) per check)
  const collisionStart = performance.now()
  const collisions = detectCollisionsRGL(result, target)
  metrics.collisionChecks += result.length
  metrics.collisionTime = performance.now() - collisionStart

  // Resolve collisions by pushing nodes down
  for (const collider of collisions) {
    if (collider.static) {
      // Target must move below static node
      const newTarget: RGLNode = { ...target, y: collider.y + collider.h }
      result[targetIndex] = newTarget
    } else {
      // Push collider down
      const idx = result.findIndex((n) => n.id === collider.id)
      if (idx !== -1) {
        const targetH = target.h ?? 1
        result[idx] = { ...collider, y: target.y + targetH }
        metrics.nodesReRendered++

        // Cascade
        const movedNode = result[idx]!
        const cascade = resolveCollisionsCascadeRGL(result, movedNode)
        metrics.nodesReRendered += cascade.nodesReRendered
        metrics.collisionChecks += cascade.collisionChecks
      }
    }
  }

  metrics.layoutTime = performance.now() - startTime

  return { metrics, nodes: compactLayoutRGL(result) }
}

/**
 * Cascade collision resolution (RGL style).
 */
function resolveCollisionsCascadeRGL(
  nodes: RGLNode[],
  movedNode: RGLNode
): { collisionChecks: number; nodesReRendered: number } {
  let collisionChecks = 0
  let nodesReRendered = 0

  const collisions = detectCollisionsRGL(nodes, movedNode)
  collisionChecks += nodes.length

  for (const collider of collisions) {
    if (collider.static) continue

    const idx = nodes.findIndex((n) => n.id === collider.id)
    if (idx !== -1) {
      nodes[idx] = { ...collider, y: movedNode.y + movedNode.h }
      nodesReRendered++

      const cascade = resolveCollisionsCascadeRGL(nodes, nodes[idx])
      collisionChecks += cascade.collisionChecks
      nodesReRendered += cascade.nodesReRendered
    }
  }

  return { collisionChecks, nodesReRendered }
}

/**
 * Simulates RGL's viewport query (linear scan).
 */
export function queryViewportRGL(
  nodes: RGLNode[],
  viewport: Rect,
  metrics: GridMetrics
): { metrics: { checks: number; time: number }; nodes: RGLNode[] } {
  const startTime = performance.now()
  let checks = 0

  const result: RGLNode[] = []

  for (const node of nodes) {
    checks++

    // Convert to pixel coordinates (like RGL does)
    const left = (metrics.paddingLeft ?? 0) + node.x * (metrics.columnWidth + (metrics.gapX ?? 0))
    const top = (metrics.paddingTop ?? 0) + node.y * (metrics.rowHeight + (metrics.gapY ?? 0))
    const width = node.w * metrics.columnWidth + Math.max(0, node.w - 1) * (metrics.gapX ?? 0)
    const height = node.h * metrics.rowHeight + Math.max(0, node.h - 1) * (metrics.gapY ?? 0)

    // Check intersection with viewport
    if (
      left < viewport.left + viewport.width &&
      left + width > viewport.left &&
      top < viewport.top + viewport.height &&
      top + height > viewport.top
    ) {
      result.push(node)
    }
  }

  return {
    metrics: {
      checks,
      time: performance.now() - startTime,
    },
    nodes: result,
  }
}

/**
 * Run a benchmark task against RGL baseline.
 */
export function runRGLBenchmark<T>(
  name: string,
  fn: () => T
): { name: string; result: T; time: number } {
  const start = performance.now()
  const result = fn()
  const time = performance.now() - start

  return { name, result, time }
}
