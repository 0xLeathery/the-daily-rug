import Link from 'next/link'
import Image from 'next/image'
import StatusBadge from '@/components/public/StatusBadge'
import type { ArticleWithAuthor } from '@/lib/supabase/articles'

interface ArticleCardProps {
  article: ArticleWithAuthor
}

function formatBurnPrice(burnPrice: number | null): string | null {
  if (burnPrice === null) return null
  const millions = Math.round(burnPrice / 1_000_000)
  return `BURN ${millions}M TO REDACT`
}

/**
 * Server Component — renders an article card with cover image, headline,
 * status badge, and burn price. Redacted articles show tombstone styling.
 */
export default function ArticleCard({ article }: ArticleCardProps) {
  const isRedacted = article.status === 'redacted'
  const burnLabel = formatBurnPrice(article.burn_price)

  return (
    <Link
      href={`/articles/${article.slug}`}
      className={`block border border-brand-red/20 hover:border-brand-yellow transition-colors bg-brand-black group ${
        isRedacted ? 'opacity-50 grayscale' : ''
      }`}
    >
      {/* Cover image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-red to-brand-black">
        {article.cover_image_url ? (
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : null}
      </div>

      {/* Card body */}
      <div className="p-3">
        {/* Status badge */}
        <div className="mb-2">
          <StatusBadge status={article.status} alphaGateUntil={article.alpha_gate_until} />
        </div>

        {/* Headline */}
        <h3 className="font-display font-bold uppercase tracking-tight text-brand-white leading-tight text-[clamp(0.9rem,2vw,1.1rem)] line-clamp-3">
          {article.title}
        </h3>

        {/* Burn price */}
        {burnLabel && (
          <p className="mt-2 font-mono text-xs text-brand-red/70 uppercase tracking-widest">
            {burnLabel}
          </p>
        )}
      </div>
    </Link>
  )
}
