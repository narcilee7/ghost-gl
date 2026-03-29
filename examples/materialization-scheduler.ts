/**
 * Materialization Scheduler Example
 * 
 * This example demonstrates ghost-gl's three-state materialization model:
 * - ghost: Zero-cost layout representation
 * - shell: Lightweight skeleton placeholder
 * - live: Full component with interaction
 * 
 * The scheduler ensures frame budget compliance (< 16ms per frame).
 */

import {
  LayoutNode,
  LayoutRuntime,
  MaterializationMode,
  SchedulerPlan,
  SchedulerProfile,
} from 'ghost-gl-core'

// Simulate a heavy component with 50ms mount cost
interface HeavyWidget {
  title: string
  mountCost: number // ms to mount
  renderCost: number // ms per frame to render
}

// Create 100 heavy widgets
function createHeavyGrid(count: number): LayoutNode<HeavyWidget>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `heavy-${i}`,
    x: (i % 4) * 3,
    y: Math.floor(i / 4) * 4,
    w: 3,
    h: 4,
    data: {
      title: `Heavy Widget ${i}`,
      mountCost: 50, // 50ms to mount
      renderCost: 5, // 5ms per frame
    },
  }))
}

const nodes = createHeavyGrid(100)

// Initialize runtime
const runtime = new LayoutRuntime<HeavyWidget>({
  nodes,
  columns: 12,
  rowHeight: 40,
})

const controller = runtime.controller

/**
 * Plan materialization with different profiles
 */
function planWithProfile(
  scrollTop: number,
  profile: SchedulerProfile,
  budget?: { mountBudget: number; unmountBudget: number }
): SchedulerPlan {
  return controller.planMaterialization({
    viewport: {
      left: 0,
      top: scrollTop,
      width: 1200,
      height: 800,
    },
    overscan: 2,
    profile,
    budget,
  })
}

/**
 * Profile: idle - User not interacting, maximize mounts
 */
function planIdleMode(scrollTop: number): SchedulerPlan {
  console.log('\n=== Idle Mode ===')
  const plan = planWithProfile(scrollTop, 'idle')
  
  console.log('Budget:', plan.summary.mountBudget, 'ms mount,', plan.summary.unmountBudget, 'ms unmount')
  console.log('Mounts within budget:', plan.summary.mountsWithinBudget)
  console.log('Deferred to next frame:', plan.deferred.length)
  
  return plan
}

/**
 * Profile: scrolling - Reduce mounts to maintain smooth scroll
 */
function planScrollingMode(scrollTop: number): SchedulerPlan {
  console.log('\n=== Scrolling Mode ===')
  const plan = planWithProfile(scrollTop, 'scrolling')
  
  console.log('Budget:', plan.summary.mountBudget, 'ms mount,', plan.summary.unmountBudget, 'ms unmount')
  console.log('Mounts within budget:', plan.summary.mountsWithinBudget)
  console.log('Deferred to next frame:', plan.deferred.length)
  
  return plan
}

/**
 * Profile: interacting - Minimal mounts, prioritize responsiveness
 */
function planInteractingMode(scrollTop: number): SchedulerPlan {
  console.log('\n=== Interacting Mode ===')
  const plan = planWithProfile(scrollTop, 'interacting')
  
  console.log('Budget:', plan.summary.mountBudget, 'ms mount,', plan.summary.unmountBudget, 'ms unmount')
  console.log('Mounts within budget:', plan.summary.mountsWithinBudget)
  console.log('Deferred to next frame:', plan.deferred.length)
  
  return plan
}

/**
 * Custom budget configuration
 */
function planWithCustomBudget(scrollTop: number): SchedulerPlan {
  console.log('\n=== Custom Budget ===')
  
  // Very conservative: only 4ms for mounts per frame
  const plan = planWithProfile(scrollTop, 'scrolling', {
    mountBudget: 4,
    unmountBudget: 2,
  })
  
  console.log('Custom mount budget: 4ms')
  console.log('Mounts within budget:', plan.summary.mountsWithinBudget)
  
  return plan
}

/**
 * Simulate host rendering based on materialization plan
 */
function simulateRender(plan: SchedulerPlan, nodes: LayoutNode<HeavyWidget>[]) {
  const renderStats = {
    ghost: 0,
    shell: 0,
    live: 0,
    totalCost: 0,
  }

  // Build node lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Process decisions
  for (const decision of plan.decisions) {
    const node = nodeMap.get(decision.id)
    if (!node) continue

    switch (decision.mode) {
      case 'ghost':
        // Zero cost: just layout position
        renderStats.ghost++
        break
      
      case 'shell':
        // 30% of mount cost (~15ms)
        renderStats.shell++
        renderStats.totalCost += node.data.mountCost * 0.3
        break
      
      case 'live':
        // Full mount cost (50ms)
        renderStats.live++
        renderStats.totalCost += node.data.mountCost
        break
    }
  }

  console.log('Render stats:', renderStats)
  console.log(`Estimated frame cost: ${renderStats.totalCost.toFixed(1)}ms`)
  
  return renderStats
}

/**
 * Listen for materialization events
 */
function setupMaterializationListeners() {
  controller.on('materialization', (event) => {
    const emoji = {
      ghost: '👻',
      shell: '🐚',
      live: '⚡',
    }[event.mode]
    
    console.log(`${emoji} ${event.nodeId}: ${event.previousMode} → ${event.mode} (${event.reason})`)
  })

  controller.on('budget', (event) => {
    if (event.exceeded) {
      console.warn(`⚠️ Budget exceeded! Mounts deferred: ${event.deferredMounts}`)
    }
  })
}

/**
 * Simulate scrolling through a large grid
 */
function simulateScrolling() {
  console.log('\n=== Simulating Scroll Through Grid ===')
  
  const scrollPositions = [0, 400, 800, 1200, 1600]
  
  for (const scrollTop of scrollPositions) {
    console.log(`\n--- Scroll position: ${scrollTop}px ---`)
    
    // Use scrolling profile during scroll
    const plan = planScrollingMode(scrollTop)
    simulateRender(plan, nodes)
  }
}

/**
 * Simulate user interaction (dragging a widget)
 */
function simulateDragInteraction() {
  console.log('\n=== Simulating Drag Interaction ===')
  
  // Start drag
  controller.applyOperation({
    type: 'move',
    id: 'heavy-0',
    position: { x: 1, y: 0 },
  })
  
  // During drag, use interacting profile
  const plan = planInteractingMode(0)
  simulateRender(plan, nodes)
}

// Example execution
console.log('=== ghost-gl Materialization Scheduler Example ===')

setupMaterializationListeners()

// Initial render in idle mode
const initialPlan = planIdleMode(0)
simulateRender(initialPlan, nodes)

// Simulate scrolling
simulateScrolling()

// Simulate interaction
simulateDragInteraction()

// Custom budget
planWithCustomBudget(0)

// Cleanup
runtime.dispose()

export {
  planIdleMode,
  planInteractingMode,
  planScrollingMode,
  planWithCustomBudget,
  simulateDragInteraction,
  simulateRender,
  simulateScrolling,
}
