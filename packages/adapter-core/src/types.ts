import type {
  GridMetrics,
  LayoutConstraints,
  LayoutNode,
  LayoutPolicy,
  MaterializationMode,
  MaterializedNode,
  Rect,
  RuntimeController,
  RuntimeControllerState,
} from 'ghost-gl-core'

/**
 * Options for creating a framework-agnostic grid host.
 */
export interface GridHostOptions<T = unknown> {
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
  /** Raw layout constraints passed to ghost-gl-core */
  constraints?: LayoutConstraints
  /** Overscan rows for virtualization */
  overscan?: number
  /** Debounce time in ms for state subscriptions */
  debounceMs?: number
}

/**
 * Calculated metrics input used to derive {@link GridMetrics}.
 */
export interface GridMetricsInput {
  /** Container width in pixels */
  containerWidth: number
  /** Number of columns */
  columns: number
  /** Row height in pixels */
  rowHeight: number
  /** Gap between columns in pixels */
  gapX?: number
  /** Gap between rows in pixels */
  gapY?: number
  /** Left padding in pixels */
  paddingLeft?: number
  /** Top padding in pixels */
  paddingTop?: number
}

/**
 * Platform-agnostic state exposed by a grid host.
 */
export interface GridHostState<T = unknown> {
  /** Current controller state */
  state: RuntimeControllerState<T>
  /** Currently materialized nodes */
  materialized: MaterializedNode<T>[]
  /** Whether the host has finished initial setup */
  isReady: boolean
}

/**
 * Platform-agnostic render context passed to adapter render functions.
 */
export interface GridItemRenderContext<T = unknown> {
  /** The layout node with its data */
  node: LayoutNode<T>
  /** The calculated rect in pixels */
  rect: Rect
  /** Current materialization mode */
  mode: MaterializationMode
  /** Reason for current mode */
  reason: MaterializedNode<T>['reason']
  /** Whether this item is currently being dragged */
  isDragging: boolean
  /** Whether this item is currently being resized */
  isResizing: boolean
}

/**
 * Subscription options for {@link GridHost.subscribe}.
 */
export interface GridHostSubscriptionOptions {
  /** Debounce time in ms (0 = no debounce) */
  debounceMs?: number
}

/**
 * A framework-agnostic bridge between a host framework and ghost-gl-core.
 */
export interface GridHost<T = unknown> {
  /** Underlying runtime controller */
  readonly controller: RuntimeController<T>
  /** Latest host state snapshot */
  readonly state: GridHostState<T> | null
  /** Currently materialized nodes */
  readonly materialized: MaterializedNode<T>[]
  /** Current grid metrics */
  readonly metrics: GridMetrics | null
  /** Current viewport in pixels */
  readonly viewport: Rect | null
  /** Whether the host is ready */
  readonly isReady: boolean

  /** Update the visible viewport in pixels (left/top are scroll offsets) */
  setViewport(
    viewport: Rect & {
      velocityX?: number
      velocityY?: number
    }
  ): void

  /** Update container size and recompute grid metrics */
  setContainerSize(size: { width: number; height: number }): void

  /** Move a node to a new grid position */
  moveNode(id: string, x: number, y: number): boolean

  /** Resize a node */
  resizeNode(id: string, w: number, h: number): boolean

  /** Undo the last operation */
  undo(): boolean

  /** Redo the last undone operation */
  redo(): boolean

  /** Begin dragging a node from the given pointer coordinates */
  beginDrag(input: { nodeId: string; pointerX: number; pointerY: number }): boolean

  /** Update the active drag to the given pointer coordinates */
  updateDrag(input: { pointerX: number; pointerY: number }): void

  /** Commit the active drag */
  endDrag(): void

  /** Cancel the active drag */
  cancelDrag(): void

  /** Subscribe to host state changes */
  subscribe(
    listener: (state: GridHostState<T>) => void,
    options?: GridHostSubscriptionOptions
  ): () => void

  /** Dispose the host and release resources */
  dispose(): void
}

/**
 * Internal mutable state used by the host implementation.
 *
 * @internal
 */
export interface GridHostInternalState<T = unknown> {
  controller: RuntimeController<T>
  state: GridHostState<T> | null
  viewport: Rect | null
  metrics: GridMetrics | null
  containerWidth: number
  isReady: boolean
  drag: DragState | null
  listeners: Map<(state: GridHostState<T>) => void, GridHostSubscriptionOptions>
  debounceTimers: Map<(state: GridHostState<T>) => void, ReturnType<typeof setTimeout>>
  unsubscribeController: (() => void) | null
}

/**
 * Drag interaction state tracked by the host.
 *
 * @internal
 */
export interface DragState {
  nodeId: string
  offsetX: number
  offsetY: number
  lastGridX: number
  lastGridY: number
}
