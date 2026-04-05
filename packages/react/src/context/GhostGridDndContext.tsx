'use client'

import type { RuntimeController } from 'ghost-gl-core'
import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
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

  // Refs for tracking drag state
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  const lastGridPos = useRef<{ x: number; y: number } | null>(null)

  // Calculate grid position from pointer coordinates
  const pointerToGrid = useCallback(
    (pointerX: number, pointerY: number): { x: number; y: number } | null => {
      if (!containerRef?.current || !metrics) return null

      const container = containerRef.current
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
      } = metrics

      const adjustedX = relativeX - paddingLeft
      const adjustedY = relativeY - paddingTop

      // Account for gaps in grid calculation
      const x = Math.floor((adjustedX + gapX / 2) / (columnWidth + gapX))
      const y = Math.floor((adjustedY + gapY / 2) / (rowHeight + gapY))

      return { x: Math.max(0, x), y: Math.max(0, y) }
    },
    [containerRef, metrics]
  )

  const startDrag = useCallback(
    (nodeId: string, pointerX: number, pointerY: number) => {
      if (!enabled || !controller) return

      const node = controller.getNode(nodeId)
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
      controller.beginInteraction({
        id: `drag-${Date.now()}`,
        kind: 'drag',
        targetId: nodeId,
      })

      setDraggedNodeId(nodeId)
      setIsDragging(true)
      onDragStart?.(nodeId)
    },
    [enabled, controller, pointerToGrid, onDragStart]
  )

  const updateDrag = useCallback(
    (pointerX: number, pointerY: number) => {
      if (!isDragging || !controller || !draggedNodeId || !dragOffset.current) return

      const gridPos = pointerToGrid(pointerX, pointerY)
      if (!gridPos) return

      // Calculate new grid position with offset
      const newX = gridPos.x - dragOffset.current.x
      const newY = gridPos.y - dragOffset.current.y

      // Only update if position changed
      if (lastGridPos.current?.x !== newX || lastGridPos.current?.y !== newY) {
        lastGridPos.current = { x: newX, y: newY }

        // Preview the move operation
        controller.previewInteraction([
          {
            id: draggedNodeId,
            placement: { x: newX, y: newY },
            type: 'move',
          },
        ])
      }
    },
    // dragOffset is accessed via ref.current, not a reactive dependency
    [isDragging, controller, draggedNodeId, pointerToGrid]
  )

  const endDrag = useCallback(() => {
    if (!isDragging || !controller) return

    // Commit the interaction
    controller.commitInteraction()

    if (draggedNodeId && lastGridPos.current) {
      onDragEnd?.(draggedNodeId, lastGridPos.current.x, lastGridPos.current.y)
    }

    // Reset state
    setIsDragging(false)
    setDraggedNodeId(null)
    dragStartPos.current = null
    dragOffset.current = null
    lastGridPos.current = null
  }, [isDragging, controller, draggedNodeId, onDragEnd])

  const cancelDrag = useCallback(() => {
    if (!isDragging || !controller) return

    // Cancel the interaction
    controller.cancelInteraction()

    // Reset state
    setIsDragging(false)
    setDraggedNodeId(null)
    dragStartPos.current = null
    dragOffset.current = null
    lastGridPos.current = null
  }, [isDragging, controller])

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
