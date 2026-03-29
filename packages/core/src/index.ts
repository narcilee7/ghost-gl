export {
  estimateLayoutBounds,
  expandRect,
  intersectsRect,
  projectNodeToRect,
} from './geometry'
export type {
  GridMetrics,
  LayoutNode,
  LayoutRect,
  MaterializationMode,
  MaterializedNode,
  Rect,
  SnapshotAdapter,
} from './types'
export { materializationModes } from './types'
export type { ViewportQueryOptions } from './viewport'
export { queryViewport } from './viewport'

import type { LayoutNode, MaterializationMode } from './types'
import { materializationModes } from './types'

export function isMaterializationMode(value: string): value is MaterializationMode {
  return materializationModes.includes(value as MaterializationMode)
}

export function createNodeMap<TData = unknown>(
  nodes: readonly LayoutNode<TData>[]
): Map<string, LayoutNode<TData>> {
  return new Map(nodes.map((node) => [node.id, node]))
}
