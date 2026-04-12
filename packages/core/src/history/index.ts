import type { LayoutOperation } from '../operations'
import {
  applyLayoutTransaction,
  type LayoutTransactionOptions,
  type LayoutTransactionResult,
} from '../transactions'
import type { LayoutNode } from '../types'

export interface LayoutHistoryEntry<T = unknown> {
  redoOperations: readonly LayoutOperation<T>[]
  undoOperations: readonly LayoutOperation<T>[]
}

export interface LayoutHistoryState<T = unknown> {
  future: readonly LayoutHistoryEntry<T>[]
  past: readonly LayoutHistoryEntry<T>[]
}

export interface LayoutHistoryNavigationResult<T = unknown> {
  changed: boolean
  history: LayoutHistoryState<T>
  transaction?: LayoutTransactionResult<T>
}

export function createLayoutHistory<T = unknown>(): LayoutHistoryState<T> {
  return {
    future: [],
    past: [],
  }
}

export function recordLayoutTransaction<T = unknown>(
  history: LayoutHistoryState<T>,
  transaction: LayoutTransactionResult<T>
): LayoutHistoryState<T> {
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

export function redoLayoutHistory<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  history: LayoutHistoryState<T>,
  options: LayoutTransactionOptions<T> = {}
): LayoutHistoryNavigationResult<T> {
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

export function undoLayoutHistory<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  history: LayoutHistoryState<T>,
  options: LayoutTransactionOptions<T> = {}
): LayoutHistoryNavigationResult<T> {
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
