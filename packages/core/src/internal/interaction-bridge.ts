import { projectNodeToRect } from '../geometry'
import type { LayoutInteractionSession } from '../interaction'
import type { GridMetrics, LayoutNode, LayoutRect } from '../types'

export function collectInteractionActiveIds<TData = unknown>(
  session: LayoutInteractionSession<TData> | undefined
): Set<string> {
  const activeIds = new Set<string>()

  if (session == null || session.status !== 'active') {
    return activeIds
  }

  if (session.targetId !== undefined) {
    activeIds.add(session.targetId)
  }

  for (const operation of session.previewOperations) {
    switch (operation.type) {
      case 'move':
      case 'resize':
      case 'remove':
        activeIds.add(operation.id)
        break
      case 'upsert':
        activeIds.add(operation.node.id)
        break
      case 'replace':
        for (const node of operation.nodes) {
          activeIds.add(node.id)
        }
        break
    }
  }

  return activeIds
}

export function resolvePlanningNodes<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  session: LayoutInteractionSession<TData> | undefined
): readonly LayoutNode<TData>[] {
  if (
    session == null ||
    session.status !== 'active' ||
    session.previewResult == null ||
    !session.previewResult.committed
  ) {
    return nodes
  }

  return session.currentNodes
}

export function resolvePlanningRects<TData = unknown>(
  nodes: readonly LayoutNode<TData>[],
  metrics: GridMetrics,
  session: LayoutInteractionSession<TData> | undefined
): LayoutRect<TData>[] {
  return resolvePlanningNodes(nodes, session).map((node) => projectNodeToRect(node, metrics))
}
