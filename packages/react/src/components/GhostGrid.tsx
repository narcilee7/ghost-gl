'use client'

import type { Rect } from 'ghost-gl-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GhostGridProvider } from '../context/GhostGridContext'
import { GhostGridDndProvider } from '../context/GhostGridDndContext'
import { useGhostGrid } from '../hooks/useGhostGrid'
import type {
  GhostGridContextValue,
  GhostGridItemRenderContext,
  GhostGridProps,
  UseGhostGridOptions,
} from '../types'

/**
 * GhostGrid - High-performance virtualized grid layout component for React
 *
 * Features:
 * - Three-state materialization (ghost/shell/live) for heavy components
 * - Budget-driven rendering to maintain 60fps
 * - Virtualization with overscan
 * - Collision detection and auto-compact layout
 *
 * @example
 * ```tsx
 * <GhostGrid
 *   columns={12}
 *   rowHeight={50}
 *   initialNodes={[
 *     { id: '1', x: 0, y: 0, w: 4, h: 3, data: { title: 'Chart' } },
 *   ]}
 *   renderItem={({ node, rect, mode }) => (
 *     <div style={{
 *       position: 'absolute',
 *       left: rect.left,
 *       top: rect.top,
 *       width: rect.width,
 *       height: rect.height,
 *     }}>
 *       {mode === 'live' ? <HeavyChart data={node.data} /> : <Skeleton />}
 *     </div>
 *   )}
 * />
 * ```
 */
export function GhostGrid<TData = unknown, TSnapshot = unknown>(
  props: GhostGridProps<TData, TSnapshot>
): React.JSX.Element {
  const {
    initialNodes = [],
    columns: columnsProp,
    rowHeight = 50,
    gapX = 0,
    gapY = 0,
    paddingLeft = 0,
    paddingTop = 0,
    policy,
    renderItem,
    className,
    style,
    width: containerWidth,
    overscan = 2,
    children,
    onStateChange,
    onNodesChange,
    gridRef,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Rect | null>(null)

  // Default columns if not provided
  const columns = columnsProp ?? 12

  // Initialize grid hook with proper options type
  const gridOptions: UseGhostGridOptions<TData> = {
    containerRef,
    columns,
    debounceMs: 16,
    gapX,
    gapY,
    initialNodes,
    overscan,
    paddingLeft,
    paddingTop,
    rowHeight,
  }

  if (policy !== undefined) {
    gridOptions.policy = policy
  }

  const grid = useGhostGrid<TData>(gridOptions)

  const { controller, state, materialized, bounds, metrics, updateViewport } = grid

  // Track viewport changes
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    const calculateViewport = () => {
      const rect = container.getBoundingClientRect()
      const scrollLeft = container.scrollLeft
      const scrollTop = container.scrollTop

      const newViewport: Rect = {
        height: rect.height,
        left: scrollLeft,
        top: scrollTop,
        width: containerWidth ?? rect.width,
      }

      setViewport(newViewport)
      updateViewport(newViewport)
    }

    // Initial calculation
    calculateViewport()

    // Set up observers
    const handleScroll = () => {
      calculateViewport()
    }

    const handleResize = () => {
      calculateViewport()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [containerWidth, updateViewport])

  // Subscribe to state changes for callbacks
  useEffect(() => {
    if (!controller || (!onStateChange && !onNodesChange)) return

    const unsubscribeState = onStateChange
      ? controller.subscribe(onStateChange, { debounceMs: 16 })
      : () => {}

    const unsubscribeNodes = onNodesChange ? controller.on('nodes', onNodesChange) : () => {}

    // Push initial state immediately
    if (onStateChange) {
      onStateChange(controller.getState())
    }
    if (onNodesChange) {
      onNodesChange(controller.getState().nodes)
    }

    return () => {
      unsubscribeState()
      unsubscribeNodes()
    }
  }, [controller, onStateChange, onNodesChange])

  // Calculate container styles
  const containerStyle = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      height: bounds?.height ?? 'auto',
      overflow: 'auto',
      position: 'relative',
      width: containerWidth ?? '100%',
    }

    return { ...baseStyle, ...style }
  }, [bounds?.height, containerWidth, style])

  // Create context value
  const contextValue = useMemo<GhostGridContextValue<TData>>(
    () => ({
      bounds,
      containerRef,
      controller,
      materialized: materialized as GhostGridContextValue<TData>['materialized'],
      metrics,
      setViewport,
      state,
      viewport,
    }),
    [bounds, controller, materialized, metrics, state, viewport]
  )

  // Expose imperative API
  useEffect(() => {
    if (gridRef) {
      const refObject = gridRef as React.MutableRefObject<import('../types').GhostGridRef<TData> | null>
      refObject.current = {
        controller,
        containerRef,
        metrics,
      }
    }
  }, [gridRef, controller, metrics])

  // Calculate grid height
  const gridHeight = useMemo(() => {
    if (!bounds) return 0
    return bounds.height
  }, [bounds])

  return (
    <GhostGridProvider value={contextValue}>
      <GhostGridDndProvider>
        <div
          ref={containerRef}
          className={className}
          style={containerStyle}
          data-ghost-grid=""
          data-columns={columns}
        >
          {/* Grid content layer */}
          <div
            style={{
              height: gridHeight,
              position: 'relative',
              width: '100%',
            }}
          >
            {/* Render materialized nodes */}
            {materialized.map((item) => {
              const { id, rect, mode, reason } = item
              const node = state?.nodes.find((n) => n.id === id)

              if (!node) return null

              const context: GhostGridItemRenderContext<TData> = {
                isDragging: state?.interactionSession?.targetId === id,
                isResizing: false, // Will be updated when resize is implemented
                mode,
                node: node as typeof node & { data: TData },
                reason,
                rect,
              }

              return (
                <div
                  key={id}
                  data-ghost-id={id}
                  data-ghost-mode={mode}
                  style={{
                    height: rect.height,
                    left: rect.left + paddingLeft,
                    position: 'absolute',
                    top: rect.top + paddingTop,
                    width: rect.width,
                  }}
                >
                  {renderItem(context)}
                </div>
              )
            })}
          </div>

          {/* Additional children */}
          {children}
        </div>
      </GhostGridDndProvider>
    </GhostGridProvider>
  )
}

// Display name for debugging
GhostGrid.displayName = 'GhostGrid'
