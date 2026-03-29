# ghost-gl Agent Guide

This document provides context for AI agents working on the ghost-gl project.

## Project Overview

ghost-gl is a high-performance virtualized grid layout engine designed for **heavy components** (charts, editors, tables) with mount costs of 10-100ms+. It uses a three-state materialization model (ghost/shell/live) with budget-driven scheduling to guarantee frame time compliance.

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

## Key Design Principles

1. **Headless Core**: All logic in `ghost-gl-core`, framework bindings are thin adapters
2. **Budget-First**: Never exceed 16ms frame budget for materialization
3. **Immutable State**: All mutations through transactions
4. **Observable**: Event-driven with debounced subscriptions

## Important Files

- `packages/core/src/index.ts` - Public API exports
- `packages/core/src/controller.ts` - Main RuntimeController class
- `packages/core/src/runtime.ts` - LayoutRuntime facade
- `packages/core/src/spatial/kernel.ts` - RBush spatial indexing
- `packages/core/src/internal/scheduler.ts` - Materialization scheduler
- `packages/core/src/layout.ts` - Layout engine
- `packages/core/src/transactions.ts` - Transaction system

## Testing

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm bench          # Run benchmarks
```

## Code Style

- TypeScript strict mode enabled
- Biome for linting/formatting
- Co-located tests (`feature.test.ts` alongside `feature.ts`)
- Conventional commits

## Package Naming

- Core: `ghost-gl-core`
- React: `ghost-gl-react`
- Vue: `ghost-gl-vue`

## Release Process

Uses Changesets for version management:
1. `pnpm changeset` - Create changeset
2. `pnpm release:version` - Version packages
3. `pnpm release:publish` - Publish to npm

See RELEASE_CHECKLIST.md for full details.
