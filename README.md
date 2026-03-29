# ghost-gl

<p align="center">
  <strong>High-performance virtualized grid layout engine for heavy components</strong>
</p>

<p align="center">
  <a href="https://github.com/ghost-gl/ghost-gl/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/ghost-gl-core" alt="License" />
  </a>
  <a href="https://www.npmjs.com/package/ghost-gl-core">
    <img src="https://img.shields.io/npm/v/ghost-gl-core" alt="npm version" />
  </a>
  <a href="https://github.com/ghost-gl/ghost-gl/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/ghost-gl/ghost-gl/ci.yml" alt="CI" />
  </a>
  <a href="https://codecov.io/gh/ghost-gl/ghost-gl">
    <img src="https://img.shields.io/codecov/c/github/ghost-gl/ghost-gl" alt="Coverage" />
  </a>
</p>

---

## What is ghost-gl?

`ghost-gl` is a **budget-driven virtualization engine** for draggable, resizable grid layouts. Unlike traditional virtualization libraries that focus on simple lists, ghost-gl is optimized for **heavy components**—charts, code editors, complex tables—with mount costs ranging from 10ms to 100ms+.

### Key Differentiators

| Feature | react-window | react-grid-layout | **ghost-gl** |
|---------|--------------|-------------------|--------------|
| Virtualization | ✅ Lists | ❌ | ✅ **Grid + Heavy components** |
| Spatial Index | O(n) scan | O(n) scan | **O(log n) RBush** |
| Component Cost Model | Lightweight | N/A | **Ghost/Shell/Live states** |
| Frame Budget Guarantee | ❌ | ❌ | **< 16ms per frame** |
| Auto-compact Layout | ❌ | ✅ | ✅ |
| Multi-direction Collision | ❌ | Vertical | **Vertical/Horizontal/Both** |

### Performance Benchmarks

```
Viewport Query Performance (ops/sec):
┌──────────────┬─────────────┬─────────────┬──────────┐
│ Items        │ ghost-gl    │ RGL (O(n))  │ Speedup  │
├──────────────┼─────────────┼─────────────┼──────────┤
│ 100          │ 865,000     │ 8,500       │ ~100x    │
│ 500          │ 177,000     │ 1,700       │ ~100x    │
│ 1,600        │ 58,000      │ 520         │ ~110x    │
│ 10,000       │ 9,200       │ 85          │ ~108x    │
└──────────────┴─────────────┴─────────────┴──────────┘
```

## Installation

```bash
# npm
npm install ghost-gl-core

# pnpm
pnpm add ghost-gl-core

# yarn
yarn add ghost-gl-core
```

### Framework Bindings

```bash
# React (coming soon)
npm install ghost-gl-react

# Vue (planned)
npm install ghost-gl-vue
```

## Quick Start

### Basic Usage (Headless)

```typescript
import { LayoutRuntime, LayoutNode } from 'ghost-gl-core'

// Define your grid items
const nodes: LayoutNode<{ title: string }>[] = [
  { id: 'widget-1', x: 0, y: 0, w: 4, h: 3, data: { title: 'Chart A' } },
  { id: 'widget-2', x: 4, y: 0, w: 4, h: 3, data: { title: 'Editor B' } },
  { id: 'widget-3', x: 0, y: 3, w: 8, h: 4, data: { title: 'Table C' } },
]

// Create runtime with 12-column grid
const runtime = new LayoutRuntime({
  nodes,
  columns: 12,
  rowHeight: 30,
  policy: {
    collisionDirection: 'vertical',
    autoCompact: true,
  },
})

// Subscribe to state changes
const unsubscribe = runtime.controller.subscribe((state) => {
  console.log('Visible nodes:', state.materialized)
  console.log('Can undo:', state.canUndo)
  console.log('Can redo:', state.canRedo)
})

// Plan materialization based on viewport
const plan = runtime.controller.planMaterialization({
  viewport: { left: 0, top: 0, width: 1200, height: 600 },
  overscan: 2, // Extra rows to render outside viewport
})

// Execute transaction to move a node
const result = runtime.controller.applyTransaction({
  operations: [
    {
      type: 'move',
      id: 'widget-1',
      position: { x: 2, y: 0 },
    },
  ],
})

// Cleanup
unsubscribe()
runtime.dispose()
```

### React Integration (Coming Soon)

```tsx
import { GhostGrid } from 'ghost-gl-react'
import { LayoutNode } from 'ghost-gl-core'

function Dashboard() {
  const nodes: LayoutNode[] = [
    { id: '1', x: 0, y: 0, w: 4, h: 3 },
    { id: '2', x: 4, y: 0, w: 4, h: 3 },
  ]

  return (
    <GhostGrid
      nodes={nodes}
      renderItem={({ node, rect }) => {
        // node.mode is 'ghost' | 'shell' | 'live'
        switch (node.mode) {
          case 'ghost':
            return <GhostPlaceholder rect={rect} />
          case 'shell':
            return <WidgetShell title={node.data.title} rect={rect} />
          case 'live':
            return <HeavyChartWidget data={node.data} rect={rect} />
        }
      }}
    />
  )
}
```

## Three-State Materialization Model

ghost-gl's core innovation is the **budget-driven materialization scheduler** that manages three component states:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  GHOST  │────▶│  SHELL  │────▶│  LIVE   │
│  ~0ms   │     │  ~30%   │     │  100%   │
└─────────┘     └─────────┘     └─────────┘
  Layout          Skeleton        Full mount
  only            placeholder     + interaction
```

### State Transitions

- **Ghost → Shell**: Component enters viewport, show skeleton placeholder
- **Shell → Live**: Frame budget allows, mount full component
- **Live → Shell**: Component leaves viewport during scroll, preserve snapshot
- **Shell → Ghost**: Component far outside viewport, full cleanup

### Budget Guarantee

The scheduler ensures **never more than 16ms of mount/unmount work per frame**:

```typescript
const plan = runtime.controller.planMaterialization({
  viewport: { left: 0, top: 0, width: 1200, height: 800 },
  profile: 'scrolling', // 'idle' | 'scrolling' | 'interacting'
  budget: {
    mountBudget: 8,      // ms per frame for mounting
    unmountBudget: 4,    // ms per frame for cleanup
    maxMountsPerFrame: 3,
  },
})

// Plan.summary.mountsWithinBudget guarantees frame time
```

## API Reference

### Core Classes

#### `LayoutRuntime`

Main entry point combining layout engine, spatial index, and controller.

```typescript
class LayoutRuntime<TData = unknown> {
  constructor(options: LayoutRuntimeOptions<TData>)
  
  readonly controller: RuntimeController<TData>
  readonly kernel: SpatialKernel<TData>
  
  dispose(): void
}
```

#### `RuntimeController`

Event-driven facade for all operations.

```typescript
class RuntimeController<TData = unknown> {
  // Event subscription
  on<K extends keyof RuntimeControllerEvents<TData>>(
    event: K,
    listener: RuntimeControllerEvents<TData>[K]
  ): () => void
  
  // Debounced state subscription
  subscribe(
    listener: (state: RuntimeControllerState<TData>) => void,
    options?: { debounceMs?: number; nodeFilter?: string[] }
  ): () => void
  
  // Operations
  applyTransaction(options: LayoutTransactionOptions): LayoutTransactionResult
  applyOperation(options: LayoutOperationOptions): LayoutOperationResult
  
  // Materialization planning
  planMaterialization(input: MaterializationPlanInput): MaterializationPlanResult
  
  // History
  undo(): boolean
  redo(): boolean
  canUndo: boolean
  canRedo: boolean
  
  // State
  getState(): RuntimeControllerState<TData>
}
```

### Layout Operations

```typescript
// Move a node (with collision resolution)
runtime.controller.applyOperation({
  type: 'move',
  id: 'widget-1',
  position: { x: 4, y: 2 },
})

// Resize a node
runtime.controller.applyOperation({
  type: 'resize',
  id: 'widget-1',
  size: { w: 6, h: 4 },
  anchor: 'se', // Resize from southeast corner
})

// Batch multiple operations in a transaction
runtime.controller.applyTransaction({
  operations: [
    { type: 'move', id: 'w1', position: { x: 0, y: 0 } },
    { type: 'resize', id: 'w2', size: { w: 4, h: 3 } },
    { type: 'insert', node: { id: 'w3', x: 8, y: 0, w: 4, h: 3 } },
  ],
})
```

### Spatial Queries

```typescript
// Direct kernel access for advanced queries
const kernel = runtime.kernel

// Viewport query with overscan
const visible = kernel.queryViewport(
  { left: 0, top: 0, width: 1200, height: 600 },
  2 // overscan rows
)

// Collision detection
const collisions = kernel.queryCollisions({
  x: 4, y: 2, w: 4, h: 3,
  excludeId: 'widget-1',
})

// K-nearest neighbors
const nearest = kernel.queryKNearest(4, 2, 3)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Host (React/Vue)                        │
├─────────────────────────────────────────────────────────────┤
│  RuntimeController  │  InteractionManager  │  HistoryManager │
├─────────────────────┴──────────────────────┴────────────────┤
│                    LayoutRuntime (facade)                    │
├─────────────────────────────────────────────────────────────┤
│  LayoutEngine       │  SpatialKernel       │  Scheduler      │
│  - collision resolve│  - RBush R-tree      │  - 3-state      │
│  - compact          │  - O(log n) queries  │  - budget-driven│
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Headless Core**: Framework-agnostic engine, thin framework bindings
2. **Budget-First**: Frame time guarantees over eager rendering
3. **Spatial Locality**: RBush R-tree for efficient viewport queries
4. **Immutable State**: All mutations through transactions with undo/redo
5. **Observable**: Event-driven architecture with debounced subscriptions

## Development

```bash
# Clone repository
git clone https://github.com/ghost-gl/ghost-gl.git
cd ghost-gl

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run benchmarks
pnpm --filter ghost-gl-core bench

# Build packages
pnpm build

# Lint and format
pnpm lint
pnpm format
```

### Project Structure

```
ghost-gl/
├── packages/
│   ├── core/          # Headless layout engine (this package)
│   ├── react/         # React bindings (coming soon)
│   └── vue/           # Vue bindings (planned)
├── apps/
│   ├── bench-web/     # Interactive benchmark dashboard
│   └── docs/          # Documentation site (planned)
├── examples/          # Usage examples
└── p_docs/            # Internal architecture docs
```

## Roadmap

### Q2 2025
- [x] Core layout engine with collision resolution
- [x] RBush spatial indexing
- [x] Budget-driven materialization scheduler
- [x] Transaction system with undo/redo
- [ ] React bindings (`ghost-gl-react`)
- [ ] Basic documentation site

### Q3 2025
- [ ] Vue bindings (`ghost-gl-vue`)
- [ ] Animation support (FLIP transitions)
- [ ] Touch/mobile gestures
- [ ] Performance monitoring API

### Q4 2025
- [ ] Server-side rendering support
- [ ] Persistence adapters (localStorage, IndexedDB)
- [ ] Layout templates/presets
- [ ] Accessibility audit

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © [ghost-gl contributors](https://github.com/ghost-gl/ghost-gl/graphs/contributors)

---

<p align="center">
  Built for dashboards that matter. 🎯
</p>
