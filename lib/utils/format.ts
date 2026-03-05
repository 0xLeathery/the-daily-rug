/**
 * Formats a token balance with K/M abbreviations.
 * Examples: 1_200_000 -> "1.2M", 850_000 -> "850K", 500 -> "500"
 */
export function formatBalance(amount: number): string {
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000;
    // Show one decimal only if it's not a whole number
    const formatted =
      value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }

  if (amount >= 1_000) {
    const value = amount / 1_000;
    const formatted =
      value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
    return `${formatted}K`;
  }

  return Math.round(amount).toString();
}

/**
 * Truncates a Solana wallet address to "first4...last4" format.
 * Example: "7xKpABCDEFGH3nFd" -> "7xKp...3nFd"
 */
export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
