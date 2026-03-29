import { describe, expect, it } from 'vitest'

import {
  createLayoutHistory,
  recordLayoutTransaction,
  redoLayoutHistory,
  undoLayoutHistory,
} from './history'
import { applyLayoutTransaction } from './transactions'

describe('layout history', () => {
  it('records committed transactions and supports undo/redo', () => {
    const transaction = applyLayoutTransaction(
      [{ id: 'a', x: 0, y: 0, w: 1, h: 1 }],
      [{ id: 'a', placement: { x: 1, y: 0 }, type: 'move' }]
    )

    const history = recordLayoutTransaction(createLayoutHistory(), transaction)

    expect(history.past).toHaveLength(1)
    expect(history.future).toHaveLength(0)

    const undoResult = undoLayoutHistory(transaction.nextNodes, history)
    expect(undoResult.changed).toBe(true)
    expect(undoResult.transaction?.nextNodes).toEqual([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }])
    expect(undoResult.history.past).toHaveLength(0)
    expect(undoResult.history.future).toHaveLength(1)

    const redoResult = redoLayoutHistory(
      undoResult.transaction?.nextNodes ?? [],
      undoResult.history
    )
    expect(redoResult.changed).toBe(true)
    expect(redoResult.transaction?.nextNodes).toEqual([{ id: 'a', x: 1, y: 0, w: 1, h: 1 }])
    expect(redoResult.history.past).toHaveLength(1)
    expect(redoResult.history.future).toHaveLength(0)
  })

  it('ignores uncommitted transactions when recording history', () => {
    const transaction = applyLayoutTransaction(
      [{ id: 'a', x: 0, y: 0, w: 2, h: 1 }],
      [{ id: 'a', size: { w: 5, h: 1 }, type: 'resize' }],
      { constraints: { columns: 4 } }
    )

    const history = recordLayoutTransaction(createLayoutHistory(), transaction)

    expect(history.past).toHaveLength(0)
    expect(history.future).toHaveLength(0)
  })
})
