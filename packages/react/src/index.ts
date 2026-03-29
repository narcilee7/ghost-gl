import type { LayoutNode, Rect, SnapshotAdapter } from 'ghost-gl-core'
import type { ReactNode } from 'react'

export interface GhostGridItemRenderContext<TData = unknown> {
  node: LayoutNode<TData>
  rect: Rect
}

export interface GhostGridProps<TData = unknown, TSnapshot = unknown> {
  nodes: readonly LayoutNode<TData>[]
  renderItem: (context: GhostGridItemRenderContext<TData>) => ReactNode
  snapshotAdapter?: SnapshotAdapter<TSnapshot>
}

export function GhostGrid<TData = unknown, TSnapshot = unknown>(
  _props: GhostGridProps<TData, TSnapshot>
): null {
  return null
}
