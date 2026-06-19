import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useGhostGrid } from './useGhostGrid'

describe('useGhostGrid', () => {
  const nodes = [
    { id: 'a', x: 0, y: 0, w: 4, h: 3 },
    { id: 'b', x: 4, y: 0, w: 4, h: 3 },
  ]

  function mockContainer(width = 1200, height = 600) {
    const el = document.createElement('div')
    el.getBoundingClientRect = vi.fn(() => ({
      bottom: height,
      height,
      left: 0,
      right: width,
      top: 0,
      width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))
    return el
  }

  it('initializes and reports ready', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({ containerRef, columns: 12, rowHeight: 50, initialNodes: nodes })
    })

    await nextTick()

    expect(grid?.isReady.value).toBe(true)
    expect(grid?.host.value).not.toBeNull()
    expect(grid?.controller.value).not.toBeNull()
    expect(grid?.nodes.value.length).toBe(2)
    scope.stop()
  })

  it('materializes nodes when viewport is set', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({ containerRef, columns: 12, rowHeight: 50, initialNodes: nodes })
    })

    await nextTick()
    await nextTick()

    expect(grid?.materialized.value.length).toBeGreaterThan(0)
    expect(grid?.materialized.value.some((item) => item.id === 'a')).toBe(true)
    scope.stop()
  })

  it('supports move and undo', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({ containerRef, columns: 12, rowHeight: 50, initialNodes: nodes })
    })

    await nextTick()

    const moved = grid?.moveNode('a', 2, 0)
    expect(moved).toBe(true)

    await nextTick()

    const nodeA = grid?.state.value?.nodes.find((n) => n.id === 'a')
    expect(nodeA?.x).toBe(2)

    grid?.undo()

    await nextTick()

    const nodeAAfterUndo = grid?.state.value?.nodes.find((n) => n.id === 'a')
    expect(nodeAAfterUndo?.x).toBe(0)
    scope.stop()
  })
})
