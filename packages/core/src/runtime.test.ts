import { describe, expect, it } from 'vitest'

import { LayoutRuntime } from './index'

describe('LayoutRuntime', () => {
  const metrics = {
    columnWidth: 100,
    rowHeight: 80,
    gapX: 10,
    gapY: 20,
    paddingLeft: 16,
    paddingTop: 24,
  }

  it('creates a stable node lookup and bounds view', () => {
    const runtime = new LayoutRuntime({
      metrics,
      nodes: [
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 4, y: 4, w: 1, h: 1 },
      ],
    })

    expect(runtime.getNode('a')?.w).toBe(2)
    expect(runtime.getBounds()).toEqual({
      left: 0,
      top: 0,
      width: 556,
      height: 504,
    })
  })

  it('supports replace, upsert and remove operations', () => {
    const runtime = new LayoutRuntime({
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
    })

    runtime.upsertNode({ id: 'b', x: 2, y: 1, w: 1, h: 1 })
    expect(runtime.getNodes().map((node) => node.id)).toEqual(['a', 'b'])

    runtime.upsertNode({ id: 'a', x: 3, y: 0, w: 2, h: 1 })
    expect(runtime.getNode('a')).toMatchObject({ x: 3, w: 2 })

    runtime.removeNode('b')
    expect(runtime.getNode('b')).toBeUndefined()

    runtime.replaceNodes([{ id: 'c', x: 1, y: 1, w: 1, h: 1 }])
    expect(runtime.getNodes().map((node) => node.id)).toEqual(['c'])
  })

  it('queries visible rects using current metrics', () => {
    const runtime = new LayoutRuntime({
      metrics,
      nodes: [
        { id: 'a', x: 0, y: 0, w: 1, h: 1 },
        { id: 'b', x: 0, y: 2, w: 1, h: 1 },
        { id: 'c', x: 5, y: 5, w: 1, h: 1 },
      ],
    })

    const rects = runtime.queryViewport({
      left: 0,
      top: 0,
      width: 200,
      height: 240,
    })

    expect(rects.map((rect) => rect.id)).toEqual(['a', 'b'])
  })

  it('produces materialization output with live and shell items', () => {
    const runtime = new LayoutRuntime({
      metrics,
      nodes: [
        { id: 'a', x: 0, y: 0, w: 1, h: 1 },
        { id: 'b', x: 0, y: 2, w: 1, h: 1 },
        { id: 'c', x: 0, y: 10, w: 1, h: 1 },
      ],
    })

    const plan = runtime.planMaterialization({
      left: 0,
      top: 0,
      width: 140,
      height: 100,
      overscanY: 200,
      timestamp: 1_000,
    })

    expect(plan.materialized.map((item) => [item.id, item.mode])).toEqual([
      ['a', 'live'],
      ['b', 'shell'],
    ])
    expect(plan.summary).toEqual({
      ghost: 1,
      live: 1,
      shell: 1,
    })
    expect(runtime.getMaterializationMode('c')).toBe('ghost')
  })

  it('keeps recently visible nodes warm through cooldown', () => {
    const runtime = new LayoutRuntime({
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
    })

    runtime.planMaterialization({
      left: 0,
      top: 0,
      width: 140,
      height: 100,
      timestamp: 1_000,
    })

    const plan = runtime.planMaterialization({
      left: 0,
      top: 600,
      width: 140,
      height: 100,
      timestamp: 1_100,
    })

    expect(plan.materialized.map((item) => [item.id, item.mode, item.reason])).toEqual([
      ['a', 'shell', 'cooldown'],
    ])
  })

  it('pins active nodes to live without exposing scheduler internals', () => {
    const runtime = new LayoutRuntime({
      metrics,
      nodes: [{ id: 'a', x: 0, y: 10, w: 1, h: 1 }],
    })

    const plan = runtime.planMaterialization({
      activeIds: ['a'],
      left: 0,
      top: 0,
      width: 140,
      height: 100,
      timestamp: 1_000,
    })

    expect(plan.materialized.map((item) => [item.id, item.mode, item.reason])).toEqual([
      ['a', 'live', 'dragging'],
    ])
  })
})
