export const materializationModes = ['ghost', 'shell', 'live'] as const

export type MaterializationMode = (typeof materializationModes)[number]

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface LayoutNode<TData = unknown> {
  id: string
  x: number
  y: number
  w: number
  h: number
  static?: boolean
  data?: TData
}

export interface MaterializedNode<TData = unknown> {
  id: string
  rect: Rect
  mode: MaterializationMode
  reason: 'visible' | 'overscan' | 'dragging' | 'cooldown' | 'parked'
  node: LayoutNode<TData>
}

export interface SnapshotAdapter<TSnapshot = unknown> {
  canSnapshot?: (id: string) => boolean
  capture?: (id: string) => TSnapshot | undefined
  restore?: (id: string, snapshot: TSnapshot | undefined) => void
  dispose?: (id: string) => void
}

export function isMaterializationMode(value: string): value is MaterializationMode {
  return materializationModes.includes(value as MaterializationMode)
}

export function createNodeMap<TData = unknown>(
  nodes: readonly LayoutNode<TData>[]
): Map<string, LayoutNode<TData>> {
  return new Map(nodes.map((node) => [node.id, node]))
}
