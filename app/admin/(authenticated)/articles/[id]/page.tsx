import { createClient } from '@/lib/supabase/server'
import { decodeJwt } from 'jose'
import { redirect } from 'next/navigation'
import ArticleEditor from '@/components/admin/ArticleEditor'
import type { UserRole } from '@/lib/supabase/types'

interface EditArticlePageProps {
  params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Auth validated via getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Read role from JWT claims (getSession() only for claim reading after getUser() validates auth)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const claims = session?.access_token ? decodeJwt(session.access_token) : {}
  const role = ((claims as Record<string, unknown>).user_role as UserRole | undefined) ?? 'editor'

  // Fetch article by id
  let query = supabase.from('articles').select('*').eq('id', id)

  // Editors can only edit their own articles
  if (role === 'editor') {
    query = query.eq('author_id', user.id)
  }

  const { data: article, error } = await query.single()

  if (error || !article) {
    redirect('/admin')
  }

  return (
    <div>
      <h1 className="font-display text-brand-yellow uppercase text-2xl tracking-tight mb-6">
        EDIT ARTICLE
      </h1>
      <ArticleEditor article={article} userRole={role} />
    </div>
  )
}
