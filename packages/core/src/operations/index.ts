import type { LayoutConstraints, LayoutConstraintViolation } from '../constraints'
import { validateNode, validatePlacement, validateSize } from '../constraints'
import {
  createLayoutMutationContext,
  finalizeLayoutMutation,
  type LayoutMutationContext,
  moveNodeWithContext,
  type NodePlacement,
  type NodeSize,
  resizeNodeWithContext,
} from '../layout'
import type { LayoutNode, LayoutPolicy } from '../types'

export type LayoutOperation<T = unknown> =
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
      node: LayoutNode<T>
      type: 'upsert'
    }
  | {
      id: string
      type: 'remove'
    }
  | {
      nodes: readonly LayoutNode<T>[]
      type: 'replace'
    }

export interface LayoutOperationOptions<T = unknown> {
  constraints?: LayoutConstraints
  mutationContext?: LayoutMutationContext<T>
  policy?: LayoutPolicy
}

export type LayoutOperationRejectionReason = 'constraint_violation' | 'node_not_found'
export type LayoutOperationStatus = 'applied' | 'rejected'

export interface LayoutOperationResult<T = unknown> {
  changed: boolean
  nextNodes: readonly LayoutNode<T>[]
  operation: LayoutOperation<T>
  rejectionReason?: LayoutOperationRejectionReason
  status: LayoutOperationStatus
  violation?: LayoutConstraintViolation
}

export function applyLayoutOperation<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: LayoutOperation<T>,
  options: LayoutOperationOptions<T> = {}
): LayoutOperationResult<T> {
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

function applyMoveOperation<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: Extract<LayoutOperation<T>, { type: 'move' }>,
  options: LayoutOperationOptions<T>
): LayoutOperationResult<T> {
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

function applyRemoveOperation<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: Extract<LayoutOperation<T>, { type: 'remove' }>
): LayoutOperationResult<T> {
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

function applyReplaceOperation<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: Extract<LayoutOperation<T>, { type: 'replace' }>,
  options: LayoutOperationOptions<T>
): LayoutOperationResult<T> {
  const nextNodes = [...operation.nodes]
  const violation = findConstraintViolation(nextNodes, options.constraints)

  if (violation != null) {
    return createRejectedResult(nodes, operation, 'constraint_violation', violation)
  }

  return createAppliedResult(nodes, nextNodes, operation)
}

function applyResizeOperation<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: Extract<LayoutOperation<T>, { type: 'resize' }>,
  options: LayoutOperationOptions<T>
): LayoutOperationResult<T> {
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

function applyUpsertOperation<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: Extract<LayoutOperation<T>, { type: 'upsert' }>,
  options: LayoutOperationOptions<T>
): LayoutOperationResult<T> {
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

function createAppliedResult<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  nextNodes: readonly LayoutNode<T>[],
  operation: LayoutOperation<T>
): LayoutOperationResult<T> {
  return {
    changed: !areNodeListsEqual(nodes, nextNodes),
    nextNodes,
    operation,
    status: 'applied',
  }
}

function createRejectedResult<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: LayoutOperation<T>,
  rejectionReason: LayoutOperationRejectionReason,
  violation?: LayoutConstraintViolation
): LayoutOperationResult<T> {
  const result: LayoutOperationResult<T> = {
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

function areNodeListsEqual<T = unknown>(
  a: readonly LayoutNode<T>[],
  b: readonly LayoutNode<T>[]
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

function findConstraintViolation<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  constraints?: LayoutConstraints
): LayoutConstraintViolation | undefined {
  const seenIds = new Set<string>()

  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      return { code: 'duplicate_id', id: node.id }
    }
    seenIds.add(node.id)

    const violation = validateNode(node, constraints)

    if (violation != null) {
      return violation
    }
  }

  return undefined
}

function applyMoveLayout<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: Extract<LayoutOperation<T>, { type: 'move' }>,
  options: LayoutOperationOptions<T>
): readonly LayoutNode<T>[] {
  if (options.mutationContext != null) {
    moveNodeWithContext(options.mutationContext, operation.id, operation.placement)

    return options.mutationContext.nodes
  }

  const context = createLayoutMutationContext(nodes, options.policy ?? {})
  moveNodeWithContext(context, operation.id, operation.placement)

  return finalizeLayoutMutation(context)
}

function applyResizeLayout<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operation: Extract<LayoutOperation<T>, { type: 'resize' }>,
  options: LayoutOperationOptions<T>
): readonly LayoutNode<T>[] {
  if (options.mutationContext != null) {
    resizeNodeWithContext(options.mutationContext, operation.id, operation.size)

    return options.mutationContext.nodes
  }

  const context = createLayoutMutationContext(nodes, options.policy ?? {})
  resizeNodeWithContext(context, operation.id, operation.size)

  return finalizeLayoutMutation(context)
}

export function createOperationMutationContext<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  policy?: LayoutPolicy
): LayoutMutationContext<T> {
  return createLayoutMutationContext(nodes, policy ?? {})
}

export function finalizeOperationMutationContext<T = unknown>(
  context: LayoutMutationContext<T>
): LayoutNode<T>[] {
  return finalizeLayoutMutation(context)
}

export function shouldReuseMutationContext<T = unknown>(operation: LayoutOperation<T>): boolean {
  return operation.type === 'move' || operation.type === 'resize'
}
