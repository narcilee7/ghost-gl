<script setup lang="ts">
import type { VNodeChild } from 'vue'

const _props = defineProps<{
  render: () => VNodeChild
}>()
</script>

<template>
  <component :is="render" />
</template>
