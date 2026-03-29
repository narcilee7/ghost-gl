# ghost-gl - Agent Guide

> This document contains essential information for AI coding agents working on the ghost-gl project.

## Project Overview

**ghost-gl** is a headless virtualized grid runtime designed specifically for heavy components (heavy widgets) scenarios. Unlike traditional grid layout libraries like React-Grid-Layout (RGL), ghost-gl solves performance bottlenecks by decoupling layout calculation from component rendering.

### Core Problem Solved

- **Rendering bottleneck**: Traditional grid libraries must mount all child components
- **Memory bottleneck**: All component instances stay resident in memory
- **Interaction bottleneck**: Drag operations trigger synchronous reflows

### Three-State Materialization Model

ghost-gl introduces a unique three-state materialization model:

- **`ghost`**: Pure mathematical existence (no DOM, no component instance) - participates in layout/collision but zero rendering cost
- **`shell`**: Lightweight container with placeholder UI - handles hit-test, selection, drag handles, pre-warming
- **`live`**: Full heavy component mounted - only when necessary

### Target Users

- Dashboard / BI platforms
- Low-code page editors
- Workbench / IDE-style multi-panel applications
- Systems needing to accommodate large numbers of charts, tables, editor instances

## Technology Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.9+ |
| Package Manager | pnpm 10.27.0 |
| Monorepo | pnpm workspaces + Turbo 2.5 |
| Build Tool | tsup |
| Testing | Vitest |
| Lint/Format | Biome |
| Versioning | Changesets |
| Runtime | Node.js >= 20.19.0 |

## Project Structure

```
ghost-gl/
├── packages/
│   ├── core/              # Headless layout runtime (pure TypeScript)
│   │   ├── src/
│   │   │   ├── types.ts         # Core type definitions
│   │   │   ├── layout.ts        # Layout kernel with RBush spatial index
│   │   │   ├── runtime.ts       # LayoutRuntime class
│   │   │   ├── controller.ts    # RuntimeController facade
│   │   │   ├── operations.ts    # Layout operations (move/resize/upsert/remove)
│   │   │   ├── transactions.ts  # Atomic batch operations
│   │   │   ├── history.ts       # Undo/redo system
│   │   │   ├── interaction.ts   # Drag/resize interaction sessions
│   │   │   ├── constraints.ts   # Layout constraint validation
│   │   │   ├── geometry.ts      # Geometric calculations
│   │   │   ├── viewport.ts      # Viewport queries
│   │   │   └── internal/
│   │   │       ├── scheduler.ts         # ghost/shell/live scheduler
│   │   │       ├── interaction-bridge.ts # Preview to scheduler bridge
│   │   │       └── scheduler.test.ts
│   │   └── bench/         # Benchmark fixtures and runners
│   └── react/             # React host package (minimal stub)
│       └── src/
│           ├── index.ts         # GhostGrid component (stub)
│           └── index.test.tsx
├── apps/
│   ├── playground/        # Manual debugging and API validation (empty)
│   └── bench-web/         # Browser performance benchmarks (empty)
├── p_docs/               # Project documentation (in Chinese)
│   ├── 项目蓝图.md            # Project blueprint
│   ├── 核心架构设计.md        # Core architecture design
│   ├── 产品目标.md            # Product goals
│   ├── ADR-001-react-first.md
│   ├── ADR-002-materialization-三态模型.md
│   ├── Benchmark-Spec.md
│   ├── 长期规划路线图.md      # Long-term roadmap
│   ├── 底座现状与TODO.md      # Current status & TODO
│   └── 多平台架构设计.md      # Cross-platform architecture design
├── package.json          # Root package.json
├── pnpm-workspace.yaml   # Workspace configuration
├── turbo.json            # Turbo task configuration
├── tsconfig.base.json    # Shared TypeScript config
├── tsconfig.json         # Root TypeScript config
└── biome.json            # Biome lint/format configuration
```

## Package Details

### ghost-gl-core

**Location**: `packages/core/`

**Purpose**: Headless layout runtime - zero UI dependencies

**Key Dependencies**:
- `nanoevents` - Event emitter for controller
- `rbush` - R-tree spatial index for collision detection

**Exports**:
- `LayoutRuntime` - Core runtime state management
- `RuntimeController` - Host-facing facade with events/history/interaction
- `LayoutNode`, `LayoutRect`, `MaterializedNode` - Core types
- `GridMetrics`, `Rect` - Geometry types
- `applyLayoutOperation`, `applyLayoutTransaction` - Operations
- `createInteractionSession`, `commitInteraction`, etc. - Interaction
- `queryViewport` - Viewport queries

**Scripts**:
```bash
pnpm --filter ghost-gl-core bench      # Run benchmarks
pnpm --filter ghost-gl-core build      # Build with tsup
pnpm --filter ghost-gl-core test       # Run vitest
pnpm --filter ghost-gl-core typecheck  # TypeScript check
```

### ghost-gl-react

**Location**: `packages/react/`

**Purpose**: React host package (currently stub implementation)

**Dependencies**:
- `ghost-gl-core` (workspace)
- `react`, `react-dom` (peer dependencies >= 18)

**Current State**: Minimal stub with `GhostGrid` component returning `null`

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode (watch)
pnpm dev

# Run tests
pnpm test

# Run benchmarks
pnpm bench:core

# Lint
pnpm lint

# Lint and fix
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm typecheck

# Full verification (lint + typecheck + test + build)
pnpm verify

# Clean build artifacts
pnpm clean

# Versioning with changesets
pnpm changeset
pnpm release:version
pnpm release:publish
```

## Code Style Guidelines

The project uses **Biome** for linting and formatting.

**Key Style Rules**:
- Indent: 2 spaces
- Line width: 100 characters
- Quotes: single
- Semicolons: as needed
- Trailing commas: ES5

**TypeScript Configuration**:
- Target: ES2022
- Module: ESNext
- Module Resolution: Bundler
- Strict mode enabled
- `noUncheckedIndexedAccess`: true
- `exactOptionalPropertyTypes`: true

## Testing Strategy

**Framework**: Vitest

**Test File Convention**: Co-located with source files using `.test.ts` suffix

**Current Test Coverage**:
- `packages/core/src/*.test.ts` - Unit tests for each module
- `packages/core/src/internal/*.test.ts` - Internal module tests
- `packages/react/src/index.test.tsx` - React package tests

**Running Tests**:
```bash
# All tests
pnpm test

# Single package
pnpm --filter ghost-gl-core test
```

## Architecture Principles

### 1. Core Layer Independence
- `packages/core` must have zero DOM/React dependencies
- Platform-neutral data structures and event models
- Can run in: Browser, Node.js, React Native, Lynx (QuickJS)

### 2. Three-State Materialization
```typescript
type MaterializationMode = 'ghost' | 'shell' | 'live';

interface MaterializedNode<TData> {
  id: string;
  rect: Rect;
  mode: MaterializationMode;
  reason: 'visible' | 'overscan' | 'dragging' | 'cooldown' | 'parked';
  node: LayoutNode<TData>;
}
```

### 3. Layout-Rendering Decoupling
- Layout engine only knows `x, y, w, h`
- Rendering layer is stateless projection of layout engine
- No forced reflow in hot paths

### 4. Operation-Based State Changes
All layout modifications go through operation model:
- `move` - Move node to new position
- `resize` - Resize node
- `upsert` - Insert or update node
- `remove` - Remove node
- `replace` - Replace all nodes

### 5. Transactional Updates
Multiple operations can be batched atomically with undo/redo support.

## Key Design Decisions

### ADR-001: React-first, not cross-platform-first
- Phase 1 focuses only on React/Web
- Cross-platform design remains in type boundaries but not implemented
- Benchmark proof required before platform expansion

### ADR-002: Three-state materialization
- `ghost/shell/live` is core abstraction, not optimization detail
- Allows pre-warming and cold-start mitigation
- Separates interaction layer from heavy component lifecycle

### Layout Kernel
- Uses RBush for O(log n) spatial queries
- Deterministic downward push collision resolution
- Static blocker support

### Scheduler
- Controls ghost/shell/live transitions
- Respects overscan and cooldown periods
- Fast-scroll detection (>1200px/s)
- Active node pinning during interactions

## Current Development Status

### Completed (Base Ready)
- [x] Layout kernel with spatial index
- [x] Operation and transaction model
- [x] History/undo-redo system
- [x] Interaction sessions (drag/resize)
- [x] Three-state materialization scheduler
- [x] RuntimeController facade
- [x] Constraint validation
- [x] Basic benchmark harness

### In Progress / TODO
- [ ] React host adapter implementation
- [ ] Benchmark regression system
- [ ] Layout policy refinement (compact, more collision policies)
- [ ] Controller event system completion
- [ ] Snapshot adapter lifecycle
- [ ] Budget-driven scheduler profiles

### Phase 1 Deliverables (MVP)
1. React/Web working integration
2. Fixed column count, fixed row height grid
3. Vertical scroll virtualization
4. Drag/resize with collision
5. ghost/shell/live three-state
6. Snapshot adapter protocol

## Dependencies Guidelines

### Core Package
- **Allowed**: Zero-dependency libraries (RBush, nanoevents)
- **Not Allowed**: React, DOM APIs, platform-specific code

### React Package
- **Peer Dependencies**: react >= 18, react-dom >= 18
- **Dependencies**: ghost-gl-core

## Security Considerations

- No user input directly evaluated
- No dynamic code execution
- Layout operations validate constraints before applying
- TypeScript strict mode enabled

## Contact & Contribution

- License: MIT
- Package Manager: pnpm
- Node Version: >= 20.19.0
