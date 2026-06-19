import { computed, inject, ref } from 'vue'
import { GhostGridContainerKey, GhostGridHostKey } from '../inject/keys'
import type { UseGhostGridDragOptions, UseGhostGridDragReturn } from '../types'

/**
 * Composable for making an element draggable within a GhostGrid.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGhostGridDrag } from 'ghost-gl-vue'
 *
 * const { isDragging, handlers } = useGhostGridDrag({ nodeId: 'widget-1' })
 * </script>
 *
 * <template>
 *   <div v-bind="handlers">Drag me</div>
 * </template>
 * ```
 */
export function useGhostGridDrag(options: UseGhostGridDragOptions): UseGhostGridDragReturn {
  const { nodeId, disabled = false } = options
  const hostRef = inject(GhostGridHostKey, null)
  const containerRef = inject(GhostGridContainerKey, null)

  const isDragging = ref(false)

  const clientToContainer = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const container = containerRef?.value
    if (container == null) return null

    const rect = container.getBoundingClientRect()
    return {
      x: clientX - rect.left + container.scrollLeft,
      y: clientY - rect.top + container.scrollTop,
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (disabled) return
    if (event.button !== 0) return

    const target = event.currentTarget as Element | null
    if (target == null) return

    if (typeof (target as HTMLElement).setPointerCapture === 'function') {
      ;(target as HTMLElement).setPointerCapture(event.pointerId)
    }

    const host = hostRef?.value
    if (host == null) return

    const node = host.controller.getNode(nodeId)
    if (node == null || node.static) return

    const pointer = clientToContainer(event.clientX, event.clientY)
    if (pointer == null) return

    const started = host.beginDrag({
      nodeId,
      pointerX: pointer.x,
      pointerY: pointer.y,
    })

    if (started) {
      isDragging.value = true
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (disabled || !isDragging.value) return

    const host = hostRef?.value
    if (host == null) return

    const pointer = clientToContainer(event.clientX, event.clientY)
    if (pointer == null) return

    host.updateDrag({
      pointerX: pointer.x,
      pointerY: pointer.y,
    })
  }

  const onPointerUp = (event: PointerEvent) => {
    const target = event.currentTarget as Element | null
    if (target != null && typeof (target as HTMLElement).releasePointerCapture === 'function') {
      ;(target as HTMLElement).releasePointerCapture(event.pointerId)
    }

    if (!isDragging.value) return

    const host = hostRef?.value
    if (host == null) return

    host.endDrag()
    isDragging.value = false
  }

  return {
    isDragging: computed(() => isDragging.value),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  }
}
