<script setup lang="ts">
import type { VNodeChild } from 'vue'

const props = defineProps<{
  render: () => VNodeChild
}>()
</script>

<template>
  <component :is="props.render" />
</template>
