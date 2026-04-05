'use client'

import { useCallback, useMemo } from 'react'
import { useGhostGridDnd } from '../context/GhostGridDndContext'
import type { UseGhostGridDragOptions, UseGhostGridDragReturn } from '../types'

/**
 * Hook for making an element draggable within a GhostGrid
 *
 * @example
 * ```tsx
 * function GridItem({ nodeId, children }) {
 *   const { isDragging, handlers } = useGhostGridDrag({ nodeId })
 *
 *   return (
 *     <div
 *       {...handlers}
 *       style={{
 *         opacity: isDragging ? 0.5 : 1,
 *         cursor: isDragging ? 'grabbing' : 'grab',
 *       }}
 *     >
 *       {children}
 *     </div>
 *   )
 * }
 * ```
 */
export function useGhostGridDrag(options: UseGhostGridDragOptions): UseGhostGridDragReturn {
  const { nodeId, disabled = false } = options
  const dnd = useGhostGridDnd()

  const isDragging = dnd.isDragging && dnd.draggedNodeId === nodeId

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return

      // Only left mouse button
      if (e.button !== 0) return

      // Capture pointer
      e.currentTarget.setPointerCapture(e.pointerId)

      // Start drag
      dnd.startDrag(nodeId, e.clientX, e.clientY)
    },
    [disabled, nodeId, dnd]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || disabled) return

      dnd.updateDrag(e.clientX, e.clientY)
    },
    [isDragging, disabled, dnd]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return

      // Release pointer
      e.currentTarget.releasePointerCapture(e.pointerId)

      // End drag
      dnd.endDrag()
    },
    [isDragging, dnd]
  )

  const handlers = useMemo(
    () => ({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    }),
    [handlePointerDown, handlePointerMove, handlePointerUp]
  )

  return {
    isDragging,
    handlers,
  }
}
