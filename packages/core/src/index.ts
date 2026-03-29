export type {
  LayoutConstraints,
  LayoutConstraintViolation,
  LayoutConstraintViolationCode,
} from './constraints'
export {
  assertLayoutNode,
  assertLayoutNodes,
  validateNode,
  validatePlacement,
  validateSize,
} from './constraints'
export {
  estimateLayoutBounds,
  expandRect,
  intersectsRect,
  projectNodeToRect,
} from './geometry'
export type { NodePlacement, NodeSize } from './layout'
export { collides, moveNode, resizeNode } from './layout'
export { createNodeMap } from './node-map'
export type {
  LayoutRuntimeOptions,
  MaterializationPlanInput,
  MaterializationPlanResult,
} from './runtime'
export { LayoutRuntime } from './runtime'
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
