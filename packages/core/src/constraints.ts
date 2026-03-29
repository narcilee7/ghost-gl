import type { NodePlacement, NodeSize } from './layout'
import type { LayoutNode } from './types'

export interface LayoutConstraints {
  columns?: number
}

export type LayoutConstraintViolationCode =
  | 'negative_x'
  | 'negative_y'
  | 'invalid_width'
  | 'invalid_height'
  | 'overflow_columns'

export interface LayoutConstraintViolation {
  code: LayoutConstraintViolationCode
  id: string
}

export function assertLayoutNodes<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  constraints?: LayoutConstraints
): void {
  for (const node of nodes) {
    assertLayoutNode(node, constraints)
  }
}

export function assertLayoutNode<TData = unknown>(
  node: LayoutNode<TData>,
  constraints?: LayoutConstraints
): void {
  const violation = validateNode(node, constraints)

  if (violation != null) {
    throw createLayoutViolationError(violation, constraints)
  }
}

export function validateNode<TData = unknown>(
  node: Pick<LayoutNode<TData>, 'id' | 'x' | 'y' | 'w' | 'h'>,
  constraints?: LayoutConstraints
): LayoutConstraintViolation | undefined {
  if (node.x < 0) {
    return { code: 'negative_x', id: node.id }
  }

  if (node.y < 0) {
    return { code: 'negative_y', id: node.id }
  }

  if (node.w < 1) {
    return { code: 'invalid_width', id: node.id }
  }

  if (node.h < 1) {
    return { code: 'invalid_height', id: node.id }
  }

  const columns = constraints?.columns

  if (columns !== undefined && node.x + node.w > columns) {
    return { code: 'overflow_columns', id: node.id }
  }

  return undefined
}

export function validatePlacement<TData = unknown>(
  node: Pick<LayoutNode<TData>, 'id' | 'w' | 'h'>,
  nextPlacement: NodePlacement,
  constraints?: LayoutConstraints
): LayoutConstraintViolation | undefined {
  return validateNode(
    {
      h: node.h,
      id: node.id,
      w: node.w,
      x: nextPlacement.x,
      y: nextPlacement.y,
    },
    constraints
  )
}

export function validateSize<TData = unknown>(
  node: Pick<LayoutNode<TData>, 'id' | 'x' | 'y'>,
  nextSize: NodeSize,
  constraints?: LayoutConstraints
): LayoutConstraintViolation | undefined {
  return validateNode(
    {
      h: nextSize.h,
      id: node.id,
      w: nextSize.w,
      x: node.x,
      y: node.y,
    },
    constraints
  )
}

export function createLayoutViolationError(
  violation: LayoutConstraintViolation,
  constraints?: LayoutConstraints
): Error {
  return new Error(formatViolation(violation, constraints))
}

function formatViolation(
  violation: LayoutConstraintViolation,
  constraints?: LayoutConstraints
): string {
  switch (violation.code) {
    case 'negative_x':
      return `Node "${violation.id}" must have x >= 0.`
    case 'negative_y':
      return `Node "${violation.id}" must have y >= 0.`
    case 'invalid_width':
      return `Node "${violation.id}" must have w >= 1.`
    case 'invalid_height':
      return `Node "${violation.id}" must have h >= 1.`
    case 'overflow_columns':
      return `Node "${violation.id}" exceeds configured columns (${constraints?.columns ?? 0}).`
  }
}
