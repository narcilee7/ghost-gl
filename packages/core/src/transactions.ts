import {
  applyLayoutOperation,
  type LayoutOperation,
  type LayoutOperationOptions,
  type LayoutOperationResult,
} from './operations'
import type { LayoutNode } from './types'

export interface LayoutTransactionOptions extends LayoutOperationOptions {}

export interface LayoutTransactionResult<TData = unknown> {
  changed: boolean
  committed: boolean
  failedAt?: number
  inverseOperations: readonly LayoutOperation<TData>[]
  nextNodes: readonly LayoutNode<TData>[]
  operations: readonly LayoutOperation<TData>[]
  results: readonly LayoutOperationResult<TData>[]
}

export function applyLayoutTransaction<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operations: readonly LayoutOperation<TData>[],
  options: LayoutTransactionOptions = {}
): LayoutTransactionResult<TData> {
  let nextNodes = nodes
  const inverseOperations: LayoutOperation<TData>[] = []
  const results: LayoutOperationResult<TData>[] = []

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index]

    if (operation == null) {
      continue
    }

    const result = applyLayoutOperation(nextNodes, operation, options)
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

    const inverseOperation = createInverseOperation(nextNodes, operation)

    if (inverseOperation != null) {
      inverseOperations.unshift(inverseOperation)
    }

    nextNodes = result.nextNodes
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

function createInverseOperation<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  operation: LayoutOperation<TData>
): LayoutOperation<TData> | undefined {
  switch (operation.type) {
    case 'move': {
      const node = nodes.find((candidate) => candidate.id === operation.id)

      if (node == null) {
        return undefined
      }

      return {
        id: node.id,
        placement: {
          x: node.x,
          y: node.y,
        },
        type: 'move',
      }
    }
    case 'resize': {
      const node = nodes.find((candidate) => candidate.id === operation.id)

      if (node == null) {
        return undefined
      }

      return {
        id: node.id,
        size: {
          h: node.h,
          w: node.w,
        },
        type: 'resize',
      }
    }
    case 'upsert': {
      const previousNode = nodes.find((candidate) => candidate.id === operation.node.id)

      if (previousNode == null) {
        return {
          id: operation.node.id,
          type: 'remove',
        }
      }

      return {
        node: cloneNode(previousNode),
        type: 'upsert',
      }
    }
    case 'remove': {
      const previousNode = nodes.find((candidate) => candidate.id === operation.id)

      if (previousNode == null) {
        return undefined
      }

      return {
        node: cloneNode(previousNode),
        type: 'upsert',
      }
    }
    case 'replace':
      return {
        nodes: cloneNodes(nodes),
        type: 'replace',
      }
  }
}

function cloneNode<TData = unknown>(node: LayoutNode<TData>): LayoutNode<TData> {
  return { ...node }
}

function cloneNodes<TData = unknown>(nodes: readonly LayoutNode<TData>[]): LayoutNode<TData>[] {
  return nodes.map(cloneNode)
}
