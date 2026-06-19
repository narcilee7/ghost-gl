import {
  type LayoutConstraints,
  type LayoutRuntimeOptions,
  type Rect,
  RuntimeController,
  type RuntimeControllerState,
} from 'ghost-gl-core'
import { createGridMetrics, pointerToGrid } from './metrics'
import type {
  DragState,
  GridHost,
  GridHostInternalState,
  GridHostOptions,
  GridHostState,
  GridHostSubscriptionOptions,
} from './types'

/**
 * Create a framework-agnostic grid host that manages the ghost-gl-core runtime,
 * viewport materialization, and drag/resize interactions.
 */
export function createGridHost<T = unknown>(options: GridHostOptions<T> = {}): GridHost<T> {
  const columns = options.columns ?? 12
  const rowHeight = options.rowHeight ?? 50
  const gapX = options.gapX ?? 0
  const gapY = options.gapY ?? 0
  const paddingLeft = options.paddingLeft ?? 0
  const paddingTop = options.paddingTop ?? 0
  const overscan = options.overscan ?? 2

  const initialMetrics = createGridMetrics({
    containerWidth: 0,
    columns,
    gapX,
    gapY,
    paddingLeft,
    paddingTop,
    rowHeight,
  })

  const layoutOptions: LayoutRuntimeOptions<T> = {
    metrics: initialMetrics,
  }

  if (options.initialNodes !== undefined) {
    layoutOptions.nodes = options.initialNodes
  }
  if (options.policy !== undefined) {
    layoutOptions.policy = options.policy
  }

  const constraints: LayoutConstraints | undefined =
    options.constraints ??
    (options.columns !== undefined ? { columns: options.columns } : undefined)

  if (constraints !== undefined) {
    layoutOptions.constraints = constraints
  }

  const controller = new RuntimeController(layoutOptions)

  const internal: GridHostInternalState<T> = {
    controller,
    drag: null,
    isReady: false,
    listeners: new Map(),
    debounceTimers: new Map(),
    metrics: initialMetrics,
    state: null,
    unsubscribeController: null,
    viewport: null,
    containerWidth: 0,
  }

  internal.unsubscribeController = controller.subscribe(
    (newState) => {
      updateStateFromController(internal, newState, overscan)
    },
    { debounceMs: 0 }
  )

  // Set initial state and mark ready
  updateStateFromController(internal, controller.getState(), overscan)
  internal.isReady = true

  return {
    get controller() {
      return internal.controller
    },
    get state() {
      return internal.state
    },
    get materialized() {
      return internal.state?.materialized ?? []
    },
    get metrics() {
      return internal.metrics
    },
    get viewport() {
      return internal.viewport
    },
    get isReady() {
      return internal.isReady
    },
    setViewport(viewport) {
      setViewport(internal, viewport, overscan)
    },
    setContainerSize(size) {
      setContainerSize(internal, size, {
        columns,
        gapX,
        gapY,
        paddingLeft,
        paddingTop,
        rowHeight,
      })
    },
    moveNode(id, x, y) {
      return internal.controller.moveNode(id, x, y)
    },
    resizeNode(id, w, h) {
      return internal.controller.resizeNode(id, w, h)
    },
    undo() {
      return internal.controller.undo()
    },
    redo() {
      return internal.controller.redo()
    },
    beginDrag(input) {
      return beginDrag(internal, input)
    },
    updateDrag(input) {
      updateDrag(internal, input)
    },
    endDrag() {
      endDrag(internal)
    },
    cancelDrag() {
      cancelDrag(internal)
    },
    subscribe(listener, subscriptionOptions) {
      return subscribe(internal, listener, subscriptionOptions ?? {})
    },
    dispose() {
      dispose(internal)
    },
  }
}

interface ContainerSizeOptions {
  columns: number
  rowHeight: number
  gapX: number
  gapY: number
  paddingLeft: number
  paddingTop: number
}

function setViewport<T>(
  internal: GridHostInternalState<T>,
  viewport: Rect & { velocityX?: number; velocityY?: number },
  overscan: number
): void {
  internal.viewport = viewport

  if (!internal.isReady) return

  const planInput: Parameters<RuntimeController<T>['planMaterialization']>[0] = {
    left: viewport.left,
    top: viewport.top,
    width: viewport.width,
    height: viewport.height,
    overscanY: overscan,
  }

  if (viewport.velocityX !== undefined) {
    planInput.velocityX = viewport.velocityX
  }
  if (viewport.velocityY !== undefined) {
    planInput.velocityY = viewport.velocityY
  }

  const plan = internal.controller.planMaterialization(planInput)

  const hostState: GridHostState<T> = {
    isReady: internal.isReady,
    materialized: plan.materialized,
    state: internal.controller.getState(),
  }

  internal.state = hostState
  notifyListeners(internal, hostState)
}

function setContainerSize<T>(
  internal: GridHostInternalState<T>,
  size: { width: number; height: number },
  options: ContainerSizeOptions
): void {
  if (internal.containerWidth === size.width) return

  internal.containerWidth = size.width
  const metrics = createGridMetrics({
    containerWidth: size.width,
    columns: options.columns,
    gapX: options.gapX,
    gapY: options.gapY,
    paddingLeft: options.paddingLeft,
    paddingTop: options.paddingTop,
    rowHeight: options.rowHeight,
  })

  internal.metrics = metrics
  internal.controller.setMetrics(metrics)
}

function updateStateFromController<T>(
  internal: GridHostInternalState<T>,
  controllerState: RuntimeControllerState<T>,
  overscan: number
): void {
  const materialized =
    internal.viewport != null
      ? internal.controller.planMaterialization({
          left: internal.viewport.left,
          top: internal.viewport.top,
          width: internal.viewport.width,
          height: internal.viewport.height,
          overscanY: overscan,
        }).materialized
      : []

  const hostState: GridHostState<T> = {
    isReady: internal.isReady,
    materialized,
    state: controllerState,
  }

  internal.state = hostState
  notifyListeners(internal, hostState)
}

function beginDrag<T>(
  internal: GridHostInternalState<T>,
  input: { nodeId: string; pointerX: number; pointerY: number }
): boolean {
  const metrics = internal.metrics
  if (metrics == null) return false

  const node = internal.controller.getNode(input.nodeId)
  if (node == null || node.static) return false

  const gridPos = pointerToGrid({ x: input.pointerX, y: input.pointerY }, metrics)

  const drag: DragState = {
    nodeId: input.nodeId,
    offsetX: gridPos.x - node.x,
    offsetY: gridPos.y - node.y,
    lastGridX: node.x,
    lastGridY: node.y,
  }

  internal.drag = drag

  internal.controller.beginInteraction({
    id: `drag-${Date.now()}`,
    kind: 'drag',
    targetId: input.nodeId,
  })

  return true
}

function updateDrag<T>(
  internal: GridHostInternalState<T>,
  input: { pointerX: number; pointerY: number }
): void {
  const drag = internal.drag
  const metrics = internal.metrics

  if (drag == null || metrics == null) return

  const gridPos = pointerToGrid({ x: input.pointerX, y: input.pointerY }, metrics)
  const newX = gridPos.x - drag.offsetX
  const newY = gridPos.y - drag.offsetY

  if (newX === drag.lastGridX && newY === drag.lastGridY) return

  drag.lastGridX = newX
  drag.lastGridY = newY

  internal.controller.previewInteraction([
    {
      id: drag.nodeId,
      placement: { x: newX, y: newY },
      type: 'move',
    },
  ])
}

function endDrag<T>(internal: GridHostInternalState<T>): void {
  if (internal.drag == null) return

  internal.controller.commitInteraction()
  internal.drag = null
}

function cancelDrag<T>(internal: GridHostInternalState<T>): void {
  if (internal.drag == null) return

  internal.controller.cancelInteraction()
  internal.drag = null
}

function subscribe<T>(
  internal: GridHostInternalState<T>,
  listener: (state: GridHostState<T>) => void,
  options: GridHostSubscriptionOptions
): () => void {
  internal.listeners.set(listener, options)

  // Push initial state
  if (internal.state != null) {
    const debounceMs = options.debounceMs ?? 0
    if (debounceMs > 0) {
      const timer = setTimeout(() => listener(internal.state as GridHostState<T>), debounceMs)
      internal.debounceTimers.set(listener, timer)
    } else {
      listener(internal.state)
    }
  }

  return () => {
    internal.listeners.delete(listener)
    const timer = internal.debounceTimers.get(listener)
    if (timer !== undefined) {
      clearTimeout(timer)
      internal.debounceTimers.delete(listener)
    }
  }
}

function notifyListeners<T>(internal: GridHostInternalState<T>, state: GridHostState<T>): void {
  for (const [listener, options] of internal.listeners) {
    const debounceMs = options.debounceMs ?? 0

    const existingTimer = internal.debounceTimers.get(listener)
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer)
    }

    if (debounceMs > 0) {
      const timer = setTimeout(() => listener(state), debounceMs)
      internal.debounceTimers.set(listener, timer)
    } else {
      listener(state)
    }
  }
}

function dispose<T>(internal: GridHostInternalState<T>): void {
  internal.unsubscribeController?.()
  internal.unsubscribeController = null

  for (const timer of internal.debounceTimers.values()) {
    clearTimeout(timer)
  }
  internal.debounceTimers.clear()
  internal.listeners.clear()
  internal.drag = null
}
