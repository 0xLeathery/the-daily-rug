import { describe, it, expect } from 'vitest'
import { PublicKey } from '@solana/web3.js'

import {
  parseBondingCurveData,
  getBondingCurvePda,
  PUMP_PROGRAM_ID,
  INITIAL_REAL_TOKEN_RESERVES,
  type BondingCurveState,
} from '@/lib/bonding-curve/fetchProgress'

// Helper: allocate a 49-byte zeroed buffer and write a BigInt at offset 24 (realTokenReserves)
function makeBuffer(realTokenReserves: bigint, complete = 0): Buffer {
  const buf = Buffer.alloc(49, 0)
  buf.writeBigUInt64LE(realTokenReserves, 24)
  buf[48] = complete
  return buf
}

describe('parseBondingCurveData', () => {
  it('returns { status: "graduated" } when complete byte (offset 48) is 1', () => {
    const buf = makeBuffer(0n, 1)
    const result = parseBondingCurveData(buf)
    expect(result).toEqual({ status: 'graduated' })
  })

  it('returns { status: "progress", percent: 50.0 } for realTokenReserves at 50% of initial (396_550_000_000_000n)', () => {
    // 50% sold → realTokenReserves = INITIAL / 2 = 396_550_000_000_000n
    const buf = makeBuffer(396_550_000_000_000n)
    const result = parseBondingCurveData(buf) as { status: 'progress'; percent: number }
    expect(result.status).toBe('progress')
    expect(result.percent).toBeCloseTo(50.0, 1)
  })

  it('returns { status: "progress", percent: 0 } when realTokenReserves equals initial (793_100_000_000_000n)', () => {
    // Nothing sold yet → 0% progress
    const buf = makeBuffer(793_100_000_000_000n)
    const result = parseBondingCurveData(buf) as { status: 'progress'; percent: number }
    expect(result.status).toBe('progress')
    expect(result.percent).toBe(0)
  })

  it('returns { status: "progress", percent: 100 } when realTokenReserves is 0', () => {
    // All sold → 100% progress
    const buf = makeBuffer(0n)
    const result = parseBondingCurveData(buf) as { status: 'progress'; percent: number }
    expect(result.status).toBe('progress')
    expect(result.percent).toBe(100)
  })

  it('returns { status: "error" } when buffer is too short (< 49 bytes)', () => {
    const shortBuf = Buffer.alloc(48, 0)
    const result = parseBondingCurveData(shortBuf)
    expect(result).toEqual({ status: 'error' })
  })
})

describe('getBondingCurvePda', () => {
  it('returns a valid PublicKey derived from mint and pump program ID', () => {
    // Use a known valid Solana public key (mint address) for testing
    const mintPubkey = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
    const pda = getBondingCurvePda(mintPubkey)
    expect(pda).toBeInstanceOf(PublicKey)
    // PDA should be deterministic — calling again produces same result
    const pda2 = getBondingCurvePda(mintPubkey)
    expect(pda.toBase58()).toBe(pda2.toBase58())
  })
})

describe('PUMP_PROGRAM_ID', () => {
  it('is a valid PublicKey for the pump.fun program', () => {
    expect(PUMP_PROGRAM_ID).toBeInstanceOf(PublicKey)
    expect(PUMP_PROGRAM_ID.toBase58()).toBe('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
  })
})

describe('INITIAL_REAL_TOKEN_RESERVES', () => {
  it('equals 793_100_000_000_000n', () => {
    expect(INITIAL_REAL_TOKEN_RESERVES).toBe(793_100_000_000_000n)
  })
})
