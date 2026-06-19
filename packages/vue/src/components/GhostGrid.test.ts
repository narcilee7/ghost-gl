import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useGhostGrid } from '../composables/useGhostGrid'
import type { LayoutNode } from 'ghost-gl-core'

describe('useGhostGrid drag', () => {
  const nodes = [
    { id: 'a', x: 0, y: 0, w: 4, h: 3 },
    { id: 'b', x: 4, y: 0, w: 4, h: 3, static: true },
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
    el.addEventListener = vi.fn()
    el.removeEventListener = vi.fn()
    return el
  }

  it('initializes host correctly', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: nodes,
      })
    })

    await nextTick()

    expect(grid?.host.value).not.toBeNull()
    expect(grid?.controller.value).not.toBeNull()
    expect(grid?.isReady.value).toBe(true)

    scope.stop()
  })

  it('returns correct metrics', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer(375, 812))
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        gapX: 10,
        gapY: 10,
        initialNodes: nodes,
      })
    })

    await nextTick()
    await nextTick()

    expect(grid?.metrics.value).not.toBeNull()
    expect(grid?.bounds.value).not.toBeNull()

    scope.stop()
  })

  it('handles resize correctly', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: nodes,
      })
    })

    await nextTick()

    const resized = grid?.resizeNode('a', 6, 4)
    expect(resized).toBe(true)

    scope.stop()
  })

  it('handles redo after undo', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: nodes,
      })
    })

    await nextTick()

    grid?.moveNode('a', 2, 0)
    await nextTick()

    grid?.undo()
    await nextTick()

    const nodeAfterUndo = grid?.state.value?.nodes.find((n) => n.id === 'a')
    expect(nodeAfterUndo?.x).toBe(0)

    grid?.redo()
    await nextTick()

    const nodeAfterRedo = grid?.state.value?.nodes.find((n) => n.id === 'a')
    expect(nodeAfterRedo?.x).toBe(2)

    scope.stop()
  })

  it('handles container with zero dimensions', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer(0, 0))
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: nodes,
      })
    })

    await nextTick()

    expect(grid?.isReady.value).toBe(true)

    scope.stop()
  })

  it('handles custom policy options', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: nodes,
        policy: {
          collisionDirection: 'horizontal',
          autoCompact: false,
        },
      })
    })

    await nextTick()

    expect(grid?.isReady.value).toBe(true)
    expect(grid?.host.value).not.toBeNull()

    scope.stop()
  })

  it('updates viewport correctly', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: nodes,
      })
    })

    await nextTick()

    grid?.updateViewport({
      left: 100,
      top: 200,
      width: 375,
      height: 812,
    })

    expect(grid?.host.value).not.toBeNull()

    scope.stop()
  })

  it('handles empty nodes array', async () => {
    const scope = effectScope()
    const grid = scope.run(() => {
      const containerRef = ref<HTMLElement | null>(mockContainer())
      return useGhostGrid({
        containerRef,
        columns: 12,
        rowHeight: 50,
        initialNodes: [],
      })
    })

    await nextTick()

    expect(grid?.nodes.value.length).toBe(0)
    expect(grid?.isReady.value).toBe(true)

    scope.stop()
  })
})
