/**
 * ghost-gl vs RGL (React-Grid-Layout) Comparison Benchmark
 *
 * Head-to-head comparison of core operations.
 */

import { Bench } from 'tinybench'
import {
  applyLayoutOperation,
  applyLayoutTransaction,
  createInteractionSession,
  LayoutRuntime,
  previewInteraction,
  queryViewport,
  RuntimeController,
} from '../../src'
import {
  compactLayoutRGL,
  detectCollisionsRGL,
  moveNodeRGL,
  queryViewportRGL,
  type RGLNode,
} from '../baseline/rgl-baseline'
import { createBenchmarkFixtures, SCALE_TIERS, type ScaleTier } from '../fixtures'

interface ComparisonResult {
  ghostgl: { hz: number; mean: number; p99: number }
  rgl: { hz: number; mean: number; p99: number }
  speedup: number
}

async function runComparisonBenchmark(): Promise<void> {
  console.log('\n# ghost-gl vs RGL Baseline Comparison\n')

  // Test different scales
  const tiers: ScaleTier[] = ['small', 'medium', 'large', 'xlarge', 'stress']
  const results = new Map<string, ComparisonResult>()

  for (const tier of tiers) {
    const config = SCALE_TIERS[tier]
    const fixture = createBenchmarkFixtures([tier])[0]

    if (!fixture) {
      continue
    }

    console.log(`\n## ${config.name}: ${config.itemCount} items`)

    // Convert nodes to RGL format
    const rglNodes: RGLNode[] = fixture.nodes.map((n) => ({ ...n }))

    const bench = new Bench({
      iterations: tier === 'stress' ? 10 : 30,
      time: tier === 'stress' ? 2000 : 1000,
    })

    // 1. Collision Detection
    bench.add(`[ghost-gl] collision detection`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      // Query viewport triggers spatial index search
      runtime.queryViewport(fixture.viewport)
    })

    bench.add(`[RGL] collision detection`, () => {
      // RGL uses O(n) linear scan
      for (const node of rglNodes.slice(0, 10)) {
        detectCollisionsRGL(rglNodes, node)
      }
    })

    // 2. Move Operation
    bench.add(`[ghost-gl] move operation`, () => {
      applyLayoutOperation(fixture.nodes, fixture.moveOperation, {
        constraints: fixture.constraints,
      })
    })

    bench.add(`[RGL] move operation`, () => {
      const focusNode = rglNodes.find((n) => n.id === fixture.activeIds[0])
      if (focusNode) {
        moveNodeRGL(rglNodes, focusNode.id, focusNode.x + 1, focusNode.y + 2)
      }
    })

    // 3. Transaction Apply
    bench.add(`[ghost-gl] transaction (3 ops)`, () => {
      applyLayoutTransaction(fixture.nodes, fixture.transactionOperations, {
        constraints: fixture.constraints,
      })
    })

    bench.add(`[RGL] compact layout`, () => {
      compactLayoutRGL(rglNodes)
    })

    // 4. Viewport Query
    bench.add(`[ghost-gl] viewport query`, () => {
      queryViewport(fixture.nodes, fixture.viewport, fixture.metrics, {
        overscanX: 200,
        overscanY: 200,
      })
    })

    bench.add(`[RGL] viewport query`, () => {
      queryViewportRGL(rglNodes, fixture.viewport, fixture.metrics)
    })

    // 5. Materialization Planning
    bench.add(`[ghost-gl] plan materialization`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      runtime.planMaterialization({
        ...fixture.viewport,
        activeIds: fixture.activeIds,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
      })
    })

    bench.add(`[ghost-gl] controller interaction`, () => {
      const controller = new RuntimeController({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      controller.beginInteraction({
        id: 'drag-test',
        kind: 'drag',
        targetId: fixture.activeIds[0] || '',
      })

      controller.previewInteraction(fixture.interactionOperations)

      controller.planMaterialization({
        ...fixture.viewport,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
      })
    })

    await bench.run()

    // Collect and compare results
    const comparison = collectComparisonResults(bench, tier)
    for (const [taskName, result] of Object.entries(comparison)) {
      results.set(`${config.name}:${taskName}`, result)
    }

    // Print formatted results
    printComparisonTable(bench, tier)
  }

  // Print summary
  printSummary(results)
}

function collectComparisonResults(bench: Bench, tier: ScaleTier): Record<string, ComparisonResult> {
  const results: Record<string, ComparisonResult> = {}

  const tasks = bench.tasks
  const ghostglTasks = tasks.filter((t) => t.name.includes('[ghost-gl]'))
  const rglTasks = tasks.filter((t) => t.name.includes('[RGL]'))

  for (const ghostglTask of ghostglTasks) {
    const taskName = ghostglTask.name.replace('[ghost-gl] ', '')
    const rglTask = rglTasks.find((t) => t.name.includes(taskName))

    if (ghostglTask.result && rglTask?.result) {
      results[taskName] = {
        ghostgl: {
          hz: ghostglTask.result.hz,
          mean: ghostglTask.result.mean,
          p99: ghostglTask.result.p99,
        },
        rgl: {
          hz: rglTask.result.hz,
          mean: rglTask.result.mean,
          p99: rglTask.result.p99,
        },
        speedup: rglTask.result.mean / ghostglTask.result.mean,
      }
    }
  }

  return results
}

function printComparisonTable(bench: Bench, tier: ScaleTier): void {
  console.log('\n  Results:')

  // Group tasks by operation type
  const operations = new Map<string, { ghostgl?: Bench['tasks'][0]; rgl?: Bench['tasks'][0] }>()

  for (const task of bench.tasks) {
    const opName = task.name.replace(/^\[(ghost-gl|RGL)\] /, '')
    const impl = task.name.includes('[ghost-gl]') ? 'ghostgl' : 'rgl'

    if (!operations.has(opName)) {
      operations.set(opName, {})
    }
    operations.get(opName)![impl] = task
  }

  for (const [opName, impls] of operations) {
    if (impls.ghostgl?.result && impls.rgl?.result) {
      const ghostgl = impls.ghostgl.result
      const rgl = impls.rgl.result
      const speedup = rgl.mean / ghostgl.mean

      console.log(`    ${opName}:`)
      console.log(
        `      ghost-gl: ${formatMs(ghostgl.mean)} mean, ${Math.round(ghostgl.hz).toLocaleString()} ops/s`
      )
      console.log(
        `      RGL:      ${formatMs(rgl.mean)} mean, ${Math.round(rgl.hz).toLocaleString()} ops/s`
      )
      console.log(`      speedup:  ${speedup.toFixed(1)}x`)
    }
  }
}

function printSummary(results: Map<string, ComparisonResult>): void {
  console.log('\n# Summary\n')

  const speedups: number[] = []
  for (const result of results.values()) {
    speedups.push(result.speedup)
  }

  if (speedups.length > 0) {
    const avgSpeedup = speedups.reduce((a, b) => a + b, 0) / speedups.length
    const minSpeedup = Math.min(...speedups)
    const maxSpeedup = Math.max(...speedups)

    console.log(`Average speedup: ${avgSpeedup.toFixed(1)}x`)
    console.log(`Min speedup: ${minSpeedup.toFixed(1)}x`)
    console.log(`Max speedup: ${maxSpeedup.toFixed(1)}x`)
  }
}

function formatMs(durationMs: number): string {
  return `${durationMs.toFixed(3)}ms`.padStart(10)
}

void runComparisonBenchmark()
