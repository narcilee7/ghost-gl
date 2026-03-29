import { describe, expect, it } from 'vitest'

import { assertLayoutNodes, validateNode, validatePlacement, validateSize } from './constraints'

describe('layout constraints', () => {
  it('accepts valid nodes', () => {
    expect(validateNode({ id: 'a', x: 0, y: 0, w: 2, h: 2 }, { columns: 4 })).toBeUndefined()
  })

  it('rejects negative positions and invalid sizes', () => {
    expect(validateNode({ id: 'a', x: -1, y: 0, w: 1, h: 1 })).toEqual({
      code: 'negative_x',
      id: 'a',
    })
    expect(validateNode({ id: 'a', x: 0, y: -1, w: 1, h: 1 })).toEqual({
      code: 'negative_y',
      id: 'a',
    })
    expect(validateNode({ id: 'a', x: 0, y: 0, w: 0, h: 1 })).toEqual({
      code: 'invalid_width',
      id: 'a',
    })
    expect(validateNode({ id: 'a', x: 0, y: 0, w: 1, h: 0 })).toEqual({
      code: 'invalid_height',
      id: 'a',
    })
  })

  it('rejects placements and sizes that exceed configured columns', () => {
    expect(validatePlacement({ id: 'a', w: 2, h: 1 }, { x: 3, y: 0 }, { columns: 4 })).toEqual({
      code: 'overflow_columns',
      id: 'a',
    })

    expect(validateSize({ id: 'a', x: 2, y: 0 }, { w: 3, h: 1 }, { columns: 4 })).toEqual({
      code: 'overflow_columns',
      id: 'a',
    })
  })

  it('throws on invalid node collections', () => {
    expect(() => assertLayoutNodes([{ id: 'a', x: 4, y: 0, w: 1, h: 1 }], { columns: 4 })).toThrow(
      'exceeds configured columns'
    )
  })
})
