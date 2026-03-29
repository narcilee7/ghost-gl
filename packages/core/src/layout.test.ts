import { describe, expect, it } from 'vitest'

import { collides, compactLayout, findAutoPlacement, moveNode, resizeNode } from './layout'

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

  describe('compact', () => {
    it('moves nodes up to fill empty spaces', () => {
      const next = compactLayout([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 0, y: 5, w: 2, h: 2 },
      ])

      expect(next).toEqual([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 0, y: 2, w: 2, h: 2 },
      ])
    })

    it('respects static nodes as barriers', () => {
      const next = compactLayout([
        { id: 'static', x: 0, y: 2, w: 2, h: 2, static: true },
        { id: 'a', x: 0, y: 6, w: 2, h: 2 },
      ])

      // 'a' should stop at y=4 (below the static node at y=2, h=2)
      expect(next).toEqual([
        { id: 'static', x: 0, y: 2, w: 2, h: 2, static: true },
        { id: 'a', x: 0, y: 4, w: 2, h: 2 },
      ])
    })

    it('handles multi-column nodes correctly', () => {
      const next = compactLayout([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 2, y: 3, w: 2, h: 2 },
      ])

      // Node 'b' is in a different column (x=2), should compact to y=0
      expect(next).toEqual([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 2, y: 0, w: 2, h: 2 },
      ])
    })

    it('does not create collisions during compact', () => {
      const next = compactLayout([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 1, y: 3, w: 2, h: 2 },
      ])

      // Node 'b' at x=1 overlaps with 'a' at x=0, w=2
      // So 'b' cannot move up to y=0, should stay at y=3 or move minimally
      expect(next.find((n) => n.id === 'b')?.y).toBeGreaterThanOrEqual(2)
    })
  })

  describe('auto-placement', () => {
    it('places new node at origin when empty', () => {
      const placement = findAutoPlacement([], { w: 2, h: 2 })
      expect(placement).toEqual({ x: 0, y: 0 })
    })

    it('finds next available position', () => {
      const placement = findAutoPlacement([{ id: 'a', x: 0, y: 0, w: 2, h: 2 }], { w: 2, h: 2 })
      expect(placement).toEqual({ x: 2, y: 0 })
    })

    it('avoids overlapping with static nodes', () => {
      const placement = findAutoPlacement(
        [{ id: 'static', x: 0, y: 0, w: 2, h: 2, static: true }],
        { w: 2, h: 2 }
      )
      // Should place to the right of the static node
      expect(placement?.x).toBeGreaterThanOrEqual(2)
    })

    it('respects max bounds', () => {
      // Fill a 4x2 grid completely
      const placement = findAutoPlacement(
        [
          { id: 'a', x: 0, y: 0, w: 2, h: 2 },
          { id: 'b', x: 2, y: 0, w: 2, h: 2 },
          { id: 'c', x: 0, y: 2, w: 2, h: 2 },
          { id: 'd', x: 2, y: 2, w: 2, h: 2 },
        ],
        { w: 2, h: 2 },
        { maxX: 4, maxY: 4 }
      )
      // No space within max bounds
      expect(placement).toBeNull()
    })
  })
})
