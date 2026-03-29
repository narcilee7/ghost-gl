import { describe, expect, it } from 'vitest'

import { applyLayoutOperation, LayoutRuntime } from './index'

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

  it('dispatches unified layout operations and keeps runtime state in sync', () => {
    const runtime = new LayoutRuntime({
      constraints: { columns: 4 },
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
    })

    const moveResult = runtime.dispatch({
      id: 'a',
      placement: { x: 1, y: 0 },
      type: 'move',
    })

    expect(moveResult).toMatchObject({
      changed: true,
      status: 'applied',
    })
    expect(runtime.getNode('a')).toMatchObject({ x: 1, y: 0 })

    runtime.planMaterialization({
      height: 100,
      left: 0,
      top: 0,
      width: 140,
    })
    expect(runtime.getMaterializationMode('a')).toBe('live')

    const replaceResult = runtime.dispatch({
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      type: 'replace',
    })

    expect(replaceResult.status).toBe('applied')
    expect(runtime.getMaterializationMode('a')).toBeUndefined()
  })

  it('commits batched operations atomically through dispatchAll', () => {
    const runtime = new LayoutRuntime({
      constraints: { columns: 4 },
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
    })

    const committed = runtime.dispatchAll([
      { id: 'a', placement: { x: 1, y: 0 }, type: 'move' },
      { id: 'a', size: { w: 2, h: 1 }, type: 'resize' },
    ])

    expect(committed).toMatchObject({
      changed: true,
      committed: true,
    })
    expect(runtime.getNode('a')).toEqual({ id: 'a', x: 1, y: 0, w: 2, h: 1 })

    const rejected = runtime.dispatchAll([
      { id: 'a', placement: { x: 2, y: 0 }, type: 'move' },
      { id: 'a', size: { w: 3, h: 1 }, type: 'resize' },
    ])

    expect(rejected).toMatchObject({
      changed: false,
      committed: false,
      failedAt: 1,
    })
    expect(runtime.getNode('a')).toEqual({ id: 'a', x: 1, y: 0, w: 2, h: 1 })
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

  it('supports deterministic move and resize updates', () => {
    const runtime = new LayoutRuntime({
      constraints: { columns: 4 },
      metrics,
      nodes: [
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 0, y: 2, w: 2, h: 2 },
        { id: 'c', x: 0, y: 4, w: 2, h: 2, static: true },
      ],
    })

    expect(runtime.moveNode('a', { x: 0, y: 1 })).toBe(true)
    expect(runtime.getNodes()).toEqual([
      { id: 'a', x: 0, y: 1, w: 2, h: 2 },
      { id: 'c', x: 0, y: 4, w: 2, h: 2, static: true },
      { id: 'b', x: 0, y: 6, w: 2, h: 2 },
    ])

    expect(runtime.resizeNode('b', { w: 2, h: 3 })).toBe(true)
    expect(runtime.getNode('b')).toMatchObject({ h: 3, y: 6 })
    expect(runtime.getBounds()).toEqual({
      left: 0,
      top: 0,
      width: 226,
      height: 904,
    })
  })

  it('rejects illegal operations against configured constraints', () => {
    const runtime = new LayoutRuntime({
      constraints: { columns: 4 },
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 2, h: 2 }],
    })

    expect(runtime.getConstraints()).toEqual({ columns: 4 })
    expect(runtime.moveNode('a', { x: -1, y: 0 })).toBe(false)
    expect(runtime.moveNode('a', { x: 3, y: 0 })).toBe(false)
    expect(runtime.resizeNode('a', { w: 5, h: 2 })).toBe(false)
    expect(runtime.getNode('a')).toEqual({ id: 'a', x: 0, y: 0, w: 2, h: 2 })

    expect(
      runtime.dispatch({
        id: 'missing',
        type: 'remove',
      })
    ).toMatchObject({
      changed: false,
      rejectionReason: 'node_not_found',
      status: 'rejected',
    })
  })

  it('throws when runtime state would become invalid', () => {
    expect(
      () =>
        new LayoutRuntime({
          constraints: { columns: 4 },
          metrics,
          nodes: [{ id: 'a', x: 3, y: 0, w: 2, h: 1 }],
        })
    ).toThrow('exceeds configured columns')

    const runtime = new LayoutRuntime({
      constraints: { columns: 4 },
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
    })

    expect(() => runtime.upsertNode({ id: 'b', x: 4, y: 0, w: 1, h: 1 })).toThrow(
      'exceeds configured columns'
    )
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

  it('re-exports the pure operation model from the public core entry', () => {
    const result = applyLayoutOperation([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }], {
      id: 'a',
      placement: { x: 0, y: 1 },
      type: 'move',
    })

    expect(result.status).toBe('applied')
    expect(result.nextNodes).toEqual([{ id: 'a', x: 0, y: 1, w: 1, h: 1 }])
  })
})
