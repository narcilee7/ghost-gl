<script setup lang="ts" generic="T = unknown">
import { computed, inject } from 'vue'
import { GhostGridHostKey } from '../inject/keys'
import type { GhostGridItemRenderContext, GhostGridItemRenderProps } from '../types'

const props = defineProps<GhostGridItemRenderProps<T>>()

const hostRef = inject(GhostGridHostKey, null)

const _context = computed<GhostGridItemRenderContext<T>>(() => ({
  isDragging:
    hostRef?.value?.controller.getInteractionSession()?.targetId === props.materializedNode.id,
  isResizing: false,
  mode: props.materializedNode.mode,
  node: props.materializedNode.node as typeof props.materializedNode.node & { data: T },
  reason: props.materializedNode.reason,
  rect: props.materializedNode.rect,
}))
</script>

<template>
  <div
    :data-ghost-id="props.materializedNode.id"
    :data-ghost-mode="props.materializedNode.mode"
    :style="{
      height: `${props.materializedNode.rect.height}px`,
      left: `${props.materializedNode.rect.left}px`,
      pointerEvents: props.materializedNode.mode === 'ghost' ? 'none' : 'auto',
      position: 'absolute',
      top: `${props.materializedNode.rect.top}px`,
      width: `${props.materializedNode.rect.width}px`,
    }"
  >
    <slot v-bind="_context">
      <component :is="() => props.renderItem(_context)" />
    </slot>
  </div>
</template>
