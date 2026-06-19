import type { GridMetrics, LayoutConstraints, LayoutNode, Rect } from 'ghost-gl-core'

export interface BenchmarkFixture {
  columns: number
  constraints: LayoutConstraints
  metrics: GridMetrics
  name: string
  nodeCount: number
  nodes: LayoutNode[]
  viewport: Rect
}

export const FIXTURE_CONFIGS = [
  {
    name: '100 items',
    nodeCount: 100,
    columns: 12,
    viewport: { left: 0, top: 800, width: 1440, height: 900 },
  },
  {
    name: '500 items',
    nodeCount: 500,
    columns: 12,
    viewport: { left: 0, top: 3200, width: 1680, height: 1000 },
  },
  {
    name: '1k items',
    nodeCount: 1000,
    columns: 16,
    viewport: { left: 0, top: 4800, width: 1680, height: 1000 },
  },
  {
    name: '2k items',
    nodeCount: 2000,
    columns: 24,
    viewport: { left: 0, top: 9600, width: 2048, height: 1200 },
  },
  {
    name: '5k items',
    nodeCount: 5000,
    columns: 32,
    viewport: { left: 0, top: 30000, width: 2560, height: 1500 },
  },
] as const

const DEFAULT_METRICS: GridMetrics = {
  columnWidth: 96,
  gapX: 12,
  gapY: 12,
  paddingLeft: 24,
  paddingTop: 24,
  rowHeight: 72,
}

export function createFixture(nodeCount: number, columns: number): BenchmarkFixture {
  const nodes: LayoutNode[] = []
  let x = 0
  let y = 0

  for (let i = 0; i < nodeCount; i++) {
    const w = Math.min(i % 11 === 0 ? 4 : i % 5 === 0 ? 3 : 2, columns)
    if (x + w > columns) {
      x = 0
      y += 3
    }
    nodes.push({
      id: `node-${i}`,
      x,
      y,
      w,
      h: 2 + (i % 3),
    })
    x += w
    if (x >= columns) {
      x = 0
      y += 3
    }
  }

  const config = FIXTURE_CONFIGS.find((f) => f.nodeCount === nodeCount) ?? FIXTURE_CONFIGS[0]

  return {
    columns,
    constraints: { columns },
    metrics: DEFAULT_METRICS,
    name: config.name,
    nodeCount,
    nodes,
    viewport: config.viewport,
  }
}
