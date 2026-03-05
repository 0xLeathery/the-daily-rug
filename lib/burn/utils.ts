/**
 * Burn mechanic shared utilities
 * Used by both client (BurnButton) and server (Helius webhook handler)
 */

/**
 * Converts a UUID string to a 16-byte number array.
 * Strips hyphens and hex-decodes each pair.
 * Matches the ArticleKilled event article_id field: { "array": ["u8", 16] }
 */
export function uuidToBytes(uuid: string): number[] {
  const hex = uuid.replace(/-/g, '')
  return Array.from(Buffer.from(hex, 'hex'))
}

/**
 * Converts a 16-byte number array back to a UUID string.
 * Inserts hyphens at positions 8-4-4-4-12.
 */
export function bytesToUUID(bytes: number[]): string {
  const hex = Buffer.from(bytes).toString('hex')
  return (
    `${hex.slice(0, 8)}-` +
    `${hex.slice(8, 12)}-` +
    `${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-` +
    `${hex.slice(20)}`
  )
}

/**
 * Minimum token holding (in raw units) required to enable the BurnButton.
 * Matches the on-chain constraint: 100K tokens (pre-decimal).
 */
export const BURN_ELIGIBILITY_THRESHOLD = 100_000

/**
 * Pump.fun tokens have 6 decimal places.
 * Used when converting raw u64 amounts to display values.
 */
export const TOKEN_DECIMALS = 6

/**
 * Canonical devnet Anchor program address for burn-for-article.
 * Matches IDL address field.
 */
export const PROGRAM_ID = 'DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW'
