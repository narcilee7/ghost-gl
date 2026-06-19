import {
  applyLayoutOperation,
  createOperationMutationContext,
  finalizeOperationMutationContext,
  type LayoutOperation,
  type LayoutOperationOptions,
  type LayoutOperationResult,
  shouldReuseMutationContext,
} from '../operations'
import type { LayoutNode } from '../types'

export interface LayoutTransactionOptions<T = unknown> extends LayoutOperationOptions<T> {}

export interface LayoutTransactionResult<T = unknown> {
  changed: boolean
  committed: boolean
  failedAt?: number
  inverseOperations: readonly LayoutOperation<T>[]
  nextNodes: readonly LayoutNode<T>[]
  operations: readonly LayoutOperation<T>[]
  results: readonly LayoutOperationResult<T>[]
}

export function applyLayoutTransaction<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  operations: readonly LayoutOperation<T>[],
  options: LayoutTransactionOptions<T> = {}
): LayoutTransactionResult<T> {
  let nextNodes = nodes
  let mutationContext: LayoutOperationOptions<T>['mutationContext']
  const inverseOperations: LayoutOperation<T>[] = []
  const results: LayoutOperationResult<T>[] = []

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index]

    if (operation == null) {
      continue
    }

    const previousNodes = cloneNodes(nextNodes)

    if (shouldReuseMutationContext(operation)) {
      mutationContext ??= createOperationMutationContext(previousNodes, options.policy)
    } else {
      mutationContext = undefined
    }

    const operationOptions: LayoutOperationOptions<T> = { ...options }

    if (mutationContext !== undefined) {
      operationOptions.mutationContext = mutationContext
    }

    const result = applyLayoutOperation(previousNodes, operation, operationOptions)
    results.push(result)

    if (result.status === 'rejected') {
      return {
        changed: false,
        committed: false,
        failedAt: index,
        inverseOperations: [],
        nextNodes: nodes,
        operations,
        results,
      }
    }

    if (result.changed) {
      inverseOperations.unshift({
        nodes: cloneNodes(previousNodes),
        type: 'replace',
      })
    }

    nextNodes =
      mutationContext != null ? finalizeOperationMutationContext(mutationContext) : result.nextNodes
  }

  return {
    changed: results.some((result) => result.changed),
    committed: true,
    inverseOperations,
    nextNodes,
    operations,
    results,
  }
}

function cloneNode<T = unknown>(node: LayoutNode<T>): LayoutNode<T> {
  return { ...node }
}

function cloneNodes<T = unknown>(nodes: readonly LayoutNode<T>[]): LayoutNode<T>[] {
  return nodes.map(cloneNode)
}
