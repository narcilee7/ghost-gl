'use client'

import type { RuntimeController } from 'ghost-gl-core'
import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { GhostGridDndContextValue, GhostGridDndProviderProps } from '../types'
import { GhostGridContext } from './GhostGridContext'

/**
 * Context for drag and drop operations
 */
export const GhostGridDndContext = createContext<GhostGridDndContextValue | null>(null)

/**
 * Hook to access the DnD context
 */
export function useGhostGridDnd(): GhostGridDndContextValue {
  const context = useContext(GhostGridDndContext)

  if (context === null) {
    throw new Error('useGhostGridDnd must be used within a GhostGridDndProvider')
  }

  return context
}

/**
 * Provider for drag and drop functionality
 *
 * Can be used in two ways:
 * 1. Inside GhostGrid (automatically uses context):
 * ```tsx
 * <GhostGrid {...props}>
 *   <GhostGridDndProvider>
 *     <YourContent />
 *   </GhostGridDndProvider>
 * </GhostGrid>
 * ```
 *
 * 2. Outside GhostGrid (provide values via props):
 * ```tsx
 * <GhostGridDndProvider controller={controller} containerRef={containerRef} metrics={metrics}>
 *   <GhostGrid {...props} />
 * </GhostGridDndProvider>
 * ```
 */
export function GhostGridDndProvider(props: GhostGridDndProviderProps): React.JSX.Element {
  const {
    children,
    enabled = true,
    onDragStart,
    onDragEnd,
    controller: controllerProp,
    containerRef: containerRefProp,
    metrics: metricsProp,
  } = props

  // Try to get from context, fallback to props
  const context = useContext(GhostGridContext)
  const controller = (controllerProp ?? context?.controller) as RuntimeController<unknown> | null
  const containerRef = (containerRefProp ?? context?.containerRef) as RefObject<HTMLElement | null>
  const metrics = metricsProp ?? context?.metrics

  const [isDragging, setIsDragging] = useState(false)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)

  // Use refs to track dragging state so event handlers always see current values
  const isDraggingRef = useRef(false)
  const draggedNodeIdRef = useRef<string | null>(null)

  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  useEffect(() => {
    draggedNodeIdRef.current = draggedNodeId
  }, [draggedNodeId])

  // Refs for tracking drag state
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  const lastGridPos = useRef<{ x: number; y: number } | null>(null)

  // Ref for controller to avoid dependency issues
  const controllerRef = useRef(controller)
  useEffect(() => {
    controllerRef.current = controller
  }, [controller])

  // Refs to access latest values without triggering re-renders
  const containerRefRef = useRef(containerRef)
  const metricsRef = useRef(metrics)

  // Update refs when props/context change
  useEffect(() => {
    containerRefRef.current = containerRef
  }, [containerRef])

  useEffect(() => {
    metricsRef.current = metrics
  }, [metrics])

  // Calculate grid position from pointer coordinates
  const pointerToGrid = useCallback(
    (pointerX: number, pointerY: number): { x: number; y: number } | null => {
      const currentContainerRef = containerRefRef.current
      const currentMetrics = metricsRef.current

      if (!currentContainerRef?.current || !currentMetrics) return null

      const container = currentContainerRef.current
      const rect = container.getBoundingClientRect()
      const scrollLeft = container.scrollLeft
      const scrollTop = container.scrollTop

      // Calculate position relative to container content
      const relativeX = pointerX - rect.left + scrollLeft
      const relativeY = pointerY - rect.top + scrollTop

      // Convert to grid coordinates
      const {
        columnWidth,
        rowHeight,
        gapX = 0,
        gapY = 0,
        paddingLeft = 0,
        paddingTop = 0,
      } = currentMetrics

      const adjustedX = relativeX - paddingLeft
      const adjustedY = relativeY - paddingTop

      // Account for gaps in grid calculation
      const x = Math.floor((adjustedX + gapX / 2) / (columnWidth + gapX))
      const y = Math.floor((adjustedY + gapY / 2) / (rowHeight + gapY))

      return { x: Math.max(0, x), y: Math.max(0, y) }
    },
    []
  )

  const startDrag = useCallback(
    (nodeId: string, pointerX: number, pointerY: number) => {
      const currentController = controllerRef.current
      if (!enabled || !currentController) return

      const node = currentController.getNode(nodeId)
      if (!node || node.static) return

      // Get current grid position
      const gridPos = pointerToGrid(pointerX, pointerY)
      if (!gridPos) return

      // Store drag start info
      dragStartPos.current = { x: pointerX, y: pointerY }
      dragOffset.current = {
        x: gridPos.x - node.x,
        y: gridPos.y - node.y,
      }
      lastGridPos.current = { x: node.x, y: node.y }

      // Begin interaction in controller
      currentController.beginInteraction({
        id: `drag-${Date.now()}`,
        kind: 'drag',
        targetId: nodeId,
      })

      setDraggedNodeId(nodeId)
      setIsDragging(true)
      onDragStart?.(nodeId)
    },
    [enabled, pointerToGrid, onDragStart]
  )

  const updateDrag = useCallback(
    (pointerX: number, pointerY: number) => {
      const currentController = controllerRef.current
      if (!isDraggingRef.current || !currentController || !draggedNodeIdRef.current || !dragOffset.current) return

      const gridPos = pointerToGrid(pointerX, pointerY)
      if (!gridPos) return

      // Calculate new grid position with offset
      const newX = gridPos.x - dragOffset.current.x
      const newY = gridPos.y - dragOffset.current.y

      // Only update if position changed
      if (lastGridPos.current?.x !== newX || lastGridPos.current?.y !== newY) {
        lastGridPos.current = { x: newX, y: newY }

        // Preview the move operation
        currentController.previewInteraction([
          {
            id: draggedNodeIdRef.current,
            placement: { x: newX, y: newY },
            type: 'move',
          },
        ])
      }
    },
    // All mutable state accessed via refs; pointerToGrid is stable
    [pointerToGrid]
  )

  const endDrag = useCallback(() => {
    const currentController = controllerRef.current
    if (!isDraggingRef.current || !currentController) return

    // Commit the interaction
    currentController.commitInteraction()

    if (draggedNodeIdRef.current && lastGridPos.current) {
      onDragEnd?.(draggedNodeIdRef.current, lastGridPos.current.x, lastGridPos.current.y)
    }

    // Reset state
    setIsDragging(false)
    setDraggedNodeId(null)
    dragStartPos.current = null
    dragOffset.current = null
    lastGridPos.current = null
  }, [onDragEnd])

  const cancelDrag = useCallback(() => {
    const currentController = controllerRef.current
    if (!isDraggingRef.current || !currentController) return

    // Cancel the interaction
    currentController.cancelInteraction()

    // Reset state
    setIsDragging(false)
    setDraggedNodeId(null)
    dragStartPos.current = null
    dragOffset.current = null
    lastGridPos.current = null
  }, [])

  const value = useMemo<GhostGridDndContextValue>(
    () => ({
      isDragging,
      draggedNodeId,
      startDrag,
      updateDrag,
      endDrag,
      cancelDrag,
    }),
    [isDragging, draggedNodeId, startDrag, updateDrag, endDrag, cancelDrag]
  )

  return <GhostGridDndContext.Provider value={value}>{children}</GhostGridDndContext.Provider>
}
