import RBush from 'rbush'

import type { LayoutNode, LayoutPolicy } from '../types'

export type CompactDirection = 'up' | 'down'

export interface CompactOptions {
  direction?: CompactDirection
  maxColumns?: number
}

export interface NodePlacement {
  x: number
  y: number
}

export interface NodeSize {
  w: number
  h: number
}

export interface LayoutMutationContext<T = unknown> {
  itemById: Map<string, SpatialItem<T>>
  nodes: LayoutNode<T>[]
  policy: LayoutPolicy
  tree: RBush<SpatialItem<T>>
}

export function collides<T = unknown>(
  a: Pick<LayoutNode<T>, 'id' | 'x' | 'y' | 'w' | 'h'>,
  b: Pick<LayoutNode<T>, 'id' | 'x' | 'y' | 'w' | 'h'>
): boolean {
  if (a.id === b.id) {
    return false
  }

  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function moveNode<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  id: string,
  nextPlacement: NodePlacement
): LayoutNode<T>[] {
  const context = createLayoutMutationContext(nodes)
  moveNodeWithContext(context, id, nextPlacement)

  return finalizeLayoutMutation(context)
}

export function moveNodeWithContext<T = unknown>(
  context: LayoutMutationContext<T>,
  id: string,
  nextPlacement: NodePlacement
): void {
  mutateNode(context, id, (node) => {
    node.x = nextPlacement.x
    node.y = nextPlacement.y
  })
}

export function resizeNode<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  id: string,
  nextSize: NodeSize
): LayoutNode<T>[] {
  const context = createLayoutMutationContext(nodes)
  resizeNodeWithContext(context, id, nextSize)

  return finalizeLayoutMutation(context)
}

export function resizeNodeWithContext<T = unknown>(
  context: LayoutMutationContext<T>,
  id: string,
  nextSize: NodeSize
): void {
  mutateNode(context, id, (node) => {
    node.w = nextSize.w
    node.h = nextSize.h
  })
}

export function createLayoutMutationContext<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  policy: LayoutPolicy = {}
): LayoutMutationContext<T> {
  const nextNodes = nodes.map((node) => ({ ...node }))
  const { itemById, tree } = createSpatialIndex(nextNodes)

  return {
    itemById,
    nodes: nextNodes,
    policy,
    tree,
  }
}

export function finalizeLayoutMutation<T = unknown>(
  context: LayoutMutationContext<T>
): LayoutNode<T>[] {
  return sortNodes(context.nodes)
}

/**
 * Compact the layout by moving nodes to fill empty spaces.
 *
 * Algorithm:
 * 1. Group nodes by column (x position)
 * 2. For each column, sort nodes by y position
 * 3. For each non-static node, move it up as far as possible
 * 4. Respect static nodes as barriers
 *
 * @param nodes - Current layout nodes
 * @param options - Compact options (direction, maxColumns)
 * @returns Compacted layout nodes
 */
export function compactLayout<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  options: CompactOptions = {},
  policy: LayoutPolicy = {}
): LayoutNode<T>[] {
  const direction = options.direction ?? 'up'

  if (direction === 'down') {
    // Downward compact is essentially what resolveNodeCollisions already does
    return [...nodes]
  }

  // Create context for efficient spatial queries
  const context = createLayoutMutationContext(nodes, policy)

  // Get all column positions
  const columnXs = new Set<number>()
  for (const node of context.nodes) {
    columnXs.add(node.x)
    // Also add positions for multi-column nodes
    for (let i = 1; i < node.w; i++) {
      columnXs.add(node.x + i)
    }
  }

  // Process each column
  for (const colX of columnXs) {
    compactColumn(context, colX)
  }

  return finalizeLayoutMutation(context)
}

/**
 * Compact a single column by moving nodes upward.
 */
function compactColumn<T = unknown>(context: LayoutMutationContext<T>, colX: number): void {
  // Get all nodes that overlap with this column
  const columnNodes = context.nodes
    .filter((node) => node.x <= colX && node.x + node.w > colX)
    .sort((a, b) => a.y - b.y)

  // Track the bottom of the last placed node (or static barrier)
  let lastBottom = 0

  for (const node of columnNodes) {
    if (node.static) {
      // Static nodes act as barriers
      lastBottom = Math.max(lastBottom, node.y + node.h)
      continue
    }

    // Find the item in context
    const item = context.itemById.get(node.id)
    if (item == null) continue

    // Check if we can move this node up
    const targetY = lastBottom
    if (node.y > targetY) {
      // Check for collisions in the new position
      const collisions = findCollisionsAt(context, node, targetY)

      if (collisions.length === 0) {
        // Safe to move up
        node.y = targetY
        syncSpatialItem(context.tree, item)
      } else {
        // There's a collision, place below the collision
        const maxBottom = Math.max(...collisions.map((c) => c.y + c.h))
        node.y = maxBottom
        syncSpatialItem(context.tree, item)
      }
    }

    lastBottom = Math.max(lastBottom, node.y + node.h)
  }
}

/**
 * Find nodes that would collide if 'node' were moved to targetY.
 */
function findCollisionsAt<T = unknown>(
  context: LayoutMutationContext<T>,
  node: LayoutNode<T>,
  targetY: number
): LayoutNode<T>[] {
  const tempNode = { ...node, y: targetY }

  return context.nodes.filter((other) => {
    if (other.id === node.id) return false
    return collides(tempNode, other)
  })
}

function mutateNode<T = unknown>(
  context: LayoutMutationContext<T>,
  id: string,
  mutate: (node: LayoutNode<T>) => void
): void {
  const targetItem = context.itemById.get(id)

  if (targetItem == null) {
    return
  }

  mutate(targetItem.node)
  syncSpatialItem(context.tree, targetItem)
  resolveNodeCollisions(context.tree, context.itemById, targetItem.id, context.policy)
}

function resolveNodeCollisions<T = unknown>(
  tree: RBush<SpatialItem<T>>,
  itemById: Map<string, SpatialItem<T>>,
  rootId: string,
  policy: LayoutPolicy = {}
): void {
  const direction = policy.collisionDirection ?? 'vertical'
  const allowStaticOverlap = policy.allowStaticOverlap ?? false

  const queue = [rootId]
  let cursor = 0

  while (cursor < queue.length) {
    const currentId = queue[cursor]
    cursor += 1

    if (currentId == null) {
      continue
    }

    const current = itemById.get(currentId)

    if (current == null) {
      continue
    }

    // Pinned nodes cannot be displaced - they force others to move
    const isPinned = current.node.pinned ?? false

    while (true) {
      const colliders = sortSpatialItems(
        tree
          .search(current)
          .filter((item) => item.id !== current.id && collides(current.node, item.node))
      )

      if (colliders.length === 0) {
        break
      }

      // Check for static blockers
      if (!allowStaticOverlap) {
        const staticBlocker = colliders.find((item) => item.node.static)

        if (staticBlocker != null && !isPinned) {
          // Current node must move below static blocker
          current.node.y = staticBlocker.node.y + staticBlocker.node.h
          syncSpatialItem(tree, current)
          continue
        }
      }

      // Find the best node to displace (prefer unpinned, non-static)
      const displaced =
        colliders.find((item) => !(item.node.pinned ?? false) && !item.node.static) ??
        colliders.find((item) => !item.node.static) ?? // fallback to any non-static
        colliders[0] // final fallback

      if (displaced == null || (displaced.node.pinned ?? false)) {
        // Can't displace pinned nodes, move current instead
        if (direction === 'vertical' || direction === 'both') {
          current.node.y =
            displaced?.node.y !== undefined
              ? displaced.node.y + displaced.node.h
              : current.node.y + 1
          syncSpatialItem(tree, current)
        }
        if (direction === 'horizontal' || direction === 'both') {
          current.node.x =
            displaced?.node.x !== undefined
              ? displaced.node.x + displaced.node.w
              : current.node.x + 1
          syncSpatialItem(tree, current)
        }
        continue
      }

      // Displace the target node
      if (direction === 'vertical' || direction === 'both') {
        displaced.node.y = current.node.y + current.node.h
      }
      if (direction === 'horizontal' || direction === 'both') {
        displaced.node.x = current.node.x + current.node.w
      }
      syncSpatialItem(tree, displaced)
      queue.push(displaced.id)
    }
  }
}

interface SpatialItem<T = unknown> {
  id: string
  maxX: number
  maxY: number
  minX: number
  minY: number
  node: LayoutNode<T>
}

function createSpatialIndex<T = unknown>(
  nodes: readonly LayoutNode<T>[]
): {
  itemById: Map<string, SpatialItem<T>>
  tree: RBush<SpatialItem<T>>
} {
  const itemById = new Map<string, SpatialItem<T>>()
  const items = nodes.map((node) => {
    const item = toSpatialItem(node)
    itemById.set(item.id, item)
    return item
  })
  const tree = new RBush<SpatialItem<T>>()
  tree.load(items)

  return {
    itemById,
    tree,
  }
}

function sortNodes<T = unknown>(nodes: readonly LayoutNode<T>[]): LayoutNode<T>[] {
  return [...nodes].sort(compareNodes)
}

function sortSpatialItems<T = unknown>(items: readonly SpatialItem<T>[]): SpatialItem<T>[] {
  return [...items].sort((a, b) => compareNodes(a.node, b.node))
}

function compareNodes<T = unknown>(a: LayoutNode<T>, b: LayoutNode<T>): number {
  if (a.y !== b.y) {
    return a.y - b.y
  }

  if (a.x !== b.x) {
    return a.x - b.x
  }

  return a.id.localeCompare(b.id)
}

function syncSpatialItem<T = unknown>(tree: RBush<SpatialItem<T>>, item: SpatialItem<T>): void {
  tree.remove(item)
  item.minX = item.node.x
  item.minY = item.node.y
  item.maxX = item.node.x + item.node.w
  item.maxY = item.node.y + item.node.h
  tree.insert(item)
}

function toSpatialItem<T = unknown>(node: LayoutNode<T>): SpatialItem<T> {
  return {
    id: node.id,
    maxX: node.x + node.w,
    maxY: node.y + node.h,
    minX: node.x,
    minY: node.y,
    node,
  }
}

/**
 * Find the best placement for a new node using auto-placement algorithm.
 *
 * Strategy:
 * 1. Try to place at the top-left (0, 0) first
 * 2. If collision, scan right then down
 * 3. Respect static and pinned nodes as barriers
 *
 * @param nodes - Existing layout nodes
 * @param nodeSize - Size of the new node (w, h)
 * @param options - Optional placement constraints
 * @returns Best placement coordinates { x, y } or null if no space found
 */
export function findAutoPlacement(
  nodes: readonly LayoutNode[],
  nodeSize: { w: number; h: number },
  options: {
    maxX?: number
    maxY?: number
    startX?: number
    startY?: number
  } = {}
): { x: number; y: number } | null {
  const { w, h } = nodeSize
  const { maxX = Number.POSITIVE_INFINITY, maxY = Number.POSITIVE_INFINITY } = options
  let { startX = 0, startY = 0 } = options

  // Ensure start positions are non-negative
  startX = Math.max(0, startX)
  startY = Math.max(0, startY)

  // Create a temporary context for collision checking
  const context = createLayoutMutationContext(nodes)

  // Scan for placement starting from start position
  for (let y = startY; y < maxY; y++) {
    for (let x = startX; x < maxX; x++) {
      // Check if this position is free
      const tempNode = { id: 'temp', x, y, w, h }
      const collisions = findCollisionsAt(context, tempNode, y)
        .filter((n) => !(n.x + n.w <= x || x + w <= n.x)) // precise x check
        .filter((n) => !(n.y + n.h <= y || y + h <= n.y)) // precise y check

      // Filter out collisions with static/pinned nodes (they are barriers)
      const blocked = collisions.some((n) => (n.static ?? false) || (n.pinned ?? false))

      if (!blocked && collisions.length === 0) {
        return { x, y }
      }

      // Skip ahead if blocked by a wide node
      const rightmostBlocker = collisions.reduce((max, n) => Math.max(max, n.x + n.w), x + 1)
      if (rightmostBlocker > x + 1) {
        x = rightmostBlocker - 1 // -1 because loop will increment
      }
    }
  }

  return null // No valid placement found
}
