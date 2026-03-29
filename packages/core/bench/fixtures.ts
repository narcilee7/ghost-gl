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
  /** Heavy component simulation configuration */
  heavyConfig: HeavyComponentConfig
  /** Description of the fixture characteristics */
  description: string
}

export interface HeavyComponentConfig {
  /** Average component mount cost in ms */
  mountCost: number
  /** Average component unmount cost in ms */
  unmountCost: number
  /** Memory footprint per component in MB */
  memoryMB: number
  /** Component complexity type */
  type: 'chart' | 'editor' | 'table' | 'mixed'
}

export interface BenchmarkNodeData {
  complexity: 'light' | 'medium' | 'heavy'
  kind: 'chart' | 'editor' | 'table'
  seed: number
  /** Simulated component weight for memory/perf calculations */
  weight: number
}

/** Scale tiers for comprehensive testing */
export type ScaleTier = 'small' | 'medium' | 'large' | 'xlarge' | 'stress' | 'extreme'

export interface ScaleConfig {
  columns: number
  itemCount: number
  name: string
  tier: ScaleTier
  viewport: Rect
}

export const SCALE_TIERS: Record<ScaleTier, ScaleConfig> = {
  small: {
    columns: 12,
    itemCount: 100,
    name: 'small-100',
    tier: 'small',
    viewport: { height: 900, left: 0, top: 800, width: 1440 },
  },
  medium: {
    columns: 12,
    itemCount: 500,
    name: 'medium-500',
    tier: 'medium',
    viewport: { height: 1000, left: 0, top: 3200, width: 1680 },
  },
  large: {
    columns: 16,
    itemCount: 180,
    name: 'large-180',
    tier: 'large',
    viewport: { height: 900, left: 0, top: 1600, width: 1440 },
  },
  xlarge: {
    columns: 16,
    itemCount: 720,
    name: 'xlarge-720',
    tier: 'xlarge',
    viewport: { height: 1000, left: 0, top: 4800, width: 1680 },
  },
  stress: {
    columns: 24,
    itemCount: 1600,
    name: 'stress-1600',
    tier: 'stress',
    viewport: { height: 1200, left: 0, top: 9600, width: 2048 },
  },
  extreme: {
    columns: 32,
    itemCount: 10000,
    name: 'extreme-10k',
    tier: 'extreme',
    viewport: { height: 1500, left: 0, top: 60000, width: 2560 },
  },
}

/** Generate all benchmark fixtures */
export function createBenchmarkFixtures(
  tiers: ScaleTier[] = Object.keys(SCALE_TIERS) as ScaleTier[]
): BenchmarkFixture[] {
  return tiers.map((tier) => createBenchmarkFixture(SCALE_TIERS[tier]))
}

/** Generate heavy-load fixtures for specific testing */
export function createHeavyBenchmarkFixtures(): BenchmarkFixture[] {
  const heavyTiers: ScaleTier[] = ['stress', 'extreme']
  return heavyTiers.map((tier) =>
    createBenchmarkFixture(SCALE_TIERS[tier], {
      heavyConfig: {
        mountCost: 50,
        unmountCost: 30,
        memoryMB: 5,
        type: 'mixed',
      },
    })
  )
}

interface BenchmarkFixtureOptions {
  heavyConfig?: HeavyComponentConfig
}

function createBenchmarkFixture(
  config: ScaleConfig,
  options: BenchmarkFixtureOptions = {}
): BenchmarkFixture {
  const metrics: GridMetrics = {
    columnWidth: 96,
    gapX: 12,
    gapY: 12,
    paddingLeft: 24,
    paddingTop: 24,
    rowHeight: 72,
  }

  const constraints: LayoutConstraints = {
    columns: config.columns,
  }

  const nodes = createGridNodes(config.itemCount, config.columns)
  const focusNode = nodes[Math.floor(nodes.length * 0.55)] ?? nodes[0]
  const secondaryNode = nodes[Math.floor(nodes.length * 0.56)] ?? nodes[1] ?? focusNode
  const tertiaryNode = nodes[Math.floor(nodes.length * 0.57)] ?? nodes[2] ?? secondaryNode

  if (focusNode == null || secondaryNode == null || tertiaryNode == null) {
    throw new Error('Benchmark fixture requires at least three nodes.')
  }

  const heavyConfig = options.heavyConfig ?? inferHeavyConfig(config.tier, config.itemCount)

  return {
    activeIds: [focusNode.id, secondaryNode.id],
    constraints,
    description: `${config.itemCount} items in ${config.columns} columns grid`,
    heavyConfig,
    interactionOperations: [
      {
        id: focusNode.id,
        placement: {
          x: Math.max(0, Math.min(config.columns - focusNode.w, focusNode.x + 1)),
          y: focusNode.y + 2,
        },
        type: 'move',
      },
      {
        id: secondaryNode.id,
        size: {
          h: secondaryNode.h + 1,
          w: Math.min(config.columns - secondaryNode.x, secondaryNode.w + 1),
        },
        type: 'resize',
      },
    ],
    metrics,
    moveOperation: {
      id: focusNode.id,
      placement: {
        x: Math.max(0, Math.min(config.columns - focusNode.w, focusNode.x + 2)),
        y: focusNode.y + 3,
      },
      type: 'move',
    },
    name: config.name,
    nodes,
    resizeOperation: {
      id: tertiaryNode.id,
      size: {
        h: tertiaryNode.h + 1,
        w: Math.min(config.columns - tertiaryNode.x, tertiaryNode.w + 1),
      },
      type: 'resize',
    },
    transactionOperations: [
      {
        id: focusNode.id,
        placement: {
          x: Math.max(0, Math.min(config.columns - focusNode.w, focusNode.x + 1)),
          y: focusNode.y + 1,
        },
        type: 'move',
      },
      {
        id: secondaryNode.id,
        placement: {
          x: Math.max(0, Math.min(config.columns - secondaryNode.w, secondaryNode.x + 2)),
          y: secondaryNode.y + 2,
        },
        type: 'move',
      },
      {
        id: tertiaryNode.id,
        size: {
          h: tertiaryNode.h + 1,
          w: Math.min(config.columns - tertiaryNode.x, tertiaryNode.w + 1),
        },
        type: 'resize',
      },
    ],
    viewport: config.viewport,
  }
}

function createGridNodes(
  itemCount: number,
  columns: number,
  options: { staticRatio?: number } = {}
): LayoutNode<BenchmarkNodeData>[] {
  const nodes: LayoutNode<BenchmarkNodeData>[] = []
  let x = 0
  let y = 0
  const staticRatio = options.staticRatio ?? 0.02 // 2% static nodes

  for (let index = 0; index < itemCount; index += 1) {
    const width = index % 11 === 0 ? 4 : index % 5 === 0 ? 3 : 2
    const clampedWidth = Math.min(width, columns)

    if (x + clampedWidth > columns) {
      x = 0
      y += 3
    }

    const complexity: BenchmarkNodeData['complexity'] =
      index % 10 === 0 ? 'heavy' : index % 3 === 0 ? 'medium' : 'light'

    nodes.push({
      data: {
        complexity,
        kind: inferNodeKind(index),
        seed: index,
        weight: complexity === 'heavy' ? 10 : complexity === 'medium' ? 5 : 1,
      },
      h: 2 + (index % 3),
      id: `node-${index}`,
      pinned: index % 73 === 0 && index > 0, // Some pinned nodes
      static: index < itemCount * staticRatio || index % 37 === 0,
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
  if (index % 7 === 0) return 'editor'
  if (index % 3 === 0) return 'table'
  return 'chart'
}

function inferHeavyConfig(tier: ScaleTier, itemCount: number): HeavyComponentConfig {
  const configs: Record<ScaleTier, HeavyComponentConfig> = {
    small: { mountCost: 10, unmountCost: 5, memoryMB: 1, type: 'mixed' },
    medium: { mountCost: 20, unmountCost: 10, memoryMB: 2, type: 'mixed' },
    large: { mountCost: 30, unmountCost: 15, memoryMB: 3, type: 'mixed' },
    xlarge: { mountCost: 40, unmountCost: 20, memoryMB: 4, type: 'mixed' },
    stress: { mountCost: 50, unmountCost: 30, memoryMB: 5, type: 'mixed' },
    extreme: { mountCost: 100, unmountCost: 60, memoryMB: 10, type: 'mixed' },
  }

  return configs[tier]
}
