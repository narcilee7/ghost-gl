import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGhostGrid } from './useGhostGrid'

describe('useGhostGrid', () => {
  function createContainerRef() {
    const el = document.createElement('div')
    el.getBoundingClientRect = () => ({
      width: 1200,
      height: 500,
      top: 0,
      left: 0,
      bottom: 500,
      right: 1200,
      x: 0,
      y: 0,
      toJSON: () => '',
    })
    return { current: el }
  }

  it('updates materialized rects when interaction preview changes node position', async () => {
    const containerRef = createContainerRef()

    const { result } = renderHook(() =>
      useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: [
          { id: 'a', x: 0, y: 0, w: 3, h: 3 },
          { id: 'b', x: 5, y: 0, w: 3, h: 3 },
        ],
        overscan: 0,
      })
    )

    // Wait for initialization and container width detection
    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
      expect(result.current.metrics?.columnWidth).toBe(100)
    })

    const controller = result.current.controller!

    const initialA = result.current.materialized.find((m) => m.id === 'a')
    expect(initialA).toBeDefined()
    const initialLeft = initialA?.rect.left
    const initialTop = initialA?.rect.top

    // Simulate drag interaction via controller API
    act(() => {
      controller.beginInteraction({
        id: 'drag-a',
        kind: 'drag',
        targetId: 'a',
      })

      controller.previewInteraction([
        {
          id: 'a',
          placement: { x: 2, y: 1 },
          type: 'move',
        },
      ])
    })

    // Materialized should now reflect the preview position
    await waitFor(() => {
      const materializedA = result.current.materialized.find((m) => m.id === 'a')
      expect(materializedA).toBeDefined()
      expect(materializedA?.rect.left).not.toBe(initialLeft)
      expect(materializedA?.rect.top).not.toBe(initialTop)
    })

    // Verify actual coordinates: with 12 cols in 1200px, columnWidth = 100
    // preview x=2 -> left = 2 * 100 = 200; preview y=1 -> top = 1 * 50 = 50
    const previewA = result.current.materialized.find((m) => m.id === 'a')
    expect(previewA?.rect.left).toBe(200)
    expect(previewA?.rect.top).toBe(50)
  })

  it('reverts materialized rects when interaction is cancelled', async () => {
    const containerRef = createContainerRef()

    const { result } = renderHook(() =>
      useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: [{ id: 'a', x: 0, y: 0, w: 3, h: 3 }],
        overscan: 0,
      })
    )

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
      expect(result.current.metrics?.columnWidth).toBe(100)
    })

    const controller = result.current.controller!
    const initialLeft = result.current.materialized.find((m) => m.id === 'a')?.rect.left

    act(() => {
      controller.beginInteraction({
        id: 'drag-a',
        kind: 'drag',
        targetId: 'a',
      })
      controller.previewInteraction([{ id: 'a', placement: { x: 5, y: 0 }, type: 'move' }])
    })

    await waitFor(() => {
      expect(result.current.materialized.find((m) => m.id === 'a')?.rect.left).toBe(500)
    })

    act(() => {
      controller.cancelInteraction()
    })

    await waitFor(() => {
      expect(result.current.materialized.find((m) => m.id === 'a')?.rect.left).toBe(initialLeft)
    })
  })
})
