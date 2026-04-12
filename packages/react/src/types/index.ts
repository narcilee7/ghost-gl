import type {
  GridMetrics,
  LayoutNode,
  LayoutPolicy,
  MaterializedNode,
  Rect,
  RuntimeController,
  RuntimeControllerState,
  SnapshotAdapter,
} from 'ghost-gl-core'
import type { CSSProperties, ReactNode, RefObject } from 'react'

export interface GhostGridSkeletonProps {
  /** Width of the skeleton (defaults to 100%) */
  width?: number | string
  /** Height of the skeleton (defaults to 100%) */
  height?: number | string
  /** Animation style */
  animation?: 'pulse' | 'wave' | 'none'
  /** Custom className */
  className?: string
  /** Custom styles */
  style?: CSSProperties
  /** Border radius */
  borderRadius?: number | string
  /** Background color */
  backgroundColor?: string
  /** Highlight color for animation */
  highlightColor?: string
}

/**
 * Render context passed to the renderItem function
 */
export interface GhostGridItemRenderContext<T = unknown> {
  /** The layout node with its data */
  node: LayoutNode<T>
  /** The calculated rect in pixels */
  rect: Rect
  /** Current materialization mode */
  mode: 'ghost' | 'shell' | 'live'
  /** Reason for current mode */
  reason: 'visible' | 'overscan' | 'dragging' | 'cooldown' | 'parked'
  /** Whether this item is currently being dragged */
  isDragging: boolean
  /** Whether this item is currently being resized */
  isResizing: boolean
}

/**
 * Props for the GhostGrid component
 */
export interface GhostGridProps<T = unknown, S = unknown> {
  /** Initial nodes for the grid */
  initialNodes?: readonly LayoutNode<T>[]
  /** Grid configuration */
  columns?: number
  /** Height of each row in pixels */
  rowHeight?: number
  /** Gap between columns in pixels */
  gapX?: number
  /** Gap between rows in pixels */
  gapY?: number
  /** Padding on the left in pixels */
  paddingLeft?: number
  /** Padding on the top in pixels */
  paddingTop?: number
  /** Layout behavior policy */
  policy?: LayoutPolicy
  /** Optional ref to access grid internals */
  gridRef?: import('react').RefObject<GhostGridRef<T> | null>
  /** Optional snapshot adapter for state preservation */
  snapshotAdapter?: SnapshotAdapter<S>
  /** Width of the container (defaults to 100%) */
  width?: number
  /** Overscan rows for virtualization */
  overscan?: number
  /** Children for additional customization */
  children?: ReactNode
  /** Additional className for the container */
  className?: string
  /** Additional inline styles for the container */
  style?: CSSProperties
  /** Callback when grid state changes */
  onStateChange?: (state: RuntimeControllerState<T>) => void
  /** Callback when nodes change */
  onNodesChange?: (nodes: readonly LayoutNode<T>[]) => void
  /** Render function for each grid item */
  renderItem: (context: GhostGridItemRenderContext<T>) => ReactNode
}

/**
 * Props for the GhostGridItem component
 */
export interface GhostGridItemProps<T = unknown> {
  /** The materialized node to render */
  materializedNode: MaterializedNode<T>
  /** Render function */
  renderItem: (context: GhostGridItemRenderContext<T>) => ReactNode
  /** Whether this item is being dragged */
  isDragging?: boolean
  /** Whether this item is being resized */
  isResizing?: boolean
}

/**
 * Options for the useGhostGrid hook
 */
export interface UseGhostGridOptions<T = unknown> {
  /** Initial nodes */
  initialNodes?: readonly LayoutNode<T>[]
  /** Grid configuration */
  columns?: number
  /** Row height in pixels */
  rowHeight?: number
  /** Gap between columns */
  gapX?: number
  /** Gap between rows */
  gapY?: number
  /** Left padding */
  paddingLeft?: number
  /** Top padding */
  paddingTop?: number
  /** Layout policy */
  policy?: LayoutPolicy
  /** Container ref for viewport tracking */
  containerRef?: RefObject<HTMLElement | null>
  /** Overscan for virtualization */
  overscan?: number
  /** Debounce ms for state updates */
  debounceMs?: number
}

/**
 * Return value of the useGhostGrid hook
 */
export interface UseGhostGridReturn<T = unknown> {
  /** The runtime controller instance */
  controller: RuntimeController<T> | null
  /** Current grid state */
  state: RuntimeControllerState<T> | null
  /** Currently visible/layout nodes */
  nodes: readonly LayoutNode<T>[]
  /** Currently materialized nodes */
  materialized: MaterializedNode<T>[]
  /** Grid bounds */
  bounds: Rect | null
  /** Grid metrics */
  metrics: GridMetrics | null
  /** Whether grid is ready */
  isReady: boolean
  /** Update viewport and recalculate materialization */
  updateViewport: (viewport: Rect) => void
  /** Move a node */
  moveNode: (id: string, x: number, y: number) => boolean
  /** Resize a node */
  resizeNode: (id: string, w: number, h: number) => boolean
  /** Undo last operation */
  undo: () => boolean
  /** Redo last undone operation */
  redo: () => boolean
}

/**
 * Imperative API exposed by GhostGrid via ref
 */
export interface GhostGridRef<T = unknown> {
  controller: RuntimeController<T> | null
  containerRef: RefObject<HTMLElement | null>
  metrics: GridMetrics | null
}

/**
 * Context value for GhostGridContext
 */
export interface GhostGridContextValue<T = unknown> {
  /** The runtime controller */
  controller: RuntimeController<T> | null
  /** Current state */
  state: RuntimeControllerState<T> | null
  /** Container element ref */
  containerRef: RefObject<HTMLElement | null>
  /** Current viewport */
  viewport: Rect | null
  /** Update viewport */
  setViewport: (viewport: Rect) => void
  /** Current materialized nodes */
  materialized: MaterializedNode<T>[]
  /** Grid metrics */
  metrics: GridMetrics | null
}

/**
 * Drag and drop context value
 */
export interface GhostGridDndContextValue {
  /** Whether a drag operation is active */
  isDragging: boolean
  /** Currently dragged node id */
  draggedNodeId: string | null
  /** Start dragging a node */
  startDrag: (nodeId: string, pointerX: number, pointerY: number) => void
  /** Update drag position */
  updateDrag: (pointerX: number, pointerY: number) => void
  /** End drag operation */
  endDrag: () => void
  /** Cancel drag operation */
  cancelDrag: () => void
}

/**
 * Props for the GhostGridDndProvider
 */
export interface GhostGridDndProviderProps {
  children?: ReactNode
  /** Enable drag and drop */
  enabled?: boolean
  /** Grid size for snapping */
  columnWidth?: number
  /** Callback when drag starts */
  onDragStart?: (nodeId: string) => void
  /** Callback when drag ends */
  onDragEnd?: (nodeId: string, x: number, y: number) => void
  /** Optional controller - if not provided, will use context */
  controller?: import('ghost-gl-core').RuntimeController<unknown>
  /** Optional container ref - if not provided, will use context */
  containerRef?: import('react').RefObject<HTMLElement | null>
  /** Optional metrics - if not provided, will use context */
  metrics?: import('ghost-gl-core').GridMetrics
}

/**
 * Props for the useGhostGridDrag hook
 */
export interface UseGhostGridDragOptions {
  /** Node id */
  nodeId: string
  /** Whether dragging is enabled for this node */
  disabled?: boolean
}

/**
 * Return value of useGhostGridDrag hook
 */
export interface UseGhostGridDragReturn {
  /** Whether this node is being dragged */
  isDragging: boolean
  /** Drag handlers to attach to the element */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }
}
