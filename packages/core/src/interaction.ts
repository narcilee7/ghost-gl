import type { LayoutOperation } from './operations'
import {
  applyLayoutTransaction,
  type LayoutTransactionOptions,
  type LayoutTransactionResult,
} from './transactions'
import type { LayoutNode } from './types'

export type LayoutInteractionKind = 'drag' | 'resize' | 'custom'
export type LayoutInteractionStatus = 'active' | 'committed' | 'cancelled'

export interface LayoutInteractionSession<TData = unknown> {
  baseNodes: readonly LayoutNode<TData>[]
  currentNodes: readonly LayoutNode<TData>[]
  id: string
  kind: LayoutInteractionKind
  previewOperations: readonly LayoutOperation<TData>[]
  previewResult?: LayoutTransactionResult<TData>
  status: LayoutInteractionStatus
  targetId?: string
}

export interface LayoutInteractionPreviewResult<TData = unknown> {
  session: LayoutInteractionSession<TData>
  transaction: LayoutTransactionResult<TData>
}

export interface LayoutInteractionCommitResult<TData = unknown> {
  session: LayoutInteractionSession<TData>
  transaction?: LayoutTransactionResult<TData>
}

export function createInteractionSession<TData = unknown>(input: {
  id: string
  kind: LayoutInteractionKind
  nodes: readonly LayoutNode<TData>[]
  targetId?: string
}): LayoutInteractionSession<TData> {
  const clonedNodes = cloneNodes(input.nodes)
  const session: LayoutInteractionSession<TData> = {
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

export function previewInteraction<TData = unknown>(
  session: LayoutInteractionSession<TData>,
  operations: readonly LayoutOperation<TData>[],
  options: LayoutTransactionOptions = {}
): LayoutInteractionPreviewResult<TData> {
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

export function commitInteraction<TData = unknown>(
  session: LayoutInteractionSession<TData>
): LayoutInteractionCommitResult<TData> {
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

export function cancelInteraction<TData = unknown>(
  session: LayoutInteractionSession<TData>
): LayoutInteractionSession<TData> {
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

function withOptionalTransaction<TData = unknown>(
  result: {
    session: LayoutInteractionSession<TData>
  },
  transaction: LayoutTransactionResult<TData> | undefined
): LayoutInteractionCommitResult<TData> {
  if (transaction === undefined) {
    return result
  }

  return {
    ...result,
    transaction,
  }
}

function cloneNodes<TData = unknown>(nodes: readonly LayoutNode<TData>[]): LayoutNode<TData>[] {
  return nodes.map((node) => ({ ...node }))
}

function cloneOperations<TData = unknown>(
  operations: readonly LayoutOperation<TData>[]
): LayoutOperation<TData>[] {
  return operations.map(cloneOperation)
}

function cloneOperation<TData = unknown>(
  operation: LayoutOperation<TData>
): LayoutOperation<TData> {
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

function createRejectedSessionTransaction<TData = unknown>(
  session: LayoutInteractionSession<TData>
): LayoutTransactionResult<TData> {
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
