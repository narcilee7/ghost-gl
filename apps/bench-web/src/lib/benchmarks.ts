import {
  applyLayoutOperation,
  type GridMetrics,
  type LayoutConstraints,
  type LayoutNode,
  LayoutRuntime,
  queryViewport,
  type Rect,
} from 'ghost-gl-core'
import { rglCollisionDetect, rglMoveNode, rglViewportQuery } from './rgl-baseline'

export interface BenchmarkTask {
  ghostgl: () => number
  name: string
  rgl: () => number
}

export function createTasks(
  nodes: LayoutNode[],
  viewport: Rect,
  metrics: GridMetrics,
  constraints: LayoutConstraints
): BenchmarkTask[] {
  const focusNode = nodes[Math.floor(nodes.length * 0.55)] ?? nodes[0]

  return [
    {
      name: 'Viewport Query',
      ghostgl: () => {
        const s = performance.now()
        queryViewport(nodes, viewport, metrics, { overscanX: 200, overscanY: 200 })
        return performance.now() - s
      },
      rgl: () => rglViewportQuery(nodes, viewport, metrics),
    },
    {
      name: 'Collision Detection',
      ghostgl: () => {
        const s = performance.now()
        const runtime = new LayoutRuntime({ nodes, metrics, constraints })
        runtime.queryCollisions(
          { x: focusNode.x, y: focusNode.y, w: focusNode.w, h: focusNode.h },
          focusNode.id
        )
        return performance.now() - s
      },
      rgl: () => rglCollisionDetect(nodes, focusNode),
    },
    {
      name: 'Move + Resolve',
      ghostgl: () => {
        const s = performance.now()
        applyLayoutOperation(
          nodes,
          {
            id: focusNode.id,
            placement: { x: focusNode.x + 1, y: focusNode.y + 2 },
            type: 'move',
          },
          { constraints }
        )
        return performance.now() - s
      },
      rgl: () => rglMoveNode(nodes, focusNode.id, focusNode.x + 1, focusNode.y + 2),
    },
    {
      name: 'Materialization Plan',
      ghostgl: () => {
        const runtime = new LayoutRuntime({ nodes, metrics, constraints })
        const s = performance.now()
        runtime.planMaterialization({
          ...viewport,
          overscanX: 200,
          overscanY: 200,
          timestamp: Date.now(),
        })
        return performance.now() - s
      },
      rgl: () => {
        // RGL has no materialization plan; simulate full render cost
        const s = performance.now()
        for (const node of nodes) {
          const gapX = metrics.gapX ?? 0
          const gapY = metrics.gapY ?? 0
          const left = (metrics.paddingLeft ?? 0) + node.x * (metrics.columnWidth + gapX)
          const top = (metrics.paddingTop ?? 0) + node.y * (metrics.rowHeight + gapY)
          void { left, top }
        }
        return performance.now() - s
      },
    },
  ]
}

export interface BenchmarkResult {
  ghostglMs: number
  name: string
  rglMs: number
  speedup: number
}

export async function runBenchmark(
  tasks: BenchmarkTask[],
  iterations: number,
  onProgress?: (done: number, total: number) => void
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = []
  let done = 0

  for (const task of tasks) {
    // Warmup
    for (let i = 0; i < 3; i++) {
      task.ghostgl()
      task.rgl()
    }

    // Ghost-gl
    let ghostglTotal = 0
    for (let i = 0; i < iterations; i++) {
      ghostglTotal += task.ghostgl()
    }

    // RGL
    let rglTotal = 0
    for (let i = 0; i < iterations; i++) {
      rglTotal += task.rgl()
    }

    const ghostglMs = ghostglTotal / iterations
    const rglMs = rglTotal / iterations
    const speedup = ghostglMs > 0 ? rglMs / ghostglMs : 1

    results.push({ name: task.name, ghostglMs, rglMs, speedup })
    done++
    onProgress?.(done, tasks.length)

    // Yield to UI
    await new Promise((r) => setTimeout(r, 0))
  }

  return results
}
