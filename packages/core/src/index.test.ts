import { describe, expect, it } from 'vitest'

import { createNodeMap, isMaterializationMode, materializationModes } from './index'

describe('ghost-gl-core', () => {
  it('exposes the supported materialization modes', () => {
    expect(materializationModes).toEqual(['ghost', 'shell', 'live'])
  })

  it('can narrow materialization mode values', () => {
    expect(isMaterializationMode('shell')).toBe(true)
    expect(isMaterializationMode('entity')).toBe(false)
  })

  it('creates a stable node lookup map', () => {
    const nodes = [
      { id: 'a', x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', x: 2, y: 0, w: 2, h: 2 },
    ]

    const nodeMap = createNodeMap(nodes)

    expect(nodeMap.get('a')?.w).toBe(2)
    expect(nodeMap.get('b')?.x).toBe(2)
  })
})
