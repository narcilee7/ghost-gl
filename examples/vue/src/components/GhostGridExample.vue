<script setup lang="ts">
import { ref, computed } from 'vue'
import { GhostGrid } from 'ghost-gl-vue'
import type { LayoutNode, RuntimeControllerState } from 'ghost-gl-core'

interface WidgetData {
  title: string
  type: string
}

const stats = ref<RuntimeControllerState<WidgetData> | null>(null)

// Initial grid items
const initialNodes: LayoutNode<WidgetData>[] = [
  { id: '1', x: 0, y: 0, w: 4, h: 3, data: { title: 'Revenue Chart', type: 'chart' } },
  { id: '2', x: 4, y: 0, w: 4, h: 3, data: { title: 'Active Users', type: 'metric' } },
  { id: '3', x: 8, y: 0, w: 4, h: 3, data: { title: 'Conversion Rate', type: 'metric' } },
  { id: '4', x: 0, y: 3, w: 6, h: 4, data: { title: 'Sales Overview', type: 'chart' } },
  { id: '5', x: 6, y: 3, w: 6, h: 4, data: { title: 'Recent Orders', type: 'table' } },
  { id: '6', x: 0, y: 7, w: 3, h: 3, data: { title: 'Traffic Sources', type: 'pie' } },
  { id: '7', x: 3, y: 7, w: 3, h: 3, data: { title: 'Bounce Rate', type: 'metric' } },
  { id: '8', x: 6, y: 7, w: 6, h: 3, data: { title: 'Customer Feedback', type: 'list' } },
]

const handleStateChange = (state: RuntimeControllerState<WidgetData>) => {
  stats.value = state
}
</script>

<template>
  <div class="example-container">
    <div class="example-header">
      <h2>Basic GhostGrid (Vue)</h2>
      <p>A simple grid layout with three-state materialization (ghost/shell/live)</p>
    </div>

    <div class="grid-container" style="height: 500px">
      <GhostGrid
        :columns="12"
        :row-height="50"
        :initial-nodes="initialNodes"
        :overscan="1"
        :policy="{ collisionDirection: 'vertical', autoCompact: true }"
        @state-change="handleStateChange"
      >
        <template #default="{ node, rect, mode }">
          <!-- Ghost: not rendered -->
          <div v-if="mode === 'shell'" class="skeleton">
            <span>Loading... {{ node.data?.title }}</span>
          </div>
          <div v-else-if="mode === 'live'" class="grid-item">
            <div class="grid-item-header">
              <span class="title">{{ node.data?.title ?? 'Untitled' }}</span>
            </div>
            <div class="grid-item-content">
              <p>{{ node.data?.type ?? 'unknown' }}</p>
              <small>{{ rect.width.toFixed(0) }} × {{ rect.height.toFixed(0) }}</small>
            </div>
          </div>
        </template>
      </GhostGrid>
    </div>

    <div v-if="stats" class="stats-panel">
      <h4>Grid Stats</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total Items:</span>
          <span class="stat-value">{{ stats.nodes.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Grid Height:</span>
          <span class="stat-value">{{ stats.bounds?.height.toFixed(0) }}px</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Column Width:</span>
          <span class="stat-value">{{ stats.metrics?.columnWidth.toFixed(1) }}px</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.example-container {
  padding: 16px;
}

.example-header {
  margin-bottom: 16px;
}

.example-header h2 {
  margin: 0 0 8px 0;
}

.example-header p {
  color: #666;
  margin: 0;
}

.grid-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.grid-item {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.grid-item-header {
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.title {
  font-weight: 600;
}

.grid-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.grid-item-content p {
  margin: 0;
  color: #666;
}

.grid-item-content small {
  color: #999;
}

.skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f0f0f0;
  border-radius: 8px;
  color: #999;
}

.stats-panel {
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.stats-panel h4 {
  margin: 0 0 8px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-weight: 600;
}
</style>
