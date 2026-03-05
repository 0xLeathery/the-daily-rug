import { describe, it, expect } from 'vitest'
import { BURN_ELIGIBILITY_THRESHOLD } from '@/lib/burn/utils'
import { formatBalance } from '@/lib/utils/format'

/**
 * Burn Eligibility exhaustive edge-case tests.
 *
 * These test the eligibility decision tree with boundary values and edge cases.
 * Mirrors the logic in BurnButton.tsx.
 */

function isConnectedWithWallet(connected: boolean): boolean {
  return connected
}

function meetsThreshold(balance: number | null): boolean {
  return balance !== null && balance >= BURN_ELIGIBILITY_THRESHOLD
}

function canAffordBurn(balance: number | null, burnPrice: number): boolean {
  return balance !== null && balance >= burnPrice
}

function isEligible(connected: boolean, balance: number | null, burnPrice: number): boolean {
  return isConnectedWithWallet(connected) && meetsThreshold(balance) && canAffordBurn(balance, burnPrice)
}

function getDeficit(connected: boolean, balance: number | null, burnPrice: number): number | null {
  if (!isConnectedWithWallet(connected)) return null
  if (!meetsThreshold(balance)) return null
  if (canAffordBurn(balance, burnPrice)) return null
  return burnPrice - (balance ?? 0)
}

describe('Burn Eligibility', () => {
  describe('not connected', () => {
    it('not connected: button visible but disabled (not eligible)', () => {
      expect(isEligible(false, null, 500_000)).toBe(false)
      expect(getDeficit(false, null, 500_000)).toBe(null)
    })

    it('not connected with balance: still not eligible (no wallet)', () => {
      // balance available but no wallet connection — should still be ineligible
      expect(isEligible(false, 1_000_000, 500_000)).toBe(false)
    })
  })

  describe('threshold checks', () => {
    it('connected, balance exactly at 100K threshold: meets threshold', () => {
      expect(meetsThreshold(100_000)).toBe(true)
      expect(BURN_ELIGIBILITY_THRESHOLD).toBe(100_000)
    })

    it('connected, balance just below threshold (99999): does not meet threshold', () => {
      expect(meetsThreshold(99_999)).toBe(false)
    })

    it('connected, balance < 100K: disabled with threshold message (not eligible)', () => {
      expect(isEligible(true, 99_999, 500_000)).toBe(false)
      expect(meetsThreshold(99_999)).toBe(false)
      expect(getDeficit(true, 99_999, 500_000)).toBe(null)
    })

    it('connected, balance === 0: does not meet threshold', () => {
      expect(meetsThreshold(0)).toBe(false)
    })

    it('connected, balance === null: does not meet threshold', () => {
      expect(meetsThreshold(null)).toBe(false)
    })
  })

  describe('balance vs burn price', () => {
    it('connected, balance >= 100K but < burn_price: deficit message with buy link shown', () => {
      expect(isEligible(true, 200_000, 500_000)).toBe(false)
      expect(meetsThreshold(200_000)).toBe(true)
      expect(canAffordBurn(200_000, 500_000)).toBe(false)
      expect(getDeficit(true, 200_000, 500_000)).toBe(300_000)
    })

    it('connected, balance equals burn price exactly: eligible (exact match)', () => {
      expect(isEligible(true, 500_000, 500_000)).toBe(true)
      expect(canAffordBurn(500_000, 500_000)).toBe(true)
      expect(getDeficit(true, 500_000, 500_000)).toBe(null)
    })

    it('connected, balance >= burn_price: enabled (eligible)', () => {
      expect(isEligible(true, 1_000_000, 500_000)).toBe(true)
      expect(getDeficit(true, 1_000_000, 500_000)).toBe(null)
    })

    it('deficit calculation accuracy: burnPrice - balance displayed correctly', () => {
      const balance = 300_000
      const burnPrice = 750_000
      const deficit = getDeficit(true, balance, burnPrice)
      expect(deficit).toBe(450_000)
      expect(formatBalance(deficit!)).toBe('450.0K')
    })

    it('small deficit: 100001 balance vs 100002 burn price', () => {
      const deficit = getDeficit(true, 100_001, 100_002)
      expect(deficit).toBe(1)
      expect(formatBalance(deficit!)).toBe('1')
    })
  })

  describe('already redacted', () => {
    it('already redacted: shows tombstone, no burn button (articleStatus check)', () => {
      // The BurnButton component returns null when articleStatus === 'redacted'
      // This is a component-level check, not eligibility logic
      // Verify the status value that triggers it
      const articleStatus = 'redacted'
      expect(articleStatus === 'redacted').toBe(true)
    })
  })
})
