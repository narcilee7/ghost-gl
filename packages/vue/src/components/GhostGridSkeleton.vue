<script setup lang="ts">
import { computed } from 'vue'

export interface GhostGridSkeletonProps {
  /** Width of the skeleton (defaults to 100%) */
  width?: number | string
  /** Height of the skeleton (defaults to 100%) */
  height?: number | string
  /** Animation style */
  animation?: 'pulse' | 'wave' | 'none'
  /** Custom class */
  class?: string
  /** Border radius */
  borderRadius?: number | string
  /** Background color */
  backgroundColor?: string
  /** Highlight color for wave animation */
  highlightColor?: string
}

const props = withDefaults(defineProps<GhostGridSkeletonProps>(), {
  width: '100%',
  height: '100%',
  animation: 'pulse',
  borderRadius: 4,
  backgroundColor: '#e0e0e0',
  highlightColor: '#f0f0f0',
})

const toStyleValue = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value

const _baseStyle = computed(() => ({
  backgroundColor: props.backgroundColor,
  borderRadius: toStyleValue(props.borderRadius),
  height: toStyleValue(props.height),
  overflow: 'hidden',
  position: 'relative' as const,
  width: toStyleValue(props.width),
}))

const _animationClass = computed(() => {
  if (props.animation === 'pulse') return 'ghost-gl-pulse'
  if (props.animation === 'wave') return 'ghost-gl-wave'
  return ''
})

const _waveStyle = computed(() =>
  props.animation === 'wave'
    ? {
        background: `linear-gradient(90deg, ${props.backgroundColor} 25%, ${props.highlightColor} 50%, ${props.backgroundColor} 75%)`,
        backgroundSize: '200% 100%',
      }
    : {}
)
</script>

<template>
  <div
    :class="[props.class, _animationClass]"
    :style="{ ..._baseStyle, ..._waveStyle }"
    data-ghost-skeleton=""
  />
</template>

<style>
@keyframes ghost-gl-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes ghost-gl-wave {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.ghost-gl-pulse {
  animation: ghost-gl-pulse 1.5s ease-in-out infinite;
}

.ghost-gl-wave {
  animation: ghost-gl-wave 1.5s ease-in-out infinite;
}
</style>
