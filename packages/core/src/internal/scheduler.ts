import { expandRect, intersectsRect } from '../geometry'
import type { SpatialKernel } from '../spatial'
import type { MaterializationMode, Rect } from '../types'

export const schedulerReasons = ['visible', 'overscan', 'dragging', 'cooldown', 'parked'] as const

export type SchedulerReason = (typeof schedulerReasons)[number]

/** Profile type for different user interaction states */
export type SchedulerProfile = 'idle' | 'scrolling' | 'interacting'

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
  /** Estimated mount cost in ms */
  mountCost?: number
  /** Estimated unmount cost in ms */
  unmountCost?: number
  /** Priority override (higher = more important) */
  priority?: number
}

/** Budget configuration for mount/unmount operations */
export interface SchedulerBudget {
  /** Maximum time (ms) for mount operations per frame */
  mountBudget: number
  /** Maximum time (ms) for unmount operations per frame */
  unmountBudget: number
  /** Maximum number of nodes to mount per frame */
  maxMountsPerFrame: number
  /** Maximum number of nodes to unmount per frame */
  maxUnmountsPerFrame: number
}

/** Profile-specific budget and behavior configuration */
export interface ProfileConfig {
  budget: SchedulerBudget
  /** Overscan multiplier (1.0 = normal) */
  overscanMultiplier: number
  /** Cooldown duration multiplier */
  cooldownMultiplier: number
  /** Whether to prioritize visible nodes */
  prioritizeVisible: boolean
  /** Shell mode duration in ms (0 = immediate ghost) */
  shellDuration: number
}

export interface SchedulerConfig {
  overscanX: number
  overscanY: number
  shellCooldownMs: number
  fastScrollVelocity: number
  /** Budget configuration */
  budget?: Partial<SchedulerBudget>
  /** Profile-specific overrides */
  profiles?: Partial<Record<SchedulerProfile, Partial<ProfileConfig>>>
}

export interface SchedulerContext {
  config: SchedulerConfig
  expandedViewport: Rect
  isFastScrolling: boolean
  timestamp: number
  viewport: Rect
  /** Current detected profile */
  profile: SchedulerProfile
  /** Available budget for this frame */
  budget: SchedulerBudget
}

export interface SchedulerDecision {
  id: string
  mode: MaterializationMode
  reason: SchedulerReason
  /** Priority score (higher = more important) */
  priority: number
}

export interface SchedulerSummary {
  ghost: number
  live: number
  shell: number
  /** Number of mounts within budget */
  mountsWithinBudget: number
  /** Number of unmounts within budget */
  unmountsWithinBudget: number
  /** Estimated mount cost (ms) */
  estimatedMountCost: number
  /** Estimated unmount cost (ms) */
  estimatedUnmountCost: number
}

export interface SchedulerPlan {
  context: SchedulerContext
  decisions: SchedulerDecision[]
  summary: SchedulerSummary
  /** Decisions that were deferred due to budget constraints */
  deferred: SchedulerDecision[]
  /** Trace information for debugging */
  trace: SchedulerTrace | undefined
}

export interface SchedulerTrace {
  /** Profile detection result */
  profileDetection: {
    velocity: { x: number; y: number }
    detectedProfile: SchedulerProfile
    isFastScrolling: boolean
  }
  /** Budget calculation details */
  budgetCalculation: {
    baseBudget: SchedulerBudget
    profileMultiplier: number
    finalBudget: SchedulerBudget
  }
  /** Priority distribution */
  priorityDistribution: Record<string, number>
  /** Decisions that exceeded budget */
  budgetExceeded: string[]
}

export interface SchedulerOverrideResult {
  mode: MaterializationMode
  reason?: SchedulerReason
  priority?: number
}

export interface SchedulerController {
  resolveMode?: (
    node: SchedulerNodeCandidate,
    context: SchedulerContext
  ) => SchedulerOverrideResult | null | undefined
  /** Provide custom priority calculation */
  calculatePriority?: (node: SchedulerNodeCandidate, context: SchedulerContext) => number
}

export interface PlanMaterializationInput {
  config?: Partial<SchedulerConfig>
  controller?: SchedulerController
  nodes: readonly SchedulerNodeCandidate[]
  timestamp: number
  viewport: SchedulerViewport
  /** Enable debug trace */
  trace?: boolean
}

export interface PlanMaterializationFromKernelInput<TData = unknown> {
  activeIds?: ReadonlySet<string>
  config?: Partial<SchedulerConfig>
  controller?: SchedulerController
  kernel: SpatialKernel<TData>
  modeById: ReadonlyMap<string, MaterializationMode>
  timestamp: number
  viewport: SchedulerViewport
  cooldownData?: ReadonlyMap<string, { lastInteractionAt?: number; lastVisibleAt?: number }>
  /** Enable debug trace */
  trace?: boolean
  /** Previous mode for calculating transitions */
  previousModes?: ReadonlyMap<string, MaterializationMode>
  /** Cost estimates per node */
  nodeCosts?: ReadonlyMap<string, { mount?: number; unmount?: number }>
}

/** Default budget configuration */
export const defaultSchedulerBudget: SchedulerBudget = {
  maxMountsPerFrame: 3,
  maxUnmountsPerFrame: 5,
  mountBudget: 16, // ~1 frame at 60fps
  unmountBudget: 8,
}

/** Default profile configurations */
export const defaultProfileConfigs: Record<SchedulerProfile, ProfileConfig> = {
  idle: {
    budget: defaultSchedulerBudget,
    cooldownMultiplier: 1.0,
    overscanMultiplier: 1.0,
    prioritizeVisible: true,
    shellDuration: 180,
  },
  scrolling: {
    budget: {
      ...defaultSchedulerBudget,
      mountBudget: 8, // Lower budget during scroll
      maxMountsPerFrame: 1,
    },
    cooldownMultiplier: 0.5, // Shorter cooldown
    overscanMultiplier: 1.5, // Larger overscan
    prioritizeVisible: true,
    shellDuration: 300, // Longer shell duration
  },
  interacting: {
    budget: {
      ...defaultSchedulerBudget,
      mountBudget: 32, // Higher budget for interactions
      maxMountsPerFrame: 5,
    },
    cooldownMultiplier: 1.5, // Longer cooldown
    overscanMultiplier: 1.0,
    prioritizeVisible: false, // Prioritize active nodes
    shellDuration: 100,
  },
}

export const defaultSchedulerConfig: SchedulerConfig = {
  budget: defaultSchedulerBudget,
  fastScrollVelocity: 1_200,
  overscanX: 200,
  overscanY: 200,
  profiles: defaultProfileConfigs,
  shellCooldownMs: 180,
}

export function createSchedulerConfig(overrides: Partial<SchedulerConfig> = {}): SchedulerConfig {
  return {
    ...defaultSchedulerConfig,
    ...overrides,
    budget: { ...defaultSchedulerBudget, ...overrides.budget },
  }
}

/**
 * Detect current interaction profile based on viewport velocity and active nodes.
 */
function detectProfile(
  viewport: SchedulerViewport,
  activeIds: ReadonlySet<string>,
  config: SchedulerConfig
): SchedulerProfile {
  if (activeIds.size > 0) {
    return 'interacting'
  }

  const velocity = Math.max(Math.abs(viewport.velocityX ?? 0), Math.abs(viewport.velocityY ?? 0))

  if (velocity >= config.fastScrollVelocity) {
    return 'scrolling'
  }

  return 'idle'
}

/**
 * Get profile-specific configuration.
 */
function getProfileConfig(profile: SchedulerProfile, config: SchedulerConfig): ProfileConfig {
  const baseConfig = defaultProfileConfigs[profile]
  const overrideConfig = config.profiles?.[profile]

  if (!overrideConfig) {
    return baseConfig
  }

  return {
    ...baseConfig,
    ...overrideConfig,
    budget: { ...baseConfig.budget, ...overrideConfig.budget },
  }
}

/**
 * Calculate priority for a node transition.
 */
function calculateNodePriority(
  node: SchedulerNodeCandidate,
  newMode: MaterializationMode,
  context: SchedulerContext,
  controller?: SchedulerController
): number {
  // Use controller override if provided
  if (controller?.calculatePriority) {
    return controller.calculatePriority(node, context)
  }

  let priority = node.priority ?? 0

  // Active nodes get highest priority
  if (node.isActive) {
    priority += 1000
  }

  // Visible nodes get high priority
  if (intersectsRect(node.rect, context.viewport)) {
    priority += 500
  }

  // Nodes in viewport get medium priority
  if (intersectsRect(node.rect, context.expandedViewport)) {
    priority += 100
  }

  // Transition type affects priority
  if (newMode === 'live') {
    priority += 50
  } else if (newMode === 'shell') {
    priority += 10
  }

  // Nodes with recent interaction get boost
  if (node.lastInteractionAt !== undefined) {
    const timeSinceInteraction = context.timestamp - node.lastInteractionAt
    if (timeSinceInteraction < 1000) {
      priority += 200
    }
  }

  return priority
}

export function planMaterialization(input: PlanMaterializationInput): SchedulerPlan {
  const config = createSchedulerConfig(input.config)
  const viewport: Rect = {
    height: input.viewport.height,
    left: input.viewport.left,
    top: input.viewport.top,
    width: input.viewport.width,
  }

  const activeIds = new Set(input.nodes.filter((n) => n.isActive).map((n) => n.id))

  const profile = detectProfile(input.viewport, activeIds, config)
  const profileConfig = getProfileConfig(profile, config)

  const expandedViewport = expandRect(
    viewport,
    config.overscanX * profileConfig.overscanMultiplier,
    config.overscanY * profileConfig.overscanMultiplier
  )

  const budget: SchedulerBudget = {
    maxMountsPerFrame: profileConfig.budget.maxMountsPerFrame,
    maxUnmountsPerFrame: profileConfig.budget.maxUnmountsPerFrame,
    mountBudget: profileConfig.budget.mountBudget,
    unmountBudget: profileConfig.budget.unmountBudget,
  }

  const context: SchedulerContext = {
    budget,
    config,
    expandedViewport,
    isFastScrolling:
      Math.abs(input.viewport.velocityX ?? 0) >= config.fastScrollVelocity ||
      Math.abs(input.viewport.velocityY ?? 0) >= config.fastScrollVelocity,
    profile,
    timestamp: input.timestamp,
    viewport,
  }

  const summary: SchedulerSummary = {
    estimatedMountCost: 0,
    estimatedUnmountCost: 0,
    ghost: 0,
    live: 0,
    mountsWithinBudget: 0,
    shell: 0,
    unmountsWithinBudget: 0,
  }

  const trace: SchedulerTrace | undefined = input.trace
    ? {
        budgetCalculation: {
          baseBudget: defaultSchedulerBudget,
          finalBudget: budget,
          profileMultiplier: profileConfig.overscanMultiplier,
        },
        budgetExceeded: [],
        priorityDistribution: {},
        profileDetection: {
          detectedProfile: profile,
          isFastScrolling: context.isFastScrolling,
          velocity: {
            x: input.viewport.velocityX ?? 0,
            y: input.viewport.velocityY ?? 0,
          },
        },
      }
    : undefined

  // First pass: determine target modes
  const candidates = input.nodes.map((node) => {
    const override = input.controller?.resolveMode?.(node, context)
    const modeDecision = decideNodeModeRaw(node, context, profileConfig)
    const targetMode = override?.mode ?? modeDecision.mode
    const targetReason = override?.reason ?? modeDecision.reason
    const priority = calculateNodePriority(node, targetMode, context, input.controller)

    if (trace) {
      trace.priorityDistribution[node.id] = priority
    }

    return {
      node,
      priority,
      targetMode,
      targetReason,
    }
  })

  // Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority)

  // Second pass: apply budget constraints
  let remainingMountBudget = budget.mountBudget
  let remainingUnmountBudget = budget.unmountBudget
  let remainingMountSlots = budget.maxMountsPerFrame
  let remainingUnmountSlots = budget.maxUnmountsPerFrame

  const decisions: SchedulerDecision[] = []
  const deferred: SchedulerDecision[] = []

  for (const candidate of candidates) {
    const { node, priority, targetMode, targetReason } = candidate
    const currentMode = node.mode

    // Calculate transition cost
    const mountCost = node.mountCost ?? 10
    const unmountCost = node.unmountCost ?? 5

    let canApply = true

    // Check if this is a mount operation (ghost -> shell/live)
    if (currentMode === 'ghost' && (targetMode === 'shell' || targetMode === 'live')) {
      // Shell is cheaper than live
      const actualMountCost = targetMode === 'shell' ? mountCost * 0.3 : mountCost
      if (remainingMountBudget < actualMountCost || remainingMountSlots <= 0) {
        canApply = false
        if (trace) {
          trace.budgetExceeded.push(node.id)
        }
      } else {
        remainingMountBudget -= actualMountCost
        remainingMountSlots--
        summary.estimatedMountCost += actualMountCost
        summary.mountsWithinBudget++
      }
    }

    // Check if this is an unmount operation (live/shell -> ghost)
    if ((currentMode === 'live' || currentMode === 'shell') && targetMode === 'ghost') {
      if (remainingUnmountBudget < unmountCost || remainingUnmountSlots <= 0) {
        canApply = false
        if (trace) {
          trace.budgetExceeded.push(node.id)
        }
      } else {
        remainingUnmountBudget -= unmountCost
        remainingUnmountSlots--
        summary.estimatedUnmountCost += unmountCost
        summary.unmountsWithinBudget++
      }
    }

    const decision: SchedulerDecision = {
      id: node.id,
      mode: canApply ? targetMode : currentMode,
      priority,
      reason: canApply ? targetReason : inferReasonFromMode(currentMode),
    }

    if (canApply) {
      decisions.push(decision)
    } else {
      deferred.push(decision)
    }

    summary[targetMode]++
  }

  return {
    context,
    decisions: [...decisions, ...deferred],
    deferred,
    summary,
    trace,
  }
}

interface NodeModeDecision {
  mode: MaterializationMode
  reason: SchedulerReason
}

/**
 * Determine raw target mode and reason without budget constraints.
 */
function decideNodeModeRaw(
  node: SchedulerNodeCandidate,
  context: SchedulerContext,
  profileConfig: ProfileConfig
): NodeModeDecision {
  if (node.isActive) {
    return { mode: 'live', reason: 'dragging' }
  }

  if (intersectsRect(node.rect, context.viewport)) {
    return { mode: 'live', reason: 'visible' }
  }

  const cooldownMs = context.config.shellCooldownMs * profileConfig.cooldownMultiplier
  const lastWarmAt = Math.max(
    node.lastInteractionAt ?? Number.NEGATIVE_INFINITY,
    node.lastVisibleAt ?? Number.NEGATIVE_INFINITY
  )

  if (Number.isFinite(lastWarmAt) && context.timestamp - lastWarmAt <= cooldownMs) {
    return { mode: 'shell', reason: 'cooldown' }
  }

  if (intersectsRect(node.rect, context.expandedViewport)) {
    // During fast scrolling, prefer shell or ghost
    if (context.isFastScrolling) {
      return { mode: 'shell', reason: 'cooldown' }
    }
    return { mode: 'shell', reason: 'overscan' }
  }

  return { mode: 'ghost', reason: 'parked' }
}

/**
 * Legacy function for backward compatibility.
 */
export function planMaterializationFromKernel<TData = unknown>(
  input: PlanMaterializationFromKernelInput<TData>
): SchedulerPlan {
  // Convert kernel items to candidates
  const allItems = input.kernel.getAll()

  const candidates: SchedulerNodeCandidate[] = allItems.map((item) => {
    const rect: Rect = {
      height: item.maxY - item.minY,
      left: item.minX,
      top: item.minY,
      width: item.maxX - item.minX,
    }

    const cooldownData = input.cooldownData?.get(item.id)
    const costs = input.nodeCosts?.get(item.id)

    const candidate: SchedulerNodeCandidate = {
      id: item.id,
      mode: input.modeById.get(item.id) ?? 'ghost',
      rect,
    }

    if (input.activeIds?.has(item.id)) {
      candidate.isActive = true
    }
    if (cooldownData?.lastInteractionAt !== undefined) {
      candidate.lastInteractionAt = cooldownData.lastInteractionAt
    }
    if (cooldownData?.lastVisibleAt !== undefined) {
      candidate.lastVisibleAt = cooldownData.lastVisibleAt
    }
    if (costs?.mount !== undefined) {
      candidate.mountCost = costs.mount
    }
    if (costs?.unmount !== undefined) {
      candidate.unmountCost = costs.unmount
    }

    return candidate
  })

  const planInput: PlanMaterializationInput = {
    nodes: candidates,
    timestamp: input.timestamp,
    viewport: input.viewport,
  }
  if (input.config !== undefined) {
    planInput.config = input.config
  }
  if (input.controller !== undefined) {
    planInput.controller = input.controller
  }
  if (input.trace !== undefined) {
    planInput.trace = input.trace
  }
  return planMaterialization(planInput)
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
