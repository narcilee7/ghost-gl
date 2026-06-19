import { act, renderHook } from '@testing-library/react'
import type { LayoutNode } from 'ghost-gl-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGhostGrid } from './useGhostGrid'

// Mock the createGridHost function
vi.mock('ghost-gl-adapter-core', () => ({
  createGridHost: vi.fn(() => ({
    subscribe: vi.fn(() => () => {}),
    state: {
      state: {
        nodes: [],
        bounds: { left: 0, top: 0, width: 375, height: 812 },
        metrics: { columnWidth: 30, rowHeight: 50, containerWidth: 375 },
        canUndo: false,
        canRedo: false,
        interactionSession: null,
      },
    },
    materialized: [],
    viewport: null,
    isReady: true,
    controller: {
      getState: vi.fn(() => ({
        nodes: [],
        bounds: { left: 0, top: 0, width: 375, height: 812 },
        metrics: { columnWidth: 30, rowHeight: 50, containerWidth: 375 },
        canUndo: false,
        canRedo: false,
        interactionSession: null,
      })),
      subscribe: vi.fn(() => () => {}),
      on: vi.fn(() => () => {}),
      getNode: vi.fn(),
    },
    setViewport: vi.fn(),
    setContainerSize: vi.fn(),
    moveNode: vi.fn(() => true),
    resizeNode: vi.fn(() => true),
    undo: vi.fn(() => true),
    redo: vi.fn(() => true),
    beginDrag: vi.fn(() => true),
    updateDrag: vi.fn(),
    endDrag: vi.fn(),
    cancelDrag: vi.fn(),
    dispose: vi.fn(),
  })),
}))

describe('useGhostGrid', () => {
  const initialNodes: LayoutNode[] = [
    { id: '1', x: 0, y: 0, w: 4, h: 3 },
    { id: '2', x: 4, y: 0, w: 4, h: 3 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useGhostGrid())

    expect(result.current.isReady).toBe(true)
    expect(result.current.host).not.toBeNull()
    expect(result.current.state).not.toBeNull()
    expect(result.current.materialized).toEqual([])
  })

  it('should accept initial nodes', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    // Note: nodes will be populated after host subscription
    expect(result.current.host).not.toBeNull()
  })

  it('should set container size', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    act(() => {
      result.current.setContainerSize?.({ width: 375, height: 812 })
    })

    expect(result.current.host).toBeDefined()
  })

  it('should update viewport', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    act(() => {
      result.current.updateViewport({
        left: 0,
        top: 0,
        width: 375,
        height: 812,
      })
    })

    expect(result.current.host).toBeDefined()
  })

  it('should move node', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    const moved = result.current.moveNode('1', 2, 0)
    expect(moved).toBe(true)
  })

  it('should resize node', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    const resized = result.current.resizeNode('1', 6, 4)
    expect(resized).toBe(true)
  })

  it('should undo', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    const undone = result.current.undo()
    expect(undone).toBe(true)
  })

  it('should redo', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    const redone = result.current.redo()
    expect(redone).toBe(true)
  })

  it('should handle null setContainerSize', () => {
    const { result } = renderHook(() => useGhostGrid({ initialNodes }))

    // setContainerSize should be defined but may be noop if host is null
    expect(result.current.setContainerSize).toBeDefined()
  })

  it('should handle grid options correctly', () => {
    const { result } = renderHook(() =>
      useGhostGrid({
        initialNodes,
        columns: 12,
        rowHeight: 50,
        gapX: 10,
        gapY: 10,
        paddingLeft: 8,
        paddingTop: 8,
        overscan: 3,
        debounceMs: 32,
      })
    )

    expect(result.current.isReady).toBe(true)
    expect(result.current.metrics).toBeDefined()
  })
})
