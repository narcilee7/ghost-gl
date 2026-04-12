import type { LayoutNode, RuntimeControllerState } from 'ghost-gl-core'
import { GhostGrid, GhostGridSkeleton } from 'ghost-gl-react'
import { useMemo, useState } from 'react'

interface WidgetData {
  title: string
  index: number
  type: string
}

export function VirtualizedGridExample() {
  const [stats, setStats] = useState<RuntimeControllerState<WidgetData> | null>(null)
  const [itemCount, setItemCount] = useState(100)
  const [overscan, setOverscan] = useState(2)

  // Generate many items for virtualization demo
  const initialNodes = useMemo<LayoutNode<WidgetData>[]>(() => {
    const nodes: LayoutNode<WidgetData>[] = []
    const cols = 4

    for (let i = 0; i < itemCount; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols

      nodes.push({
        id: String(i + 1),
        x: col * 3,
        y: row * 3,
        w: 3,
        h: 3,
        data: {
          title: `Widget ${i + 1}`,
          index: i,
          type: i % 3 === 0 ? 'chart' : i % 3 === 1 ? 'metric' : 'table',
        },
      })
    }

    return nodes
  }, [itemCount])

  // Calculate visible stats
  const visibleCount = stats?.nodes.length || 0
  const gridHeight = stats?.bounds?.height || 0

  return (
    <div className="example-container">
      <div className="example-header">
        <h2>Virtualized Grid</h2>
        <p>
          Large dataset with virtualization - only visible items are rendered. Scroll to see the
          three-state materialization in action.
        </p>
      </div>

      <div className="example-toolbar">
        <label>
          Items:
          <input
            type="range"
            min="50"
            max="500"
            step="50"
            value={itemCount}
            onChange={(e) => setItemCount(Number(e.target.value))}
          />
          <span>{itemCount}</span>
        </label>

        <label>
          Overscan:
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={overscan}
            onChange={(e) => setOverscan(Number(e.target.value))}
          />
          <span>{overscan}</span>
        </label>

        <span className="info">
          Grid height: {gridHeight.toFixed(0)}px | Visible: {visibleCount} items | Scroll to see
          ghost/shell/live transitions
        </span>
      </div>

      <div className="grid-container" style={{ height: 600 }}>
        <GhostGrid<WidgetData>
          columns={12}
          rowHeight={50}
          initialNodes={initialNodes}
          overscan={overscan}
          policy={{ collisionDirection: 'vertical', autoCompact: false }}
          onStateChange={setStats}
          renderItem={({ node, mode }) => {
            // Ghost mode - grid handles positioning, we render nothing
            if (mode === 'ghost') {
              return null
            }

            // Shell mode - skeleton placeholder
            if (mode === 'shell') {
              return (
                <GhostGridSkeleton
                  animation="wave"
                  backgroundColor="#e8e8e8"
                  highlightColor="#f5f5f5"
                  borderRadius={8}
                />
              )
            }

            // Live mode - full component
            const data = node.data
            if (!data) return null
            return (
              <div className="grid-item">
                <div className="grid-item-header">
                  <span className="title">#{data.index + 1}</span>
                </div>
                <div className="grid-item-content">
                  <p>{data.type}</p>
                </div>
                <div className="grid-item-id">{node.id}</div>
              </div>
            )
          }}
        />
      </div>

      {stats && (
        <div className="stats-panel">
          <h4>Virtualization Stats</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Items:</span>
              <span className="stat-value">{stats.nodes.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Grid Height:</span>
              <span className="stat-value">{(stats.bounds?.height || 0).toFixed(0)}px</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Col Width:</span>
              <span className="stat-value">{stats.metrics?.columnWidth.toFixed(1)}px</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Row Height:</span>
              <span className="stat-value">{stats.metrics?.rowHeight}px</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Gap X:</span>
              <span className="stat-value">{stats.metrics?.gapX || 0}px</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Gap Y:</span>
              <span className="stat-value">{stats.metrics?.gapY || 0}px</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
