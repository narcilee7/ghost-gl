import { describe, expect, it } from 'vitest'

import { estimateLayoutBounds, projectNodeToRect, queryViewport } from './index'

describe('viewport query', () => {
  const metrics = {
    columnWidth: 100,
    rowHeight: 80,
    gapX: 10,
    gapY: 20,
    paddingLeft: 16,
    paddingTop: 24,
  }

  it('projects grid nodes into pixel rects', () => {
    const rect = projectNodeToRect(
      {
        id: 'node-1',
        x: 2,
        y: 1,
        w: 2,
        h: 3,
      },
      metrics
    )

    expect(rect).toMatchObject({
      id: 'node-1',
      left: 236,
      top: 124,
      width: 210,
      height: 280,
      gridX: 2,
      gridY: 1,
      gridWidth: 2,
      gridHeight: 3,
    })
  })

  it('returns nodes intersecting the viewport', () => {
    const rects = queryViewport(
      [
        { id: 'a', x: 0, y: 0, w: 1, h: 1 },
        { id: 'b', x: 0, y: 2, w: 1, h: 1 },
        { id: 'c', x: 5, y: 5, w: 1, h: 1 },
      ],
      {
        left: 0,
        top: 0,
        width: 200,
        height: 240,
      },
      metrics
    )

    expect(rects.map((rect) => rect.id)).toEqual(['a', 'b'])
  })

  it('uses overscan when querying the viewport', () => {
    const rects = queryViewport(
      [
        { id: 'a', x: 0, y: 0, w: 1, h: 1 },
        { id: 'b', x: 0, y: 2, w: 1, h: 1 },
      ],
      {
        left: 0,
        top: 0,
        width: 140,
        height: 100,
      },
      metrics,
      {
        overscanY: 200,
      }
    )

    expect(rects.map((rect) => rect.id)).toEqual(['a', 'b'])
  })

  it('estimates scrollable bounds from projected rects', () => {
    const bounds = estimateLayoutBounds(
      [
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 4, y: 4, w: 1, h: 1 },
      ],
      metrics
    )

    expect(bounds).toEqual({
      left: 0,
      top: 0,
      width: 556,
      height: 504,
    })
  })
})
