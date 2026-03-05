'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useTokenBalance } from '@/components/wallet/useTokenBalance'
import { isAlphaGateExpired, hasTokenAccess } from '@/lib/articles/gate'
import { AlphaGateCountdown } from './AlphaGateCountdown'
import type { ArticleStatus } from '@/lib/supabase/types'

interface ArticleGateProps {
  alphaGateUntil: string | null
  articleStatus: ArticleStatus
  children: React.ReactNode
}

export function ArticleGate({ alphaGateUntil, articleStatus: _articleStatus, children }: ArticleGateProps) {
  const { connected } = useWallet()
  const { balance, loading } = useTokenBalance()

  // State: expired is initialized from the current timestamp so it never flips back
  const [expired, setExpired] = useState<boolean>(() => isAlphaGateExpired(alphaGateUntil))

  const tokenHolder = hasTokenAccess(balance)

  // Case 1: Alpha gate expired — article is public, no gate needed
  if (expired) {
    return <>{children}</>
  }

  // Case 2: Wallet connected and user holds enough tokens — full access with badge
  if (tokenHolder) {
    return (
      <div>
        <div className="inline-block bg-brand-yellow text-brand-black text-xs font-display font-bold uppercase tracking-widest px-3 py-1 mb-4">
          Alpha Access
        </div>
        {children}
      </div>
    )
  }

  // Case 3: Gate overlay shown
  // Children are always rendered in the DOM (blurred) — accepted v1 security model
  // Content is time-delayed public (2 hours), not a permanent secret
  const tokenMint = process.env.NEXT_PUBLIC_TOKEN_MINT
  const tokenTicker = process.env.NEXT_PUBLIC_TOKEN_TICKER ?? 'TOKEN'
  const pumpFunUrl = tokenMint
    ? `https://pump.fun/coin/${tokenMint}`
    : 'https://pump.fun'

  return (
    <div className="relative">
      {/* Blurred content preview — always in DOM, gate is visual only */}
      <div className="max-h-48 overflow-hidden select-none pointer-events-none blur-md opacity-40">
        {children}
      </div>

      {/* Gate overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-black/80 backdrop-blur-sm p-6 text-center">
        {/* Countdown timer */}
        {alphaGateUntil && !expired && (
          <AlphaGateCountdown
            alphaGateUntil={alphaGateUntil}
            onExpired={() => setExpired(true)}
          />
        )}

        {/* Buy CTA — impossible to miss, primary conversion funnel */}
        <a
          href={pumpFunUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand-yellow text-brand-black font-display font-bold uppercase tracking-widest text-lg px-8 py-4 hover:opacity-90 transition-opacity"
        >
          BUY ${tokenTicker} ON PUMP.FUN
        </a>

        {/* Wallet hints */}
        {loading && (
          <p className="text-brand-white/60 text-sm font-mono">Checking balance...</p>
        )}
        {!connected && !loading && (
          <p className="text-brand-white/60 text-sm font-mono">
            or connect wallet if you already hold tokens
          </p>
        )}
      </div>
    </div>
  )
}
