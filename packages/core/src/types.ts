export const materializationModes = ['ghost', 'shell', 'live'] as const

export type MaterializationMode = (typeof materializationModes)[number]

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface GridMetrics {
  columnWidth: number
  rowHeight: number
  gapX?: number
  gapY?: number
  paddingLeft?: number
  paddingTop?: number
}

export interface LayoutNode<TData = unknown> {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** Static nodes act as immovable barriers */
  static?: boolean
  /** Pinned nodes cannot be displaced by other nodes' collisions */
  pinned?: boolean
  /** Whether the node can be dragged (defaults to true) */
  draggable?: boolean
  /** Whether the node can be resized (defaults to true) */
  resizable?: boolean
  data?: TData
}

/** Layout behavior policy configuration */
export interface LayoutPolicy {
  /** Direction for collision resolution */
  collisionDirection?: 'vertical' | 'horizontal' | 'both'
  /** Whether to auto-compact after operations */
  autoCompact?: boolean
  /** Whether static nodes can be overlapped by drag operations */
  allowStaticOverlap?: boolean
  /** Minimum gap between nodes (in grid units) */
  minGapX?: number
  minGapY?: number
}

export interface LayoutRect<TData = unknown> extends Rect {
  id: string
  gridX: number
  gridY: number
  gridWidth: number
  gridHeight: number
  node: LayoutNode<TData>
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
