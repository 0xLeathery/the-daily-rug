/**
 * Pure gate logic functions for token gating and countdown formatting.
 * No server-only import — these functions are safe to use on the client side.
 */

export const TOKEN_GATE_THRESHOLD = 1_000_000

/**
 * Returns true if the alpha gate has expired (or never existed).
 * - null means no gate was set, so the content is public → returns true
 * - a past timestamp means the gate period is over → returns true
 * - a future timestamp means the gate is still active → returns false
 */
export function isAlphaGateExpired(alphaGateUntil: string | null): boolean {
  if (alphaGateUntil === null) return true
  return Date.now() > new Date(alphaGateUntil).getTime()
}

/**
 * Returns true if the token balance meets or exceeds the gate threshold.
 * Returns false when balance is null (wallet not connected).
 */
export function hasTokenAccess(balance: number | null): boolean {
  if (balance === null) return false
  return balance >= TOKEN_GATE_THRESHOLD
}

/**
 * Formats milliseconds into a human-readable countdown string.
 * - Omits the hours component when h === 0.
 * - Examples: 6443000ms → "1h 47m 23s", 2843000ms → "47m 23s", 0ms → "0m 0s"
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  return `${minutes}m ${seconds}s`
}
