import { describe, expect, it } from 'vitest'

import { applyLayoutOperation } from './operations'

describe('layout operations', () => {
  it('applies move and resize operations through a pure dispatch model', () => {
    const moved = applyLayoutOperation(
      [
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 0, y: 2, w: 2, h: 2 },
      ],
      { id: 'a', placement: { x: 0, y: 1 }, type: 'move' },
      { constraints: { columns: 4 } }
    )

    expect(moved.status).toBe('applied')
    expect(moved.changed).toBe(true)
    expect(moved.nextNodes).toEqual([
      { id: 'a', x: 0, y: 1, w: 2, h: 2 },
      { id: 'b', x: 0, y: 3, w: 2, h: 2 },
    ])

    const resized = applyLayoutOperation(
      moved.nextNodes,
      { id: 'b', size: { w: 2, h: 3 }, type: 'resize' },
      { constraints: { columns: 4 } }
    )

    expect(resized.status).toBe('applied')
    expect(resized.nextNodes).toEqual([
      { id: 'a', x: 0, y: 1, w: 2, h: 2 },
      { id: 'b', x: 0, y: 3, w: 2, h: 3 },
    ])
  })

  it('rejects missing nodes and invalid constrained operations', () => {
    expect(applyLayoutOperation([], { id: 'missing', type: 'remove' })).toMatchObject({
      changed: false,
      rejectionReason: 'node_not_found',
      status: 'rejected',
    })

    expect(
      applyLayoutOperation(
        [{ id: 'a', x: 0, y: 0, w: 2, h: 2 }],
        { id: 'a', placement: { x: 3, y: 0 }, type: 'move' },
        { constraints: { columns: 4 } }
      )
    ).toMatchObject({
      changed: false,
      rejectionReason: 'constraint_violation',
      status: 'rejected',
      violation: { code: 'overflow_columns', id: 'a' },
    })
  })

  it('supports pure upsert and replace flows', () => {
    const upserted = applyLayoutOperation([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }], {
      node: { id: 'b', x: 1, y: 0, w: 1, h: 1 },
      type: 'upsert',
    })

    expect(upserted.status).toBe('applied')
    expect(upserted.nextNodes).toEqual([
      { id: 'a', x: 0, y: 0, w: 1, h: 1 },
      { id: 'b', x: 1, y: 0, w: 1, h: 1 },
    ])

    const replaced = applyLayoutOperation(
      upserted.nextNodes,
      { nodes: [{ id: 'c', x: 0, y: 0, w: 1, h: 1 }], type: 'replace' },
      { constraints: { columns: 4 } }
    )

    expect(replaced.status).toBe('applied')
    expect(replaced.nextNodes).toEqual([{ id: 'c', x: 0, y: 0, w: 1, h: 1 }])
  })
})
