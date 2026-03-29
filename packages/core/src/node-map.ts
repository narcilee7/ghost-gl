import type { LayoutNode } from './types'

export function createNodeMap<TData = unknown>(
  nodes: readonly LayoutNode<TData>[]
): Map<string, LayoutNode<TData>> {
  return new Map(nodes.map((node) => [node.id, node]))
}
