import type { GridMetrics, LayoutConstraints, LayoutNode, LayoutOperation, Rect } from '../src'

export interface BenchmarkFixture {
  activeIds: readonly string[]
  constraints: LayoutConstraints
  interactionOperations: readonly LayoutOperation<BenchmarkNodeData>[]
  metrics: GridMetrics
  moveOperation: LayoutOperation<BenchmarkNodeData>
  name: string
  nodes: readonly LayoutNode<BenchmarkNodeData>[]
  resizeOperation: LayoutOperation<BenchmarkNodeData>
  transactionOperations: readonly LayoutOperation<BenchmarkNodeData>[]
  viewport: Rect
}

export interface BenchmarkNodeData {
  complexity: 'heavy'
  kind: 'chart' | 'editor' | 'table'
  seed: number
}

export function createBenchmarkFixtures(): BenchmarkFixture[] {
  return [
    createBenchmarkFixture({
      columns: 12,
      itemCount: 180,
      name: 'dense-180',
      viewport: {
        height: 900,
        left: 0,
        top: 1_600,
        width: 1_440,
      },
    }),
    createBenchmarkFixture({
      columns: 16,
      itemCount: 720,
      name: 'large-720',
      viewport: {
        height: 1_000,
        left: 0,
        top: 4_800,
        width: 1_680,
      },
    }),
    createBenchmarkFixture({
      columns: 24,
      itemCount: 1_600,
      name: 'stress-1600',
      viewport: {
        height: 1_200,
        left: 0,
        top: 9_600,
        width: 2_048,
      },
    }),
  ]
}

interface BenchmarkFixtureOptions {
  columns: number
  itemCount: number
  name: string
  viewport: Rect
}

function createBenchmarkFixture(options: BenchmarkFixtureOptions): BenchmarkFixture {
  const metrics: GridMetrics = {
    columnWidth: 96,
    gapX: 12,
    gapY: 12,
    paddingLeft: 24,
    paddingTop: 24,
    rowHeight: 72,
  }
  const constraints: LayoutConstraints = {
    columns: options.columns,
  }
  const nodes = createGridNodes(options.itemCount, options.columns)
  const focusNode = nodes[Math.floor(nodes.length * 0.55)] ?? nodes[0]
  const secondaryNode = nodes[Math.floor(nodes.length * 0.56)] ?? nodes[1] ?? focusNode
  const tertiaryNode = nodes[Math.floor(nodes.length * 0.57)] ?? nodes[2] ?? secondaryNode

  if (focusNode == null || secondaryNode == null || tertiaryNode == null) {
    throw new Error('Benchmark fixture requires at least three nodes.')
  }

  return {
    activeIds: [focusNode.id, secondaryNode.id],
    constraints,
    interactionOperations: [
      {
        id: focusNode.id,
        placement: {
          x: Math.max(0, Math.min(options.columns - focusNode.w, focusNode.x + 1)),
          y: focusNode.y + 2,
        },
        type: 'move',
      },
      {
        id: secondaryNode.id,
        size: {
          h: secondaryNode.h + 1,
          w: Math.min(options.columns - secondaryNode.x, secondaryNode.w + 1),
        },
        type: 'resize',
      },
    ],
    metrics,
    moveOperation: {
      id: focusNode.id,
      placement: {
        x: Math.max(0, Math.min(options.columns - focusNode.w, focusNode.x + 2)),
        y: focusNode.y + 3,
      },
      type: 'move',
    },
    name: options.name,
    nodes,
    resizeOperation: {
      id: tertiaryNode.id,
      size: {
        h: tertiaryNode.h + 1,
        w: Math.min(options.columns - tertiaryNode.x, tertiaryNode.w + 1),
      },
      type: 'resize',
    },
    transactionOperations: [
      {
        id: focusNode.id,
        placement: {
          x: Math.max(0, Math.min(options.columns - focusNode.w, focusNode.x + 1)),
          y: focusNode.y + 1,
        },
        type: 'move',
      },
      {
        id: secondaryNode.id,
        placement: {
          x: Math.max(0, Math.min(options.columns - secondaryNode.w, secondaryNode.x + 2)),
          y: secondaryNode.y + 2,
        },
        type: 'move',
      },
      {
        id: tertiaryNode.id,
        size: {
          h: tertiaryNode.h + 1,
          w: Math.min(options.columns - tertiaryNode.x, tertiaryNode.w + 1),
        },
        type: 'resize',
      },
    ],
    viewport: options.viewport,
  }
}

function createGridNodes(itemCount: number, columns: number): LayoutNode<BenchmarkNodeData>[] {
  const nodes: LayoutNode<BenchmarkNodeData>[] = []
  let x = 0
  let y = 0

  for (let index = 0; index < itemCount; index += 1) {
    const width = index % 11 === 0 ? 4 : index % 5 === 0 ? 3 : 2
    const clampedWidth = Math.min(width, columns)

    if (x + clampedWidth > columns) {
      x = 0
      y += 3
    }

    nodes.push({
      data: {
        complexity: 'heavy',
        kind: inferNodeKind(index),
        seed: index,
      },
      h: 2 + (index % 3),
      id: `node-${index}`,
      static: index % 37 === 0,
      w: clampedWidth,
      x,
      y,
    })

    x += clampedWidth

    if (x >= columns) {
      x = 0
      y += 3
    }
  }

  return nodes
}

function inferNodeKind(index: number): BenchmarkNodeData['kind'] {
  if (index % 7 === 0) {
    return 'editor'
  }

  if (index % 3 === 0) {
    return 'table'
  }

  return 'chart'
}
