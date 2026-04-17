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

      // Capture pointer so pointermove/up continue even if cursor leaves element
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId)
      }

      // Start drag
      dnd.startDrag(nodeId, e.clientX, e.clientY)
    },
    [disabled, nodeId, dnd]
  )

  // Always forward move/up to DnD context; it guards via internal refs.
  // This avoids React's stale-closure trap where isDragging is still false
  // immediately after pointerDown.
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      dnd.updateDrag(e.clientX, e.clientY)
    },
    [disabled, dnd]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (typeof e.currentTarget.releasePointerCapture === 'function') {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      dnd.endDrag()
    },
    [dnd]
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
