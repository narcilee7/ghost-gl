# ghost-gl React Example

A complete React application demonstrating ghost-gl-react features.

## Features Demonstrated

### 1. Basic Grid
- Three-state materialization (ghost/shell/live)
- Automatic collision resolution
- Auto-compact layout
- Grid stats tracking

### 2. Draggable Grid
- Drag and drop with pointer events
- Undo/redo support
- Dynamic widget addition
- Visual feedback during drag

### 3. Virtualized Grid
- Large dataset handling (50-500 items)
- Configurable overscan
- Performance optimized rendering
- Scroll-based materialization

## Getting Started

### Install dependencies

```bash
# From the monorepo root
pnpm install

# Or from this directory
pnpm install
```

### Run the development server

```bash
pnpm dev
```

This will start the Vite dev server at `http://localhost:3000`.

### Build for production

```bash
pnpm build
```

## Project Structure

```
examples/react/
├── src/
│   ├── components/
│   │   ├── GhostGridExample.tsx      # Basic grid demo
│   │   ├── DraggableGridExample.tsx  # Drag & drop demo
│   │   └── VirtualizedGridExample.tsx # Virtualization demo
│   ├── App.tsx                       # Main app with tabs
│   ├── App.css                       # Styles
│   ├── index.css                     # Global styles
│   └── main.tsx                      # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Key Concepts

### Three-State Materialization

The grid automatically manages three rendering states:

- **Ghost**: Items outside viewport - not rendered (zero cost)
- **Shell**: Items entering viewport - skeleton placeholder (~30% cost)
- **Live**: Items in viewport - full component (100% cost)

### Drag and Drop

Uses `GhostGridDndProvider` and `useGhostGridDrag` hook:

```tsx
function DraggableItem({ nodeId }) {
  const { isDragging, handlers } = useGhostGridDrag({ nodeId })
  
  return (
    <div className={isDragging ? 'dragging' : ''} {...handlers}>
      Drag me!
    </div>
  )
}
```

### Virtualization

Large datasets are efficiently handled by only rendering visible items:

```tsx
<GhostGrid
  columns={12}
  rowHeight={50}
  overscan={2}  // Extra rows to render outside viewport
  initialNodes={hundredsOfItems}
/>
```

## Customization

### Styling Grid Items

Grid items receive their position via the `rect` parameter:

```tsx
<GhostGrid
  renderItem={({ node, rect, mode }) => (
    <div style={{
      position: 'absolute',
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }}>
      Content
    </div>
  )}
/>
```

### Handling State Changes

Subscribe to grid state updates:

```tsx
<GhostGrid
  onStateChange={(state) => {
    console.log('Can undo:', state.canUndo)
    console.log('Nodes:', state.nodes.length)
  }}
/>
```

## Learn More

- [ghost-gl Documentation](../../README.md)
- [React Package](../../packages/react/README.md)
- [Core Package](../../packages/core/README.md)
