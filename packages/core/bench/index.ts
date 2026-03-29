#!/usr/bin/env node
/**
 * ghost-gl Benchmark Suite
 *
 * Run with: pnpm bench
 *
 * This benchmark suite provides comprehensive performance testing:
 * 1. Core operations (move, resize, collision, viewport query)
 * 2. Heavy component materialization (ghost/shell/live)
 * 3. Comparison against RGL baseline
 * 4. Stress tests at different scales (100 - 10k items)
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
} from '../src'
import { createBenchmarkFixtures, SCALE_TIERS, type ScaleTier } from './fixtures'
import { ConsoleReporter, formatDuration } from './reporters/console-reporter'
import { JSONReporter } from './reporters/json-reporter'

const reporter = new ConsoleReporter({ detailed: true })
const jsonReporter = new JSONReporter()

interface BenchmarkSuite {
  description: string
  name: string
  run: () => Promise<Bench>
}

const suites: BenchmarkSuite[] = [
  {
    description: 'Core layout operations at various scales',
    name: 'Core Operations',
    run: runCoreBenchmark,
  },
  {
    description: 'Heavy component materialization (ghost/shell/live)',
    name: 'Heavy Components',
    run: runHeavyBenchmark,
  },
  {
    description: 'Stress tests with extreme data volumes',
    name: 'Stress Tests',
    run: runStressBenchmark,
  },
]

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const suiteName = args[0]
  const outputJson = args.includes('--json')
  const saveBaseline = args.includes('--baseline')

  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║           ghost-gl Performance Benchmark Suite           ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  const allResults: Array<{ name: string; bench: Bench; description?: string }> = []

  for (const suite of suites) {
    if (suiteName && !suite.name.toLowerCase().includes(suiteName.toLowerCase())) {
      continue
    }

    const bench = await suite.run()
    allResults.push({ name: suite.name, bench, description: suite.description })
  }

  // Generate JSON report if requested
  if (outputJson || saveBaseline) {
    const report = jsonReporter.generateReport(allResults)
    const filepath = jsonReporter.saveReport(report, saveBaseline ? 'baseline.json' : undefined)
    console.log(`\n📊 Report saved: ${filepath}`)
  }

  // Compare with baseline if available
  if (args.includes('--compare')) {
    try {
      const baseline = jsonReporter.loadReport('baseline.json')
      const current = jsonReporter.generateReport(allResults)
      const comparison = jsonReporter.compareReports(baseline, current)

      console.log('\n📈 Comparison with Baseline')
      console.log(`   Improved:   ${comparison.summary.improved}`)
      console.log(`   Regressed:  ${comparison.summary.regressed}`)
      console.log(`   Unchanged:  ${comparison.summary.unchanged}`)

      if (comparison.summary.regressed > 0) {
        console.log('\n   Regressions:')
        for (const delta of comparison.deltas.filter((d) => d.status === 'regressed')) {
          console.log(`     ${delta.suite} > ${delta.task}: +${delta.delta.meanChange.toFixed(1)}%`)
        }
      }
    } catch (e) {
      console.log('\n⚠️  Could not load baseline for comparison')
    }
  }
}

async function runCoreBenchmark(): Promise<Bench> {
  reporter.header('Core Operations', 'Baseline performance of key layout operations')

  const fixtures = createBenchmarkFixtures(['small', 'medium', 'large', 'xlarge', 'stress'])

  const bench = new Bench({
    iterations: 30,
    time: 1000,
  })

  for (const fixture of fixtures) {
    // Viewport Query
    bench.add(`${fixture.name}: viewport query`, () => {
      queryViewport(fixture.nodes, fixture.viewport, fixture.metrics, {
        overscanX: 200,
        overscanY: 200,
      })
    })

    // Move Operation
    bench.add(`${fixture.name}: move operation`, () => {
      applyLayoutOperation(fixture.nodes, fixture.moveOperation, {
        constraints: fixture.constraints,
      })
    })

    // Transaction
    bench.add(`${fixture.name}: transaction (3 ops)`, () => {
      applyLayoutTransaction(fixture.nodes, fixture.transactionOperations, {
        constraints: fixture.constraints,
      })
    })

    // Interaction Preview
    bench.add(`${fixture.name}: interaction preview`, () => {
      const session = createInteractionSession({
        id: `${fixture.name}-session`,
        kind: 'drag',
        nodes: fixture.nodes,
        targetId: fixture.activeIds[0] || '',
      })

      previewInteraction(session, fixture.interactionOperations, {
        constraints: fixture.constraints,
      })
    })

    // Runtime Plan
    bench.add(`${fixture.name}: runtime plan`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      runtime.planMaterialization({
        activeIds: fixture.activeIds,
        ...fixture.viewport,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
      })
    })

    // Controller
    bench.add(`${fixture.name}: controller interaction`, () => {
      const controller = new RuntimeController({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      controller.beginInteraction({
        id: `${fixture.name}-controller-session`,
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
  }

  await bench.run()
  reporter.printBench('Core Operations', bench)

  return bench
}

async function runHeavyBenchmark(): Promise<Bench> {
  reporter.header('Heavy Components', 'Three-state materialization (ghost/shell/live) performance')

  const fixtures = createBenchmarkFixtures(['stress', 'extreme'])

  const bench = new Bench({
    iterations: 20,
    time: 2000,
  })

  for (const fixture of fixtures) {
    // Normal scroll
    bench.add(`${fixture.name}: normal scroll`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      runtime.planMaterialization({
        ...fixture.viewport,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
        velocityY: 100,
      })
    })

    // Fast scroll
    bench.add(`${fixture.name}: fast scroll (>1200px/s)`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      runtime.planMaterialization({
        ...fixture.viewport,
        overscanX: 200,
        overscanY: 200,
        timestamp: Date.now(),
        velocityY: 1500,
      })
    })

    // Interaction
    bench.add(`${fixture.name}: dragging`, () => {
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
  }

  await bench.run()
  reporter.printBench('Heavy Components', bench)

  return bench
}

async function runStressBenchmark(): Promise<Bench> {
  reporter.header('Stress Tests', 'Extreme data volume performance')

  const fixtures = createBenchmarkFixtures(['extreme'])

  const bench = new Bench({
    iterations: 5,
    time: 5000,
  })

  for (const fixture of fixtures) {
    bench.add(`${fixture.name}: spatial query`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      // Multiple viewport queries
      for (let i = 0; i < 10; i++) {
        runtime.queryViewport({
          height: fixture.viewport.height,
          left: fixture.viewport.left,
          top: fixture.viewport.top + i * 1000,
          width: fixture.viewport.width,
        })
      }
    })

    bench.add(`${fixture.name}: batch operations`, () => {
      const runtime = new LayoutRuntime({
        constraints: fixture.constraints,
        metrics: fixture.metrics,
        nodes: fixture.nodes,
      })

      // Simulate batch updates
      const ops = fixture.nodes.slice(0, 100).map((node, i) => ({
        id: node.id,
        placement: { x: node.x, y: node.y + (i % 3) },
        type: 'move' as const,
      }))

      runtime.dispatchAll(ops)
    })
  }

  await bench.run()
  reporter.printBench('Stress Tests', bench)

  return bench
}

void main()
