'use client'

import type { GridMetrics, Rect, RuntimeController, RuntimeControllerState } from 'ghost-gl-core'
import { createContext, type JSX, useContext, useMemo } from 'react'
import type { GhostGridContextValue } from '../types'

/**
 * Context for sharing ghost-gl runtime state throughout the React tree
 */
export const GhostGridContext = createContext<GhostGridContextValue<unknown> | null>(null)

/**
 * Hook to access the GhostGrid context
 * @throws if used outside of GhostGrid provider
 */
export function useGhostGridContext<T = unknown>(): GhostGridContextValue<T> {
  const context = useContext(GhostGridContext)

  if (context === null) {
    throw new Error('useGhostGridContext must be used within a GhostGrid component')
  }

  return context as GhostGridContextValue<T>
}

/**
 * Hook to access the runtime controller
 * Returns null if not within a GhostGrid
 */
export function useController<T = unknown>(): RuntimeController<T> | null {
  const context = useContext(GhostGridContext)
  return (context?.controller as RuntimeController<T> | null) ?? null
}

/**
 * Hook to access the current grid state
 */
export function useGridState<T = unknown>(): RuntimeControllerState<T> | null {
  const context = useContext(GhostGridContext)
  return (context?.state as RuntimeControllerState<T> | null) ?? null
}

/**
 * Hook to access grid metrics
 */
export function useGridMetrics(): GridMetrics | null {
  const context = useContext(GhostGridContext)
  return context?.metrics ?? null
}

/**
 * Hook to access current viewport
 */
export function useViewport(): Rect | null {
  const context = useContext(GhostGridContext)
  return context?.viewport ?? null
}

/**
 * Provider component for GhostGridContext
 * Internal use only
 */
export function GhostGridProvider<T = unknown>({
  children,
  value,
}: {
  children: React.ReactNode
  value: GhostGridContextValue<T>
}): JSX.Element {
  // Memoize context value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => value as GhostGridContextValue<unknown>, [value])

  return <GhostGridContext.Provider value={memoizedValue}>{children}</GhostGridContext.Provider>
}
