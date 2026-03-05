"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const TOKEN_MINT_RAW = process.env.NEXT_PUBLIC_TOKEN_MINT;
// Pump.fun tokens always have 6 decimals
const DECIMALS = 6;

function getMint(): PublicKey | null {
  if (!TOKEN_MINT_RAW) return null;
  try {
    return new PublicKey(TOKEN_MINT_RAW);
  } catch {
    return null;
  }
}

const MINT = getMint();

interface UseTokenBalanceResult {
  balance: number | null;
  loading: boolean;
}

export function useTokenBalance(): UseTokenBalanceResult {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If MINT is not configured, return immediately with null balance
    if (!MINT) {
      setBalance(null);
      setLoading(false);
      return;
    }

    // If wallet is not connected, reset balance
    if (!publicKey) {
      setBalance(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      if (!MINT || !publicKey) return;

      setLoading(true);
      try {
        const ata = await getAssociatedTokenAddress(MINT, publicKey);
        const res = await connection.getTokenAccountBalance(ata);
        if (!cancelled) {
          // uiAmount is already divided by 10^decimals
          setBalance(res.value.uiAmount ?? 0);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          // AccountNotFound means the wallet holds 0 of this token — not an error
          const message =
            err instanceof Error ? err.message : String(err);
          if (
            message.includes("could not find account") ||
            message.includes("AccountNotFound") ||
            message.includes("Invalid param")
          ) {
            setBalance(0);
          } else {
            console.error("[useTokenBalance] Unexpected error:", err);
            setBalance(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBalance();

    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  // If MINT not configured, return immediately (pre-launch fallback)
  if (!MINT) {
    return { balance: null, loading: false };
  }

  return { balance, loading };
}
