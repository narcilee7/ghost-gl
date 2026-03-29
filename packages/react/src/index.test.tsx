import { describe, expect, it } from 'vitest'

import { GhostGrid } from './index'

describe('ghost-gl-react', () => {
  it('keeps the current component stub inert', () => {
    const result = GhostGrid({
      nodes: [],
      renderItem: () => null,
    })

    expect(result).toBeNull()
  })
})
