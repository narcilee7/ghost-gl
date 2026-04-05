import type { LayoutNode, RuntimeControllerState } from 'ghost-gl-core'
import {
  GhostGrid,
  GhostGridDndProvider,
  useGhostGridDrag,
  type GhostGridRef,
} from 'ghost-gl-react'
import { useMemo, useRef, useState } from 'react'

interface WidgetData {
  title: string
  type: string
  color: string
}

// Draggable grid item component
function DraggableItem({
  node,
  rect,
  mode,
}: {
  node: LayoutNode<WidgetData>
  rect: { width: number; height: number }
  mode: 'ghost' | 'shell' | 'live'
}) {
  const { isDragging, handlers } = useGhostGridDrag({
    nodeId: node.id,
    disabled: mode !== 'live',
  })

  if (mode === 'ghost') return null

  if (mode === 'shell') {
    return <div className="skeleton" style={{ width: '100%', height: '100%' }} />
  }

  // In live mode, data should be available
  const data = node.data
  if (!data) return null

  return (
    <div
      className={`grid-item ${isDragging ? 'dragging' : ''}`}
      style={{
        borderTop: `4px solid ${data.color}`,
      }}
    >
      <div className="grid-item-header" {...handlers}>
        <span className="title">{data.title}</span>
        <div className="drag-handle" title="Drag to move">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Drag Handle">
            <polyline points="5 9 2 12 5 15"></polyline>
            <polyline points="9 5 12 2 15 5"></polyline>
            <polyline points="19 9 22 12 19 15"></polyline>
            <polyline points="9 19 12 22 15 19"></polyline>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="12" y1="2" x2="12" y2="22"></line>
          </svg>
        </div>
      </div>
      <div className="grid-item-content">
        <p>Interactive Widget</p>
        <small style={{ marginTop: 'auto' }}>
          {rect.width.toFixed(0)} × {rect.height.toFixed(0)}
        </small>
      </div>
      <div className="grid-item-id">{node.id}</div>
    </div>
  )
}

export function DraggableGridExample() {
  const [stats, setStats] = useState<RuntimeControllerState<WidgetData> | null>(null)
  const gridRef = useRef<GhostGridRef<WidgetData> | null>(null)

  const initialNodes = useMemo<LayoutNode<WidgetData>[]>(
    () => [
      {
        id: '1',
        x: 0,
        y: 0,
        w: 3,
        h: 3,
        data: { title: 'Widget A', type: 'chart', color: '#667eea' },
      },
      {
        id: '2',
        x: 3,
        y: 0,
        w: 3,
        h: 3,
        data: { title: 'Widget B', type: 'metric', color: '#f5576c' },
      },
      {
        id: '3',
        x: 6,
        y: 0,
        w: 3,
        h: 3,
        data: { title: 'Widget C', type: 'table', color: '#00f2fe' },
      },
      {
        id: '4',
        x: 9,
        y: 0,
        w: 3,
        h: 3,
        data: { title: 'Widget D', type: 'chart', color: '#43e97b' },
      },
      {
        id: '5',
        x: 0,
        y: 3,
        w: 4,
        h: 4,
        data: { title: 'Widget E', type: 'metric', color: '#fee140' },
      },
      {
        id: '6',
        x: 4,
        y: 3,
        w: 4,
        h: 4,
        data: { title: 'Widget F', type: 'list', color: '#fa709a' },
      },
      {
        id: '7',
        x: 8,
        y: 3,
        w: 4,
        h: 4,
        data: { title: 'Widget G', type: 'chart', color: '#764ba2' },
      },
    ],
    []
  )

  return (
    <div className="example-container">
      <div className="example-header">
        <h2>Draggable Grid</h2>
        <p>Drag and drop grid items with collision resolution and undo/redo support</p>
      </div>

      <GhostGridDndProvider
        controller={gridRef.current?.controller ?? undefined}
        containerRef={gridRef.current?.containerRef ?? undefined}
        metrics={gridRef.current?.metrics ?? undefined}
      >
        <div className="example-toolbar">
          <button type="button" onClick={() => gridRef.current?.controller?.undo()} disabled={!stats?.canUndo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Undo"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            Undo
          </button>
          <button type="button" onClick={() => gridRef.current?.controller?.redo()} disabled={!stats?.canRedo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Redo"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            Redo
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              console.log("Add widget clicked! gridRef:", gridRef.current)
              // Add a new widget
              const id = String(Date.now())
              const colors = [
                '#667eea',
                '#f5576c',
                '#00f2fe',
                '#43e97b',
                '#fee140',
                '#fa709a',
                '#764ba2',
              ]
              const color = colors[Math.floor(Math.random() * colors.length)]
              gridRef.current?.controller?.upsertNode({
                id,
                x: 0,
                y: 0,
                w: 3,
                h: 3,
                data: { title: `New Widget`, type: 'dynamic', color },
              })
            }}
          >
            + Add Widget
          </button>
          <span className="info">Drag items to reposition • Use undo/redo to track changes</span>
        </div>

        <div className="grid-container" style={{ height: 500 }}>
          <GhostGrid<WidgetData>
            gridRef={gridRef}
            columns={12}
            rowHeight={50}
            initialNodes={initialNodes}
            overscan={1}
            policy={{ collisionDirection: 'vertical', autoCompact: true }}
            onStateChange={setStats}
            renderItem={({ node, rect, mode }) => (
              <DraggableItem node={node} rect={rect} mode={mode} />
            )}
          />
        </div>
      </GhostGridDndProvider>

      {stats && (
        <div className="stats-panel">
          <h4>Interaction Stats</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Dragging:</span>
              <span className="stat-value">
                {stats.interactionSession ? stats.interactionSession.targetId || 'None' : 'None'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">History Size:</span>
              <span className="stat-value">{stats.history.past.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Future Size:</span>
              <span className="stat-value">{stats.history.future.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Items:</span>
              <span className="stat-value">{stats.nodes.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
