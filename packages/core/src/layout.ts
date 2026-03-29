import RBush from 'rbush'

import type { LayoutNode } from './types'

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

export interface LayoutMutationContext<TData = unknown> {
  itemById: Map<string, SpatialItem<TData>>
  nodes: LayoutNode<TData>[]
  tree: RBush<SpatialItem<TData>>
}

export function collides<TData = unknown>(
  a: Pick<LayoutNode<TData>, 'id' | 'x' | 'y' | 'w' | 'h'>,
  b: Pick<LayoutNode<TData>, 'id' | 'x' | 'y' | 'w' | 'h'>
): boolean {
  if (a.id === b.id) {
    return false
  }

  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function moveNode<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  id: string,
  nextPlacement: NodePlacement
): LayoutNode<TData>[] {
  const context = createLayoutMutationContext(nodes)
  moveNodeWithContext(context, id, nextPlacement)

  return finalizeLayoutMutation(context)
}

export function moveNodeWithContext<TData = unknown>(
  context: LayoutMutationContext<TData>,
  id: string,
  nextPlacement: NodePlacement
): void {
  mutateNode(context, id, (node) => {
    node.x = nextPlacement.x
    node.y = nextPlacement.y
  })
}

export function resizeNode<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  id: string,
  nextSize: NodeSize
): LayoutNode<TData>[] {
  const context = createLayoutMutationContext(nodes)
  resizeNodeWithContext(context, id, nextSize)

  return finalizeLayoutMutation(context)
}

export function resizeNodeWithContext<TData = unknown>(
  context: LayoutMutationContext<TData>,
  id: string,
  nextSize: NodeSize
): void {
  mutateNode(context, id, (node) => {
    node.w = nextSize.w
    node.h = nextSize.h
  })
}

export function createLayoutMutationContext<TData = unknown>(
  nodes: readonly LayoutNode<TData>[]
): LayoutMutationContext<TData> {
  const nextNodes = nodes.map((node) => ({ ...node }))
  const { itemById, tree } = createSpatialIndex(nextNodes)

  return {
    itemById,
    nodes: nextNodes,
    tree,
  }
}

export function finalizeLayoutMutation<TData = unknown>(
  context: LayoutMutationContext<TData>
): LayoutNode<TData>[] {
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
export function compactLayout<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  options: CompactOptions = {}
): LayoutNode<TData>[] {
  const direction = options.direction ?? 'up'

  if (direction === 'down') {
    // Downward compact is essentially what resolveNodeCollisions already does
    return [...nodes]
  }

  // Create context for efficient spatial queries
  const context = createLayoutMutationContext(nodes)

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
function compactColumn<TData = unknown>(context: LayoutMutationContext<TData>, colX: number): void {
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
function findCollisionsAt<TData = unknown>(
  context: LayoutMutationContext<TData>,
  node: LayoutNode<TData>,
  targetY: number
): LayoutNode<TData>[] {
  const tempNode = { ...node, y: targetY }

  return context.nodes.filter((other) => {
    if (other.id === node.id) return false
    return collides(tempNode, other)
  })
}

function mutateNode<TData = unknown>(
  context: LayoutMutationContext<TData>,
  id: string,
  mutate: (node: LayoutNode<TData>) => void
): void {
  const targetItem = context.itemById.get(id)

  if (targetItem == null) {
    return
  }

  mutate(targetItem.node)
  syncSpatialItem(context.tree, targetItem)
  resolveNodeCollisions(context.tree, context.itemById, targetItem.id)
}

function resolveNodeCollisions<TData = unknown>(
  tree: RBush<SpatialItem<TData>>,
  itemById: Map<string, SpatialItem<TData>>,
  rootId: string
): void {
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

    while (true) {
      const colliders = sortSpatialItems(
        tree
          .search(current)
          .filter((item) => item.id !== current.id && collides(current.node, item.node))
      )

      if (colliders.length === 0) {
        break
      }

      const staticBlocker = colliders.find((item) => item.node.static)

      if (staticBlocker != null) {
        current.node.y = staticBlocker.node.y + staticBlocker.node.h
        syncSpatialItem(tree, current)
        continue
      }

      const displaced = colliders[0]

      if (displaced == null) {
        break
      }

      displaced.node.y = current.node.y + current.node.h
      syncSpatialItem(tree, displaced)
      queue.push(displaced.id)
    }
  }
}

interface SpatialItem<TData = unknown> {
  id: string
  maxX: number
  maxY: number
  minX: number
  minY: number
  node: LayoutNode<TData>
}

function createSpatialIndex<TData = unknown>(
  nodes: readonly LayoutNode<TData>[]
): {
  itemById: Map<string, SpatialItem<TData>>
  tree: RBush<SpatialItem<TData>>
} {
  const itemById = new Map<string, SpatialItem<TData>>()
  const items = nodes.map((node) => {
    const item = toSpatialItem(node)
    itemById.set(item.id, item)
    return item
  })
  const tree = new RBush<SpatialItem<TData>>()
  tree.load(items)

  return {
    itemById,
    tree,
  }
}

function sortNodes<TData = unknown>(nodes: readonly LayoutNode<TData>[]): LayoutNode<TData>[] {
  return [...nodes].sort(compareNodes)
}

function sortSpatialItems<TData = unknown>(
  items: readonly SpatialItem<TData>[]
): SpatialItem<TData>[] {
  return [...items].sort((a, b) => compareNodes(a.node, b.node))
}

function compareNodes<TData = unknown>(a: LayoutNode<TData>, b: LayoutNode<TData>): number {
  if (a.y !== b.y) {
    return a.y - b.y
  }

  if (a.x !== b.x) {
    return a.x - b.x
  }

  return a.id.localeCompare(b.id)
}

function syncSpatialItem<TData = unknown>(
  tree: RBush<SpatialItem<TData>>,
  item: SpatialItem<TData>
): void {
  tree.remove(item)
  item.minX = item.node.x
  item.minY = item.node.y
  item.maxX = item.node.x + item.node.w
  item.maxY = item.node.y + item.node.h
  tree.insert(item)
}

function toSpatialItem<TData = unknown>(node: LayoutNode<TData>): SpatialItem<TData> {
  return {
    id: node.id,
    maxX: node.x + node.w,
    maxY: node.y + node.h,
    minX: node.x,
    minY: node.y,
    node,
  }
}
