import type { GridHost } from 'ghost-gl-adapter-core'
import { useCallback, useRef } from 'react'
import type { UseGhostGridDragOptions } from '../types'

/**
 * Hook for drag interactions in React Native.
 *
 * @example
 * ```tsx
 * const { startDrag, updateDrag, endDrag, cancelDrag, isDragging, draggedNodeId } = useGhostGridDrag({
 *   nodeId: 'item-1',
 * })
 *
 * <TouchableOpacity onPress={() => startDrag(event.nativeEvent.locationX, event.nativeEvent.locationY)}>
 * ```
 */
export function useGhostGridDrag(options: UseGhostGridDragOptions): UseGhostGridDragReturn {
  const { nodeId, disabled = false } = options

  // Use refs to track dragging state so event handlers always see current values
  const isDraggingRef = useRef(false)
  const hostRef = useRef<GridHost | null>(null)
  const containerRef = useRef<{ current: { scrollLeft: number; scrollTop: number } | null }>({
    current: null,
  })

  const setHost = useCallback((host: GridHost | null) => {
    hostRef.current = host
  }, [])

  const setContainerRef = useCallback(
    (ref: { current: { scrollLeft: number; scrollTop: number } | null } | null) => {
      containerRef.current = ref ?? { current: null }
    },
    []
  )

  // Calculate pointer position relative to container content
  const clientToContainer = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const container = containerRef.current?.current
      if (!container) return null

      const scrollLeft = container.scrollLeft ?? 0
      const scrollTop = container.scrollTop ?? 0

      return {
        x: clientX + scrollLeft,
        y: clientY + scrollTop,
      }
    },
    []
  )

  const startDrag = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (disabled) return false

      const host = hostRef.current
      if (!host) return false

      const pointer = clientToContainer(clientX, clientY)
      if (pointer == null) return false

      const started = host.beginDrag({
        nodeId,
        pointerX: pointer.x,
        pointerY: pointer.y,
      })

      if (started) {
        isDraggingRef.current = true
      }

      return started
    },
    [disabled, nodeId, clientToContainer]
  )

  const updateDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return

      const host = hostRef.current
      if (!host) return

      const pointer = clientToContainer(clientX, clientY)
      if (pointer == null) return

      host.updateDrag({
        pointerX: pointer.x,
        pointerY: pointer.y,
      })
    },
    [clientToContainer]
  )

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return

    const host = hostRef.current
    if (!host) return

    host.endDrag()
    isDraggingRef.current = false
  }, [])

  const cancelDrag = useCallback(() => {
    if (!isDraggingRef.current) return

    const host = hostRef.current
    if (!host) return

    host.cancelDrag()
    isDraggingRef.current = false
  }, [])

  return {
    isDragging: isDraggingRef.current,
    draggedNodeId: isDraggingRef.current ? nodeId : null,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    setHost,
    setContainerRef,
  }
}

export interface UseGhostGridDragReturn {
  /** Whether this specific node is currently being dragged */
  isDragging: boolean
  /** The node id being dragged (null if not dragging) */
  draggedNodeId: string | null
  /** Start dragging the node from the given coordinates */
  startDrag: (clientX: number, clientY: number) => boolean
  /** Update the active drag to the given coordinates */
  updateDrag: (clientX: number, clientY: number) => void
  /** Commit the active drag */
  endDrag: () => void
  /** Cancel the active drag */
  cancelDrag: () => void
  /** Set the grid host (called by GhostGrid) */
  setHost: (host: GridHost | null) => void
  /** Set the container ref for coordinate transformation */
  setContainerRef: (
    ref: { current: { scrollLeft: number; scrollTop: number } | null } | null
  ) => void
}
