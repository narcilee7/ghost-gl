import type { ScrollViewProps } from '@lynx-js/lynx-ui-scroll-view'
import type { CSSProperties } from '@lynx-js/types'
import type { GridHost } from 'ghost-gl-adapter-core'
import type {
  ControllerAPI,
  GridMetrics,
  LayoutNode,
  LayoutPolicy,
  MaterializedNode,
  Rect,
  RuntimeControllerState,
} from 'ghost-gl-core'
import type { ReactElement, ReactNode } from 'react'

/**
 * Render context passed to the renderItem function.
 */
export interface GhostGridItemRenderContext<T = unknown> {
  /** The layout node with its data */
  node: LayoutNode<T>
  /** The calculated rect in pixels */
  rect: Rect
  /** Current materialization mode */
  mode: 'ghost' | 'shell' | 'live'
  /** Reason for current mode */
  reason: MaterializedNode<T>['reason']
  /** Whether this item is currently being dragged */
  isDragging: boolean
  /** Whether this item is currently being resized */
  isResizing: boolean
}

/**
 * Props for the GhostGrid component.
 */
export interface GhostGridProps<T = unknown> {
  /** Initial nodes for the grid */
  initialNodes?: readonly LayoutNode<T>[]
  /** Number of columns (defaults to 12) */
  columns?: number
  /** Height of each row in pixels */
  rowHeight?: number
  /** Gap between columns in pixels */
  gapX?: number
  /** Gap between rows in pixels */
  gapY?: number
  /** Left padding in pixels */
  paddingLeft?: number
  /** Top padding in pixels */
  paddingTop?: number
  /** Layout behavior policy */
  policy?: LayoutPolicy
  /** Container width in pixels */
  width?: number | string
  /** Container height in pixels */
  height?: number | string
  /** Overscan rows for virtualization */
  overscan?: number
  /** Debounce ms for state updates */
  debounceMs?: number
  /** Render function for each grid item */
  renderItem: (context: GhostGridItemRenderContext<T>) => ReactElement
  /** Callback when grid state changes */
  onStateChange?: (state: RuntimeControllerState<T>) => void
  /** Callback when nodes change */
  onNodesChange?: (nodes: readonly LayoutNode<T>[]) => void
  /** Style prop for the container */
  style?: CSSProperties
  /** Additional children */
  children?: ReactNode
  /** ScrollView-specific props */
  scrollViewProps?: Partial<ScrollViewProps>
}

/**
 * Options for the useGhostGrid hook.
 */
export interface UseGhostGridOptions<T = unknown> {
  /** Initial nodes */
  initialNodes?: readonly LayoutNode<T>[]
  /** Number of columns */
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
  containerRef?: { current: LynxElement | null }
  /** Overscan for virtualization */
  overscan?: number
  /** Debounce ms for state updates */
  debounceMs?: number
}

/**
 * Return value of the useGhostGrid hook.
 */
export interface UseGhostGridReturn<T = unknown> {
  /** The framework-agnostic grid host */
  host: GridHost<T> | null
  /** Current grid state */
  state: RuntimeControllerState<T> | null
  /** Current grid nodes */
  nodes: readonly LayoutNode<T>[]
  /** Currently materialized nodes */
  materialized: MaterializedNode<T>[]
  /** Grid bounds */
  bounds: Rect | null
  /** Grid metrics */
  metrics: GridMetrics | null
  /** Whether grid is ready */
  isReady: boolean
  /** Underlying controller API */
  controller: ControllerAPI<T> | null
  /** Set container size (called by onLayout) */
  setContainerSize?: (size: { width: number; height: number }) => void
  /** Set viewport (called by onScroll) */
  setViewport?: (viewport: Rect) => void
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
 * Options for the useGhostGridDrag hook.
 */
export interface UseGhostGridDragOptions {
  /** Node id */
  nodeId: string
  /** Whether dragging is disabled for this node */
  disabled?: boolean
}

/**
 * Return value of the useGhostGridDrag hook.
 */
export interface UseGhostGridDragReturn {
  /** Whether this specific node is currently being dragged */
  isDragging: boolean
  /** The node id being dragged (null if not dragging) */
  draggedNodeId: string | null
  /** Start dragging the node from the given coordinates */
  startDrag: (clientX: number, clientY: number) => boolean
  /** Update the active drag to the given coordinates */
  updateDrag: (clientX: number, clientY: number) => void
  /** Commit the active drag */
  endDrag: () => void
  /** Cancel the active drag */
  cancelDrag: () => void
  /** Set the grid host (called by GhostGrid) */
  setHost: (host: GridHost | null) => void
  /** Set the container ref for coordinate transformation */
  setContainerRef: (
    ref: { current: { scrollLeft: number; scrollTop: number } | null } | null
  ) => void
}

/**
 * Context value shared by GhostGrid provider.
 */
export interface GhostGridContextValue<T = unknown> {
  /** The framework-agnostic grid host */
  host: GridHost<T> | null
  /** Current grid state */
  state: RuntimeControllerState<T> | null
  /** Currently materialized nodes */
  materialized: MaterializedNode<T>[]
  /** Grid bounds */
  bounds: Rect | null
  /** Grid metrics */
  metrics: GridMetrics | null
  /** Current viewport in pixels */
  viewport: Rect | null
  /** Container ref */
  containerRef: { current: LynxElement | null }
  /** Underlying controller API */
  controller: ControllerAPI<T> | null
  /** Set viewport callback */
  setViewport: (viewport: Rect) => void
}

/**
 * Ref object exposed via gridRef prop.
 */
export interface GhostGridRef<T = unknown> {
  /** Controller API */
  controller: ControllerAPI<T> | null
  /** Container ref */
  containerRef: { current: LynxElement | null }
  /** Grid metrics */
  metrics: GridMetrics | null
}

/**
 * Lynx element type (base type for all Lynx elements)
 */
export interface LynxElement {
  /** Element id */
  id?: string
  /** Scroll to position */
  scrollTo?(x: number, y: number): void
}

/**
 * Lynx ScrollView ref type
 */
export interface LynxScrollViewRef {
  scrollTo(x: number, y: number): void
}
