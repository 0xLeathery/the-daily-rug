import type { Metadata } from 'next'
import { getPublishedArticles } from '@/lib/supabase/articles'
import ArticleHeroCard from '@/components/public/ArticleHeroCard'
import ArticleCard from '@/components/public/ArticleCard'
import BondingCurveBanner from '@/components/public/BondingCurveBanner'

export const metadata: Metadata = {
  title: 'The Daily Rug',
  description: 'Where Whales Silence The Alpha',
  openGraph: {
    siteName: 'The Daily Rug',
    description: 'Where Whales Silence The Alpha',
  },
}

/**
 * Homepage — SSR article listing with bonding curve banner.
 * Server Component: fetches articles server-side, renders hero + grid layout.
 * BondingCurveBanner is client-only (polls on-chain data every 30s).
 */
export default async function HomePage() {
  const articles = await getPublishedArticles()
  const [hero, ...rest] = articles

  return (
    <main className="min-h-screen bg-brand-black">
      {/* Bonding curve banner — client component, always full width */}
      <BondingCurveBanner />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {articles.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24">
            <p className="font-display font-bold text-brand-red uppercase tracking-widest text-[clamp(1rem,3vw,1.5rem)]">
              NO STORIES YET
            </p>
            <p className="mt-2 font-mono text-brand-white/40 text-sm">
              Check back soon — the rug is being pulled.
            </p>
          </div>
        ) : (
          <>
            {/* Hero card — most recent article */}
            {hero && (
              <div className="mb-6">
                <ArticleHeroCard article={hero} />
              </div>
            )}

            {/* Article grid: 1 col mobile, 2 col tablet, 3 col desktop */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {rest.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
