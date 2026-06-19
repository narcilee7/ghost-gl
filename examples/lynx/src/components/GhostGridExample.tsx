import type { CSSProperties } from '@lynx-js/types'
import type { LayoutNode, RuntimeControllerState } from 'ghost-gl-core'
import { GhostGrid } from 'ghost-gl-lynx'
import { useMemo, useState } from 'react'

interface WidgetData {
  title: string
  type: string
}

const containerStyle: CSSProperties = {
  flex: 1,
  padding: 16,
}

const headerStyle: CSSProperties = {
  marginBottom: 16,
}

const titleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#000',
}

const subtitleStyle: CSSProperties = {
  fontSize: 14,
  color: '#666',
  marginTop: 4,
}

const gridContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 500,
}

const skeletonStyle: CSSProperties = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f0f0f0',
  borderRadius: 8,
}

const itemContainerStyle: CSSProperties = {
  flex: 1,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 12,
}

const itemHeaderStyle: CSSProperties = {
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
  paddingBottom: 8,
  marginBottom: 8,
}

const itemContentStyle: CSSProperties = {
  flex: 1,
  justifyContent: 'space-between',
}

const itemTypeStyle: CSSProperties = {
  fontSize: 12,
  color: '#666',
}

const itemSizeStyle: CSSProperties = {
  fontSize: 10,
  color: '#999',
}

const loadingTextStyle: CSSProperties = {
  color: '#999',
  fontSize: 12,
}

const statsStyle: CSSProperties = {
  marginTop: 16,
  padding: 12,
  backgroundColor: '#f5f5f5',
  borderRadius: 8,
}

const statsTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 'bold',
}

const statsTextStyle: CSSProperties = {
  fontSize: 12,
}

export function GhostGridExample() {
  const [stats, setStats] = useState<RuntimeControllerState<WidgetData> | null>(null)

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
    <view style={containerStyle}>
      <view style={headerStyle}>
        <text style={titleStyle}>GhostGrid Lynx Example</text>
        <text style={subtitleStyle}>
          A simple grid layout with three-state materialization (ghost/shell/live)
        </text>
      </view>

      <view style={gridContainerStyle}>
        <GhostGrid<WidgetData>
          columns={12}
          rowHeight={50}
          initialNodes={initialNodes}
          overscan={1}
          policy={{ collisionDirection: 'vertical', autoCompact: true }}
          onStateChange={setStats}
          renderItem={({ node, rect, mode }) => {
            if (mode === 'ghost') {
              return <view />
            }

            if (mode === 'shell') {
              return (
                <view style={skeletonStyle}>
                  <text style={loadingTextStyle}>Loading... {node.data?.title}</text>
                </view>
              )
            }

            return (
              <view style={itemContainerStyle}>
                <view style={itemHeaderStyle}>
                  <text style={titleStyle}>{node.data?.title ?? 'Untitled'}</text>
                </view>
                <view style={itemContentStyle}>
                  <text style={itemTypeStyle}>{node.data?.type ?? 'unknown'}</text>
                  <text style={itemSizeStyle}>
                    {rect.width.toFixed(0)} × {rect.height.toFixed(0)}
                  </text>
                </view>
              </view>
            )
          }}
        />
      </view>

      {stats && (
        <view style={statsStyle}>
          <text style={statsTitleStyle}>Grid Stats</text>
          <text style={statsTextStyle}>Total Items: {stats.nodes.length}</text>
          <text style={statsTextStyle}>Grid Height: {stats.bounds?.height.toFixed(0)}px</text>
          <text style={statsTextStyle}>
            Column Width: {stats.metrics?.columnWidth.toFixed(1)}px
          </text>
        </view>
      )}
    </view>
  )
}
