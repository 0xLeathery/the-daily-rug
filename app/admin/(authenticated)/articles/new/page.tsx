import { createClient } from '@/lib/supabase/server'
import { decodeJwt } from 'jose'
import ArticleEditor from '@/components/admin/ArticleEditor'
import type { UserRole } from '@/lib/supabase/types'

export default async function NewArticlePage() {
  const supabase = await createClient()

  // Auth validated via getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Read role from JWT claims (getSession() only for claim reading after getUser() validates auth)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const claims = session?.access_token ? decodeJwt(session.access_token) : {}
  const role = ((claims as Record<string, unknown>).user_role as UserRole | undefined) ?? 'editor'

  const isEditor = role === 'editor'

  return (
    <div>
      <h1 className="font-display text-brand-yellow uppercase text-2xl tracking-tight mb-6">
        {isEditor ? 'NEW DRAFT' : 'NEW ARTICLE'}
      </h1>
      <ArticleEditor article={null} userRole={role} />
    </div>
  )
}
