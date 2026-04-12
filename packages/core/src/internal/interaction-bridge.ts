import { projectNodeToRect } from '../geometry'
import type { LayoutInteractionSession } from '../interaction'
import type { GridMetrics, LayoutNode, LayoutRect } from '../types'

export function collectInteractionActiveIds<T = unknown>(
  session: LayoutInteractionSession<T> | undefined
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

export function resolvePlanningNodes<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  session: LayoutInteractionSession<T> | undefined
): readonly LayoutNode<T>[] {
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

export function resolvePlanningRects<T = unknown>(
  nodes: readonly LayoutNode<T>[],
  metrics: GridMetrics,
  session: LayoutInteractionSession<T> | undefined
): LayoutRect<T>[] {
  return resolvePlanningNodes(nodes, session).map((node) => projectNodeToRect(node, metrics))
}
