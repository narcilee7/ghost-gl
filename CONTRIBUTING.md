# Contributing to ghost-gl

Thank you for your interest in contributing to ghost-gl! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept responsibility and apologize when mistakes happen

## Getting Started

### Prerequisites

- **Node.js** >= 20.19.0
- **pnpm** >= 10.0.0
- **Git**

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ghost-gl.git
cd ghost-gl

# Install dependencies
pnpm install

# Verify setup
pnpm build
pnpm test
```

## Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development mode with watchers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Check code style |
| `pnpm lint:fix` | Fix code style issues |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm bench` | Run performance benchmarks |

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write tests for new functionality
   - Ensure all tests pass
   - Update documentation if needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, semicolons)
   - `refactor:` Code refactoring
   - `perf:` Performance improvements
   - `test:` Adding or updating tests
   - `chore:` Build process or auxiliary tool changes

4. **Push and create PR**
   ```bash
   git push origin feat/your-feature-name
   ```

## Project Structure

```
ghost-gl/
├── packages/
│   ├── core/              # Headless layout engine
│   │   ├── src/           # Source code
│   │   ├── src/**/*.test.ts  # Co-located tests
│   │   └── bench/         # Benchmarks
│   ├── react/             # React bindings
│   └── vue/               # Vue bindings (planned)
├── apps/
│   └── bench-web/         # Interactive benchmark dashboard
├── examples/              # Usage examples
└── p_docs/                # Internal architecture documentation
```

### Package Naming

- Core: `ghost-gl-core`
- React: `ghost-gl-react`
- Vue: `ghost-gl-vue`

## Coding Standards

### TypeScript

- **Strict mode enabled** - no `any` without justification
- **Explicit return types** on public APIs
- **JSDoc comments** for all exported functions and types

```typescript
/**
 * Plans materialization for visible nodes within viewport
 * @param input - Materialization planning parameters
 * @returns Planned materialization decisions with budget summary
 */
export function planMaterialization(
  input: PlanMaterializationInput
): SchedulerPlan {
  // implementation
}
```

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check style
pnpm lint

# Fix style issues
pnpm lint:fix
```

### File Organization

```
src/
├── feature/
│   ├── index.ts           # Public exports
│   ├── feature.ts         # Main implementation
│   ├── feature.test.ts    # Tests (co-located)
│   └── types.ts           # Feature-specific types (if needed)
```

## Testing

### Test Philosophy

- **Co-located tests**: `feature.test.ts` alongside `feature.ts`
- **Unit tests first**: Test functions in isolation
- **Integration tests**: Test feature interactions
- **Performance tests**: Benchmarks in `bench/` directory

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter ghost-gl-core test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test --coverage
```

### Writing Tests

```typescript
import { describe, expect, it } from 'vitest'
import { myFunction } from './my-feature'

describe('myFeature', () => {
  it('should handle basic case', () => {
    const result = myFunction({ input: 'test' })
    expect(result).toEqual({ output: 'test' })
  })

  it('should handle edge cases', () => {
    expect(() => myFunction({ input: null })).toThrow()
  })
})
```

### Benchmarks

Performance is critical. Add benchmarks for performance-sensitive code:

```bash
# Run all benchmarks
pnpm bench

# Run specific benchmark
pnpm bench:core
pnpm bench:heavy
pnpm bench:stress
```

## Submitting Changes

### Pull Request Process

1. **Ensure tests pass**
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

2. **Update documentation**
   - Update README.md if API changes
   - Add JSDoc comments
   - Update examples if relevant

3. **Add changeset** (for user-facing changes)
   ```bash
   pnpm changeset
   ```
   - Select packages affected
   - Choose semver bump (patch/minor/major)
   - Write summary

4. **Create PR**
   - Clear title and description
   - Reference any related issues
   - Include screenshots/GIFs for UI changes

### PR Review Process

- All PRs require at least one review
- CI checks must pass
- Maintainers may request changes
- Squash merging is preferred

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Add a changeset
pnpm changeset

# Version packages (maintainers only)
pnpm version-packages

# Publish packages (maintainers only)
pnpm release
```

## Release Process

1. **Automated**: Changesets bot tracks changes
2. **Version PR**: Created automatically with version bumps
3. **Merge**: Merging version PR triggers release
4. **Publish**: Packages published to npm with provenance

## Questions?

- Open a [Discussion](https://github.com/ghost-gl/ghost-gl/discussions) for questions
- Open an [Issue](https://github.com/ghost-gl/ghost-gl/issues) for bugs
- Join our Discord (coming soon)

Thank you for contributing! 🎉
