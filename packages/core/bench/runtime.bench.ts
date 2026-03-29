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
import { type BenchmarkNodeData, createBenchmarkFixtures } from './fixtures'

async function main(): Promise<void> {
  for (const fixture of createBenchmarkFixtures()) {
    const bench = new Bench({
      iterations: 30,
      time: 500,
    })

    bench
      .add(`${fixture.name}: viewport query`, () => {
        queryViewport(fixture.nodes, fixture.viewport, fixture.metrics, {
          overscanX: 160,
          overscanY: 240,
        })
      })
      .add(`${fixture.name}: move operation`, () => {
        applyLayoutOperation(fixture.nodes, fixture.moveOperation, {
          constraints: fixture.constraints,
        })
      })
      .add(`${fixture.name}: transaction apply`, () => {
        applyLayoutTransaction(fixture.nodes, fixture.transactionOperations, {
          constraints: fixture.constraints,
        })
      })
      .add(`${fixture.name}: interaction preview`, () => {
        const sessionInput: Parameters<typeof createInteractionSession<BenchmarkNodeData>>[0] = {
          id: `${fixture.name}-session`,
          kind: 'drag',
          nodes: fixture.nodes,
        }

        if (fixture.activeIds[0] !== undefined) {
          sessionInput.targetId = fixture.activeIds[0]
        }

        const session = createInteractionSession(sessionInput)

        previewInteraction(session, fixture.interactionOperations, {
          constraints: fixture.constraints,
        })
      })
      .add(`${fixture.name}: runtime plan`, () => {
        const runtime = new LayoutRuntime({
          constraints: fixture.constraints,
          metrics: fixture.metrics,
          nodes: fixture.nodes,
        })

        runtime.planMaterialization({
          activeIds: fixture.activeIds,
          ...fixture.viewport,
          overscanX: 160,
          overscanY: 240,
          timestamp: 1_000,
          velocityY: 0,
        })
      })
      .add(`${fixture.name}: controller plan with interaction`, () => {
        const controller = new RuntimeController({
          constraints: fixture.constraints,
          metrics: fixture.metrics,
          nodes: fixture.nodes,
        })
        const interactionInput: Parameters<typeof controller.beginInteraction>[0] = {
          id: `${fixture.name}-controller-session`,
          kind: 'drag',
        }

        if (fixture.activeIds[0] !== undefined) {
          interactionInput.targetId = fixture.activeIds[0]
        }

        controller.beginInteraction(interactionInput)
        controller.previewInteraction(fixture.interactionOperations)
        controller.planMaterialization({
          ...fixture.viewport,
          overscanX: 160,
          overscanY: 240,
          timestamp: 1_000,
          velocityY: 0,
        })
      })

    await bench.run()
    printBenchResults(fixture.name, bench)
  }
}

function printBenchResults(name: string, bench: Bench): void {
  console.log(`\n# ${name}`)

  for (const task of bench.tasks) {
    const stats = task.result

    if (stats == null) {
      continue
    }

    console.log(
      [
        task.name,
        `mean=${formatMs(stats.mean)}`,
        `p99=${formatMs(stats.p99)}`,
        `hz=${Math.round(stats.hz).toLocaleString('en-US')}`,
      ].join(' | ')
    )
  }
}

function formatMs(durationMs: number): string {
  return `${durationMs.toFixed(3)}ms`
}

void main()
