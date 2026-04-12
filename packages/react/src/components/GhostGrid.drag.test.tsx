import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GhostGrid } from './GhostGrid'
import { useGhostGridDrag } from '../hooks/useGhostGridDrag'

describe('GhostGrid Drag and Drop', () => {
  // Simple draggable item component for testing
  function TestDraggableItem({
    node,
    rect,
    mode,
  }: {
    node: { id: string; data?: { title: string } }
    rect: { width: number; height: number }
    mode: 'ghost' | 'shell' | 'live'
  }) {
    const { isDragging, handlers } = useGhostGridDrag({
      nodeId: node.id,
      disabled: mode !== 'live',
    })

    if (mode === 'ghost') return null
    if (mode === 'shell') return <div data-testid={`skeleton-${node.id}`}>Skeleton</div>

    return (
      <div
        data-testid={`draggable-${node.id}`}
        data-dragging={isDragging}
        {...handlers}
        style={{ width: rect.width, height: rect.height }}
      >
        {node.data?.title || 'No Title'}
      </div>
    )
  }

  it('should render GhostGrid with DnD provider', async () => {
    const initialNodes = [
      { id: '1', x: 0, y: 0, w: 3, h: 3, data: { title: 'Widget A' } },
    ]

    render(
      <GhostGrid
        columns={12}
        rowHeight={50}
        initialNodes={initialNodes}
        renderItem={({ node, rect, mode }) => (
          <TestDraggableItem node={node} rect={rect} mode={mode} />
        )}
      />
    )

    // Wait for grid to initialize and render live items
    await waitFor(() => {
      const item = screen.getByTestId('draggable-1')
      expect(item).toBeDefined()
    })
  })

  it('should handle pointer down to start drag', async () => {
    const initialNodes = [
      { id: '1', x: 0, y: 0, w: 3, h: 3, data: { title: 'Widget A' } },
    ]

    render(
      <GhostGrid
        columns={12}
        rowHeight={50}
        initialNodes={initialNodes}
        renderItem={({ node, rect, mode }) => (
          <TestDraggableItem node={node} rect={rect} mode={mode} />
        )}
      />
    )

    // Wait for the item to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('draggable-1')).toBeDefined()
    })

    const item = screen.getByTestId('draggable-1')

    // Simulate pointer down
    fireEvent.pointerDown(item, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    // Item should have dragging attribute set
    await waitFor(() => {
      expect(item.getAttribute('data-dragging')).toBe('true')
    })
  })

  it('should not throw when useGhostGridDrag is used inside GhostGrid', async () => {
    const initialNodes = [
      { id: '1', x: 0, y: 0, w: 3, h: 3, data: { title: 'Widget A' } },
    ]

    // This should not throw an error
    expect(() => {
      render(
        <GhostGrid
          columns={12}
          rowHeight={50}
          initialNodes={initialNodes}
          renderItem={({ node, rect, mode }) => (
            <TestDraggableItem node={node} rect={rect} mode={mode} />
          )}
        />
      )
    }).not.toThrow()
  })

  it('should pass drag handlers to rendered items', async () => {
    const initialNodes = [
      { id: '1', x: 0, y: 0, w: 3, h: 3, data: { title: 'Widget A' } },
    ]

    render(
      <GhostGrid
        columns={12}
        rowHeight={50}
        initialNodes={initialNodes}
        renderItem={({ node, rect, mode }) => (
          <TestDraggableItem node={node} rect={rect} mode={mode} />
        )}
      />
    )

    await waitFor(() => {
      const item = screen.getByTestId('draggable-1')
      expect(item).toBeDefined()
    })

    const item = screen.getByTestId('draggable-1')

    // Verify the element has pointer event handlers attached
    expect(item).toHaveProperty('onpointerdown')
  })

  it('should complete drag lifecycle (down, move, up)', async () => {
    const onStateChange = vi.fn()
    const initialNodes = [
      { id: '1', x: 0, y: 0, w: 3, h: 3, data: { title: 'Widget A' } },
    ]

    render(
      <GhostGrid
        columns={12}
        rowHeight={50}
        initialNodes={initialNodes}
        onStateChange={onStateChange}
        renderItem={({ node, rect, mode }) => (
          <TestDraggableItem node={node} rect={rect} mode={mode} />
        )}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('draggable-1')).toBeDefined()
    })

    const item = screen.getByTestId('draggable-1')

    // Start drag
    fireEvent.pointerDown(item, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    // Move
    fireEvent.pointerMove(item, {
      clientX: 150,
      clientY: 150,
      pointerId: 1,
    })

    // End drag
    fireEvent.pointerUp(item, {
      pointerId: 1,
    })

    // After drag ends, dragging state should be false
    await waitFor(() => {
      expect(item.getAttribute('data-dragging')).toBe('false')
    })
  })
})
