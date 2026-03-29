export type {
  LayoutConstraints,
  LayoutConstraintViolation,
  LayoutConstraintViolationCode,
} from './constraints'
export {
  assertLayoutNode,
  assertLayoutNodes,
  createLayoutViolationError,
  validateNode,
  validatePlacement,
  validateSize,
} from './constraints'
export type { RuntimeControllerState } from './controller'
export { RuntimeController } from './controller'
export {
  estimateLayoutBounds,
  expandRect,
  intersectsRect,
  projectNodeToRect,
} from './geometry'
export type {
  LayoutHistoryEntry,
  LayoutHistoryNavigationResult,
  LayoutHistoryState,
} from './history'
export {
  createLayoutHistory,
  recordLayoutTransaction,
  redoLayoutHistory,
  undoLayoutHistory,
} from './history'
export type {
  LayoutInteractionCommitResult,
  LayoutInteractionKind,
  LayoutInteractionPreviewResult,
  LayoutInteractionSession,
  LayoutInteractionStatus,
} from './interaction'
export {
  cancelInteraction,
  commitInteraction,
  createInteractionSession,
  previewInteraction,
} from './interaction'
export type { NodePlacement, NodeSize } from './layout'
export { collides, moveNode, resizeNode } from './layout'
export { createNodeMap } from './node-map'
export type {
  LayoutOperation,
  LayoutOperationOptions,
  LayoutOperationRejectionReason,
  LayoutOperationResult,
  LayoutOperationStatus,
} from './operations'
export { applyLayoutOperation } from './operations'
export type {
  LayoutRuntimeOptions,
  MaterializationPlanInput,
  MaterializationPlanResult,
} from './runtime'
export { LayoutRuntime } from './runtime'
export type {
  LayoutTransactionOptions,
  LayoutTransactionResult,
} from './transactions'
export { applyLayoutTransaction } from './transactions'
export type {
  GridMetrics,
  LayoutNode,
  LayoutRect,
  MaterializationMode,
  MaterializedNode,
  Rect,
  SnapshotAdapter,
} from './types'
export { materializationModes } from './types'
export type { ViewportQueryOptions } from './viewport'
export { queryViewport } from './viewport'

import type { MaterializationMode } from './types'
import { materializationModes } from './types'

export function isMaterializationMode(value: string): value is MaterializationMode {
  return materializationModes.includes(value as MaterializationMode)
}
