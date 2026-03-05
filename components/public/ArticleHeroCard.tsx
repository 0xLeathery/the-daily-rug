import Link from 'next/link'
import Image from 'next/image'
import StatusBadge from '@/components/public/StatusBadge'
import type { ArticleWithAuthor } from '@/lib/supabase/articles'

interface ArticleHeroCardProps {
  article: ArticleWithAuthor
}

function formatBurnPrice(burnPrice: number | null): string | null {
  if (burnPrice === null) return null
  const millions = Math.round(burnPrice / 1_000_000)
  return `BURN ${millions}M TO REDACT`
}

/**
 * Server Component — full-width hero card for the most recent article.
 * Larger image, bigger headline, same data as ArticleCard.
 * Redacted articles show tombstone styling (grayscale, reduced opacity).
 */
export default function ArticleHeroCard({ article }: ArticleHeroCardProps) {
  const isRedacted = article.status === 'redacted'
  const burnLabel = formatBurnPrice(article.burn_price)

  return (
    <Link
      href={`/articles/${article.slug}`}
      className={`block border border-brand-red/20 hover:border-brand-yellow transition-colors bg-brand-black group w-full ${
        isRedacted ? 'opacity-50 grayscale' : ''
      }`}
    >
      <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] overflow-hidden bg-gradient-to-br from-brand-red to-brand-black">
        {article.cover_image_url ? (
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            priority
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="100vw"
          />
        ) : null}

        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-brand-black/30 to-transparent" />

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="mb-3">
            <StatusBadge status={article.status} alphaGateUntil={article.alpha_gate_until} />
          </div>
          <h2 className="font-display font-bold uppercase tracking-tight text-brand-white leading-none text-[clamp(1.5rem,5vw,3rem)] line-clamp-2">
            {article.title}
          </h2>
          {burnLabel && (
            <p className="mt-2 font-mono text-sm text-brand-red/80 uppercase tracking-widest">
              {burnLabel}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
