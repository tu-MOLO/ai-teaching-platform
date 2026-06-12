import { describe, it, expect } from 'vitest'
import { toItem, toListResponse, toBlob } from '../response'

describe('response utils', () => {
  describe('toItem', () => {
    it('returns the value as-is', () => {
      const input = { id: '1', name: 'Test' }
      expect(toItem(input)).toBe(input)
    })

    it('returns string value as-is', () => {
      expect(toItem('hello')).toBe('hello')
    })

    it('returns number value as-is', () => {
      expect(toItem(42)).toBe(42)
    })

    it('returns null as-is', () => {
      expect(toItem(null)).toBeNull()
    })

    it('returns undefined as-is', () => {
      expect(toItem(undefined)).toBeUndefined()
    })

    it('returns array as-is', () => {
      const arr = [1, 2, 3]
      expect(toItem(arr)).toBe(arr)
    })
  })

  describe('toListResponse', () => {
    it('returns the value as-is', () => {
      const input = { data: [{ id: '1' }], total: 1, page: 1, page_size: 10 }
      expect(toListResponse(input)).toBe(input)
    })

    it('returns null as-is', () => {
      expect(toListResponse(null)).toBeNull()
    })

    it('returns empty object as-is', () => {
      const input = {}
      expect(toListResponse(input)).toBe(input)
    })
  })

  describe('toBlob', () => {
    it('returns the value as-is', () => {
      const blob = new Blob(['test'])
      expect(toBlob(blob)).toBe(blob)
    })

    it('returns null as-is', () => {
      expect(toBlob(null)).toBeNull()
    })

    it('returns undefined as-is', () => {
      expect(toBlob(undefined)).toBeUndefined()
    })
  })
})