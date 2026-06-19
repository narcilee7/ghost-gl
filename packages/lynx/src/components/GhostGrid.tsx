import type { ScrollViewRef } from '@lynx-js/lynx-ui-scroll-view'
import { ScrollView } from '@lynx-js/lynx-ui-scroll-view'
import type { CSSProperties } from '@lynx-js/types'
import type { LayoutNode, MaterializedNode, Rect } from 'ghost-gl-core'
import React, { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { GhostGridProvider } from '../context/GhostGridContext'
import { useGhostGrid } from '../hooks/useGhostGrid'
import type { GhostGridContextValue, GhostGridItemRenderContext, GhostGridProps } from '../types'

/**
 * GhostGrid - High-performance virtualized grid layout component for Lynx
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
 *     <view style={{
 *       position: 'absolute',
 *       left: rect.left,
 *       top: rect.top,
 *       width: rect.width,
 *       height: rect.height,
 *     }}>
 *       {mode === 'live' ? <HeavyChart data={node.data} /> : <Skeleton />}
 *     </view>
 *   )}
 * />
 * ```
 */
export function GhostGrid<T = unknown>(props: GhostGridProps<T>): React.JSX.Element {
  const {
    initialNodes = [],
    columns = 12,
    rowHeight = 50,
    gapX = 0,
    gapY = 0,
    paddingLeft = 0,
    paddingTop = 0,
    policy,
    renderItem,
    style,
    width,
    height,
    overscan = 2,
    debounceMs = 16,
    children,
    onStateChange,
    onNodesChange,
  } = props

  // Scroll container ref for viewport tracking
  const scrollRef = useRef<ScrollViewRef | null>(null)
  const scrollOffsetRef = useRef({ scrollLeft: 0, scrollTop: 0 })

  // Initialize grid hook
  const grid = useGhostGrid<T>({
    initialNodes,
    columns,
    rowHeight,
    gapX,
    gapY,
    paddingLeft,
    paddingTop,
    ...(policy !== undefined ? { policy } : {}),
    overscan,
    debounceMs,
  })

  const {
    controller,
    state,
    materialized,
    bounds,
    metrics,
    setViewport: rawSetViewport,
    host,
  } = grid

  // Ensure setViewport is always available
  const setViewport = rawSetViewport ?? (() => {})

  // Handle layout to get container dimensions
  // Lynx uses onLayoutChange event - event.detail contains { id, width, height, ... }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback(
    (event: any) => {
      const { width: layoutWidth, height: layoutHeight } = event.detail ?? event
      grid.setContainerSize?.({ width: layoutWidth, height: layoutHeight })
    },
    [grid]
  )

  // Handle scroll events to update viewport
  // Lynx scroll event structure: { detail: { scrollTop, scrollLeft, scrollWidth, scrollHeight } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleScrollEvent = useCallback(
    (event: any) => {
      const detail = event.detail ?? event
      scrollOffsetRef.current = { scrollLeft: detail.scrollLeft, scrollTop: detail.scrollTop }

      setViewport({
        left: detail.scrollLeft,
        top: detail.scrollTop,
        width: detail.scrollWidth ?? 0,
        height: detail.scrollHeight ?? 0,
      })
    },
    [setViewport]
  )

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
  const containerStyle = useMemo((): CSSProperties => {
    const baseStyle: CSSProperties = {
      flex: 1,
      overflow: 'hidden',
    }

    if (width != null) {
      baseStyle.width = width as number
    }
    if (height != null) {
      baseStyle.height = height as number
    }

    return { ...baseStyle, ...style }
  }, [width, height, style])

  // Create context value
  const viewport = grid.host?.viewport ?? null
  const contextValue = useMemo<GhostGridContextValue<T>>(
    () => ({
      host: host as GhostGridContextValue<T>['host'],
      bounds,
      containerRef: scrollRef as unknown as { current: ScrollViewRef | null },
      controller: controller as GhostGridContextValue<T>['controller'],
      materialized: materialized as GhostGridContextValue<T>['materialized'],
      metrics,
      setViewport,
      state,
      viewport,
    }),
    [bounds, controller, host, materialized, metrics, setViewport, state, viewport]
  )

  // Calculate grid height for content
  const gridHeight = useMemo(() => {
    if (!bounds) return 0
    return bounds.height
  }, [bounds])

  // Lynx uses intrinsic JSX elements like <view>, <scroll-view>
  // The children are rendered directly inside the ScrollView
  // Note: Casting to any to work around Lynx type incompatibilities with React 19
  const scrollViewProps = {
    style: containerStyle,
    scrollOrientation: 'vertical',
    enableScroll: true,
    onLayoutChange: handleLayoutChange,
    onScroll: handleScrollEvent,
  } as any

  return (
    <GhostGridProvider value={contextValue}>
      <ScrollView {...scrollViewProps}>
        {/* Content container - Lynx uses intrinsic <view> element */}
        <view
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
              isResizing: false,
              mode,
              node: node as typeof node & { data: T },
              reason,
              rect,
            }

            return (
              <view
                key={id}
                style={{
                  height: rect.height,
                  left: rect.left,
                  position: 'absolute',
                  top: rect.top,
                  width: rect.width,
                }}
              >
                {renderItem(context)}
              </view>
            )
          })}
          {children}
        </view>
      </ScrollView>
    </GhostGridProvider>
  )
}

// Display name for debugging
GhostGrid.displayName = 'GhostGrid'
