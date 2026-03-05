"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTokenBalance } from "@/components/wallet/useTokenBalance";
import { formatBalance } from "@/lib/utils/format";

const TICKER = process.env.NEXT_PUBLIC_TOKEN_TICKER ?? "TOKEN";

export default function WalletArea() {
  const { connected } = useWallet();
  const { balance, loading } = useTokenBalance();

  return (
    <div className="flex items-center gap-3">
      {/* Token balance display -- only show when wallet is connected */}
      {connected && (
        <>
          {loading ? (
            /* Shimmer skeleton while balance is loading */
            <div className="w-24 h-5 animate-pulse rounded bg-gray-700" />
          ) : balance !== null ? (
            /* Balance display with Y2K styling */
            <span
              className="font-bold uppercase tracking-wide text-sm"
              style={{
                color: "#ffd700",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.05em",
              }}
            >
              {formatBalance(balance)} ${TICKER}
            </span>
          ) : null /* MINT not configured or balance unavailable */}
        </>
      )}

      <WalletMultiButton />
    </div>
  );
}
