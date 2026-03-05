'use client'

import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import {
  parseBondingCurveData,
  getBondingCurvePda,
  type BondingCurveState,
} from '@/lib/bonding-curve/fetchProgress'

/**
 * Client component — displays the pump.fun bonding curve progress banner.
 * Polls the on-chain account every 30 seconds via Helius RPC.
 *
 * States:
 *  - loading: fetch in progress
 *  - graduated: token has graduated to PumpSwap
 *  - progress: active bonding curve with X.X% sold
 *  - error: fetch failed or buffer malformed
 *
 * Renders nothing if NEXT_PUBLIC_TOKEN_MINT is not set.
 */
export default function BondingCurveBanner() {
  const { connection } = useConnection()
  const [state, setState] = useState<BondingCurveState>({ status: 'loading' })

  useEffect(() => {
    const mint = process.env.NEXT_PUBLIC_TOKEN_MINT
    if (!mint) return

    let cancelled = false

    async function fetchCurve() {
      if (cancelled) return
      try {
        const mintPubkey = new PublicKey(mint as string)
        const curvePda = getBondingCurvePda(mintPubkey)
        const info = await connection.getAccountInfo(curvePda)

        if (cancelled) return

        if (info === null) {
          // Account deleted after graduation
          setState({ status: 'graduated' })
        } else {
          const result = parseBondingCurveData(info.data as Buffer)
          setState(result)
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error' })
        }
      }
    }

    fetchCurve()
    const interval = setInterval(fetchCurve, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [connection])

  const mint = process.env.NEXT_PUBLIC_TOKEN_MINT
  if (!mint) return null

  if (state.status === 'loading') {
    return (
      <div className="w-full border-b-2 border-brand-yellow px-4 py-2 text-center">
        <span className="font-display font-bold uppercase tracking-widest text-xs text-brand-yellow/60">
          Loading bonding curve...
        </span>
      </div>
    )
  }

  if (state.status === 'graduated') {
    const ticker = process.env.NEXT_PUBLIC_TOKEN_TICKER ?? 'TOKEN'
    return (
      <div className="w-full bg-brand-yellow px-4 py-3 text-center">
        <span className="font-display font-bold uppercase tracking-widest text-sm text-brand-black">
          GRADUATED TO PUMPSWAP —{' '}
          <a
            href="https://pumpswap.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            TRADE ${ticker} NOW
          </a>
        </span>
      </div>
    )
  }

  if (state.status === 'progress') {
    const percent = state.percent
    const displayPercent = percent.toFixed(1)
    return (
      <div className="w-full border-b border-brand-yellow/30 bg-brand-black px-4 py-2">
        <p className="font-display font-bold uppercase tracking-widest text-xs text-brand-yellow text-center mb-1.5 leading-snug">
          We are {displayPercent}% of the way to PumpSwap graduation
        </p>
        <div className="relative h-1.5 w-full max-w-2xl mx-auto overflow-hidden rounded-none bg-brand-white/10">
          <div
            className="absolute inset-y-0 left-0 bg-brand-yellow transition-all duration-700"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
      </div>
    )
  }

  // error state — subtle, non-blocking
  return (
    <div className="w-full px-4 py-1.5 text-center">
      <span className="font-mono text-xs text-brand-red/60 uppercase tracking-wider">
        Bonding curve data unavailable
      </span>
    </div>
  )
}
