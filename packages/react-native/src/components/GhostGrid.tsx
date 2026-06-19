import type { LayoutNode, MaterializedNode, Rect, RuntimeControllerState } from 'ghost-gl-core'
import React, { useCallback, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { ScrollView, View, type ViewStyle } from 'react-native'
import { GhostGridProvider } from '../context/GhostGridContext'
import { useGhostGrid } from '../hooks/useGhostGrid'
import type { GhostGridContextValue, GhostGridItemRenderContext, GhostGridProps } from '../types'

/**
 * GhostGrid - High-performance virtualized grid layout component for React Native
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
 *     <View style={{
 *       position: 'absolute',
 *       left: rect.left,
 *       top: rect.top,
 *       width: rect.width,
 *       height: rect.height,
 *     }}>
 *       {mode === 'live' ? <HeavyChart data={node.data} /> : <Skeleton />}
 *     </View>
 *   )}
 * />
 * ```
 */
export function GhostGrid<T = unknown>(
  props: GhostGridProps<T>
): React.JSX.Element {
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
  const scrollRef = useRef<ScrollView>(null)
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

  const { controller, state, materialized, bounds, metrics, setViewport: rawSetViewport, host } = grid

  // Ensure setViewport is always available
  const setViewport = rawSetViewport ?? (() => {})

  // Handle layout to get container dimensions
  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout
    grid.setContainerSize?.({ width: layoutWidth, height: layoutHeight })
  }, [grid])

  // Handle scroll events to update viewport
  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number; y: number }; layoutMeasurement: { width: number; height: number } } }) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent
    scrollOffsetRef.current = { scrollLeft: contentOffset.x, scrollTop: contentOffset.y }

    setViewport({
      left: contentOffset.x,
      top: contentOffset.y,
      width: layoutMeasurement.width,
      height: layoutMeasurement.height,
    })
  }, [setViewport])

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
  const containerStyle = useMemo((): ViewStyle => {
    const baseStyle: ViewStyle = {
      flex: 1,
      overflow: 'hidden',
    }

    if (width != null) {
      baseStyle.width = width
    }
    if (height != null) {
      baseStyle.height = height
    }

    return { ...baseStyle, ...(style as ViewStyle) }
  }, [width, height, style])

  // Create context value
  const viewport = grid.host?.viewport ?? null
  const contextValue = useMemo<GhostGridContextValue<T>>(
    () => ({
      host: host as GhostGridContextValue<T>['host'],
      bounds,
      containerRef: scrollRef as unknown as RefObject<View | null>,
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

  // Render context for each item
  const renderContext = useCallback((item: MaterializedNode<T>): GhostGridItemRenderContext<T> => {
    const node = state?.nodes.find((n) => n.id === item.id)
    return {
      isDragging: state?.interactionSession?.targetId === item.id,
      isResizing: false,
      mode: item.mode,
      node: (node ?? item.node) as LayoutNode<T>,
      reason: item.reason,
      rect: item.rect,
    }
  }, [state])

  return (
    <GhostGridProvider value={contextValue}>
      <ScrollView
        ref={scrollRef as unknown as React.RefObject<ScrollView>}
        style={containerStyle}
        contentContainerStyle={{
          height: gridHeight,
          position: 'relative',
          width: '100%',
        }}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
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
            <View
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
            </View>
          )
        })}
        {children}
      </ScrollView>
    </GhostGridProvider>
  )
}

// Display name for debugging
GhostGrid.displayName = 'GhostGrid'
