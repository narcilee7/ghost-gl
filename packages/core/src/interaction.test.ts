import { describe, expect, it } from 'vitest'

import {
  cancelInteraction,
  commitInteraction,
  createInteractionSession,
  previewInteraction,
} from './interaction'

describe('layout interaction session', () => {
  it('previews from base nodes and commits the preview transaction', () => {
    const initial = createInteractionSession({
      id: 'drag-a',
      kind: 'drag',
      nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      targetId: 'a',
    })

    const preview = previewInteraction(
      initial,
      [{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }],
      { constraints: { columns: 4 } }
    )

    expect(preview.transaction.committed).toBe(true)
    expect(preview.session.currentNodes).toEqual([{ id: 'a', x: 1, y: 0, w: 1, h: 1 }])

    const committed = commitInteraction(preview.session)

    expect(committed.session.status).toBe('committed')
    expect(committed.transaction?.nextNodes).toEqual([{ id: 'a', x: 1, y: 0, w: 1, h: 1 }])
  })

  it('resets preview state on cancel', () => {
    const preview = previewInteraction(
      createInteractionSession({
        id: 'resize-a',
        kind: 'resize',
        nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
        targetId: 'a',
      }),
      [{ id: 'a', size: { w: 2, h: 1 }, type: 'resize' }],
      { constraints: { columns: 4 } }
    )

    const cancelled = cancelInteraction(preview.session)

    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.currentNodes).toEqual([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }])
    expect(cancelled.previewResult).toBeUndefined()
  })

  it('keeps the session active but clears preview operations on invalid preview', () => {
    const preview = previewInteraction(
      createInteractionSession({
        id: 'drag-a',
        kind: 'drag',
        nodes: [{ id: 'a', x: 0, y: 0, w: 2, h: 1 }],
        targetId: 'a',
      }),
      [{ id: 'a', placement: { x: 3, y: 0 }, type: 'move' }],
      { constraints: { columns: 4 } }
    )

    expect(preview.transaction.committed).toBe(false)
    expect(preview.session.status).toBe('active')
    expect(preview.session.currentNodes).toEqual([{ id: 'a', x: 0, y: 0, w: 2, h: 1 }])
    expect(preview.session.previewOperations).toEqual([])
  })
})
