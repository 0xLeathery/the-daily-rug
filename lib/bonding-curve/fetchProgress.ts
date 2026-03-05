import { PublicKey } from '@solana/web3.js'

/**
 * The pump.fun bonding curve program ID on Solana mainnet.
 */
export const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')

/**
 * The initial real token reserves when a pump.fun bonding curve is created.
 * Represents 793,100,000 tokens with 6 decimal precision.
 * Source: community-sourced pump.fun account layout (validate against live data before shipping).
 */
export const INITIAL_REAL_TOKEN_RESERVES = BigInt('793100000000000')

/**
 * Represents the current state of a pump.fun bonding curve.
 * - loading: fetch in progress
 * - graduated: token has graduated to Raydium (complete byte = 1)
 * - progress: active bonding curve with computed percent sold
 * - error: fetch failed or buffer malformed
 */
export type BondingCurveState =
  | { status: 'loading' }
  | { status: 'graduated' }
  | { status: 'progress'; percent: number }
  | { status: 'error' }

/**
 * Derives the bonding curve PDA for a given token mint.
 * Seeds: ["bonding-curve", mintPubkey.toBuffer()]
 */
export function getBondingCurvePda(mintPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
    PUMP_PROGRAM_ID
  )
  return pda
}

/**
 * Parses raw account data from a pump.fun bonding curve account.
 *
 * Account layout (community-sourced byte offsets):
 * - offset 24 (8 bytes LE): realTokenReserves (BigUInt64)
 * - offset 48 (1 byte):     complete flag (1 = graduated)
 *
 * Progress calculation:
 *   sold = INITIAL - realTokenReserves
 *   percent = (sold * 10000n / INITIAL) / 100  → two decimal precision, clamped [0, 100]
 */
export function parseBondingCurveData(data: Buffer): BondingCurveState {
  if (data.length < 49) return { status: 'error' }

  // Check if curve is complete (graduated to Raydium)
  if (data[48] === 1) return { status: 'graduated' }

  // Read realTokenReserves (little-endian 64-bit unsigned int at offset 24)
  const realTokenReserves = data.readBigUInt64LE(24)

  // Calculate percentage of tokens sold
  // percent = (INITIAL - current) / INITIAL * 100
  const sold = INITIAL_REAL_TOKEN_RESERVES - realTokenReserves
  const percentBasisPoints = (sold * 10000n) / INITIAL_REAL_TOKEN_RESERVES
  let percent = Number(percentBasisPoints) / 100

  // Clamp to [0, 100]
  percent = Math.max(0, Math.min(100, percent))

  return { status: 'progress', percent }
}
