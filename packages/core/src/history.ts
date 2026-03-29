import type { LayoutOperation } from './operations'
import {
  applyLayoutTransaction,
  type LayoutTransactionOptions,
  type LayoutTransactionResult,
} from './transactions'
import type { LayoutNode } from './types'

export interface LayoutHistoryEntry<TData = unknown> {
  redoOperations: readonly LayoutOperation<TData>[]
  undoOperations: readonly LayoutOperation<TData>[]
}

export interface LayoutHistoryState<TData = unknown> {
  future: readonly LayoutHistoryEntry<TData>[]
  past: readonly LayoutHistoryEntry<TData>[]
}

export interface LayoutHistoryNavigationResult<TData = unknown> {
  changed: boolean
  history: LayoutHistoryState<TData>
  transaction?: LayoutTransactionResult<TData>
}

export function createLayoutHistory<TData = unknown>(): LayoutHistoryState<TData> {
  return {
    future: [],
    past: [],
  }
}

export function recordLayoutTransaction<TData = unknown>(
  history: LayoutHistoryState<TData>,
  transaction: LayoutTransactionResult<TData>
): LayoutHistoryState<TData> {
  if (!transaction.committed || !transaction.changed) {
    return history
  }

  return {
    future: [],
    past: [
      ...history.past,
      {
        redoOperations: cloneOperations(transaction.operations),
        undoOperations: cloneOperations(transaction.inverseOperations),
      },
    ],
  }
}

export function redoLayoutHistory<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  history: LayoutHistoryState<TData>,
  options: LayoutTransactionOptions = {}
): LayoutHistoryNavigationResult<TData> {
  const entry = history.future.at(-1)

  if (entry == null) {
    return {
      changed: false,
      history,
    }
  }

  const transaction = applyLayoutTransaction(nodes, entry.redoOperations, options)

  if (!transaction.committed) {
    return {
      changed: false,
      history,
      transaction,
    }
  }

  return {
    changed: transaction.changed,
    history: {
      future: history.future.slice(0, -1),
      past: [...history.past, entry],
    },
    transaction,
  }
}

export function undoLayoutHistory<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  history: LayoutHistoryState<TData>,
  options: LayoutTransactionOptions = {}
): LayoutHistoryNavigationResult<TData> {
  const entry = history.past.at(-1)

  if (entry == null) {
    return {
      changed: false,
      history,
    }
  }

  const transaction = applyLayoutTransaction(nodes, entry.undoOperations, options)

  if (!transaction.committed) {
    return {
      changed: false,
      history,
      transaction,
    }
  }

  return {
    changed: transaction.changed,
    history: {
      future: [...history.future, entry],
      past: history.past.slice(0, -1),
    },
    transaction,
  }
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
