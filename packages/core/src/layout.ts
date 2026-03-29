import RBush from 'rbush'

import type { LayoutNode } from './types'

export interface NodePlacement {
  x: number
  y: number
}

export interface NodeSize {
  w: number
  h: number
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
  return mutateNode(nodes, id, (node) => {
    node.x = nextPlacement.x
    node.y = nextPlacement.y
  })
}

export function resizeNode<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  id: string,
  nextSize: NodeSize
): LayoutNode<TData>[] {
  return mutateNode(nodes, id, (node) => {
    node.w = nextSize.w
    node.h = nextSize.h
  })
}

function mutateNode<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  id: string,
  mutate: (node: LayoutNode<TData>) => void
): LayoutNode<TData>[] {
  const nextNodes = nodes.map((node) => ({ ...node }))
  const { itemById, tree } = createSpatialIndex(nextNodes)
  const targetItem = itemById.get(id)

  if (targetItem == null) {
    return sortNodes(nextNodes)
  }

  mutate(targetItem.node)
  syncSpatialItem(tree, targetItem)
  resolveNodeCollisions(tree, itemById, targetItem.id)

  return sortNodes(nextNodes)
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
