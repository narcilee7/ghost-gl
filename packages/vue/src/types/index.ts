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
import type { ComputedRef, InjectionKey, Ref, ShallowRef, VNodeChild } from 'vue'

/**
 * Render context passed to the default slot / renderItem function.
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
 * Props for the GhostGridItem component.
 */
export interface GhostGridItemRenderProps<T = unknown> {
  /** The materialized node to render */
  materializedNode: MaterializedNode<T>
  /** Render function */
  renderItem: (context: GhostGridItemRenderContext<T>) => VNodeChild
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
  /** Container width in pixels (defaults to 100%) */
  width?: number
  /** Overscan rows for virtualization */
  overscan?: number
  /** Debounce ms for state updates */
  debounceMs?: number
  /** Optional class for the container */
  class?: string
  /** Optional inline styles for the container */
  style?: Record<string, string | number>
  /** Render function for each grid item (alternatively use the default slot) */
  renderItem?: (context: GhostGridItemRenderContext<T>) => VNodeChild
  /** Callback when grid state changes */
  onStateChange?: (state: RuntimeControllerState<T>) => void
  /** Callback when nodes change */
  onNodesChange?: (nodes: readonly LayoutNode<T>[]) => void
}

/**
 * Return value of the useGhostGrid composable.
 */
export interface UseGhostGridReturn<T = unknown> {
  /** The framework-agnostic grid host */
  host: ShallowRef<GridHost<T> | null>
  /** The runtime controller instance */
  controller: ComputedRef<ControllerAPI<T> | null>
  /** Current grid state */
  state: ShallowRef<RuntimeControllerState<T> | null>
  /** Currently visible/layout nodes */
  nodes: ComputedRef<readonly LayoutNode<T>[]>
  /** Currently materialized nodes */
  materialized: ComputedRef<MaterializedNode<T>[]>
  /** Grid bounds */
  bounds: Ref<Rect | null>
  /** Grid metrics */
  metrics: Ref<GridMetrics | null>
  /** Whether grid is ready */
  isReady: Ref<boolean>
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
 * Options for the useGhostGrid composable.
 */
export interface UseGhostGridOptions<T = unknown> {
  /** Initial nodes */
  initialNodes?: readonly LayoutNode<T>[]
  /** Container element ref */
  containerRef?: Ref<HTMLElement | null>
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
  /** Overscan for virtualization */
  overscan?: number
  /** Debounce ms for state updates */
  debounceMs?: number
}

/**
 * Props for the GhostGridSkeleton component.
 */
export interface GhostGridSkeletonProps {
  /** Width of the skeleton (defaults to 100%) */
  width?: number | string
  /** Height of the skeleton (defaults to 100%) */
  height?: number | string
  /** Animation style */
  animation?: 'pulse' | 'wave' | 'none'
  /** Custom class */
  class?: string
  /** Border radius */
  borderRadius?: number | string
  /** Background color */
  backgroundColor?: string
  /** Highlight color for wave animation */
  highlightColor?: string
}

/**
 * Options for the useGhostGridDrag composable.
 */
export interface UseGhostGridDragOptions {
  /** Node id */
  nodeId: string
  /** Whether dragging is disabled for this node */
  disabled?: boolean
}

/**
 * Return value of useGhostGridDrag composable.
 */
export interface UseGhostGridDragReturn {
  /** Whether this node is currently being dragged */
  isDragging: ComputedRef<boolean>
  /** Drag handlers to attach to the element */
  handlers: {
    onPointerDown: (event: PointerEvent) => void
    onPointerMove: (event: PointerEvent) => void
    onPointerUp: (event: PointerEvent) => void
  }
}

/**
 * Context value provided by GhostGrid.
 */
export interface GhostGridContextValue<T = unknown> {
  /** The grid host */
  host: GridHost<T> | null
  /** Current state */
  state: RuntimeControllerState<T> | null
  /** Current materialized nodes */
  materialized: MaterializedNode<T>[]
  /** Grid metrics */
  metrics: GridMetrics | null
  /** Current viewport */
  viewport: Rect | null
}

/**
 * Injection key for the GhostGrid context.
 */
export const GhostGridKey: InjectionKey<GhostGridContextValue<unknown>> = Symbol('ghost-gl-vue')
