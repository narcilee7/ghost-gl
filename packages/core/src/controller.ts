import { createNanoEvents, type Emitter } from 'nanoevents'

import {
  createLayoutHistory,
  type LayoutHistoryState,
  recordLayoutTransaction,
  redoLayoutHistory,
  undoLayoutHistory,
} from './history'
import {
  cancelInteraction,
  commitInteraction,
  createInteractionSession,
  type LayoutInteractionKind,
  type LayoutInteractionSession,
  previewInteraction,
} from './interaction'
import type { LayoutOperation } from './operations'
import {
  LayoutRuntime,
  type LayoutRuntimeOptions,
  type MaterializationPlanInput,
  type MaterializationPlanResult,
} from './runtime'
import type { LayoutTransactionResult } from './transactions'
import type { GridMetrics, LayoutNode, MaterializationMode, Rect } from './types'

/** Controller event types for host subscription */
export interface RuntimeControllerEvents<TData = unknown> {
  /** Emitted when any state changes (aggregated) */
  state: (state: RuntimeControllerState<TData>) => void

  /** Emitted when nodes change (move, resize, add, remove) */
  nodes: (nodes: readonly LayoutNode<TData>[]) => void

  /** Emitted when interaction session state changes */
  interaction: (event: InteractionLifecycleEvent<TData>) => void

  /** Emitted when a transaction is committed */
  transaction: (event: TransactionEvent<TData>) => void

  /** Emitted when history changes (undo/redo availability) */
  history: (history: LayoutHistoryState<TData>) => void

  /** Emitted when materialization plan changes */
  materialization: (event: MaterializationEvent<TData>) => void

  /** Emitted for budget-related events */
  budget: (event: BudgetEvent) => void
}

/** Detailed interaction lifecycle event */
export interface InteractionLifecycleEvent<TData = unknown> {
  type: 'begin' | 'preview' | 'commit' | 'cancel'
  session: LayoutInteractionSession<TData>
  previousSession: LayoutInteractionSession<TData> | undefined
}

/** Detailed transaction event */
export interface TransactionEvent<TData = unknown> {
  type: 'commit' | 'undo' | 'redo'
  transaction: LayoutTransactionResult<TData>
  source: 'interaction' | 'api' | 'history'
}

/** Materialization planning event */
export interface MaterializationEvent<TData = unknown> {
  type: 'plan' | 'mode-change'
  plan: MaterializationPlanResult<TData>
  /** Mode transitions for tracking */
  transitions:
    | Array<{
        id: string
        from: MaterializationMode
        to: MaterializationMode
        reason: string
      }>
    | undefined
}

/** Budget tracking event */
export interface BudgetEvent {
  type: 'exceeded' | 'available'
  mountsRemaining: number
  unmountsRemaining: number
  mountBudgetRemaining: number
  unmountBudgetRemaining: number
}

/** Subscription options for fine-grained control */
export interface SubscriptionOptions {
  /** Debounce time in ms for state events (0 = no debounce) */
  debounceMs?: number
  /** Filter to only receive events for specific node IDs */
  nodeFilter?: string[]
}

export interface RuntimeControllerState<TData = unknown> {
  history: LayoutHistoryState<TData>
  interactionSession: LayoutInteractionSession<TData> | undefined
  nodes: readonly LayoutNode<TData>[]
  metrics: GridMetrics
  bounds: Rect
  canUndo: boolean
  canRedo: boolean
}

/** Public API for host interaction */
export interface ControllerAPI<TData = unknown> {
  // Queries
  getNodes(): readonly LayoutNode<TData>[]
  getNode(id: string): LayoutNode<TData> | undefined
  getBounds(): Rect
  getMetrics(): GridMetrics
  getState(): RuntimeControllerState<TData>
  canUndo(): boolean
  canRedo(): boolean

  // Operations
  moveNode(id: string, x: number, y: number): boolean
  resizeNode(id: string, w: number, h: number): boolean
  upsertNode(node: LayoutNode<TData>): void
  removeNode(id: string): boolean

  // Interaction
  beginInteraction(input: {
    id: string
    kind: LayoutInteractionKind
    targetId?: string
  }): LayoutInteractionSession<TData>
  previewInteraction(operations: ReadonlyArray<LayoutOperation<TData>>): void
  commitInteraction(): void
  cancelInteraction(): void

  // History
  undo(): boolean
  redo(): boolean

  // Materialization
  planMaterialization(
    input: Omit<MaterializationPlanInput<TData>, 'interactionSession'>
  ): MaterializationPlanResult<TData>

  // Subscription
  on<EventName extends keyof RuntimeControllerEvents<TData>>(
    event: EventName,
    listener: RuntimeControllerEvents<TData>[EventName]
  ): () => void
  subscribe(
    listener: (state: RuntimeControllerState<TData>) => void,
    options?: SubscriptionOptions
  ): () => void
}

export class RuntimeController<TData = unknown> implements ControllerAPI<TData> {
  private emitter: Emitter<RuntimeControllerEvents<TData>>
  private history: LayoutHistoryState<TData>
  private interactionSession?: LayoutInteractionSession<TData>
  private runtime: LayoutRuntime<TData>

  // Track previous materialization for diffing
  private previousMaterialized = new Map<string, MaterializationMode>()

  constructor(options: LayoutRuntimeOptions<TData>) {
    this.emitter = createNanoEvents<RuntimeControllerEvents<TData>>()
    this.runtime = new LayoutRuntime(options)
    this.history = createLayoutHistory()
  }

  // ==================== Queries ====================

  getBounds(): Rect {
    return this.runtime.getBounds()
  }

  getHistory(): LayoutHistoryState<TData> {
    return this.history
  }

  getInteractionSession(): LayoutInteractionSession<TData> | undefined {
    return this.interactionSession
  }

  getMetrics(): GridMetrics {
    return this.runtime.getMetrics()
  }

  getNode(id: string): LayoutNode<TData> | undefined {
    return this.runtime.getNode(id)
  }

  getNodes(): readonly LayoutNode<TData>[] {
    return this.runtime.getNodes()
  }

  getState(): RuntimeControllerState<TData> {
    return {
      bounds: this.runtime.getBounds(),
      canRedo: this.history.future.length > 0,
      canUndo: this.history.past.length > 0,
      history: this.history,
      interactionSession: this.interactionSession,
      metrics: this.runtime.getMetrics(),
      nodes: this.runtime.getNodes(),
    }
  }

  canUndo(): boolean {
    return this.history.past.length > 0
  }

  canRedo(): boolean {
    return this.history.future.length > 0
  }

  // ==================== Operations ====================

  moveNode(id: string, x: number, y: number): boolean {
    const success = this.runtime.moveNode(id, { x, y })
    if (success) {
      this.emitNodesChange()
      this.emitState()
    }
    return success
  }

  resizeNode(id: string, w: number, h: number): boolean {
    const success = this.runtime.resizeNode(id, { w, h })
    if (success) {
      this.emitNodesChange()
      this.emitState()
    }
    return success
  }

  upsertNode(node: LayoutNode<TData>): void {
    this.runtime.upsertNode(node)
    this.emitNodesChange()
    this.emitState()
  }

  removeNode(id: string): boolean {
    const success = this.runtime.removeNode(id)
    if (success) {
      this.emitNodesChange()
      this.emitState()
    }
    return success
  }

  // ==================== Interaction Lifecycle ====================

  beginInteraction(input: {
    id: string
    kind: LayoutInteractionKind
    targetId?: string
  }): LayoutInteractionSession<TData> {
    const sessionInput: {
      id: string
      kind: LayoutInteractionKind
      nodes: readonly LayoutNode<TData>[]
      targetId?: string
    } = {
      id: input.id,
      kind: input.kind,
      nodes: this.runtime.getNodes(),
    }

    if (input.targetId !== undefined) {
      sessionInput.targetId = input.targetId
    }

    const previousSession = this.interactionSession
    this.interactionSession = createInteractionSession(sessionInput)

    this.emitter.emit('interaction', {
      previousSession,
      session: this.interactionSession,
      type: 'begin',
    })
    this.emitInteractionState()

    return this.interactionSession
  }

  previewInteraction(operations: readonly LayoutOperation<TData>[]): void {
    if (this.interactionSession == null) {
      return
    }

    const previousSession = this.interactionSession
    const preview = previewInteraction(this.interactionSession, operations, {
      constraints: this.runtime.getConstraints(),
    })
    this.interactionSession = preview.session

    this.emitter.emit('interaction', {
      previousSession,
      session: this.interactionSession,
      type: 'preview',
    })
    this.emitInteractionState()
  }

  commitInteraction(): void {
    if (this.interactionSession == null) {
      return
    }

    const previousSession = this.interactionSession
    const result = commitInteraction(this.interactionSession)
    this.interactionSession = result.session

    if (result.transaction?.committed) {
      const transaction = this.runtime.dispatchAll(result.transaction.operations)

      if (transaction.committed) {
        this.history = recordLayoutTransaction(this.history, transaction)
        this.emitTransaction({
          source: 'interaction',
          transaction,
          type: 'commit',
        })
        this.emitHistory()
        this.emitNodesChange()
      }
    }

    this.emitter.emit('interaction', {
      previousSession,
      session: this.interactionSession,
      type: 'commit',
    })
    this.emitInteractionState()
  }

  cancelInteraction(): void {
    if (this.interactionSession == null) {
      return
    }

    const previousSession = this.interactionSession
    this.interactionSession = cancelInteraction(this.interactionSession)

    this.emitter.emit('interaction', {
      previousSession,
      session: this.interactionSession,
      type: 'cancel',
    })
    this.emitInteractionState()
  }

  // ==================== Materialization ====================

  planMaterialization(
    input: Omit<MaterializationPlanInput<TData>, 'interactionSession'>
  ): MaterializationPlanResult<TData> {
    const planInput: MaterializationPlanInput<TData> = { ...input }

    if (this.interactionSession !== undefined) {
      planInput.interactionSession = this.interactionSession
    }

    const plan = this.runtime.planMaterialization(planInput)

    // Calculate transitions
    const transitions: Array<{
      id: string
      from: MaterializationMode
      to: MaterializationMode
      reason: string
    }> = []

    for (const item of plan.materialized) {
      const previousMode = this.previousMaterialized.get(item.id)
      if (previousMode !== undefined && previousMode !== item.mode) {
        transitions.push({
          from: previousMode,
          id: item.id,
          reason: item.reason,
          to: item.mode,
        })
      }
      this.previousMaterialized.set(item.id, item.mode)
    }

    // Clean up nodes that are no longer materialized
    const currentIds = new Set(plan.materialized.map((m) => m.id))
    for (const id of this.previousMaterialized.keys()) {
      if (!currentIds.has(id)) {
        const mode = this.previousMaterialized.get(id)
        if (mode !== undefined && mode !== 'ghost') {
          transitions.push({
            from: mode,
            id,
            reason: 'parked',
            to: 'ghost',
          })
        }
        this.previousMaterialized.delete(id)
      }
    }

    this.emitter.emit('materialization', {
      plan,
      transitions: transitions.length > 0 ? transitions : undefined,
      type: transitions.length > 0 ? 'mode-change' : 'plan',
    })

    // Emit budget event if needed (check if summary has budget info)
    const summary = plan.summary as Record<string, number>
    const mountsWithinBudget =
      summary['mountsWithinBudget'] ?? plan.summary.live + plan.summary.shell
    if (mountsWithinBudget < plan.summary.live + plan.summary.shell) {
      this.emitter.emit('budget', {
        mountBudgetRemaining: 0,
        mountsRemaining: 0,
        type: 'exceeded',
        unmountBudgetRemaining: 8,
        unmountsRemaining: summary['unmountsWithinBudget'] ?? 0,
      })
    }

    return plan
  }

  // ==================== History ====================

  redo(): boolean {
    const navigation = redoLayoutHistory(this.runtime.getNodes(), this.history, {
      constraints: this.runtime.getConstraints(),
    })

    if (!navigation.changed || navigation.transaction == null) {
      return false
    }

    const committed = this.runtime.dispatchAll(navigation.transaction.operations)

    if (!committed.committed) {
      return false
    }

    this.history = navigation.history
    this.emitTransaction({
      source: 'history',
      transaction: committed,
      type: 'redo',
    })
    this.emitHistory()
    this.emitNodesChange()
    this.emitState()

    return true
  }

  undo(): boolean {
    const navigation = undoLayoutHistory(this.runtime.getNodes(), this.history, {
      constraints: this.runtime.getConstraints(),
    })

    if (!navigation.changed || navigation.transaction == null) {
      return false
    }

    const committed = this.runtime.dispatchAll(navigation.transaction.operations)

    if (!committed.committed) {
      return false
    }

    this.history = navigation.history
    this.emitTransaction({
      source: 'history',
      transaction: committed,
      type: 'undo',
    })
    this.emitHistory()
    this.emitNodesChange()
    this.emitState()

    return true
  }

  // ==================== Subscription ====================

  on<EventName extends keyof RuntimeControllerEvents<TData>>(
    event: EventName,
    listener: RuntimeControllerEvents<TData>[EventName]
  ): () => void {
    return this.emitter.on(event, listener)
  }

  subscribe(
    listener: (state: RuntimeControllerState<TData>) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    const { debounceMs = 0, nodeFilter } = options

    let timeoutId: ReturnType<typeof setTimeout> | undefined

    return this.emitter.on('state', (state) => {
      // Filter by node IDs if specified
      if (nodeFilter !== undefined) {
        const hasRelevantNodes = state.nodes.some((n) => nodeFilter.includes(n.id))
        if (!hasRelevantNodes) {
          return
        }
      }

      if (debounceMs > 0) {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => listener(state), debounceMs)
      } else {
        listener(state)
      }
    })
  }

  // ==================== Private Emitters ====================

  private emitHistory(): void {
    this.emitter.emit('history', this.history)
  }

  private emitInteractionState(): void {
    this.emitState()
  }

  private emitNodesChange(): void {
    this.emitter.emit('nodes', this.runtime.getNodes())
  }

  private emitState(): void {
    this.emitter.emit('state', this.getState())
  }

  private emitTransaction(event: TransactionEvent<TData>): void {
    this.emitter.emit('transaction', event)
  }
}
