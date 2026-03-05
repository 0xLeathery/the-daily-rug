'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { BurnButton } from '@/components/public/BurnButton'
import { TombstoneGraphic } from '@/components/public/TombstoneGraphic'
import { truncateAddress, formatBalance } from '@/lib/utils/format'
import type { ArticleStatus } from '@/lib/supabase/types'
import Link from 'next/link'

interface ArticleLiveWrapperProps {
  articleId: string
  articleTitle: string
  articleStatus: ArticleStatus
  burnPrice: number | null
  burnedBy: string | null
  burnedAmount: number | null
  children: React.ReactNode  // the article body (already wrapped in ArticleGate)
}

export function ArticleLiveWrapper({
  articleId,
  articleTitle,
  articleStatus,
  burnPrice,
  burnedBy,
  burnedAmount,
  children,
}: ArticleLiveWrapperProps) {
  const [isBeingRedacted, setIsBeingRedacted] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'none' | 'glitch' | 'flash' | 'reveal'>('none')
  const [showTombstone, setShowTombstone] = useState(false)

  // Supabase Realtime subscription — listen for status change to 'redacted'
  useEffect(() => {
    if (articleStatus === 'redacted') return

    const supabase = createClient()
    const channel = supabase
      .channel(`article-status-${articleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'articles',
          filter: `id=eq.${articleId}`,
        },
        (payload) => {
          if ((payload.new as { status?: string })?.status === 'redacted') {
            setIsBeingRedacted(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [articleId, articleStatus])

  // Destruction animation sequence when isBeingRedacted becomes true
  useEffect(() => {
    if (!isBeingRedacted) return

    // Phase 1: Glitch (0-800ms)
    setAnimationPhase('glitch')

    const flashTimer = setTimeout(() => {
      // Phase 2: Flash (800-1100ms)
      setAnimationPhase('flash')
    }, 800)

    const revealTimer = setTimeout(() => {
      // Phase 3: Reveal tombstone (1100-1600ms)
      setAnimationPhase('reveal')
      setShowTombstone(true)
    }, 1100)

    return () => {
      clearTimeout(flashTimer)
      clearTimeout(revealTimer)
    }
  }, [isBeingRedacted])

  // Show inline tombstone after animation completes
  if (showTombstone) {
    return (
      <div style={{ animation: 'burn-reveal 0.5s ease-out' }}>
        <div className="text-center mt-8">
          <TombstoneGraphic seed={articleId} className="w-full max-w-xs mx-auto" />
          <h2 className="font-display font-bold uppercase text-brand-red text-5xl tracking-widest mb-4 mt-6">
            REDACTED BY WHALE
          </h2>
          <p className="text-brand-white/70 font-mono text-lg mb-4">
            This story was silenced. The truth died here.
          </p>
          {burnedBy && (
            <p className="text-brand-white/50 font-mono text-sm mt-4">
              Burned by {truncateAddress(burnedBy)} for {formatBalance(burnedAmount ?? 0)} tokens
            </p>
          )}
          <Link href="/" className="text-brand-yellow font-mono text-sm hover:underline mt-8 inline-block">
            &larr; Back to The Daily Rug
          </Link>
        </div>
      </div>
    )
  }

  // Flash overlay
  if (animationPhase === 'flash') {
    return (
      <div className="fixed inset-0 z-50 bg-brand-white pointer-events-none" style={{ animation: 'burn-flash 0.3s ease-out' }} />
    )
  }

  return (
    <div>
      {/* Article content — apply glitch animation when being redacted */}
      <div
        className={animationPhase === 'glitch' ? '' : ''}
        style={
          animationPhase === 'glitch'
            ? { animation: 'burn-glitch 0.8s ease-in-out' }
            : undefined
        }
      >
        {children}
      </div>

      {/* BurnButton: shown for published articles with a burn price set */}
      {articleStatus !== 'redacted' && burnPrice && burnPrice > 0 && !showTombstone && (
        <div className="mt-12 pt-8 border-t border-brand-white/20">
          <BurnButton
            articleId={articleId}
            articleTitle={articleTitle}
            burnPrice={burnPrice}
            articleStatus={articleStatus}
            onBurnComplete={() => setIsBeingRedacted(true)}
          />
        </div>
      )}
    </div>
  )
}
