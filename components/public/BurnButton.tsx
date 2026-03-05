'use client'

import { useState } from 'react'
import { useWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { useTokenBalance } from '@/components/wallet/useTokenBalance'
import { uuidToBytes, BURN_ELIGIBILITY_THRESHOLD, TOKEN_DECIMALS } from '@/lib/burn/utils'
import { formatBalance } from '@/lib/utils/format'
import type { ArticleStatus } from '@/lib/supabase/types'
import idl from '@/anchor/target/idl/burn_for_article.json'

interface BurnButtonProps {
  articleId: string
  articleTitle: string
  burnPrice: number          // human-readable token amount (e.g. 500000 for 500K)
  articleStatus: ArticleStatus
  onBurnComplete: () => void // callback to trigger parent page tombstone transition
}

type BurnState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'processing'; step: 'wallet' | 'chain' }
  | { phase: 'success' }
  | { phase: 'error'; message: string }

export function BurnButton({
  articleId,
  articleTitle,
  burnPrice,
  articleStatus,
  onBurnComplete,
}: BurnButtonProps) {
  const { connected } = useWallet()
  const anchorWallet = useAnchorWallet()
  const { connection } = useConnection()
  const { balance } = useTokenBalance()
  const [state, setState] = useState<BurnState>({ phase: 'idle' })

  // Article already redacted: BurnButton not rendered; tombstone handles display
  if (articleStatus === 'redacted') return null

  // No burn price set: nothing to show
  if (!burnPrice || burnPrice === 0) return null

  const formattedPrice = formatBalance(burnPrice)

  // Eligibility checks
  const isConnected = connected && !!anchorWallet
  const meetsThreshold = balance !== null && balance >= BURN_ELIGIBILITY_THRESHOLD
  const canAffordBurn = balance !== null && balance >= burnPrice
  const isEligible = isConnected && meetsThreshold && canAffordBurn

  // Deficit: how many tokens short
  const deficit = balance !== null && isConnected && meetsThreshold && !canAffordBurn
    ? burnPrice - balance
    : null

  const handleConfirm = async () => {
    setState({ phase: 'processing', step: 'wallet' })
    try {
      const provider = new AnchorProvider(connection, anchorWallet!, { commitment: 'confirmed' })
      const program = new Program(idl as any, provider)
      const mintPubkey = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT!)
      // Pump.fun 6-decimal tokens: multiply human amount by 10^6
      const rawAmount = new BN(burnPrice).mul(new BN(10 ** TOKEN_DECIMALS))

      setState({ phase: 'processing', step: 'chain' })
      await program.methods
        .burnForArticle(uuidToBytes(articleId), rawAmount)
        .accounts({
          burner: anchorWallet!.publicKey,
          mint: mintPubkey,
        })
        .rpc()

      setState({ phase: 'success' })
      // Short delay for success state visibility, then trigger parent transition
      setTimeout(() => onBurnComplete(), 500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed'
      // Clean up common Anchor/wallet errors for user-facing display
      const userMessage = message.includes('User rejected')
        ? 'Transaction rejected'
        : message.includes('InsufficientTokenBalance')
        ? 'Insufficient token balance'
        : 'Transaction failed'
      setState({ phase: 'error', message: userMessage })
      // Reset to idle after 3 seconds per locked decisions
      setTimeout(() => setState({ phase: 'idle' }), 3000)
    }
  }

  // Success state: brief flash before onBurnComplete fires
  if (state.phase === 'success') {
    return (
      <div className="text-center">
        <p className="text-brand-red text-6xl font-display uppercase animate-pulse">
          ARTICLE KILLED
        </p>
      </div>
    )
  }

  // Processing overlay
  if (state.phase === 'processing') {
    return (
      <div className="fixed inset-0 z-50 bg-brand-black/95 flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-brand-yellow text-3xl uppercase tracking-widest animate-pulse">
            {state.step === 'wallet'
              ? 'AWAITING WALLET APPROVAL...'
              : 'CONFIRMING ON-CHAIN...'}
          </p>
        </div>
      </div>
    )
  }

  // Confirmation dialog
  if (state.phase === 'confirming') {
    return (
      <div className="fixed inset-0 z-50 bg-brand-black/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-brand-black border-2 border-brand-red p-6 sm:p-8 max-w-md w-full">
          <h2 className="font-display text-brand-red text-2xl uppercase tracking-widest mb-4">
            BURN {formattedPrice} TO REDACT
          </h2>
          <p className="text-brand-white/70 font-mono text-sm mb-4">
            You are about to burn {formattedPrice} tokens to permanently redact this article.
            This cannot be undone.
          </p>
          <p className="text-brand-white/50 font-mono text-xs mb-8 italic">
            &ldquo;{articleTitle}&rdquo;
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-brand-red text-brand-white font-display font-bold uppercase tracking-widest py-3 px-6 hover:opacity-90 transition-opacity"
            >
              CONFIRM BURN
            </button>
            <button
              onClick={() => setState({ phase: 'idle' })}
              className="flex-1 border border-brand-white/40 text-brand-white font-display font-bold uppercase tracking-widest py-3 px-6 hover:opacity-90 transition-opacity"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Idle state: the main button with eligibility helpers
  return (
    <div>
      <button
        onClick={() => isEligible && setState({ phase: 'confirming' })}
        disabled={!isEligible}
        className="bg-brand-red text-brand-white font-display font-bold uppercase tracking-widest text-lg px-8 py-4 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        BURN {formattedPrice} TO REDACT
      </button>

      {/* Helper text based on eligibility state */}
      {!isConnected && (
        <p className="text-brand-white/60 font-mono text-sm mt-2">
          Connect wallet to burn
        </p>
      )}
      {isConnected && !meetsThreshold && (
        <p className="text-brand-white/60 font-mono text-sm mt-2">
          Hold at least 100K tokens to burn
        </p>
      )}
      {isConnected && meetsThreshold && deficit !== null && (
        <div className="mt-2">
          <p className="text-brand-white/60 font-mono text-sm">
            You need {formatBalance(deficit)} more tokens
          </p>
          <a
            href={`https://pump.fun/coin/${process.env.NEXT_PUBLIC_TOKEN_MINT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-yellow font-mono text-sm hover:underline"
          >
            Buy on Pump.fun &rarr;
          </a>
        </div>
      )}

      {/* Error state: inline below button */}
      {state.phase === 'error' && (
        <p className="text-brand-red font-mono text-sm mt-2">
          {state.message}
        </p>
      )}
    </div>
  )
}
