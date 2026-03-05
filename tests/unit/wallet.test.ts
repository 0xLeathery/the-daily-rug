import { describe, it, expect } from 'vitest'
import { formatBalance, truncateAddress } from '@/lib/utils/format'

describe('formatBalance', () => {
  it('formats millions with one decimal', () => {
    expect(formatBalance(1500000)).toBe('1.5M')
  })

  it('formats thousands with one decimal', () => {
    expect(formatBalance(850000)).toBe('850.0K')
  })

  it('returns raw number for values under 1000', () => {
    expect(formatBalance(500)).toBe('500')
  })

  it('returns "0" for zero', () => {
    expect(formatBalance(0)).toBe('0')
  })

  it('formats exactly 1 million', () => {
    expect(formatBalance(1000000)).toBe('1.0M')
  })

  it('returns raw number for 999', () => {
    expect(formatBalance(999)).toBe('999')
  })
})

describe('truncateAddress', () => {
  it('truncates a long address to first 4 and last 4 chars', () => {
    expect(truncateAddress('7xKpRZweb5fDJ1234567890abcdef3nFd')).toBe('7xKp...3nFd')
  })

  it('truncates an 8-character address', () => {
    expect(truncateAddress('ABCD1234')).toBe('ABCD...1234')
  })
})
