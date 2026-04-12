import type { LayoutOperation } from '../operations'
import {
  applyLayoutTransaction,
  type LayoutTransactionOptions,
  type LayoutTransactionResult,
} from '../transactions'
import type { LayoutNode } from '../types'
import type {
  LayoutInteractionCommitResult,
  LayoutInteractionKind,
  LayoutInteractionPreviewResult,
  LayoutInteractionSession,
} from './types'

export type {
  LayoutInteractionCommitResult,
  LayoutInteractionKind,
  LayoutInteractionPreviewResult,
  LayoutInteractionSession,
  LayoutInteractionStatus,
} from './types'

export function createInteractionSession<T = unknown>(input: {
  id: string
  kind: LayoutInteractionKind
  nodes: readonly LayoutNode<T>[]
  targetId?: string
}): LayoutInteractionSession<T> {
  const clonedNodes = cloneNodes(input.nodes)
  const session: LayoutInteractionSession<T> = {
    baseNodes: clonedNodes,
    currentNodes: clonedNodes,
    id: input.id,
    kind: input.kind,
    previewOperations: [],
    status: 'active',
  }

  if (input.targetId !== undefined) {
    session.targetId = input.targetId
  }

  return session
}

export function previewInteraction<T = unknown>(
  session: LayoutInteractionSession<T>,
  operations: readonly LayoutOperation<T>[],
  options: LayoutTransactionOptions<T> = {}
): LayoutInteractionPreviewResult<T> {
  if (session.status !== 'active') {
    return {
      session,
      transaction: createRejectedSessionTransaction(session),
    }
  }

  const transaction = applyLayoutTransaction(session.baseNodes, operations, options)

  if (!transaction.committed) {
    return {
      session: {
        ...session,
        currentNodes: session.baseNodes,
        previewOperations: [],
        previewResult: transaction,
      },
      transaction,
    }
  }

  return {
    session: {
      ...session,
      currentNodes: transaction.nextNodes,
      previewOperations: cloneOperations(operations),
      previewResult: transaction,
    },
    transaction,
  }
}

export function commitInteraction<T = unknown>(
  session: LayoutInteractionSession<T>
): LayoutInteractionCommitResult<T> {
  if (session.status !== 'active') {
    return withOptionalTransaction({ session }, session.previewResult)
  }

  return withOptionalTransaction(
    {
      session: {
        ...session,
        status: 'committed',
      },
    },
    session.previewResult
  )
}

export function cancelInteraction<T = unknown>(
  session: LayoutInteractionSession<T>
): LayoutInteractionSession<T> {
  if (session.status !== 'active') {
    return session
  }

  const { previewResult: _previewResult, ...nextSession } = session

  return {
    ...nextSession,
    currentNodes: session.baseNodes,
    previewOperations: [],
    status: 'cancelled',
  }
}

function withOptionalTransaction<T = unknown>(
  result: {
    session: LayoutInteractionSession<T>
  },
  transaction: LayoutTransactionResult<T> | undefined
): LayoutInteractionCommitResult<T> {
  if (transaction === undefined) {
    return result
  }

  return {
    ...result,
    transaction,
  }
}

function cloneNodes<T = unknown>(nodes: readonly LayoutNode<T>[]): LayoutNode<T>[] {
  return nodes.map((node) => ({ ...node }))
}

function cloneOperations<T = unknown>(
  operations: readonly LayoutOperation<T>[]
): LayoutOperation<T>[] {
  return operations.map(cloneOperation)
}

function cloneOperation<T = unknown>(operation: LayoutOperation<T>): LayoutOperation<T> {
  switch (operation.type) {
    case 'move':
      return {
        id: operation.id,
        placement: { ...operation.placement },
        type: 'move',
      }
    case 'resize':
      return {
        id: operation.id,
        size: { ...operation.size },
        type: 'resize',
      }
    case 'upsert':
      return {
        node: { ...operation.node },
        type: 'upsert',
      }
    case 'remove':
      return {
        id: operation.id,
        type: 'remove',
      }
    case 'replace':
      return {
        nodes: operation.nodes.map((node) => ({ ...node })),
        type: 'replace',
      }
  }
}

function createRejectedSessionTransaction<T = unknown>(
  session: LayoutInteractionSession<T>
): LayoutTransactionResult<T> {
  return {
    changed: false,
    committed: false,
    failedAt: 0,
    inverseOperations: [],
    nextNodes: session.currentNodes,
    operations: session.previewOperations,
    results: [],
  }
}
