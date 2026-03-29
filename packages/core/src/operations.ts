import type { LayoutConstraints, LayoutConstraintViolation } from './constraints'
import { validateNode, validatePlacement, validateSize } from './constraints'
import {
  moveNode as moveLayoutNode,
  type NodePlacement,
  type NodeSize,
  resizeNode as resizeLayoutNode,
} from './layout'
import type { LayoutNode } from './types'

export type LayoutOperation<TData = unknown> =
  | {
      id: string
      placement: NodePlacement
      type: 'move'
    }
  | {
      id: string
      size: NodeSize
      type: 'resize'
    }
  | {
      node: LayoutNode<TData>
      type: 'upsert'
    }
  | {
      id: string
      type: 'remove'
    }
  | {
      nodes: readonly LayoutNode<TData>[]
      type: 'replace'
    }

export interface LayoutOperationOptions {
  constraints?: LayoutConstraints
}

export type LayoutOperationRejectionReason = 'constraint_violation' | 'node_not_found'
export type LayoutOperationStatus = 'applied' | 'rejected'

export interface LayoutOperationResult<TData = unknown> {
  changed: boolean
  nextNodes: readonly LayoutNode<TData>[]
  operation: LayoutOperation<TData>
  rejectionReason?: LayoutOperationRejectionReason
  status: LayoutOperationStatus
  violation?: LayoutConstraintViolation
}

export function applyLayoutOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: LayoutOperation<TData>,
  options: LayoutOperationOptions = {}
): LayoutOperationResult<TData> {
  switch (operation.type) {
    case 'move':
      return applyMoveOperation(nodes, operation, options)
    case 'remove':
      return applyRemoveOperation(nodes, operation)
    case 'replace':
      return applyReplaceOperation(nodes, operation, options)
    case 'resize':
      return applyResizeOperation(nodes, operation, options)
    case 'upsert':
      return applyUpsertOperation(nodes, operation, options)
  }
}

function applyMoveOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'move' }>,
  options: LayoutOperationOptions
): LayoutOperationResult<TData> {
  const node = nodes.find((candidate) => candidate.id === operation.id)

  if (node == null) {
    return createRejectedResult(nodes, operation, 'node_not_found')
  }

  const violation = validatePlacement(node, operation.placement, options.constraints)

  if (violation != null) {
    return createRejectedResult(nodes, operation, 'constraint_violation', violation)
  }

  return createAppliedResult(
    nodes,
    moveLayoutNode(nodes, operation.id, operation.placement),
    operation
  )
}

function applyRemoveOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'remove' }>
): LayoutOperationResult<TData> {
  const index = nodes.findIndex((node) => node.id === operation.id)

  if (index === -1) {
    return createRejectedResult(nodes, operation, 'node_not_found')
  }

  return createAppliedResult(
    nodes,
    nodes.filter((node) => node.id !== operation.id),
    operation
  )
}

function applyReplaceOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'replace' }>,
  options: LayoutOperationOptions
): LayoutOperationResult<TData> {
  const nextNodes = [...operation.nodes]
  const violation = findConstraintViolation(nextNodes, options.constraints)

  if (violation != null) {
    return createRejectedResult(nodes, operation, 'constraint_violation', violation)
  }

  return createAppliedResult(nodes, nextNodes, operation)
}

function applyResizeOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'resize' }>,
  options: LayoutOperationOptions
): LayoutOperationResult<TData> {
  const node = nodes.find((candidate) => candidate.id === operation.id)

  if (node == null) {
    return createRejectedResult(nodes, operation, 'node_not_found')
  }

  const violation = validateSize(node, operation.size, options.constraints)

  if (violation != null) {
    return createRejectedResult(nodes, operation, 'constraint_violation', violation)
  }

  return createAppliedResult(
    nodes,
    resizeLayoutNode(nodes, operation.id, operation.size),
    operation
  )
}

function applyUpsertOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'upsert' }>,
  options: LayoutOperationOptions
): LayoutOperationResult<TData> {
  const violation = validateNode(operation.node, options.constraints)

  if (violation != null) {
    return createRejectedResult(nodes, operation, 'constraint_violation', violation)
  }

  const index = nodes.findIndex((node) => node.id === operation.node.id)
  const nextNodes = [...nodes]

  if (index === -1) {
    nextNodes.push(operation.node)
  } else {
    nextNodes[index] = operation.node
  }

  return createAppliedResult(nodes, nextNodes, operation)
}

function createAppliedResult<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  nextNodes: readonly LayoutNode<TData>[],
  operation: LayoutOperation<TData>
): LayoutOperationResult<TData> {
  return {
    changed: !areNodeListsEqual(nodes, nextNodes),
    nextNodes,
    operation,
    status: 'applied',
  }
}

function createRejectedResult<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: LayoutOperation<TData>,
  rejectionReason: LayoutOperationRejectionReason,
  violation?: LayoutConstraintViolation
): LayoutOperationResult<TData> {
  const result: LayoutOperationResult<TData> = {
    changed: false,
    nextNodes: nodes,
    operation,
    rejectionReason,
    status: 'rejected',
  }

  if (violation != null) {
    result.violation = violation
  }

  return result
}

function areNodeListsEqual<TData = unknown>(
  a: readonly LayoutNode<TData>[],
  b: readonly LayoutNode<TData>[]
): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]
    const right = b[index]

    if (left == null || right == null) {
      return false
    }

    if (
      left.id !== right.id ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.w !== right.w ||
      left.h !== right.h ||
      left.static !== right.static ||
      left.data !== right.data
    ) {
      return false
    }
  }

  return true
}

function findConstraintViolation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  constraints?: LayoutConstraints
): LayoutConstraintViolation | undefined {
  for (const node of nodes) {
    const violation = validateNode(node, constraints)

    if (violation != null) {
      return violation
    }
  }

  return undefined
}
