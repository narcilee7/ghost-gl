import type { LayoutNode } from '../types'

export function createNodeMap<T = unknown>(
  nodes: readonly LayoutNode<T>[]
): Map<string, LayoutNode<T>> {
  return new Map(nodes.map((node) => [node.id, node]))
}
