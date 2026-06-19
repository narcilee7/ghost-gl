import React, { createContext, type ReactNode, useMemo } from 'react'
import type { GhostGridContextValue } from '../types'

/**
 * Context for sharing ghost-gl runtime state throughout the React Native tree
 */
export const GhostGridContext = createContext<GhostGridContextValue<unknown> | null>(null)

/**
 * Hook to access the GhostGrid context
 * @throws if used outside of GhostGrid provider
 */
export function useGhostGridContext<T = unknown>(): GhostGridContextValue<T> {
  const context = React.useContext(GhostGridContext)

  if (context === null) {
    throw new Error('useGhostGridContext must be used within a GhostGrid component')
  }

  return context as GhostGridContextValue<T>
}

/**
 * Provider component for GhostGridContext
 * Internal use only
 */
export function GhostGridProvider<T = unknown>({
  children,
  value,
}: {
  children: ReactNode
  value: GhostGridContextValue<T>
}): React.JSX.Element {
  // Memoize context value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => value as GhostGridContextValue<unknown>, [value])

  return <GhostGridContext.Provider value={memoizedValue}>{children}</GhostGridContext.Provider>
}
