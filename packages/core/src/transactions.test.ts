import { describe, expect, it } from 'vitest'

import { applyLayoutTransaction } from './transactions'

describe('layout transactions', () => {
  it('commits multiple operations atomically and emits inverse operations', () => {
    const result = applyLayoutTransaction(
      [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      [
        { id: 'a', placement: { x: 1, y: 0 }, type: 'move' },
        { id: 'a', size: { w: 2, h: 1 }, type: 'resize' },
      ],
      { constraints: { columns: 4 } }
    )

    expect(result.committed).toBe(true)
    expect(result.changed).toBe(true)
    expect(result.nextNodes).toEqual([{ id: 'a', x: 1, y: 0, w: 2, h: 1 }])
    expect(result.inverseOperations).toEqual([
      { id: 'a', size: { w: 1, h: 1 }, type: 'resize' },
      { id: 'a', placement: { x: 0, y: 0 }, type: 'move' },
    ])
  })

  it('rejects the whole transaction when one operation fails', () => {
    const result = applyLayoutTransaction(
      [{ id: 'a', x: 0, y: 0, w: 2, h: 1 }],
      [
        { id: 'a', placement: { x: 1, y: 0 }, type: 'move' },
        { id: 'a', size: { w: 4, h: 1 }, type: 'resize' },
      ],
      { constraints: { columns: 4 } }
    )

    expect(result).toMatchObject({
      changed: false,
      committed: false,
      failedAt: 1,
      nextNodes: [{ id: 'a', x: 0, y: 0, w: 2, h: 1 }],
    })
    expect(result.results.at(-1)).toMatchObject({
      rejectionReason: 'constraint_violation',
      status: 'rejected',
    })
  })
})
