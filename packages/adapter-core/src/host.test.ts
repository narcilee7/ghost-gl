import { describe, expect, it, vi } from 'vitest'
import { createGridHost } from './host'
import { createGridMetrics, pointerToGrid } from './metrics'

describe('createGridHost', () => {
  const nodes = [
    { id: 'a', x: 0, y: 0, w: 4, h: 3 },
    { id: 'b', x: 4, y: 0, w: 4, h: 3 },
    { id: 'c', x: 0, y: 10, w: 8, h: 4 },
  ]

  it('initializes and reports ready', () => {
    const host = createGridHost({ initialNodes: nodes })

    expect(host.isReady).toBe(true)
    expect(host.controller).toBeDefined()
    expect(host.state).not.toBeNull()
    expect(host.materialized).toEqual([])

    host.dispose()
  })

  it('computes metrics after container size is set', () => {
    const host = createGridHost({ columns: 12, gapX: 10, paddingLeft: 8, rowHeight: 50 })

    host.setContainerSize({ width: 500, height: 400 })

    // (500 - 8*2 - 11*10) / 12 = (500 - 16 - 110) / 12 = 374 / 12 = 31.166...
    expect(host.metrics?.columnWidth).toBeCloseTo(31.17, 1)
    expect(host.metrics?.rowHeight).toBe(50)
    expect(host.metrics?.gapX).toBe(10)
    expect(host.metrics?.paddingLeft).toBe(8)

    host.dispose()
  })

  it('materializes nodes after viewport is set', () => {
    const host = createGridHost({
      columns: 12,
      initialNodes: nodes,
      rowHeight: 50,
    })

    host.setContainerSize({ width: 1200, height: 600 })
    host.setViewport({ left: 0, top: 0, width: 1200, height: 600 })

    expect(host.materialized.length).toBeGreaterThan(0)
    expect(host.materialized.some((item) => item.id === 'a')).toBe(true)

    host.dispose()
  })

  it('notifies subscribers on state changes', () => {
    const host = createGridHost({ initialNodes: nodes })
    const listener = vi.fn()

    const unsubscribe = host.subscribe(listener)

    // Initial push
    expect(listener).toHaveBeenCalledTimes(1)

    host.setContainerSize({ width: 800, height: 600 })

    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    host.dispose()
  })

  it('supports debounced subscriptions', async () => {
    const host = createGridHost({ initialNodes: nodes })
    const listener = vi.fn()

    const unsubscribe = host.subscribe(listener, { debounceMs: 20 })

    // Initial push is debounced
    expect(listener).toHaveBeenCalledTimes(0)

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(listener).toHaveBeenCalledTimes(1)

    host.setContainerSize({ width: 800, height: 600 })
    expect(listener).toHaveBeenCalledTimes(1)

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    host.dispose()
  })

  it('supports undo and redo', () => {
    const host = createGridHost({ initialNodes: nodes })

    host.setContainerSize({ width: 1200, height: 600 })
    host.setViewport({ left: 0, top: 0, width: 1200, height: 600 })

    const beforeMove = host.state?.state.nodes.find((n) => n.id === 'a')
    expect(beforeMove?.x).toBe(0)

    host.moveNode('a', 2, 0)

    const afterMove = host.state?.state.nodes.find((n) => n.id === 'a')
    expect(afterMove?.x).toBe(2)
    expect(host.state?.state.canUndo).toBe(true)

    host.undo()

    const afterUndo = host.state?.state.nodes.find((n) => n.id === 'a')
    expect(afterUndo?.x).toBe(0)
    expect(host.state?.state.canRedo).toBe(true)

    host.redo()

    const afterRedo = host.state?.state.nodes.find((n) => n.id === 'a')
    expect(afterRedo?.x).toBe(2)

    host.dispose()
  })

  it('supports drag lifecycle', () => {
    const host = createGridHost({
      columns: 12,
      initialNodes: nodes,
      rowHeight: 50,
    })

    host.setContainerSize({ width: 1200, height: 600 })
    host.setViewport({ left: 0, top: 0, width: 1200, height: 600 })

    // Pointer is at content position (0, 0) which maps to grid (0, 0)
    const started = host.beginDrag({ nodeId: 'a', pointerX: 0, pointerY: 0 })
    expect(started).toBe(true)

    // Drag to grid position (2, 0). Column width is 100, so x=200 maps to grid x=2.
    host.updateDrag({ pointerX: 200, pointerY: 0 })

    const previewNode = host.controller
      .getInteractionSession()
      ?.currentNodes.find((n) => n.id === 'a')
    expect(previewNode?.x).toBe(2)

    host.endDrag()

    const committedNode = host.state?.state.nodes.find((n) => n.id === 'a')
    expect(committedNode?.x).toBe(2)

    host.dispose()
  })

  it('prevents dragging static nodes', () => {
    const host = createGridHost({
      initialNodes: [{ id: 's', x: 0, y: 0, w: 2, h: 2, static: true }],
    })

    host.setContainerSize({ width: 400, height: 400 })

    const started = host.beginDrag({ nodeId: 's', pointerX: 0, pointerY: 0 })
    expect(started).toBe(false)

    host.dispose()
  })

  it('supports cancel drag', () => {
    const host = createGridHost({
      columns: 12,
      initialNodes: nodes,
      rowHeight: 50,
    })

    host.setContainerSize({ width: 1200, height: 600 })
    host.setViewport({ left: 0, top: 0, width: 1200, height: 600 })

    host.beginDrag({ nodeId: 'a', pointerX: 0, pointerY: 0 })
    host.updateDrag({ pointerX: 200, pointerY: 0 })
    host.cancelDrag()

    const node = host.state?.state.nodes.find((n) => n.id === 'a')
    expect(node?.x).toBe(0)
    expect(host.controller.getInteractionSession()?.status).toBe('cancelled')

    host.dispose()
  })
})

describe('createGridMetrics', () => {
  it('computes column width from container width', () => {
    const metrics = createGridMetrics({
      containerWidth: 500,
      columns: 10,
      rowHeight: 30,
    })

    expect(metrics.columnWidth).toBe(50)
    expect(metrics.rowHeight).toBe(30)
  })

  it('accounts for gaps and padding', () => {
    const metrics = createGridMetrics({
      containerWidth: 500,
      columns: 5,
      gapX: 10,
      paddingLeft: 20,
      rowHeight: 40,
    })

    // (500 - 20*2 - 4*10) / 5 = (500 - 40 - 40) / 5 = 84
    expect(metrics.columnWidth).toBe(84)
  })
})

describe('pointerToGrid', () => {
  it('converts pointer coordinates to grid coordinates', () => {
    const metrics = createGridMetrics({
      containerWidth: 500,
      columns: 5,
      rowHeight: 50,
    })

    expect(pointerToGrid({ x: 0, y: 0 }, metrics)).toEqual({ x: 0, y: 0 })
    expect(pointerToGrid({ x: 100, y: 50 }, metrics)).toEqual({ x: 1, y: 1 })
    expect(pointerToGrid({ x: 250, y: 125 }, metrics)).toEqual({ x: 2, y: 2 })
  })

  it('clamps negative coordinates to zero', () => {
    const metrics = createGridMetrics({
      containerWidth: 500,
      columns: 5,
      rowHeight: 50,
      paddingLeft: 20,
      paddingTop: 20,
    })

    expect(pointerToGrid({ x: 0, y: 0 }, metrics)).toEqual({ x: 0, y: 0 })
  })
})
