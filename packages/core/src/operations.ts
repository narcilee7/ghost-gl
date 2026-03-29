import type { LayoutConstraints, LayoutConstraintViolation } from './constraints'
import { validateNode, validatePlacement, validateSize } from './constraints'
import {
  createLayoutMutationContext,
  finalizeLayoutMutation,
  type LayoutMutationContext,
  moveNode as moveLayoutNode,
  moveNodeWithContext,
  type NodePlacement,
  type NodeSize,
  resizeNode as resizeLayoutNode,
  resizeNodeWithContext,
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

export interface LayoutOperationOptions<TData = unknown> {
  constraints?: LayoutConstraints
  mutationContext?: LayoutMutationContext<TData>
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
  options: LayoutOperationOptions<TData> = {}
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
  options: LayoutOperationOptions<TData>
): LayoutOperationResult<TData> {
  const node = nodes.find((candidate) => candidate.id === operation.id)

  if (node == null) {
    return createRejectedResult(nodes, operation, 'node_not_found')
  }

  const violation = validatePlacement(node, operation.placement, options.constraints)

  if (violation != null) {
    return createRejectedResult(nodes, operation, 'constraint_violation', violation)
  }

  return createAppliedResult(nodes, applyMoveLayout(nodes, operation, options), operation)
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
  options: LayoutOperationOptions<TData>
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
  options: LayoutOperationOptions<TData>
): LayoutOperationResult<TData> {
  const node = nodes.find((candidate) => candidate.id === operation.id)

  if (node == null) {
    return createRejectedResult(nodes, operation, 'node_not_found')
  }

  const violation = validateSize(node, operation.size, options.constraints)

  if (violation != null) {
    return createRejectedResult(nodes, operation, 'constraint_violation', violation)
  }

  return createAppliedResult(nodes, applyResizeLayout(nodes, operation, options), operation)
}

function applyUpsertOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'upsert' }>,
  options: LayoutOperationOptions<TData>
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

function applyMoveLayout<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'move' }>,
  options: LayoutOperationOptions<TData>
): readonly LayoutNode<TData>[] {
  if (options.mutationContext != null) {
    moveNodeWithContext(options.mutationContext, operation.id, operation.placement)

    return options.mutationContext.nodes
  }

  return moveLayoutNode(nodes, operation.id, operation.placement)
}

function applyResizeLayout<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: Extract<LayoutOperation<TData>, { type: 'resize' }>,
  options: LayoutOperationOptions<TData>
): readonly LayoutNode<TData>[] {
  if (options.mutationContext != null) {
    resizeNodeWithContext(options.mutationContext, operation.id, operation.size)

    return options.mutationContext.nodes
  }

  return resizeLayoutNode(nodes, operation.id, operation.size)
}

export function createOperationMutationContext<TData = unknown>(
  nodes: readonly LayoutNode<TData>[]
): LayoutMutationContext<TData> {
  return createLayoutMutationContext(nodes)
}

export function finalizeOperationMutationContext<TData = unknown>(
  context: LayoutMutationContext<TData>
): LayoutNode<TData>[] {
  return finalizeLayoutMutation(context)
}

export function shouldReuseMutationContext<TData = unknown>(
  operation: LayoutOperation<TData>
): boolean {
  return operation.type === 'move' || operation.type === 'resize'
}
