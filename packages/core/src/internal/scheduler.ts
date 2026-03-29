import { expandRect, intersectsRect } from '../geometry'
import type { MaterializationMode, Rect } from '../types'

export const schedulerReasons = ['visible', 'overscan', 'dragging', 'cooldown', 'parked'] as const

export type SchedulerReason = (typeof schedulerReasons)[number]

export interface SchedulerViewport extends Rect {
  velocityX?: number
  velocityY?: number
}

export interface SchedulerNodeCandidate {
  id: string
  rect: Rect
  mode: MaterializationMode
  isActive?: boolean
  lastInteractionAt?: number
  lastVisibleAt?: number
}

export interface SchedulerConfig {
  overscanX: number
  overscanY: number
  shellCooldownMs: number
  fastScrollVelocity: number
}

export interface SchedulerContext {
  config: SchedulerConfig
  expandedViewport: Rect
  isFastScrolling: boolean
  timestamp: number
  viewport: Rect
}

export interface SchedulerDecision {
  id: string
  mode: MaterializationMode
  reason: SchedulerReason
}

export interface SchedulerSummary {
  ghost: number
  live: number
  shell: number
}

export interface SchedulerPlan {
  context: SchedulerContext
  decisions: SchedulerDecision[]
  summary: SchedulerSummary
}

export interface SchedulerOverrideResult {
  mode: MaterializationMode
  reason?: SchedulerReason
}

export interface SchedulerController {
  resolveMode?: (
    node: SchedulerNodeCandidate,
    context: SchedulerContext
  ) => SchedulerOverrideResult | null | undefined
}

export interface PlanMaterializationInput {
  config?: Partial<SchedulerConfig>
  controller?: SchedulerController
  nodes: readonly SchedulerNodeCandidate[]
  timestamp: number
  viewport: SchedulerViewport
}

export const defaultSchedulerConfig: SchedulerConfig = {
  overscanX: 200,
  overscanY: 200,
  shellCooldownMs: 180,
  fastScrollVelocity: 1_200,
}

export function createSchedulerConfig(overrides: Partial<SchedulerConfig> = {}): SchedulerConfig {
  return {
    ...defaultSchedulerConfig,
    ...overrides,
  }
}

export function planMaterialization(input: PlanMaterializationInput): SchedulerPlan {
  const config = createSchedulerConfig(input.config)
  const viewport: Rect = {
    left: input.viewport.left,
    top: input.viewport.top,
    width: input.viewport.width,
    height: input.viewport.height,
  }
  const expandedViewport = expandRect(viewport, config.overscanX, config.overscanY)
  const context: SchedulerContext = {
    config,
    expandedViewport,
    isFastScrolling:
      Math.abs(input.viewport.velocityX ?? 0) >= config.fastScrollVelocity ||
      Math.abs(input.viewport.velocityY ?? 0) >= config.fastScrollVelocity,
    timestamp: input.timestamp,
    viewport,
  }

  const summary: SchedulerSummary = {
    ghost: 0,
    live: 0,
    shell: 0,
  }

  const decisions = input.nodes.map((node) => {
    const override = input.controller?.resolveMode?.(node, context)
    const decision =
      override != null ? toDecision(node.id, override) : decideNodeMode(node, context)

    summary[decision.mode] += 1

    return decision
  })

  return {
    context,
    decisions,
    summary,
  }
}

function decideNodeMode(
  node: SchedulerNodeCandidate,
  context: SchedulerContext
): SchedulerDecision {
  if (node.isActive) {
    return {
      id: node.id,
      mode: 'live',
      reason: 'dragging',
    }
  }

  if (intersectsRect(node.rect, context.viewport)) {
    return {
      id: node.id,
      mode: 'live',
      reason: 'visible',
    }
  }

  if (isInCooldown(node, context)) {
    return {
      id: node.id,
      mode: 'shell',
      reason: 'cooldown',
    }
  }

  if (intersectsRect(node.rect, context.expandedViewport)) {
    return {
      id: node.id,
      mode: 'shell',
      reason: context.isFastScrolling ? 'cooldown' : 'overscan',
    }
  }

  return {
    id: node.id,
    mode: 'ghost',
    reason: 'parked',
  }
}

function isInCooldown(node: SchedulerNodeCandidate, context: SchedulerContext): boolean {
  const lastWarmAt = Math.max(
    node.lastInteractionAt ?? Number.NEGATIVE_INFINITY,
    node.lastVisibleAt ?? Number.NEGATIVE_INFINITY
  )

  return (
    Number.isFinite(lastWarmAt) && context.timestamp - lastWarmAt <= context.config.shellCooldownMs
  )
}

function toDecision(id: string, result: SchedulerOverrideResult): SchedulerDecision {
  return {
    id,
    mode: result.mode,
    reason: result.reason ?? inferReasonFromMode(result.mode),
  }
}

function inferReasonFromMode(mode: MaterializationMode): SchedulerReason {
  switch (mode) {
    case 'live':
      return 'visible'
    case 'shell':
      return 'overscan'
    case 'ghost':
      return 'parked'
  }
}
