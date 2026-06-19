# ghost-gl

<p align="center">
  <strong>High-performance virtualized grid layout engine for heavy components</strong>
</p>

<p align="center">
  <a href="https://github.com/narcilee7/ghost-gl/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/narcilee7/ghost-gl" alt="License" />
  </a>
  <a href="https://www.npmjs.com/package/ghost-gl-core">
    <img src="https://img.shields.io/npm/v/ghost-gl-core" alt="npm version" />
  </a>
  <a href="https://github.com/narcilee7/ghost-gl/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/narcilee7/ghost-gl/ci.yml" alt="CI" />
  </a>
</p>

> **⚠️ Project Status**: Core engine and React/Vue adapters are production ready. React Native and Lynx adapters are in development. See [Roadmap](#roadmap) for details.

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
# Core engine
npm install ghost-gl-core

# Framework adapters
npm install ghost-gl-react       # React (production ready)
npm install ghost-gl-vue         # Vue 3 (production ready)
npm install ghost-gl-react-native # React Native (in development)
npm install ghost-gl-lynx        # Lynx (in development)
```

## Quick Start

### React

```tsx
import { GhostGrid } from 'ghost-gl-react'
import type { LayoutNode } from 'ghost-gl-core'

function Dashboard() {
  const nodes: LayoutNode<{ title: string }>[] = [
    { id: '1', x: 0, y: 0, w: 4, h: 3, data: { title: 'Chart A' } },
    { id: '2', x: 4, y: 0, w: 4, h: 3, data: { title: 'Editor B' } },
    { id: '3', x: 0, y: 3, w: 8, h: 4, data: { title: 'Table C' } },
  ]

  return (
    <GhostGrid
      columns={12}
      rowHeight={50}
      initialNodes={nodes}
      policy={{ collisionDirection: 'vertical', autoCompact: true }}
      renderItem={({ node, rect, mode }) => {
        switch (mode) {
          case 'ghost':
            return null
          case 'shell':
            return <Skeleton style={rect} />
          case 'live':
            return <HeavyWidget style={rect} data={node.data} />
        }
      }}
    />
  )
}
```

### Vue

```vue
<script setup lang="ts">
import { GhostGrid } from 'ghost-gl-vue'

const nodes = [
  { id: '1', x: 0, y: 0, w: 4, h: 3, data: { title: 'Chart A' } },
  { id: '2', x: 4, y: 0, w: 4, h: 3, data: { title: 'Editor B' } },
]
</script>

<template>
  <GhostGrid
    :columns="12"
    :row-height="50"
    :initial-nodes="nodes"
    :policy="{ collisionDirection: 'vertical', autoCompact: true }"
  >
    <template #default="{ node, rect, mode }">
      <div :style="{ position: 'absolute', ...rect }">
        {{ mode === 'live' ? node.data.title : 'Loading...' }}
      </div>
    </template>
  </GhostGrid>
</template>
```

## Three-State Materialization Model

ghost-gl's core innovation is the **budget-driven materialization scheduler** that manages three component states:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  GHOST  │────▶│  SHELL  │────▶│  LIVE   │
│  ~0ms   │     │  ~30%   │     │  100%   │
└─────────┘     └─────────┘     └─────────┘
  Layout          Skeleton        Full mount
  only          placeholder     + interaction
```

### State Transitions

- **Ghost → Shell**: Component enters viewport, show skeleton placeholder
- **Shell → Live**: Frame budget allows, mount full component
- **Live → Shell**: Component leaves viewport during scroll, preserve snapshot
- **Shell → Ghost**: Component far outside viewport, full cleanup

### Budget Guarantee

The scheduler ensures **never more than 16ms of mount/unmount work per frame**.

## Packages

| Package | Status | Description |
|---------|--------|-------------|
| `ghost-gl-core` | ✅ | Core layout engine |
| `ghost-gl-adapter-core` | ✅ | Framework-agnostic host bridge |
| `ghost-gl-react` | ✅ | React adapter (production) |
| `ghost-gl-vue` | ✅ | Vue 3 adapter (production) |
| `ghost-gl-react-native` | 🚧 | React Native adapter (in development) |
| `ghost-gl-lynx` | 🚧 | Lynx adapter (in development) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Host (React / Vue / RN / Lynx)                │
├─────────────────────────────────────────────────────────────┤
│                   ghost-gl-adapter-core                    │
│              (createGridHost - framework agnostic)           │
├─────────────────────────────────────────────────────────────┤
│                      ghost-gl-core                        │
│  RuntimeController │ SpatialKernel │ Scheduler             │
│  - collision      │ - RBush R-tree │ - 3-state         │
│  - compact        │ - O(log n)     │ - budget-driven    │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Headless Core**: All logic in `ghost-gl-core`, framework bindings are thin adapters
2. **Budget-First**: Never exceed 16ms frame budget for materialization
3. **Spatial Locality**: RBush R-tree for efficient viewport queries
4. **Immutable State**: All mutations through transactions with undo/redo
5. **Observable**: Event-driven with debounced subscriptions

## Documentation

📖 **Documentation Site**: https://narcilee7.github.io/ghost-gl/

- [Introduction](https://narcilee7.github.io/ghost-gl/guide/introduction)
- [Installation](https://narcilee7.github.io/ghost-gl/guide/installation)
- [Quick Start](https://narcilee7.github.io/ghost-gl/guide/quick-start)
- [Concepts](https://narcilee7.github.io/ghost-gl/guide/concepts)
- [API Reference](https://narcilee7.github.io/ghost-gl/api/core/overview)

## Development

```bash
# Clone repository
git clone https://github.com/narcilee7/ghost-gl.git
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

# Run documentation site
cd docs && pnpm dev
```

### Project Structure

```
ghost-gl/
├── packages/
│   ├── core/              # Core layout engine
│   ├── adapter-core/      # Framework-agnostic host bridge
│   ├── react/            # React adapter (production)
│   ├── vue/              # Vue 3 adapter (production)
│   ├── react-native/     # React Native adapter (in dev)
│   └── lynx/            # Lynx adapter (in dev)
├── apps/
│   └── bench-web/       # Browser benchmark dashboard
├── docs/                 # Documentation site (rspress)
├── examples/              # Framework examples
└── e2e/                 # E2E tests
```

## Roadmap

### ✅ Completed
- [x] Core layout engine with collision resolution
- [x] RBush spatial indexing
- [x] Budget-driven materialization scheduler
- [x] Transaction system with undo/redo
- [x] React bindings (`ghost-gl-react`)
- [x] Vue bindings (`ghost-gl-vue`)
- [x] Documentation site

### 🚧 In Development
- [ ] React Native bindings (`ghost-gl-react-native`)
- [ ] Lynx bindings (`ghost-gl-lynx`)

### 📋 Planned
- [ ] Animation support (FLIP transitions)
- [ ] Touch/mobile gestures
- [ ] Performance monitoring API
- [ ] Server-side rendering support
- [ ] Layout templates/presets

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © [ghost-gl contributors](https://github.com/narcilee7/ghost-gl/graphs/contributors)

---
