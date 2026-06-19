import type { LayoutNode, RuntimeControllerState } from 'ghost-gl-core'
import { GhostGrid } from 'ghost-gl-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native'

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GhostGrid React Native Example</Text>
        <Text style={styles.subtitle}>
          A simple grid layout with three-state materialization (ghost/shell/live)
        </Text>
      </View>

      <View style={styles.gridContainer}>
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
                <View style={styles.skeleton}>
                  <ActivityIndicator size="small" color="#999" />
                  <Text style={styles.loadingText}>{node.data?.title ?? 'Loading...'}</Text>
                </View>
              )
            }

            // Live mode - full component
            return (
              <View style={styles.gridItem}>
                <View style={styles.gridItemHeader}>
                  <Text style={styles.itemTitle}>{node.data?.title ?? 'Untitled'}</Text>
                </View>
                <View style={styles.gridItemContent}>
                  <Text style={styles.itemType}>{node.data?.type ?? 'unknown'}</Text>
                  <Text style={styles.itemSize}>
                    {rect.width.toFixed(0)} × {rect.height.toFixed(0)}
                  </Text>
                </View>
              </View>
            )
          }}
        />
      </View>

      {stats && (
        <View style={styles.statsPanel}>
          <Text style={styles.statsTitle}>Grid Stats</Text>
          <Text>Total Items: {stats.nodes.length}</Text>
          <Text>Grid Height: {stats.bounds?.height.toFixed(0)}px</Text>
          <Text>Column Width: {stats.metrics?.columnWidth.toFixed(1)}px</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  gridContainer: {
    flex: 1,
    minHeight: 500,
  },
  skeleton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 8,
    color: '#999',
    fontSize: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  gridItemHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  gridItemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemType: {
    fontSize: 12,
    color: '#666',
  },
  itemSize: {
    fontSize: 10,
    color: '#999',
  },
  statsPanel: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
})
