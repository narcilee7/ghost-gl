/**
 * Basic Usage Example
 * 
 * This example demonstrates the fundamental ghost-gl workflow:
 * - Creating a layout runtime
 * - Subscribing to state changes
 * - Moving and resizing nodes
 * - Planning materialization
 */

import {
  LayoutNode,
  LayoutRuntime,
  MaterializationMode,
  RuntimeController,
} from 'ghost-gl-core'

// 1. Define your data type
interface WidgetData {
  title: string
  type: 'chart' | 'editor' | 'table'
}

// 2. Create initial layout
const nodes: LayoutNode<WidgetData>[] = [
  { id: 'chart-1', x: 0, y: 0, w: 6, h: 4, data: { title: 'Revenue Chart', type: 'chart' } },
  { id: 'editor-1', x: 6, y: 0, w: 6, h: 4, data: { title: 'SQL Editor', type: 'editor' } },
  { id: 'table-1', x: 0, y: 4, w: 12, h: 6, data: { title: 'Data Grid', type: 'table' } },
]

// 3. Initialize runtime with 12-column grid
const runtime = new LayoutRuntime<WidgetData>({
  nodes,
  columns: 12,
  rowHeight: 50,
  policy: {
    collisionDirection: 'vertical',
    autoCompact: true,
  },
})

const controller = runtime.controller

// 4. Subscribe to state changes
const unsubscribe = controller.subscribe(
  (state) => {
    console.log('=== State Update ===')
    console.log('Materialized nodes:', state.materialized.length)
    console.log('Dragging:', state.dragSession?.nodeId ?? 'none')
    console.log('Can undo/redo:', state.canUndo, state.canRedo)
  },
  { debounceMs: 16 } // Debounce to animation frame
)

// 5. Plan materialization based on viewport
function updateViewport(scrollTop: number, height: number) {
  const plan = controller.planMaterialization({
    viewport: {
      left: 0,
      top: scrollTop,
      width: 1200,
      height,
    },
    overscan: 2,
  })

  console.log('Mount budget:', plan.summary.mountsWithinBudget)
  console.log('Deferred mounts:', plan.deferred.length)

  return plan
}

// 6. Move a node with collision resolution
function moveWidget(id: string, x: number, y: number) {
  const result = controller.applyOperation({
    type: 'move',
    id,
    position: { x, y },
  })

  if (result.status === 'success') {
    console.log(`Moved ${id} to (${x}, ${y})`)
    console.log('Collisions resolved:', result.affected.length)
  } else {
    console.error('Move failed:', result.rejection)
  }

  return result
}

// 7. Resize a node
function resizeWidget(id: string, w: number, h: number) {
  return controller.applyOperation({
    type: 'resize',
    id,
    size: { w, h },
    anchor: 'se', // Resize from southeast corner
  })
}

// 8. Batch operations in a transaction
function rearrangeDashboard() {
  return controller.applyTransaction({
    operations: [
      { type: 'move', id: 'chart-1', position: { x: 0, y: 0 } },
      { type: 'resize', id: 'editor-1', size: { w: 4, h: 4 } },
      { type: 'move', id: 'table-1', position: { x: 4, y: 4 } },
    ],
  })
}

// 9. History management
function undoLastChange() {
  if (controller.canUndo) {
    controller.undo()
    console.log('Undo successful')
  }
}

function redoLastChange() {
  if (controller.canRedo) {
    controller.redo()
    console.log('Redo successful')
  }
}

// 10. Listen for specific events
const unsubscribeTransaction = controller.on('transaction', (event) => {
  console.log(`Transaction ${event.status}:`, event.result?.affected.length, 'nodes affected')
})

const unsubscribeMaterialization = controller.on('materialization', (event) => {
  console.log(`Materialization: ${event.nodeId} → ${event.mode}`)
})

// 11. Cleanup
function cleanup() {
  unsubscribe()
  unsubscribeTransaction()
  unsubscribeMaterialization()
  runtime.dispose()
}

// Example execution
console.log('=== ghost-gl Basic Usage Example ===')

// Simulate viewport updates
updateViewport(0, 600)

// Move a widget
moveWidget('chart-1', 2, 0)

// Resize another
resizeWidget('editor-1', 8, 4)

// Undo the resize
undoLastChange()

// Cleanup when done
// cleanup()

export {
  cleanup,
  moveWidget,
  rearrangeDashboard,
  redoLastChange,
  resizeWidget,
  undoLastChange,
  updateViewport,
}
