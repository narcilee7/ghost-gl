import { createGridHost, type GridHost } from 'ghost-gl-adapter-core'
import type { ControllerAPI, Rect, RuntimeControllerState } from 'ghost-gl-core'
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { UseGhostGridOptions, UseGhostGridReturn } from '../types'

/**
 * Composable for creating and managing a ghost-gl grid instance in Vue 3.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGhostGrid } from 'ghost-gl-vue'
 * import { ref } from 'vue'
 *
 * const containerRef = ref<HTMLElement | null>(null)
 * const grid = useGhostGrid({
 *   containerRef,
 *   columns: 12,
 *   rowHeight: 50,
 *   initialNodes: [{ id: '1', x: 0, y: 0, w: 4, h: 3 }],
 * })
 * </script>
 *
 * <template>
 *   <div ref="containerRef">
 *     <div
 *       v-for="item in grid.materialized"
 *       :key="item.id"
 *       :style="{ position: 'absolute', left: item.rect.left + 'px', top: item.rect.top + 'px' }"
 *     >
 *       {{ item.node.id }}
 *     </div>
 *   </div>
 * </template>
 * ```
 */
export function useGhostGrid<T = unknown>(
  options: UseGhostGridOptions<T> = {}
): UseGhostGridReturn<T> {
  const {
    initialNodes = [],
    containerRef,
    columns,
    rowHeight = 50,
    gapX = 0,
    gapY = 0,
    paddingLeft = 0,
    paddingTop = 0,
    policy,
    overscan = 2,
    debounceMs = 16,
  } = options

  const hostRef = shallowRef<GridHost<T> | null>(null)
  const state = shallowRef<RuntimeControllerState<T> | null>(null)
  const isReady = ref(false)

  const hostOptions: import('ghost-gl-adapter-core').GridHostOptions<T> = {
    debounceMs,
    gapX,
    gapY,
    initialNodes,
    overscan,
    paddingLeft,
    paddingTop,
    rowHeight,
  }

  if (columns !== undefined) {
    hostOptions.columns = columns
  }
  if (policy !== undefined) {
    hostOptions.policy = policy
  }

  const host = createGridHost<T>(hostOptions)
  hostRef.value = host

  const unsubscribe = host.subscribe((hostState) => {
    state.value = hostState.state
  })

  state.value = host.state?.state ?? null
  isReady.value = true

  onScopeDispose(() => {
    unsubscribe()
    host.dispose()
    hostRef.value = null
  })

  // Track container scroll/resize and feed viewport to the host
  const stopViewportWatch = watch(
    () => containerRef?.value,
    (container) => {
      if (container == null || hostRef.value == null) return

      const update = () => {
        const rect = container.getBoundingClientRect()
        hostRef.value?.setContainerSize({ width: rect.width, height: rect.height })
        hostRef.value?.setViewport({
          left: container.scrollLeft,
          top: container.scrollTop,
          width: rect.width,
          height: rect.height,
        })
      }

      update()

      container.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update)

      return () => {
        container.removeEventListener('scroll', update)
        window.removeEventListener('resize', update)
      }
    },
    { flush: 'post', immediate: true }
  )

  onScopeDispose(() => {
    stopViewportWatch()
  })

  const materialized = computed(() => hostRef.value?.materialized ?? [])
  const nodes = computed(() => state.value?.nodes ?? [])
  const bounds = computed(() => state.value?.bounds ?? null)
  const metrics = computed(() => state.value?.metrics ?? null)

  const updateViewport = (viewport: Rect) => {
    hostRef.value?.setViewport(viewport)
  }

  const moveNode = (id: string, x: number, y: number): boolean => {
    return hostRef.value?.moveNode(id, x, y) ?? false
  }

  const resizeNode = (id: string, w: number, h: number): boolean => {
    return hostRef.value?.resizeNode(id, w, h) ?? false
  }

  const undo = (): boolean => {
    return hostRef.value?.undo() ?? false
  }

  const redo = (): boolean => {
    return hostRef.value?.redo() ?? false
  }

  return {
    host: hostRef,
    controller: computed<ControllerAPI<T> | null>(
      () => (hostRef.value?.controller as ControllerAPI<T>) ?? null
    ),
    state,
    nodes: nodes as unknown as UseGhostGridReturn<T>['nodes'],
    materialized: materialized as unknown as UseGhostGridReturn<T>['materialized'],
    bounds,
    metrics,
    isReady,
    updateViewport,
    moveNode,
    resizeNode,
    undo,
    redo,
  }
}
