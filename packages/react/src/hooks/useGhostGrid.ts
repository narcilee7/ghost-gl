'use client'

import {
  type GridMetrics,
  type LayoutConstraints,
  type LayoutNode,
  LayoutRuntime,
  type MaterializedNode,
  type Rect,
  RuntimeController,
  type RuntimeControllerState,
} from 'ghost-gl-core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UseGhostGridOptions, UseGhostGridReturn } from '../types'

/**
 * Hook for creating and managing a ghost-gl grid instance
 *
 * This hook creates a LayoutRuntime and RuntimeController, manages viewport
 * tracking, and provides methods for interacting with the grid.
 *
 * @example
 * ```tsx
 * function MyGrid() {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *   const grid = useGhostGrid({
 *     containerRef,
 *     columns: 12,
 *     rowHeight: 50,
 *     initialNodes: [
 *       { id: '1', x: 0, y: 0, w: 4, h: 3 },
 *     ],
 *   })
 *
 *   return (
 *     <div ref={containerRef}>
 *       {grid.materialized.map(node => (
 *         <div key={node.id} style={{
 *           position: 'absolute',
 *           left: node.rect.left,
 *           top: node.rect.top,
 *           width: node.rect.width,
 *           height: node.rect.height,
 *         }}>
 *           Content
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useGhostGrid<TData = unknown>(
  options: UseGhostGridOptions<TData> = {}
): UseGhostGridReturn<TData> {
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

  // Refs for mutable values
  const runtimeRef = useRef<LayoutRuntime<TData> | null>(null)
  const controllerRef = useRef<RuntimeController<TData> | null>(null)
  const unmountingRef = useRef(false)
  const viewportRef = useRef<Rect | null>(null)

  // State
  const [state, setState] = useState<RuntimeControllerState<TData> | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [materialized, setMaterialized] = useState<MaterializedNode<TData>[]>([])
  const [containerWidth, setContainerWidth] = useState(0)

  // Memoize metrics
  const metrics: GridMetrics = useMemo(
    () => {
      // If we don't have containerWidth yet, fallback to percentage approximation
      // This happens on initial render before resize observer fires
      const cols = columns || 12
      const availableWidth = containerWidth > 0 
        ? containerWidth - paddingLeft * 2 - (cols - 1) * gapX
        : 0
      
      const columnWidth = containerWidth > 0 
        ? availableWidth / cols 
        : 100 / cols
        
      return {
        columnWidth,
        rowHeight,
        gapX,
        gapY,
        paddingLeft,
        paddingTop,
      }
    },
    [columns, rowHeight, gapX, gapY, paddingLeft, paddingTop, containerWidth]
  )

  // Update controller metrics when metrics change
  useEffect(() => {
    if (controllerRef.current && isReady) {
      controllerRef.current.setMetrics(metrics)
      
      // Also trigger a re-materialization plan with new bounds
      if (viewportRef.current) {
        const plan = controllerRef.current.planMaterialization({
          left: viewportRef.current.left,
          top: viewportRef.current.top,
          width: viewportRef.current.width,
          height: viewportRef.current.height,
          overscanY: overscan,
        })
        setMaterialized(plan.materialized)
      }
    }
  }, [metrics, isReady, overscan])

  // Memoize constraints
  const constraints: LayoutConstraints | undefined = useMemo(() => {
    if (columns === undefined && policy === undefined) return undefined
    return {
      columns,
      policy,
    } as LayoutConstraints
  }, [columns, policy])

  // Initialize runtime and controller
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally runs only once on mount to initialize singleton controller
  useEffect(() => {
    // Reset unmounting ref in case of Strict Mode double mount
    unmountingRef.current = false

    // Create layout options
    const layoutOptions: {
      constraints?: LayoutConstraints
      metrics: GridMetrics
      nodes?: readonly LayoutNode<TData>[]
    } = {
      metrics,
      nodes: initialNodes,
    }

    if (constraints !== undefined) {
      layoutOptions.constraints = constraints
    }

    // Create runtime and controller
    runtimeRef.current = new LayoutRuntime(layoutOptions)
    controllerRef.current = new RuntimeController(layoutOptions)

    // Subscribe to state changes
    const unsubscribe = controllerRef.current.subscribe(
      (newState) => {
        if (!unmountingRef.current) {
          setState(newState)
        }
      },
      { debounceMs }
    )

    // Set initial state
    setState(controllerRef.current.getState())
    setIsReady(true)

    return () => {
      unmountingRef.current = true
      unsubscribe()
      // Runtime doesn't have dispose method
      controllerRef.current = null
      runtimeRef.current = null
    }
  }, []) // Only run once on mount

  // Update materialized nodes when viewport changes
  const updateViewport = useCallback(
    (viewport: Rect) => {
      if (!controllerRef.current) return

      viewportRef.current = viewport

      const plan = controllerRef.current.planMaterialization({
        left: viewport.left,
        top: viewport.top,
        width: viewport.width,
        height: viewport.height,
        overscanY: overscan,
      })

      setMaterialized(plan.materialized)
    },
    [overscan]
  )

  // Set up scroll/resize observers if containerRef is provided
  useEffect(() => {
    if (!containerRef?.current || !controllerRef.current) return

    const container = containerRef.current

    const handleScrollOrResize = () => {
      const rect = container.getBoundingClientRect()
      updateViewport({
        left: container.scrollLeft,
        top: container.scrollTop,
        width: rect.width,
        height: rect.height,
      })
      setContainerWidth((prev) => (prev !== rect.width ? rect.width : prev))
    }

    // Initial viewport calculation
    handleScrollOrResize()

    // Listen for scroll and resize
    container.addEventListener('scroll', handleScrollOrResize, { passive: true })
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      container.removeEventListener('scroll', handleScrollOrResize)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [containerRef, updateViewport])

  // Grid operations
  const moveNode = useCallback((id: string, x: number, y: number): boolean => {
    return controllerRef.current?.moveNode(id, x, y) ?? false
  }, [])

  const resizeNode = useCallback((id: string, w: number, h: number): boolean => {
    return controllerRef.current?.resizeNode(id, w, h) ?? false
  }, [])

  const undo = useCallback((): boolean => {
    return controllerRef.current?.undo() ?? false
  }, [])

  const redo = useCallback((): boolean => {
    return controllerRef.current?.redo() ?? false
  }, [])

  return {
    controller: controllerRef.current,
    state,
    nodes: state?.nodes ?? [],
    materialized,
    bounds: state?.bounds ?? null,
    metrics: state?.metrics ?? null,
    isReady,
    updateViewport,
    moveNode,
    resizeNode,
    undo,
    redo,
  }
}
