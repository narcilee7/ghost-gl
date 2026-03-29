# ghost-gl Examples

This directory contains usage examples for ghost-gl.

## Available Examples

### [basic-usage.ts](./basic-usage.ts)

A comprehensive introduction to ghost-gl covering:
- Creating a `LayoutRuntime`
- Subscribing to state changes
- Moving and resizing nodes
- Planning materialization
- Transaction and undo/redo

**Run it:**
```bash
npx tsx examples/basic-usage.ts
```

### [materialization-scheduler.ts](./materialization-scheduler.ts)

Demonstrates the three-state materialization model:
- Ghost, Shell, and Live states
- Profile-based scheduling (idle/scrolling/interacting)
- Frame budget compliance
- Custom budget configuration

**Run it:**
```bash
npx tsx examples/materialization-scheduler.ts
```

## More Examples Coming Soon

- **React Integration**: Using `GhostGrid` component
- **Collision Resolution**: Multi-direction collision handling
- **Auto-compact Layout**: Automatic space optimization
- **Custom Constraints**: Validation and boundary enforcement
- **History Management**: Undo/redo with snapshots

## Contributing

Have an example you'd like to share? See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
