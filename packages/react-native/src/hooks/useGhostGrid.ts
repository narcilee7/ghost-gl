import { createGridHost, type GridHost } from 'ghost-gl-adapter-core'
import type {
  GridMetrics,
  LayoutNode,
  MaterializedNode,
  Rect,
  RuntimeController,
  RuntimeControllerState,
} from 'ghost-gl-core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  UseGhostGridOptions,
  UseGhostGridReturn,
} from '../types'

/**
 * Hook for creating and managing a ghost-gl grid instance in React Native.
 *
 * This hook creates a framework-agnostic {@link GridHost} via
 * `ghost-gl-adapter-core` and wires it to a container for viewport tracking.
 */
export function useGhostGrid<T = unknown>(
  options: UseGhostGridOptions<T> = {}
): UseGhostGridReturn<T> {
  const {
    initialNodes = [],
    columns,
    rowHeight = 50,
    gapX = 0,
    gapY = 0,
    paddingLeft = 0,
    paddingTop = 0,
    policy,
    containerRef,
    overscan = 2,
    debounceMs = 16,
  } = options

  const hostRef = useRef<GridHost<T> | null>(null)
  const unmountingRef = useRef(false)

  const [state, setState] = useState<RuntimeControllerState<T> | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Store container size locally since RN doesn't have resize events
  const containerSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })

  // Initialize host once on mount
  useEffect(() => {
    unmountingRef.current = false

    const hostOptions: import('ghost-gl-adapter-core').GridHostOptions<T> = {
      debounceMs,
      gapX,
      gapY,
      initialNodes,
      overscan,
      paddingLeft,
      paddingTop,
      rowHeight,
    }

    if (columns !== undefined) {
      hostOptions.columns = columns
    }
    if (policy !== undefined) {
      hostOptions.policy = policy
    }

    const host = createGridHost<T>(hostOptions)

    hostRef.current = host

    const unsubscribe = host.subscribe((hostState) => {
      if (!unmountingRef.current) {
        setState(hostState.state)
      }
    })

    setState(host.state?.state ?? null)
    setIsReady(true)

    return () => {
      unmountingRef.current = true
      unsubscribe()
      host.dispose()
      hostRef.current = null
    }
  }, [])

  // Handle container layout changes
  // RN uses onLayout, so we expose a setContainerSize method
  const setContainerSize = useCallback((size: { width: number; height: number }) => {
    containerSizeRef.current = size
    hostRef.current?.setContainerSize(size)
  }, [])

  // Handle viewport updates from ScrollView
  const setViewport = useCallback((viewport: Rect) => {
    hostRef.current?.setViewport(viewport)
  }, [])

  const updateViewport = useCallback((viewport: Rect) => {
    hostRef.current?.setViewport(viewport)
  }, [])

  const moveNode = useCallback((id: string, x: number, y: number): boolean => {
    return hostRef.current?.moveNode(id, x, y) ?? false
  }, [])

  const resizeNode = useCallback((id: string, w: number, h: number): boolean => {
    return hostRef.current?.resizeNode(id, w, h) ?? false
  }, [])

  const undo = useCallback((): boolean => {
    return hostRef.current?.undo() ?? false
  }, [])

  const redo = useCallback((): boolean => {
    return hostRef.current?.redo() ?? false
  }, [])

  const metrics: GridMetrics | null = state?.metrics ?? null
  const materialized: MaterializedNode<T>[] = hostRef.current?.materialized ?? []

  return {
    host: hostRef.current,
    controller: hostRef.current?.controller ?? (null as RuntimeController<T> | null),
    state,
    nodes: state?.nodes ?? ([] as readonly LayoutNode<T>[]),
    materialized,
    bounds: state?.bounds ?? null,
    metrics,
    isReady,
    setContainerSize,
    setViewport,
    updateViewport,
    moveNode,
    resizeNode,
    undo,
    redo,
  }
}
