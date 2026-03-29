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
import type { GridMetrics, LayoutNode, Rect } from './types'

export interface RuntimeControllerState<TData = unknown> {
  history: LayoutHistoryState<TData>
  interactionSession?: LayoutInteractionSession<TData>
  nodes: readonly LayoutNode<TData>[]
}

export class RuntimeController<TData = unknown> {
  private history: LayoutHistoryState<TData>
  private interactionSession?: LayoutInteractionSession<TData>
  private runtime: LayoutRuntime<TData>

  constructor(options: LayoutRuntimeOptions<TData>) {
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

    return this.interactionSession
  }

  cancelInteraction(): LayoutInteractionSession<TData> | undefined {
    if (this.interactionSession == null) {
      return undefined
    }

    this.interactionSession = cancelInteraction(this.interactionSession)

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
      }
    }

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

    return true
  }
}
