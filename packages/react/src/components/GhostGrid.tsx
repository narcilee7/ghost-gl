'use client'

import type { Rect } from 'ghost-gl-core'
import { useEffect, useMemo, useRef } from 'react'
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
export function GhostGrid<T = unknown, TSnapshot = unknown>(
  props: GhostGridProps<T, TSnapshot>
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

  // Default columns if not provided
  const columns = columnsProp ?? 12

  // Initialize grid hook with proper options type
  const gridOptions: UseGhostGridOptions<T> = {
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

  const grid = useGhostGrid<T>(gridOptions)

  const { controller, state, materialized, bounds, metrics } = grid

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
  const viewport = grid.host?.viewport ?? null
  const contextValue = useMemo<GhostGridContextValue<T>>(
    () => ({
      host: grid.host,
      bounds,
      containerRef,
      controller,
      materialized: materialized as GhostGridContextValue<T>['materialized'],
      metrics,
      setViewport: (next: Rect) => grid.host?.setViewport(next),
      state,
      viewport,
    }),
    [bounds, controller, grid.host, materialized, metrics, state, viewport]
  )

  // Expose imperative API
  useEffect(() => {
    if (gridRef) {
      const refObject = gridRef as React.MutableRefObject<import('../types').GhostGridRef<T> | null>
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

              const context: GhostGridItemRenderContext<T> = {
                isDragging: state?.interactionSession?.targetId === id,
                isResizing: false, // Will be updated when resize is implemented
                mode,
                node: node as typeof node & { data: T },
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
                    left: rect.left,
                    position: 'absolute',
                    top: rect.top,
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
