<script setup lang="ts" generic="T = unknown">
import type { GridHost } from 'ghost-gl-adapter-core'
import type { LayoutNode, MaterializedNode, RuntimeControllerState } from 'ghost-gl-core'
import { computed, onMounted, provide, type Ref, ref, watch } from 'vue'
import { useGhostGrid } from '../composables/useGhostGrid'
import { GhostGridContainerKey, GhostGridHostKey } from '../inject/keys'
import type { GhostGridItemRenderContext, GhostGridProps, UseGhostGridOptions } from '../types'
import RenderFn from './RenderFn.vue'

const props = withDefaults(defineProps<GhostGridProps<T>>(), {
  columns: 12,
  rowHeight: 50,
  gapX: 0,
  gapY: 0,
  paddingLeft: 0,
  paddingTop: 0,
  overscan: 2,
  debounceMs: 16,
})

const _emit = defineEmits<{
  stateChange: [state: RuntimeControllerState<T>]
  nodesChange: [nodes: readonly LayoutNode<T>[]]
}>()

const containerRef = ref<HTMLElement | null>(null)

const gridOptions: UseGhostGridOptions = {
  containerRef,
  columns: props.columns,
  rowHeight: props.rowHeight,
  gapX: props.gapX,
  gapY: props.gapY,
  paddingLeft: props.paddingLeft,
  paddingTop: props.paddingTop,
  overscan: props.overscan,
  debounceMs: props.debounceMs,
}

if (props.initialNodes !== undefined) {
  gridOptions.initialNodes = props.initialNodes
}
if (props.policy !== undefined) {
  gridOptions.policy = props.policy
}

const grid = useGhostGrid(gridOptions)

provide(GhostGridHostKey, grid.host as Ref<GridHost<unknown> | null>)
provide(GhostGridContainerKey, containerRef)

const _containerStyle = computed(() => ({
  height: grid.bounds.value?.height != null ? `${grid.bounds.value.height}px` : 'auto',
  overflow: 'auto',
  position: 'relative' as const,
  width: props.width != null ? `${props.width}px` : '100%',
  ...props.style,
}))

const _gridHeight = computed(() => grid.bounds.value?.height ?? 0)
const _materialized = computed(() => grid.materialized.value)

const _renderContext = (item: MaterializedNode<T>): GhostGridItemRenderContext<T> => {
  const node = grid.state.value?.nodes.find((n) => n.id === item.id)
  return {
    isDragging: grid.state.value?.interactionSession?.targetId === item.id,
    isResizing: false,
    mode: item.mode,
    node: (node ?? item.node) as LayoutNode<T>,
    reason: item.reason,
    rect: item.rect,
  }
}

watch(
  () => grid.state.value,
  (state) => {
    if (state != null) {
      props.onStateChange?.(state as RuntimeControllerState<T>)
    }
  },
  { deep: true }
)

watch(
  () => grid.state.value?.nodes,
  (nodes) => {
    if (nodes != null) {
      props.onNodesChange?.(nodes as readonly LayoutNode<T>[])
    }
  },
  { deep: true }
)

onMounted(() => {
  if (grid.state.value != null) {
    props.onStateChange?.(grid.state.value as RuntimeControllerState<T>)
  }
  if (grid.state.value?.nodes != null) {
    props.onNodesChange?.(grid.state.value.nodes as readonly LayoutNode<T>[])
  }
})
</script>

<template>
  <div
    ref="containerRef"
    :class="props.class"
    :style="_containerStyle"
    data-ghost-grid=""
    :data-columns="props.columns"
  >
    <div
      :style="{
        height: `${_gridHeight}px`,
        position: 'relative',
        width: '100%',
      }"
    >
      <div
        v-for="item in _materialized"
        :key="item.id"
        :data-ghost-id="item.id"
        :data-ghost-mode="item.mode"
        :style="{
          height: `${item.rect.height}px`,
          left: `${item.rect.left}px`,
          position: 'absolute',
          top: `${item.rect.top}px`,
          width: `${item.rect.width}px`,
        }"
      >
        <slot v-bind="_renderContext(item as MaterializedNode<T>)">
          <template v-if="props.renderItem">
            <RenderFn :render="() => props.renderItem!(_renderContext(item as MaterializedNode<T>))" />
          </template>
        </slot>
      </div>
    </div>
    <slot name="extra" />
  </div>
</template>
