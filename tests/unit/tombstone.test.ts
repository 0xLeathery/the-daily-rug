import { describe, it, expect } from 'vitest'
import { truncateAddress, formatBalance } from '@/lib/utils/format'

/**
 * Tombstone Burn Credit tests.
 *
 * The tombstone is rendered server-side in app/articles/[slug]/page.tsx.
 * These tests verify the utility functions are applied correctly to burned_by
 * and burned_amount values when rendering the burn credit line.
 *
 * Burn credit line template:
 *   "Burned by {truncateAddress(burned_by)} for {formatBalance(burned_amount)} tokens"
 */

// Simulate the burn credit rendering logic from page.tsx
function renderBurnCredit(burnedBy: string | null, burnedAmount: number | null): string | null {
  if (!burnedBy) return null
  return `Burned by ${truncateAddress(burnedBy)} for ${formatBalance(burnedAmount ?? 0)} tokens`
}

describe('Tombstone Burn Credit', () => {
  it('renders burn credit line with truncated wallet address', () => {
    const credit = renderBurnCredit('7xKpABCDEFGH3nFd4kZm', 500_000)
    expect(credit).not.toBeNull()
    expect(credit).toContain('7xKp...4kZm')
    expect(credit).toContain('Burned by')
  })

  it('renders burn amount formatted with K/M suffix', () => {
    const credit = renderBurnCredit('7xKpABCDEFGH3nFd4kZm', 500_000)
    expect(credit).toContain('500.0K')
    expect(credit).toContain('tokens')

    const creditM = renderBurnCredit('7xKpABCDEFGH3nFd4kZm', 1_500_000)
    expect(creditM).toContain('1.5M')
  })

  it('does not render burn credit when burned_by is null', () => {
    const credit = renderBurnCredit(null, 500_000)
    expect(credit).toBeNull()
  })

  describe('truncateAddress formatting', () => {
    it('truncates long wallet address to first4...last4 format', () => {
      expect(truncateAddress('7xKpABCDEFGH3nFd4kZm')).toBe('7xKp...4kZm')
    })

    it('truncates 8-character address', () => {
      // exactly 8 chars should be truncated (length >= 8)
      expect(truncateAddress('ABCD1234')).toBe('ABCD...1234')
    })

    it('returns short address unchanged (fewer than 8 chars)', () => {
      expect(truncateAddress('SHORT')).toBe('SHORT')
    })
  })

  describe('formatBalance formatting', () => {
    it('formats 500000 as 500.0K', () => {
      expect(formatBalance(500_000)).toBe('500.0K')
    })

    it('formats 1500000 as 1.5M', () => {
      expect(formatBalance(1_500_000)).toBe('1.5M')
    })

    it('formats 0 burned_amount gracefully', () => {
      expect(formatBalance(0)).toBe('0')
    })

    it('formats 1000000 as 1.0M', () => {
      expect(formatBalance(1_000_000)).toBe('1.0M')
    })
  })

  describe('full credit line construction', () => {
    it('produces complete credit line for typical burn', () => {
      const credit = renderBurnCredit('7xKpABCDEFGH3nFd4kZm', 500_000)
      expect(credit).toBe('Burned by 7xKp...4kZm for 500.0K tokens')
    })

    it('produces credit line with million-scale amount', () => {
      const credit = renderBurnCredit('SoLAnAWaLLeTaDDrESSoNeSoLAnA123', 2_000_000)
      expect(credit).toBe('Burned by SoLA...A123 for 2.0M tokens')
    })
  })
})
