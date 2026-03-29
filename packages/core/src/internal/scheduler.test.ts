import { describe, expect, it } from 'vitest'

import { planMaterialization, type SchedulerDecision } from './scheduler'

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

    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0]).toMatchObject({
      id: 'visible-node',
      mode: 'live',
    })
    expect(plan.decisions[0]?.priority).toBeGreaterThan(0)
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

    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0]).toMatchObject({
      id: 'overscan-node',
      mode: 'shell',
    })
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

    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0]).toMatchObject({
      id: 'parked-node',
      mode: 'ghost',
    })
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

    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0]).toMatchObject({
      id: 'dragging-node',
      mode: 'live',
    })
    // Active nodes get highest priority
    expect(plan.decisions[0]?.priority).toBeGreaterThan(1000)
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

    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0]).toMatchObject({
      id: 'cooldown-node',
      mode: 'shell',
    })
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

    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0]).toMatchObject({
      id: 'forced-shell',
      mode: 'shell',
    })
  })

  describe('budget-driven scheduling', () => {
    it('respects mount budget constraints', () => {
      const plan = planMaterialization({
        config: {
          budget: {
            maxMountsPerFrame: 2,
            mountBudget: 20,
            maxUnmountsPerFrame: 5,
            unmountBudget: 10,
          },
        },
        nodes: [
          {
            id: 'a',
            mode: 'ghost',
            rect: { left: 0, top: 0, width: 100, height: 100 },
            mountCost: 15,
          },
          {
            id: 'b',
            mode: 'ghost',
            rect: { left: 0, top: 100, width: 100, height: 100 },
            mountCost: 15,
          },
          {
            id: 'c',
            mode: 'ghost',
            rect: { left: 0, top: 200, width: 100, height: 100 },
            mountCost: 15,
          },
        ],
        timestamp: 1_000,
        viewport: {
          left: 0,
          top: 0,
          width: 300,
          height: 400,
        },
      })

      // All nodes are visible, but budget limits mounts
      expect(plan.summary.mountsWithinBudget).toBeLessThanOrEqual(2)
      expect(plan.deferred.length).toBeGreaterThan(0)
    })

    it('provides trace information when enabled', () => {
      const plan = planMaterialization({
        nodes: [{ id: 'node', mode: 'ghost', rect: { left: 0, top: 0, width: 100, height: 100 } }],
        timestamp: 1_000,
        trace: true,
        viewport: {
          left: 0,
          top: 0,
          width: 300,
          height: 300,
        },
      })

      expect(plan.trace).toBeDefined()
      expect(plan.trace?.profileDetection.detectedProfile).toBe('idle')
      expect(plan.trace?.budgetCalculation.finalBudget).toBeDefined()
    })

    it('detects scrolling profile based on velocity', () => {
      const plan = planMaterialization({
        nodes: [{ id: 'node', mode: 'ghost', rect: { left: 0, top: 0, width: 100, height: 100 } }],
        timestamp: 1_000,
        trace: true,
        viewport: {
          left: 0,
          top: 0,
          velocityY: 1500, // Fast scroll
          width: 300,
          height: 300,
        },
      })

      expect(plan.trace?.profileDetection.detectedProfile).toBe('scrolling')
      expect(plan.context.profile).toBe('scrolling')
    })

    it('detects interacting profile when nodes are active', () => {
      const plan = planMaterialization({
        nodes: [
          {
            id: 'node',
            isActive: true,
            mode: 'ghost',
            rect: { left: 0, top: 0, width: 100, height: 100 },
          },
        ],
        timestamp: 1_000,
        trace: true,
        viewport: {
          left: 0,
          top: 0,
          width: 300,
          height: 300,
        },
      })

      expect(plan.trace?.profileDetection.detectedProfile).toBe('interacting')
      expect(plan.context.profile).toBe('interacting')
    })

    it('prioritizes nodes by importance', () => {
      const plan = planMaterialization({
        nodes: [
          { id: 'normal', mode: 'ghost', rect: { left: 0, top: 200, width: 100, height: 100 } },
          {
            id: 'high-priority',
            mode: 'ghost',
            rect: { left: 0, top: 100, width: 100, height: 100 },
            priority: 1000,
          },
          { id: 'visible', mode: 'ghost', rect: { left: 0, top: 0, width: 100, height: 100 } },
        ],
        timestamp: 1_000,
        viewport: {
          left: 0,
          top: 0,
          width: 300,
          height: 150, // Only first node is visible
        },
      })

      // Visible node should have highest priority
      const visibleDecision = plan.decisions.find((d) => d.id === 'visible')
      expect(visibleDecision?.priority).toBeGreaterThan(500) // Visible gets +500

      // High priority node should be prioritized over normal
      const highPriorityDecision = plan.decisions.find((d) => d.id === 'high-priority')
      const normalDecision = plan.decisions.find((d) => d.id === 'normal')
      expect(highPriorityDecision?.priority).toBeGreaterThan(normalDecision?.priority ?? 0)
    })
  })
})
