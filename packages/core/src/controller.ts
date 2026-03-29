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
import type { GridMetrics, LayoutNode, Rect } from './types'

export interface RuntimeControllerEvents<TData = unknown> {
  history: (history: LayoutHistoryState<TData>) => void
  interaction: (session: LayoutInteractionSession<TData> | undefined) => void
  state: (state: RuntimeControllerState<TData>) => void
  transaction: (transaction: LayoutTransactionResult<TData>) => void
}

export interface RuntimeControllerState<TData = unknown> {
  history: LayoutHistoryState<TData>
  interactionSession?: LayoutInteractionSession<TData>
  nodes: readonly LayoutNode<TData>[]
}

export class RuntimeController<TData = unknown> {
  private emitter: Emitter<RuntimeControllerEvents<TData>>
  private history: LayoutHistoryState<TData>
  private interactionSession?: LayoutInteractionSession<TData>
  private runtime: LayoutRuntime<TData>

  constructor(options: LayoutRuntimeOptions<TData>) {
    this.emitter = createNanoEvents<RuntimeControllerEvents<TData>>()
    this.runtime = new LayoutRuntime(options)
    this.history = createLayoutHistory()
  }

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

    this.interactionSession = createInteractionSession(sessionInput)
    this.emitInteractionState()

    return this.interactionSession
  }

  cancelInteraction(): LayoutInteractionSession<TData> | undefined {
    if (this.interactionSession == null) {
      return undefined
    }

    this.interactionSession = cancelInteraction(this.interactionSession)
    this.emitInteractionState()

    return this.interactionSession
  }

  commitInteraction(): LayoutInteractionSession<TData> | undefined {
    if (this.interactionSession == null) {
      return undefined
    }

    const result = commitInteraction(this.interactionSession)
    this.interactionSession = result.session

    if (result.transaction?.committed) {
      const transaction = this.runtime.dispatchAll(result.transaction.operations)

      if (transaction.committed) {
        this.history = recordLayoutTransaction(this.history, transaction)
        this.emitTransaction(transaction)
        this.emitHistory()
      }
    }

    this.emitInteractionState()

    return this.interactionSession
  }

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

  getNodes(): readonly LayoutNode<TData>[] {
    return this.runtime.getNodes()
  }

  getState(): RuntimeControllerState<TData> {
    const state: RuntimeControllerState<TData> = {
      history: this.history,
      nodes: this.runtime.getNodes(),
    }

    if (this.interactionSession !== undefined) {
      state.interactionSession = this.interactionSession
    }

    return state
  }

  on<EventName extends keyof RuntimeControllerEvents<TData>>(
    event: EventName,
    listener: RuntimeControllerEvents<TData>[EventName]
  ): () => void {
    return this.emitter.on(event, listener)
  }

  planMaterialization(
    input: Omit<MaterializationPlanInput<TData>, 'interactionSession'>
  ): MaterializationPlanResult<TData> {
    const planInput: MaterializationPlanInput<TData> = { ...input }

    if (this.interactionSession !== undefined) {
      planInput.interactionSession = this.interactionSession
    }

    return this.runtime.planMaterialization(planInput)
  }

  previewInteraction(
    operations: readonly LayoutOperation<TData>[]
  ): LayoutInteractionSession<TData> | undefined {
    if (this.interactionSession == null) {
      return undefined
    }

    const preview = previewInteraction(this.interactionSession, operations, {
      constraints: this.runtime.getConstraints(),
    })
    this.interactionSession = preview.session
    this.emitInteractionState()

    return this.interactionSession
  }

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
    this.emitTransaction(committed)
    this.emitHistory()
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
    this.emitTransaction(committed)
    this.emitHistory()
    this.emitState()

    return true
  }

  private emitHistory(): void {
    this.emitter.emit('history', this.history)
  }

  private emitInteractionState(): void {
    this.emitter.emit('interaction', this.interactionSession)
    this.emitState()
  }

  private emitState(): void {
    this.emitter.emit('state', this.getState())
  }

  private emitTransaction(transaction: LayoutTransactionResult<TData>): void {
    this.emitter.emit('transaction', transaction)
    this.emitState()
  }
}
