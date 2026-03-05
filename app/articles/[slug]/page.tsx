import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getArticleBySlug } from '@/lib/supabase/articles'
import { ArticleGate } from '@/components/public/ArticleGate'
import { ArticleLiveWrapper } from '@/components/public/ArticleLiveWrapper'
import { truncateAddress, formatBalance } from '@/lib/utils/format'

type Props = { params: Promise<{ slug: string }> }

const SITE_DESCRIPTION = 'The Daily Rug -- Where Whales Silence The Alpha'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return { title: 'Article Not Found | The Daily Rug' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const ogImages = article.cover_image_url
    ? [{ url: article.cover_image_url, width: 1200, height: 630 }]
    : []

  return {
    title: `${article.title} | The Daily Rug`,
    openGraph: {
      title: article.title,
      description: SITE_DESCRIPTION,
      siteName: 'The Daily Rug',
      images: ogImages,
      type: 'article',
      publishedTime: article.published_at ?? undefined,
      url: `${siteUrl}/articles/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: SITE_DESCRIPTION,
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  // Redacted tombstone page
  if (article.status === 'redacted') {
    return (
      <main className="min-h-screen bg-brand-black flex items-center justify-center p-8">
        <div className="max-w-lg w-full border-4 border-brand-red p-8 text-center">
          <h1 className="font-display font-bold uppercase text-brand-red text-6xl tracking-widest mb-4">
            REDACTED
          </h1>
          <p className="text-brand-white/70 font-mono text-lg mb-8">
            This story was silenced by a whale.
          </p>
          {article.burned_by && (
            <p className="text-brand-white/50 font-mono text-sm mt-4 mb-8">
              Burned by {truncateAddress(article.burned_by)} for {formatBalance(article.burned_amount ?? 0)} tokens
            </p>
          )}
          <Link
            href="/"
            className="text-brand-yellow font-mono text-sm hover:underline"
          >
            &larr; Back to The Daily Rug
          </Link>
        </div>
      </main>
    )
  }

  // Published article page
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <main className="min-h-screen bg-brand-black text-brand-white">
      {/* Cover image */}
      {article.cover_image_url && (
        <div className="relative w-full aspect-video max-h-[480px] overflow-hidden">
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Title */}
        <h1 className="font-display font-bold uppercase text-brand-white tracking-tight text-4xl sm:text-5xl lg:text-6xl mb-4">
          {article.title}
        </h1>

        {/* Meta line: author + date */}
        <div className="flex flex-wrap gap-4 items-center text-brand-white/60 font-mono text-sm mb-8">
          {article.profiles?.display_name && (
            <span>Written by: {article.profiles.display_name}</span>
          )}
          {publishedDate && <span>{publishedDate}</span>}
        </div>

        {/* Gated article body with live burn integration */}
        <ArticleLiveWrapper
          articleId={article.id}
          articleTitle={article.title}
          articleStatus={article.status}
          burnPrice={article.burn_price}
          burnedBy={article.burned_by}
          burnedAmount={article.burned_amount}
        >
          <ArticleGate
            alphaGateUntil={article.alpha_gate_until}
            articleStatus={article.status}
          >
            <div
              className="prose prose-invert font-mono max-w-none"
              dangerouslySetInnerHTML={{ __html: article.body || '' }}
            />
          </ArticleGate>
        </ArticleLiveWrapper>
      </div>
    </main>
  )
}
