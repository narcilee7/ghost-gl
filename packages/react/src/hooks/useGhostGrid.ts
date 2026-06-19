'use client'

import { createGridHost, type GridHost } from 'ghost-gl-adapter-core'
import type {
  GridMetrics,
  MaterializedNode,
  Rect,
  RuntimeController,
  RuntimeControllerState,
} from 'ghost-gl-core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseGhostGridOptions, UseGhostGridReturn } from '../types'

/**
 * Hook for creating and managing a ghost-gl grid instance.
 *
 * This hook creates a framework-agnostic {@link GridHost} via
 * `ghost-gl-adapter-core` and wires it to a DOM container for viewport tracking.
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

  // Initialize host once on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally runs only once to initialize singleton host
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

  // Track container scroll/resize and feed viewport to the host
  useEffect(() => {
    if (!containerRef?.current || !hostRef.current) return

    const container = containerRef.current
    const host = hostRef.current

    const update = () => {
      const rect = container.getBoundingClientRect()
      host.setContainerSize({ width: rect.width, height: rect.height })
      host.setViewport({
        left: container.scrollLeft,
        top: container.scrollTop,
        width: rect.width,
        height: rect.height,
      })
    }

    update()

    container.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [containerRef])

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
    nodes: state?.nodes ?? [],
    materialized,
    bounds: state?.bounds ?? null,
    metrics,
    isReady,
    updateViewport,
    moveNode,
    resizeNode,
    undo,
    redo,
  }
}
