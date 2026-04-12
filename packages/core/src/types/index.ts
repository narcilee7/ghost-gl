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

export interface LayoutNode<T = unknown> {
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
  data?: T
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

export interface LayoutRect<T = unknown> extends Rect {
  id: string
  gridX: number
  gridY: number
  gridWidth: number
  gridHeight: number
  node: LayoutNode<T>
}

export interface MaterializedNode<T = unknown> {
  id: string
  rect: Rect
  mode: MaterializationMode
  reason: 'visible' | 'overscan' | 'dragging' | 'cooldown' | 'parked'
  node: LayoutNode<T>
}

export interface SnapshotAdapter<S = unknown> {
  canSnapshot?: (id: string) => boolean
  capture?: (id: string) => S | undefined
  restore?: (id: string, snapshot: S | undefined) => void
  dispose?: (id: string) => void
}
