'use client'

import type { GridHost } from 'ghost-gl-adapter-core'
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
 * <GhostGridDndProvider host={host} containerRef={containerRef}>
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
    host: hostProp,
    containerRef: containerRefProp,
  } = props

  // Try to get from context, fallback to props
  const context = useContext(GhostGridContext)
  const host = (hostProp ?? context?.host) as GridHost<unknown> | null
  const containerRef = (containerRefProp ?? context?.containerRef) as RefObject<HTMLElement | null>

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

  // Refs to access latest values without triggering re-renders
  const containerRefRef = useRef(containerRef)
  const hostRef = useRef(host)

  // Update refs when props/context change
  useEffect(() => {
    containerRefRef.current = containerRef
  }, [containerRef])

  useEffect(() => {
    hostRef.current = host
  }, [host])

  // Calculate pointer position relative to container content
  const clientToContainer = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const currentContainerRef = containerRefRef.current
      if (!currentContainerRef?.current) return null

      const container = currentContainerRef.current
      const rect = container.getBoundingClientRect()
      const scrollLeft = container.scrollLeft
      const scrollTop = container.scrollTop

      return {
        x: clientX - rect.left + scrollLeft,
        y: clientY - rect.top + scrollTop,
      }
    },
    []
  )

  const startDrag = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      const currentHost = hostRef.current
      if (!enabled || !currentHost) return

      const node = currentHost.controller.getNode(nodeId)
      if (!node || node.static) return

      const pointer = clientToContainer(clientX, clientY)
      if (pointer == null) return

      const started = currentHost.beginDrag({
        nodeId,
        pointerX: pointer.x,
        pointerY: pointer.y,
      })

      if (!started) return

      setDraggedNodeId(nodeId)
      setIsDragging(true)
      onDragStart?.(nodeId)
    },
    [enabled, clientToContainer, onDragStart]
  )

  const updateDrag = useCallback(
    (clientX: number, clientY: number) => {
      const currentHost = hostRef.current
      if (!isDraggingRef.current || !currentHost) return

      const pointer = clientToContainer(clientX, clientY)
      if (pointer == null) return

      currentHost.updateDrag({
        pointerX: pointer.x,
        pointerY: pointer.y,
      })
    },
    [clientToContainer]
  )

  const endDrag = useCallback(() => {
    const currentHost = hostRef.current
    if (!isDraggingRef.current || !currentHost) return

    currentHost.endDrag()

    if (draggedNodeIdRef.current) {
      const node = currentHost.controller.getNode(draggedNodeIdRef.current)
      if (node) {
        onDragEnd?.(draggedNodeIdRef.current, node.x, node.y)
      }
    }

    setIsDragging(false)
    setDraggedNodeId(null)
  }, [onDragEnd])

  const cancelDrag = useCallback(() => {
    const currentHost = hostRef.current
    if (!isDraggingRef.current || !currentHost) return

    currentHost.cancelDrag()

    setIsDragging(false)
    setDraggedNodeId(null)
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
