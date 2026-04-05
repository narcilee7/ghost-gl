import { describe, expect, it } from 'vitest'

describe('ghost-gl-react', () => {
  it('exports GhostGrid component', async () => {
    const { GhostGrid } = await import('./components/GhostGrid')
    expect(GhostGrid).toBeDefined()
    expect(typeof GhostGrid).toBe('function')
  })

  it('exports GhostGridItem component', async () => {
    const { GhostGridItem } = await import('./components/GhostGridItem')
    expect(GhostGridItem).toBeDefined()
    expect(typeof GhostGridItem).toBe('function')
  })

  it('exports GhostGridSkeleton component', async () => {
    const { GhostGridSkeleton } = await import('./components/GhostGridSkeleton')
    expect(GhostGridSkeleton).toBeDefined()
    expect(typeof GhostGridSkeleton).toBe('function')
  })

  it('exports hooks', async () => {
    const { useGhostGrid } = await import('./hooks/useGhostGrid')
    const { useGhostGridDrag } = await import('./hooks/useGhostGridDrag')
    expect(useGhostGrid).toBeDefined()
    expect(useGhostGridDrag).toBeDefined()
    expect(typeof useGhostGrid).toBe('function')
    expect(typeof useGhostGridDrag).toBe('function')
  })

  it('exports context utilities', async () => {
    const {
      GhostGridContext,
      GhostGridProvider,
      useGhostGridContext,
      useController,
      useGridState,
      useGridMetrics,
      useViewport,
    } = await import('./context/GhostGridContext')

    expect(GhostGridContext).toBeDefined()
    expect(GhostGridProvider).toBeDefined()
    expect(useGhostGridContext).toBeDefined()
    expect(useController).toBeDefined()
    expect(useGridState).toBeDefined()
    expect(useGridMetrics).toBeDefined()
    expect(useViewport).toBeDefined()
  })

  it('exports DnD context', async () => {
    const { GhostGridDndContext, GhostGridDndProvider, useGhostGridDnd } = await import(
      './context/GhostGridDndContext'
    )

    expect(GhostGridDndContext).toBeDefined()
    expect(GhostGridDndProvider).toBeDefined()
    expect(useGhostGridDnd).toBeDefined()
  })

  it('re-exports core types', async () => {
    const index = await import('./index')

    // Check that types are exported (they'll be undefined at runtime but should exist as exports)
    expect(index).toHaveProperty('GhostGrid')
    expect(index).toHaveProperty('GhostGridItem')
    expect(index).toHaveProperty('GhostGridSkeleton')
    expect(index).toHaveProperty('GhostGridProvider')
    expect(index).toHaveProperty('GhostGridDndProvider')
    expect(index).toHaveProperty('useGhostGrid')
    expect(index).toHaveProperty('useGhostGridDrag')
  })
})
