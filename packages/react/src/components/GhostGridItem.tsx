'use client'

import { type JSX, useMemo } from 'react'
import { useGridState } from '../context/GhostGridContext'
import type { GhostGridItemProps, GhostGridItemRenderContext } from '../types'

/**
 * GhostGridItem - Renders a single grid item with the appropriate mode
 *
 * This component handles the rendering of individual grid items based on their
 * materialization mode (ghost, shell, live).
 *
 * @example
 * ```tsx
 * <GhostGridItem
 *   materializedNode={node}
 *   renderItem={({ node, rect, mode }) => (
 *     mode === 'live' ? <LiveChart /> : <Skeleton />
 *   )}
 * />
 * ```
 */
export function GhostGridItem<T = unknown>(props: GhostGridItemProps<T>): JSX.Element | null {
  const { materializedNode, renderItem, isDragging = false, isResizing = false } = props
  const { id, rect, mode, reason, node } = materializedNode
  const state = useGridState<T>()

  // Determine if this item is being interacted with
  const isItemDragging = useMemo(() => {
    if (isDragging) return true
    return state?.interactionSession?.targetId === id
  }, [isDragging, state?.interactionSession?.targetId, id])

  const isItemResizing = useMemo(() => {
    if (isResizing) return true
    // Check if this node is being resized
    return false // Resize detection to be implemented
  }, [isResizing])

  // Create render context
  const context: GhostGridItemRenderContext<T> = useMemo(
    () => ({
      isDragging: isItemDragging,
      isResizing: isItemResizing,
      mode,
      node: node as typeof node & { data: T },
      reason,
      rect,
    }),
    [isItemDragging, isItemResizing, mode, node, reason, rect]
  )

  return (
    <div
      data-ghost-id={id}
      data-ghost-mode={mode}
      style={{
        height: rect.height,
        left: rect.left,
        pointerEvents: mode === 'ghost' ? 'none' : 'auto',
        position: 'absolute',
        top: rect.top,
        width: rect.width,
      }}
    >
      {renderItem(context)}
    </div>
  )
}

GhostGridItem.displayName = 'GhostGridItem'
