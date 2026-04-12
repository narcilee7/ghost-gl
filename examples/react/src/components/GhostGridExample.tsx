import type { LayoutNode, RuntimeControllerState } from 'ghost-gl-core'
import { GhostGrid } from 'ghost-gl-react'
import { useMemo, useState } from 'react'

interface WidgetData {
  title: string
  type: string
}

export function GhostGridExample() {
  const [stats, setStats] = useState<RuntimeControllerState<WidgetData> | null>(null)

  // Initial grid items
  const initialNodes = useMemo<LayoutNode<WidgetData>[]>(
    () => [
      { id: '1', x: 0, y: 0, w: 4, h: 3, data: { title: 'Revenue Chart', type: 'chart' } },
      { id: '2', x: 4, y: 0, w: 4, h: 3, data: { title: 'Active Users', type: 'metric' } },
      { id: '3', x: 8, y: 0, w: 4, h: 3, data: { title: 'Conversion Rate', type: 'metric' } },
      { id: '4', x: 0, y: 3, w: 6, h: 4, data: { title: 'Sales Overview', type: 'chart' } },
      { id: '5', x: 6, y: 3, w: 6, h: 4, data: { title: 'Recent Orders', type: 'table' } },
      { id: '6', x: 0, y: 7, w: 3, h: 3, data: { title: 'Traffic Sources', type: 'pie' } },
      { id: '7', x: 3, y: 7, w: 3, h: 3, data: { title: 'Bounce Rate', type: 'metric' } },
      { id: '8', x: 6, y: 7, w: 6, h: 3, data: { title: 'Customer Feedback', type: 'list' } },
    ],
    []
  )

  return (
    <div className="example-container">
      <div className="example-header">
        <h2>Basic GhostGrid</h2>
        <p>A simple grid layout with three-state materialization (ghost/shell/live)</p>
      </div>

      <div className="grid-container" style={{ height: 500 }}>
        <GhostGrid<WidgetData>
          columns={12}
          rowHeight={50}
          initialNodes={initialNodes}
          overscan={1}
          policy={{ collisionDirection: 'vertical', autoCompact: true }}
          onStateChange={setStats}
          renderItem={({ node, rect, mode }) => {
            // Different rendering based on materialization mode
            if (mode === 'ghost') {
              return null // Ghost items are not rendered
            }

            if (mode === 'shell') {
              return (
                <div className="skeleton" style={{ width: '100%', height: '100%' }}>
                  <div
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#999',
                    }}
                  >
                    {node.data?.title ?? 'Loading...'} (Loading...)
                  </div>
                </div>
              )
            }

            // Live mode - full component
            return (
              <div className="grid-item">
                <div className="grid-item-header">
                  <span className="title">{node.data?.title ?? 'Untitled'}</span>
                </div>
                <div className="grid-item-content">
                  <p>{node.data?.type ?? 'unknown'}</p>
                  <small style={{ marginTop: 'auto' }}>
                    {rect.width.toFixed(0)} × {rect.height.toFixed(0)}
                  </small>
                </div>
                <div className="grid-item-id">{node.id}</div>
              </div>
            )
          }}
        />
      </div>

      {stats && (
        <div className="stats-panel">
          <h4>Grid Stats</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Items:</span>
              <span className="stat-value">{stats.nodes.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Can Undo:</span>
              <span className="stat-value">{stats.canUndo ? 'Yes' : 'No'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Can Redo:</span>
              <span className="stat-value">{stats.canRedo ? 'Yes' : 'No'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Grid Height:</span>
              <span className="stat-value">{stats.bounds?.height.toFixed(0)}px</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Column Width:</span>
              <span className="stat-value">{stats.metrics?.columnWidth.toFixed(1)}px</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Row Height:</span>
              <span className="stat-value">{stats.metrics?.rowHeight}px</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
