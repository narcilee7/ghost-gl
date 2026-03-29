/**
 * Heavy Component Benchmark Suite
 *
 * Tests ghost-gl's three-state materialization (ghost/shell/live)
 * against traditional full-mount approaches.
 */

import { Bench } from 'tinybench'
import { type LayoutNode, LayoutRuntime, type MaterializedNode } from '../../src'
import { createBenchmarkFixtures, type HeavyComponentConfig } from '../fixtures'

interface HeavyBenchmarkResult {
  ghostCount: number
  liveCount: number
  shellCount: number
  simulatedMountCost: number
  simulatedUnmountCost: number
  totalSimulatedCost: number
}

interface TraditionalResult {
  mountCount: number
  simulatedMountCost: number
  memoryMB: number
}

/**
 * Simulate traditional approach: all visible nodes fully mounted.
 */
function simulateTraditionalApproach(
  nodes: readonly LayoutNode[],
  visibleCount: number,
  config: HeavyComponentConfig
): TraditionalResult {
  // Traditional: mount all visible nodes
  const mountCount = visibleCount
  const simulatedMountCost = mountCount * config.mountCost
  const memoryMB = mountCount * config.memoryMB

  return {
    memoryMB,
    mountCount,
    simulatedMountCost,
  }
}

/**
 * Simulate ghost-gl's three-state approach.
 */
function simulateGhostGLApproach(
  materialized: MaterializedNode[],
  config: HeavyComponentConfig
): HeavyBenchmarkResult {
  let ghostCount = 0
  let shellCount = 0
  let liveCount = 0
  let simulatedMountCost = 0
  let simulatedUnmountCost = 0

  for (const node of materialized) {
    switch (node.mode) {
      case 'ghost':
        ghostCount++
        // Ghost has zero cost
        break
      case 'shell':
        shellCount++
        // Shell is cheap (placeholder)
        simulatedMountCost += config.mountCost * 0.1
        break
      case 'live':
        liveCount++
        // Full mount cost
        simulatedMountCost += config.mountCost
        simulatedUnmountCost += config.unmountCost
        break
    }
  }

  return {
    ghostCount,
    liveCount,
    shellCount,
    simulatedMountCost,
    simulatedUnmountCost,
    totalSimulatedCost: simulatedMountCost + simulatedUnmountCost,
  }
}

async function runHeavyComponentBenchmark(): Promise<void> {
  console.log('\n# Heavy Component Materialization Benchmark\n')

  const fixtures = createBenchmarkFixtures(['stress', 'extreme'])

  for (const fixture of fixtures) {
    console.log(`\n## ${fixture.name}: ${fixture.description}`)
    console.log(`Component Config: ${JSON.stringify(fixture.heavyConfig)}`)

    const bench = new Bench({
      iterations: 20,
      time: 1000,
    })

    // Traditional approach baseline
    bench.add(`[traditional] full mount all`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      const plan = runtime.planMaterialization({
        ...fixture.viewport,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
      })

      // Simulate mounting all visible nodes
      simulateTraditionalApproach(fixture.nodes, plan.visible.length, fixture.heavyConfig)
    })

    // ghost-gl three-state approach
    bench.add(`[ghost-gl] three-state`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      const plan = runtime.planMaterialization({
        ...fixture.viewport,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
      })

      // Simulate ghost/shell/live materialization
      simulateGhostGLApproach(plan.materialized, fixture.heavyConfig)
    })

    // Fast scroll scenario (high velocity)
    bench.add(`[ghost-gl] fast scroll (>1200px/s)`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      const plan = runtime.planMaterialization({
        ...fixture.viewport,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
        velocityY: 1500,
      })

      simulateGhostGLApproach(plan.materialized, fixture.heavyConfig)
    })

    // Interaction scenario (dragging)
    bench.add(`[ghost-gl] interaction (dragging)`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      const plan = runtime.planMaterialization({
        ...fixture.viewport,
        activeIds: fixture.activeIds,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
      })

      simulateGhostGLApproach(plan.materialized, fixture.heavyConfig)
    })

    await bench.run()

    // Print results with cost analysis
    for (const task of bench.tasks) {
      const stats = task.result
      if (stats == null) continue

      console.log(
        `${task.name}: mean=${formatMs(stats.mean)} | p99=${formatMs(stats.p99)} | hz=${Math.round(stats.hz).toLocaleString()}`
      )
    }

    // Calculate theoretical cost savings
    const runtime = new LayoutRuntime({
      constraints: fixture.constraints,
      metrics: fixture.metrics,
      nodes: fixture.nodes,
    })

    const plan = runtime.planMaterialization({
      ...fixture.viewport,
      overscanX: 200,
      overscanY: 200,
      timestamp: Date.now(),
    })

    const traditional = simulateTraditionalApproach(
      fixture.nodes,
      plan.visible.length,
      fixture.heavyConfig
    )

    const ghostgl = simulateGhostGLApproach(plan.materialized, fixture.heavyConfig)

    console.log('\n  Cost Analysis:')
    console.log(
      `    Traditional: ${traditional.mountCount} mounts, ${traditional.simulatedMountCost.toFixed(0)}ms cost, ${traditional.memoryMB.toFixed(0)}MB memory`
    )
    console.log(
      `    ghost-gl: ${ghostgl.liveCount} live, ${ghostgl.shellCount} shell, ${ghostgl.ghostCount} ghost`
    )
    console.log(
      `    Simulated cost: ${ghostgl.simulatedMountCost.toFixed(0)}ms mount + ${ghostgl.simulatedUnmountCost.toFixed(0)}ms unmount = ${ghostgl.totalSimulatedCost.toFixed(0)}ms total`
    )

    const savings =
      ((traditional.simulatedMountCost - ghostgl.totalSimulatedCost) /
        traditional.simulatedMountCost) *
      100
    console.log(`    Cost savings: ${savings.toFixed(1)}%`)
  }
}

function formatMs(durationMs: number): string {
  return `${durationMs.toFixed(3)}ms`
}

void runHeavyComponentBenchmark()
