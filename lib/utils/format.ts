/**
 * Formats a token balance with K/M abbreviations.
 * Always shows one decimal place for K/M values.
 * Examples: 1_200_000 -> "1.2M", 850_000 -> "850.0K", 1_000_000 -> "1.0M", 500 -> "500"
 */
export function formatBalance(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }

  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K`;
  }

  return Math.round(amount).toString();
}

/**
 * Truncates a Solana wallet address to "first4...last4" format.
 * Addresses with fewer than 8 characters are returned unchanged.
 * Example: "7xKpABCDEFGH3nFd" -> "7xKp...3nFd", "ABCD1234" -> "ABCD...1234"
 */
export function truncateAddress(address: string): string {
  if (address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
