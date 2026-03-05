import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Article, Profile } from '@/lib/supabase/types'

export type ArticleWithAuthor = Article & {
  profiles: Pick<Profile, 'display_name' | 'avatar_url'> | null
}

/**
 * Returns all published and redacted articles, ordered by published_at descending.
 * Joins the author's profile (display_name, avatar_url) via author_id.
 */
export async function getPublishedArticles(): Promise<ArticleWithAuthor[]> {
  const client = await createClient()
  const { data, error } = await client
    .from('articles')
    .select('*, profiles!author_id(display_name, avatar_url)')
    .in('status', ['published', 'redacted'])
    .order('published_at', { ascending: false })

  if (error) return []
  return (data as ArticleWithAuthor[]) ?? []
}

/**
 * Returns a single published or redacted article by slug with author profile joined.
 * Returns null if the article does not exist, is a draft, or is pending review.
 */
export async function getArticleBySlug(slug: string): Promise<ArticleWithAuthor | null> {
  const client = await createClient()
  const { data, error } = await client
    .from('articles')
    .select('*, profiles!author_id(display_name, avatar_url)')
    .eq('slug', slug)
    .in('status', ['published', 'redacted'])
    .single()

  if (error) return null
  return data as ArticleWithAuthor
}
