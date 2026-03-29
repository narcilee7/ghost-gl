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
  const nodeById = new Map(nextNodes.map((node) => [node.id, node]))
  const target = nodeById.get(id)

  if (target == null) {
    return sortNodes(nextNodes)
  }

  mutate(target)
  resolveNodeCollisions(nextNodes, target.id)

  return sortNodes(nextNodes)
}

function resolveNodeCollisions<TData = unknown>(nodes: LayoutNode<TData>[], rootId: string): void {
  const queue = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()

    if (currentId == null) {
      continue
    }

    const current = nodes.find((node) => node.id === currentId)

    if (current == null) {
      continue
    }

    while (true) {
      const colliders = sortNodes(nodes.filter((node) => collides(current, node)))

      if (colliders.length === 0) {
        break
      }

      const staticBlocker = colliders.find((node) => node.static)

      if (staticBlocker != null) {
        current.y = staticBlocker.y + staticBlocker.h
        continue
      }

      const displaced = colliders[0]

      if (displaced == null) {
        break
      }

      displaced.y = current.y + current.h
      queue.push(displaced.id)
    }
  }
}

function sortNodes<TData = unknown>(nodes: readonly LayoutNode<TData>[]): LayoutNode<TData>[] {
  return [...nodes].sort(compareNodes)
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
