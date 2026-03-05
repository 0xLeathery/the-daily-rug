import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  isAlphaGateExpired,
  hasTokenAccess,
  formatCountdown,
  TOKEN_GATE_THRESHOLD,
} from '@/lib/articles/gate'

describe('isAlphaGateExpired', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when alpha_gate_until is in the past', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-05T12:00:00Z').getTime())
    expect(isAlphaGateExpired('2026-03-05T10:00:00Z')).toBe(true)
  })

  it('returns false when alpha_gate_until is in the future', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-05T12:00:00Z').getTime())
    expect(isAlphaGateExpired('2026-03-05T14:00:00Z')).toBe(false)
  })

  it('returns true when alpha_gate_until is null (no gate = public)', () => {
    expect(isAlphaGateExpired(null)).toBe(true)
  })
})

describe('hasTokenAccess', () => {
  it('returns true when balance >= 1_000_000', () => {
    expect(hasTokenAccess(1_000_000)).toBe(true)
    expect(hasTokenAccess(5_000_000)).toBe(true)
  })

  it('returns false when balance < 1_000_000', () => {
    expect(hasTokenAccess(999_999)).toBe(false)
    expect(hasTokenAccess(0)).toBe(false)
  })

  it('returns false when balance is null (no wallet)', () => {
    expect(hasTokenAccess(null)).toBe(false)
  })
})

describe('formatCountdown', () => {
  it('returns "1h 47m 23s" for 6443000ms', () => {
    expect(formatCountdown(6_443_000)).toBe('1h 47m 23s')
  })

  it('returns "47m 23s" for 2843000ms (no hours)', () => {
    expect(formatCountdown(2_843_000)).toBe('47m 23s')
  })

  it('returns "0m 0s" for 0ms', () => {
    expect(formatCountdown(0)).toBe('0m 0s')
  })
})

describe('TOKEN_GATE_THRESHOLD', () => {
  it('is 1_000_000', () => {
    expect(TOKEN_GATE_THRESHOLD).toBe(1_000_000)
  })
})
