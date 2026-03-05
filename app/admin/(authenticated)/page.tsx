import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ArticleTable from '@/components/admin/ArticleTable'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('*, profiles!articles_author_id_fkey(display_name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-brand-yellow uppercase text-2xl tracking-tight">
          NEWSROOM
        </h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-brand-red text-brand-white font-display uppercase text-sm tracking-wide hover:bg-red-700 transition-colors"
        >
          NEW ARTICLE
        </Link>
      </div>

      <ArticleTable articles={articles ?? []} />
    </div>
  )
}
