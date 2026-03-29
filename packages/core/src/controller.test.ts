import { describe, expect, it } from 'vitest'

import { RuntimeController } from './controller'

describe('RuntimeController', () => {
  const metrics = {
    columnWidth: 100,
    rowHeight: 80,
    gapX: 10,
    gapY: 20,
    paddingLeft: 16,
    paddingTop: 24,
  }

  it('manages interaction preview, plan and commit through one facade', () => {
    const controller = new RuntimeController({
      metrics,
      nodes: [{ id: 'a', x: 0, y: 10, w: 1, h: 1 }],
    })

    controller.beginInteraction({
      id: 'drag-a',
      kind: 'drag',
      targetId: 'a',
    })

    controller.previewInteraction([{ id: 'a', placement: { x: 0, y: 0 }, type: 'move' }])

    const plan = controller.planMaterialization({
      height: 100,
      left: 0,
      top: 0,
      width: 140,
      timestamp: 1_000,
    })

    expect(plan.visible.map((rect) => rect.id)).toEqual(['a'])
    expect(controller.getNodes()).toEqual([{ id: 'a', x: 0, y: 10, w: 1, h: 1 }])

    controller.commitInteraction()

    expect(controller.getNodes()).toEqual([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }])
    expect(controller.getHistory().past).toHaveLength(1)
  })

  it('supports cancel and leaves runtime state untouched', () => {
    const controller = new RuntimeController({
      metrics,
      nodes: [{ id: 'a', x: 0, y: 1, w: 1, h: 1 }],
    })

    controller.beginInteraction({
      id: 'drag-a',
      kind: 'drag',
      targetId: 'a',
    })
    controller.previewInteraction([{ id: 'a', placement: { x: 1, y: 1 }, type: 'move' }])
    controller.cancelInteraction()

    expect(controller.getInteractionSession()?.status).toBe('cancelled')
    expect(controller.getNodes()).toEqual([{ id: 'a', x: 0, y: 1, w: 1, h: 1 }])
    expect(controller.getHistory().past).toHaveLength(0)
  })

  it('supports undo and redo for committed controller actions', () => {
    const controller = new RuntimeController({
      constraints: { columns: 4 },
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
    })

    controller.beginInteraction({
      id: 'drag-a',
      kind: 'drag',
      targetId: 'a',
    })
    controller.previewInteraction([{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }])
    controller.commitInteraction()

    expect(controller.getNodes()).toEqual([{ id: 'a', x: 1, y: 0, w: 1, h: 1 }])
    expect(controller.undo()).toBe(true)
    expect(controller.getNodes()).toEqual([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }])
    expect(controller.redo()).toBe(true)
    expect(controller.getNodes()).toEqual([{ id: 'a', x: 1, y: 0, w: 1, h: 1 }])
  })
})
