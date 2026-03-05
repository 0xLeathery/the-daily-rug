import { describe, it, expect } from 'vitest'
import { truncateAddress, formatBalance } from '@/lib/utils/format'
import { pickVariant } from '@/components/public/TombstoneGraphic'

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

describe('pickVariant determinism', () => {
  it('returns same value for the same seed string', () => {
    const v1 = pickVariant('abc-123-article-id', 3)
    const v2 = pickVariant('abc-123-article-id', 3)
    expect(v1).toBe(v2)
  })

  it('returns 0 when seed is undefined', () => {
    expect(pickVariant(undefined, 3)).toBe(0)
  })

  it('returns a value in range [0, count-1]', () => {
    const seeds = ['article-1', 'article-2', 'zzz', 'aaa', 'UUID-test-12345', '']
    for (const seed of seeds) {
      const v = pickVariant(seed, 3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(2)
    }
  })

  it('distributes across different seeds', () => {
    // With enough different seeds, we should see more than one variant
    const seeds = Array.from({ length: 20 }, (_, i) => `article-id-${i}`)
    const variants = new Set(seeds.map((s) => pickVariant(s, 3)))
    expect(variants.size).toBeGreaterThan(1)
  })

  it('returns 0 when count is 1', () => {
    expect(pickVariant('any-seed', 1)).toBe(0)
  })
})

describe('TombstoneGraphic variants', () => {
  // These are smoke tests that verify the variant functions are callable and return
  // something truthy. No jsdom needed — we test the exported pickVariant logic only,
  // and verify the component module loads without throwing.
  it('pickVariant returns a number for any UUID-like seed', () => {
    const result = pickVariant('550e8400-e29b-41d4-a716-446655440000', 3)
    expect(typeof result).toBe('number')
  })

  it('pickVariant is deterministic across 100 calls', () => {
    const seed = '550e8400-e29b-41d4-a716-446655440000'
    const first = pickVariant(seed, 3)
    for (let i = 0; i < 99; i++) {
      expect(pickVariant(seed, 3)).toBe(first)
    }
  })

  it('variant index 0 is always produced by summing to a multiple of count', () => {
    // Build a seed whose char codes sum to exactly a multiple of 3
    // 'a' = 97, need multiple of 3: 99 = 3*33, so 'ccc' (99+99+99 = 297, 297 % 3 = 0)
    expect(pickVariant('ccc', 3)).toBe(0)
  })
})
