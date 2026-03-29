import { describe, expect, it } from 'vitest'

import { planMaterialization } from './scheduler'

describe('internal scheduler', () => {
  it('promotes visible nodes to live', () => {
    const plan = planMaterialization({
      nodes: [
        {
          id: 'visible-node',
          mode: 'ghost',
          rect: { left: 0, top: 0, width: 100, height: 100 },
        },
      ],
      timestamp: 1_000,
      viewport: {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
      },
    })

    expect(plan.decisions).toEqual([
      {
        id: 'visible-node',
        mode: 'live',
        reason: 'visible',
      },
    ])
    expect(plan.summary.live).toBe(1)
  })

  it('keeps nearby offscreen nodes as shell through overscan', () => {
    const plan = planMaterialization({
      nodes: [
        {
          id: 'overscan-node',
          mode: 'ghost',
          rect: { left: 0, top: 340, width: 100, height: 100 },
        },
      ],
      timestamp: 1_000,
      viewport: {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
      },
    })

    expect(plan.decisions).toEqual([
      {
        id: 'overscan-node',
        mode: 'shell',
        reason: 'overscan',
      },
    ])
    expect(plan.summary.shell).toBe(1)
  })

  it('parks distant nodes as ghost', () => {
    const plan = planMaterialization({
      nodes: [
        {
          id: 'parked-node',
          mode: 'shell',
          rect: { left: 0, top: 2_000, width: 100, height: 100 },
        },
      ],
      timestamp: 1_000,
      viewport: {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
      },
    })

    expect(plan.decisions).toEqual([
      {
        id: 'parked-node',
        mode: 'ghost',
        reason: 'parked',
      },
    ])
    expect(plan.summary.ghost).toBe(1)
  })

  it('pins active nodes to live regardless of viewport', () => {
    const plan = planMaterialization({
      nodes: [
        {
          id: 'dragging-node',
          isActive: true,
          mode: 'shell',
          rect: { left: 0, top: 2_000, width: 100, height: 100 },
        },
      ],
      timestamp: 1_000,
      viewport: {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
      },
    })

    expect(plan.decisions).toEqual([
      {
        id: 'dragging-node',
        mode: 'live',
        reason: 'dragging',
      },
    ])
  })

  it('keeps recently visible nodes warm during cooldown', () => {
    const plan = planMaterialization({
      nodes: [
        {
          id: 'cooldown-node',
          lastVisibleAt: 950,
          mode: 'live',
          rect: { left: 0, top: 800, width: 100, height: 100 },
        },
      ],
      timestamp: 1_000,
      viewport: {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
      },
    })

    expect(plan.decisions).toEqual([
      {
        id: 'cooldown-node',
        mode: 'shell',
        reason: 'cooldown',
      },
    ])
  })

  it('allows an internal controller to override defaults', () => {
    const plan = planMaterialization({
      controller: {
        resolveMode(node) {
          if (node.id === 'forced-shell') {
            return {
              mode: 'shell',
              reason: 'cooldown',
            }
          }

          return null
        },
      },
      nodes: [
        {
          id: 'forced-shell',
          mode: 'ghost',
          rect: { left: 0, top: 0, width: 100, height: 100 },
        },
      ],
      timestamp: 1_000,
      viewport: {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
      },
    })

    expect(plan.decisions).toEqual([
      {
        id: 'forced-shell',
        mode: 'shell',
        reason: 'cooldown',
      },
    ])
  })
})
