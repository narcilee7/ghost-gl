import type { LayoutOperation } from '../operations'
import type { LayoutTransactionResult } from '../transactions'
import type { LayoutNode } from '../types'

export type LayoutInteractionKind = 'drag' | 'resize' | 'custom'

export type LayoutInteractionStatus = 'active' | 'committed' | 'cancelled'

export interface LayoutInteractionSession<T = unknown> {
  baseNodes: readonly LayoutNode<T>[]
  currentNodes: readonly LayoutNode<T>[]
  id: string
  kind: LayoutInteractionKind
  previewOperations: readonly LayoutOperation<T>[]
  previewResult?: LayoutTransactionResult<T>
  status: LayoutInteractionStatus
  targetId?: string
}

export interface LayoutInteractionPreviewResult<T = unknown> {
  session: LayoutInteractionSession<T>
  transaction: LayoutTransactionResult<T>
}

export interface LayoutInteractionCommitResult<T = unknown> {
  session: LayoutInteractionSession<T>
  transaction?: LayoutTransactionResult<T>
}
