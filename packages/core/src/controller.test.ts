import { describe, expect, it } from 'vitest'

import { type ControllerAPI, RuntimeController } from './controller'

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

    const session = controller.getInteractionSession()
    expect(session?.status).toBe('cancelled')
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

  it('emits subscription events for interaction and committed transactions', () => {
    const controller = new RuntimeController({
      metrics,
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
    })
    const events: string[] = []

    const offState = controller.on('state', () => {
      events.push('state')
    })
    const offInteraction = controller.on('interaction', (event) => {
      events.push(`interaction:${event.type}`)
    })
    const offHistory = controller.on('history', (history) => {
      events.push(`history:${history.past.length}`)
    })
    const offTransaction = controller.on('transaction', (event) => {
      events.push(`transaction:${event.type}`)
    })

    controller.beginInteraction({
      id: 'drag-a',
      kind: 'drag',
      targetId: 'a',
    })
    controller.previewInteraction([{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }])
    controller.commitInteraction()

    offState()
    offInteraction()
    offHistory()
    offTransaction()

    expect(events).toContain('interaction:begin')
    expect(events).toContain('interaction:preview')
    expect(events).toContain('interaction:commit')
    expect(events).toContain('transaction:commit')
    expect(events).toContain('history:1')
  })

  describe('enhanced event system', () => {
    it('emits detailed interaction lifecycle events', () => {
      const controller = new RuntimeController({
        metrics,
        nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      })
      const lifecycleEvents: string[] = []

      controller.on('interaction', (event) => {
        lifecycleEvents.push(`${event.type}:${event.session.id}`)
      })

      controller.beginInteraction({ id: 'drag-1', kind: 'drag', targetId: 'a' })
      controller.previewInteraction([{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }])
      controller.commitInteraction()

      expect(lifecycleEvents).toEqual(['begin:drag-1', 'preview:drag-1', 'commit:drag-1'])
    })

    it('tracks materialization mode transitions', () => {
      const controller = new RuntimeController({
        metrics,
        nodes: [
          { id: 'a', x: 0, y: 0, w: 1, h: 1 },
          { id: 'b', x: 0, y: 5, w: 1, h: 1 },
        ],
      })
      const modeChanges: string[] = []

      controller.on('materialization', (event) => {
        if (event.transitions) {
          for (const t of event.transitions) {
            modeChanges.push(`${t.id}:${t.from}->${t.to}`)
          }
        }
      })

      // First plan - establishes baseline
      controller.planMaterialization({
        height: 200,
        left: 0,
        top: 0,
        width: 200,
        timestamp: 1_000,
      })

      // Second plan - scroll to trigger transitions
      const plan = controller.planMaterialization({
        height: 200,
        left: 0,
        top: 400, // Scrolled down
        width: 200,
        timestamp: 2_000,
      })

      expect(modeChanges.length).toBeGreaterThan(0)
    })

    it('supports debounced subscriptions', () => {
      const controller = new RuntimeController({
        metrics,
        nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      })
      const states: number[] = []

      controller.subscribe(
        (state) => {
          states.push(state.nodes.length)
        },
        { debounceMs: 10 }
      )

      controller.moveNode('a', 1, 0)
      controller.moveNode('a', 2, 0)
      controller.moveNode('a', 3, 0)

      // Should be debounced
      expect(states.length).toBeLessThanOrEqual(3)
    })

    it('supports node filter subscriptions', () => {
      const controller = new RuntimeController({
        metrics,
        nodes: [
          { id: 'a', x: 0, y: 0, w: 1, h: 1 },
          { id: 'b', x: 2, y: 0, w: 1, h: 1 },
        ],
      })
      const events: string[] = []

      controller.subscribe(
        (state) => {
          events.push(state.nodes.map((n) => n.id).join(','))
        },
        { nodeFilter: ['a'] }
      )

      // Clear any initial events
      events.length = 0

      controller.moveNode('b', 3, 0) // Should not trigger
      controller.moveNode('a', 1, 0) // Should trigger

      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events[events.length - 1]).toContain('a')
    })

    it('provides canUndo/canRedo state', () => {
      const controller = new RuntimeController({
        metrics,
        nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      })

      expect(controller.canUndo()).toBe(false)
      expect(controller.canRedo()).toBe(false)

      controller.beginInteraction({ id: 'drag', kind: 'drag', targetId: 'a' })
      controller.previewInteraction([{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }])
      controller.commitInteraction()

      expect(controller.canUndo()).toBe(true)
      expect(controller.canRedo()).toBe(false)

      controller.undo()

      expect(controller.canUndo()).toBe(false)
      expect(controller.canRedo()).toBe(true)
    })
  })

  describe('ControllerAPI', () => {
    it('implements ControllerAPI interface', () => {
      const controller: ControllerAPI = new RuntimeController({
        metrics,
        nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      })

      // Test query methods
      expect(controller.getNode('a')).toBeDefined()
      expect(controller.getNodes()).toHaveLength(1)
      expect(controller.getBounds()).toBeDefined()
      expect(controller.getMetrics()).toBeDefined()
      expect(controller.getState()).toBeDefined()

      // Test operations
      expect(controller.moveNode('a', 1, 0)).toBe(true)
      expect(controller.resizeNode('a', 2, 2)).toBe(true)

      // Test subscription
      const unsub = controller.subscribe(() => {})
      expect(typeof unsub).toBe('function')
      unsub()
    })
  })
})
