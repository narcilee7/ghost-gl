import { describe, expect, it } from 'vitest'

import { collides, moveNode, resizeNode } from './layout'

describe('layout kernel', () => {
  it('detects grid collisions', () => {
    expect(collides({ id: 'a', x: 0, y: 0, w: 2, h: 2 }, { id: 'b', x: 1, y: 1, w: 2, h: 2 })).toBe(
      true
    )

    expect(collides({ id: 'a', x: 0, y: 0, w: 1, h: 1 }, { id: 'b', x: 1, y: 1, w: 1, h: 1 })).toBe(
      false
    )
  })

  it('pushes colliding nodes downward on move', () => {
    const next = moveNode(
      [
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 0, y: 2, w: 2, h: 2 },
      ],
      'a',
      { x: 0, y: 1 }
    )

    expect(next).toEqual([
      { id: 'a', x: 0, y: 1, w: 2, h: 2 },
      { id: 'b', x: 0, y: 3, w: 2, h: 2 },
    ])
  })

  it('moves the active node below static blockers', () => {
    const next = moveNode(
      [
        { id: 'static', x: 0, y: 0, w: 2, h: 2, static: true },
        { id: 'a', x: 0, y: 3, w: 2, h: 2 },
      ],
      'a',
      { x: 0, y: 1 }
    )

    expect(next).toEqual([
      { id: 'static', x: 0, y: 0, w: 2, h: 2, static: true },
      { id: 'a', x: 0, y: 2, w: 2, h: 2 },
    ])
  })

  it('cascades resize collisions deterministically', () => {
    const next = resizeNode(
      [
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 0, y: 2, w: 2, h: 2 },
        { id: 'c', x: 0, y: 4, w: 2, h: 2 },
      ],
      'a',
      { w: 2, h: 3 }
    )

    expect(next).toEqual([
      { id: 'a', x: 0, y: 0, w: 2, h: 3 },
      { id: 'b', x: 0, y: 3, w: 2, h: 2 },
      { id: 'c', x: 0, y: 5, w: 2, h: 2 },
    ])
  })
})
