'use client'

import type { CSSProperties, JSX } from 'react'

export interface GhostGridSkeletonProps {
  /** Width of the skeleton (defaults to 100%) */
  width?: number | string
  /** Height of the skeleton (defaults to 100%) */
  height?: number | string
  /** Animation style */
  animation?: 'pulse' | 'wave' | 'none'
  /** Custom className */
  className?: string
  /** Custom styles */
  style?: CSSProperties
  /** Border radius */
  borderRadius?: number | string
  /** Background color */
  backgroundColor?: string
  /** Highlight color for animation */
  highlightColor?: string
}

/**
 * Skeleton placeholder component for Ghost/Shell states
 *
 * @example
 * ```tsx
 * <GhostGridSkeleton animation="pulse" />
 * ```
 */
export function GhostGridSkeleton(props: GhostGridSkeletonProps): JSX.Element {
  const {
    width = '100%',
    height = '100%',
    animation = 'pulse',
    className,
    style,
    borderRadius = 4,
    backgroundColor = '#e0e0e0',
    highlightColor = '#f0f0f0',
  } = props

  const baseStyle: CSSProperties = {
    backgroundColor,
    borderRadius,
    height,
    overflow: 'hidden',
    position: 'relative',
    width,
  }

  // Animation styles
  const animationStyle: CSSProperties =
    animation === 'pulse'
      ? {
          animation: 'ghost-gl-pulse 1.5s ease-in-out infinite',
        }
      : animation === 'wave'
        ? {
            background: `linear-gradient(90deg, ${backgroundColor} 25%, ${highlightColor} 50%, ${backgroundColor} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'ghost-gl-wave 1.5s ease-in-out infinite',
          }
        : {}

  return (
    <>
      <style>{`
        @keyframes ghost-gl-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ghost-gl-wave {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div
        className={className}
        style={{ ...baseStyle, ...animationStyle, ...style }}
        data-ghost-skeleton=""
      />
    </>
  )
}

GhostGridSkeleton.displayName = 'GhostGridSkeleton'
