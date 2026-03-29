import { describe, expect, it } from 'vitest'
import type { LayoutNode } from '../types'
import { SpatialKernel } from './kernel'

describe('SpatialKernel', () => {
  const createNodes = (): LayoutNode[] => [
    { id: 'a', x: 0, y: 0, w: 10, h: 10 },
    { id: 'b', x: 10, y: 0, w: 10, h: 10 },
    { id: 'c', x: 0, y: 10, w: 10, h: 10 },
    { id: 'd', x: 100, y: 100, w: 10, h: 10 },
  ]

  describe('basic operations', () => {
    it('should load nodes on construction', () => {
      const kernel = new SpatialKernel(createNodes())

      expect(kernel.size).toBe(4)
      expect(kernel.has('a')).toBe(true)
      expect(kernel.has('z')).toBe(false)
    })

    it('should get item by id', () => {
      const kernel = new SpatialKernel(createNodes())
      const item = kernel.get('a')

      expect(item).toBeDefined()
      expect(item?.id).toBe('a')
      expect(item?.minX).toBe(0)
      expect(item?.minY).toBe(0)
      expect(item?.maxX).toBe(10)
      expect(item?.maxY).toBe(10)
    })

    it('should return undefined for non-existent id', () => {
      const kernel = new SpatialKernel(createNodes())

      expect(kernel.get('z')).toBeUndefined()
    })

    it('should clear all items', () => {
      const kernel = new SpatialKernel(createNodes())

      kernel.clear()

      expect(kernel.size).toBe(0)
      expect(kernel.has('a')).toBe(false)
    })

    it('should load new nodes', () => {
      const kernel = new SpatialKernel<unknown>()

      kernel.load(createNodes())

      expect(kernel.size).toBe(4)
    })
  })

  describe('upsert', () => {
    it('should insert new node', () => {
      const kernel = new SpatialKernel<unknown>()
      const node: LayoutNode = { id: 'new', x: 50, y: 50, w: 20, h: 20 }

      kernel.upsert(node)

      expect(kernel.size).toBe(1)
      expect(kernel.has('new')).toBe(true)
    })

    it('should update existing node', () => {
      const kernel = new SpatialKernel(createNodes())
      const updatedNode: LayoutNode = { id: 'a', x: 200, y: 200, w: 5, h: 5 }

      kernel.upsert(updatedNode)

      expect(kernel.size).toBe(4)
      const item = kernel.get('a')
      expect(item?.minX).toBe(200)
      expect(item?.minY).toBe(200)
      expect(item?.maxX).toBe(205)
      expect(item?.maxY).toBe(205)
    })
  })

  describe('remove', () => {
    it('should remove existing node', () => {
      const kernel = new SpatialKernel(createNodes())

      const removed = kernel.remove('a')

      expect(removed).toBe(true)
      expect(kernel.size).toBe(3)
      expect(kernel.has('a')).toBe(false)
    })

    it('should return false for non-existent node', () => {
      const kernel = new SpatialKernel(createNodes())

      const removed = kernel.remove('z')

      expect(removed).toBe(false)
      expect(kernel.size).toBe(4)
    })
  })

  describe('search', () => {
    it('should find items in region', () => {
      const kernel = new SpatialKernel(createNodes())

      const results = kernel.search({ minX: 0, minY: 0, maxX: 15, maxY: 15 })

      expect(results.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
    })

    it('should return empty array for empty region', () => {
      const kernel = new SpatialKernel(createNodes())

      const results = kernel.search({ minX: 1000, minY: 1000, maxX: 1100, maxY: 1100 })

      expect(results).toEqual([])
    })
  })

  describe('queryViewport', () => {
    it('should find items in viewport', () => {
      const kernel = new SpatialKernel(createNodes())

      const results = kernel.queryViewport({
        viewport: { height: 15, left: 0, top: 0, width: 15 },
      })

      expect(results.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
    })

    it('should include overscan region', () => {
      const kernel = new SpatialKernel(createNodes())

      const results = kernel.queryViewport({
        overscanX: 150,
        overscanY: 150,
        viewport: { height: 5, left: 0, top: 0, width: 5 },
      })

      // With large overscan, should find 'd' at (100, 100)
      expect(results.map((r) => r.id).sort()).toEqual(['a', 'b', 'c', 'd'])
    })
  })

  describe('queryCollisions', () => {
    it('should find colliding items', () => {
      const kernel = new SpatialKernel(createNodes())

      const collisions = kernel.queryCollisions({ h: 5, w: 5, x: 8, y: 8 })

      // Should collide with 'a' (0,0,10,10), 'b' (10,0,10,10), 'c' (0,10,10,10)
      expect(collisions.map((c) => c.id).sort()).toEqual(['a', 'b', 'c'])
    })

    it('should exclude specified id', () => {
      const kernel = new SpatialKernel(createNodes())

      // Query rect overlaps with 'a' and partially with 'b' and 'c'
      const collisions = kernel.queryCollisions({ excludeId: 'a', h: 11, w: 11, x: 0, y: 0 })

      // 'a' is excluded, so only 'b' and 'c' collide (partial overlap)
      expect(collisions.map((c) => c.id).sort()).toEqual(['b', 'c'])
    })

    it('should return empty for no collisions', () => {
      const kernel = new SpatialKernel(createNodes())

      const collisions = kernel.queryCollisions({ h: 5, w: 5, x: 50, y: 50 })

      expect(collisions).toEqual([])
    })
  })

  describe('queryKNearest', () => {
    it('should find nearest items', () => {
      const kernel = new SpatialKernel(createNodes())

      const nearest = kernel.queryKNearest(0, 0, 2)

      expect(nearest).toHaveLength(2)
      // 'a' is at (0,0), closest to (0,0)
      expect(nearest[0]?.item.id).toBe('a')
    })

    it('should return fewer if not enough items', () => {
      const kernel = new SpatialKernel([{ id: 'only', x: 100, y: 100, w: 10, h: 10 }])

      const nearest = kernel.queryKNearest(0, 0, 5)

      expect(nearest).toHaveLength(1)
    })
  })

  describe('computeBounds', () => {
    it('should compute bounds of all items', () => {
      const kernel = new SpatialKernel(createNodes())

      const bounds = kernel.computeBounds()

      expect(bounds).toEqual({
        height: 110,
        left: 0,
        top: 0,
        width: 110,
      })
    })

    it('should return null for empty kernel', () => {
      const kernel = new SpatialKernel<unknown>()

      const bounds = kernel.computeBounds()

      expect(bounds).toBeNull()
    })
  })

  describe('itemsInOrder', () => {
    it('should iterate items sorted by position', () => {
      const kernel = new SpatialKernel(createNodes())

      const ids = Array.from(kernel.itemsInOrder()).map((item) => item.id)

      // Sorted by y, then x
      expect(ids).toEqual(['a', 'b', 'c', 'd'])
    })
  })
})
