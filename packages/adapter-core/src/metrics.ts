import type { GridMetrics } from 'ghost-gl-core'
import type { GridMetricsInput } from './types'

/**
 * Calculate grid metrics from container dimensions and grid configuration.
 *
 * @returns GridMetrics compatible with ghost-gl-core
 */
export function createGridMetrics(input: GridMetricsInput): GridMetrics {
  const {
    containerWidth,
    columns,
    rowHeight,
    gapX = 0,
    gapY = 0,
    paddingLeft = 0,
    paddingTop = 0,
  } = input

  const cols = Math.max(1, columns)
  const availableWidth =
    containerWidth > 0 ? Math.max(0, containerWidth - paddingLeft * 2 - (cols - 1) * gapX) : 0

  const columnWidth = containerWidth > 0 ? availableWidth / cols : 100 / cols

  return {
    columnWidth,
    rowHeight,
    gapX,
    gapY,
    paddingLeft,
    paddingTop,
  }
}

/**
 * Convert a pointer coordinate (relative to the container content, including scroll)
 * into grid coordinates.
 */
export function pointerToGrid(
  pointer: { x: number; y: number },
  metrics: GridMetrics
): { x: number; y: number } {
  const { columnWidth, rowHeight, gapX = 0, gapY = 0, paddingLeft = 0, paddingTop = 0 } = metrics

  const adjustedX = pointer.x - paddingLeft
  const adjustedY = pointer.y - paddingTop

  const x = Math.floor((adjustedX + gapX / 2) / (columnWidth + gapX))
  const y = Math.floor((adjustedY + gapY / 2) / (rowHeight + gapY))

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
  }
}
