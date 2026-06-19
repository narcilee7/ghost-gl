import type { GridHost } from 'ghost-gl-adapter-core'
import type { InjectionKey, Ref } from 'vue'

/**
 * Injection key for the grid host.
 */
export const GhostGridHostKey: InjectionKey<Ref<GridHost<unknown> | null>> = Symbol('ghost-gl-host')

/**
 * Injection key for the container element ref.
 */
export const GhostGridContainerKey: InjectionKey<Ref<HTMLElement | null>> =
  Symbol('ghost-gl-container')

/**
 * Injection key for the currently dragged node id.
 */
export const GhostGridDraggedNodeKey: InjectionKey<Ref<string | null>> =
  Symbol('ghost-gl-dragged-node')
