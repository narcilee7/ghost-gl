import { describe, expect, it } from 'vitest'

import { createInteractionSession, previewInteraction } from '../interaction'
import { collectInteractionActiveIds, resolvePlanningNodes } from './interaction-bridge'

describe('internal interaction bridge', () => {
  it('collects active ids from the interaction target and preview operations', () => {
    const preview = previewInteraction(
      createInteractionSession({
        id: 'drag-a',
        kind: 'drag',
        nodes: [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
        targetId: 'a',
      }),
      [{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }]
    )

    expect([...collectInteractionActiveIds(preview.session)]).toEqual(['a'])
  })

  it('uses preview nodes only for active committed previews', () => {
    const baseNodes = [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }]
    const preview = previewInteraction(
      createInteractionSession({
        id: 'drag-a',
        kind: 'drag',
        nodes: baseNodes,
        targetId: 'a',
      }),
      [{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }]
    )

    expect(resolvePlanningNodes(baseNodes, preview.session)).toEqual([
      { id: 'a', x: 1, y: 0, w: 1, h: 1 },
    ])

    expect(
      resolvePlanningNodes(baseNodes, {
        ...preview.session,
        status: 'committed',
      })
    ).toEqual(baseNodes)
  })
})
