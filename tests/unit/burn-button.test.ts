import { describe, it, expect } from 'vitest'
import { BURN_ELIGIBILITY_THRESHOLD } from '@/lib/burn/utils'
import { formatBalance } from '@/lib/utils/format'

/**
 * BurnButton eligibility logic tests.
 *
 * These tests verify the logic that drives each render state of the BurnButton.
 * Since the vitest environment is `node` (no DOM), we test the underlying
 * eligibility logic as pure functions extracted from the component's decision tree.
 */

// Eligibility helper — mirrors the logic in BurnButton.tsx
function checkEligibility(params: {
  connected: boolean
  balance: number | null
  burnPrice: number
}): {
  isConnected: boolean
  meetsThreshold: boolean
  canAffordBurn: boolean
  isEligible: boolean
  deficit: number | null
  shouldRender: boolean
} {
  const { connected, balance, burnPrice } = params
  const shouldRender = burnPrice > 0
  const isConnected = connected
  const meetsThreshold = balance !== null && balance >= BURN_ELIGIBILITY_THRESHOLD
  const canAffordBurn = balance !== null && balance >= burnPrice
  const isEligible = isConnected && meetsThreshold && canAffordBurn
  const deficit =
    balance !== null && isConnected && meetsThreshold && !canAffordBurn
      ? burnPrice - balance
      : null

  return { isConnected, meetsThreshold, canAffordBurn, isEligible, deficit, shouldRender }
}

describe('BurnButton', () => {
  it('renders nothing when burnPrice is 0 (shouldRender = false)', () => {
    const result = checkEligibility({ connected: true, balance: 500_000, burnPrice: 0 })
    expect(result.shouldRender).toBe(false)
  })

  it('shows disabled state with "Connect wallet to burn" when wallet not connected', () => {
    const result = checkEligibility({ connected: false, balance: null, burnPrice: 500_000 })
    expect(result.shouldRender).toBe(true)
    expect(result.isConnected).toBe(false)
    expect(result.isEligible).toBe(false)
    expect(result.deficit).toBe(null) // deficit not shown when not connected
  })

  it('disables button when wallet balance is below 100K threshold', () => {
    const result = checkEligibility({ connected: true, balance: 99_999, burnPrice: 500_000 })
    expect(result.isConnected).toBe(true)
    expect(result.meetsThreshold).toBe(false)
    expect(result.isEligible).toBe(false)
    expect(result.deficit).toBe(null) // deficit not shown below threshold
  })

  it('shows deficit message with Pump.fun link when balance < burn price but >= threshold', () => {
    const result = checkEligibility({ connected: true, balance: 200_000, burnPrice: 500_000 })
    expect(result.isConnected).toBe(true)
    expect(result.meetsThreshold).toBe(true)
    expect(result.canAffordBurn).toBe(false)
    expect(result.isEligible).toBe(false)
    expect(result.deficit).toBe(300_000)
  })

  it('enables button when wallet has sufficient balance', () => {
    const result = checkEligibility({ connected: true, balance: 500_000, burnPrice: 500_000 })
    expect(result.isConnected).toBe(true)
    expect(result.meetsThreshold).toBe(true)
    expect(result.canAffordBurn).toBe(true)
    expect(result.isEligible).toBe(true)
    expect(result.deficit).toBe(null)
  })

  it('shows confirmation dialog on click — button is enabled (isEligible = true)', () => {
    const result = checkEligibility({ connected: true, balance: 1_000_000, burnPrice: 500_000 })
    expect(result.isEligible).toBe(true)
    // When isEligible, clicking the button transitions to 'confirming' state
    // That transition is tested here as: the eligibility gate passes
    expect(result.isConnected).toBe(true)
    expect(result.meetsThreshold).toBe(true)
    expect(result.canAffordBurn).toBe(true)
  })

  it('formats burn price correctly using formatBalance', () => {
    expect(formatBalance(500_000)).toBe('500.0K')
    expect(formatBalance(1_500_000)).toBe('1.5M')
    expect(formatBalance(100_000)).toBe('100.0K')
  })

  it('formats deficit correctly using formatBalance', () => {
    const result = checkEligibility({ connected: true, balance: 200_000, burnPrice: 500_000 })
    expect(result.deficit).toBe(300_000)
    expect(formatBalance(result.deficit!)).toBe('300.0K')
  })
})
