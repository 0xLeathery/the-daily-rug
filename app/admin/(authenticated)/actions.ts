'use server'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import { decodeJwt } from 'jose'
import { revalidatePath } from 'next/cache'
import type { ArticleStatus } from '@/lib/supabase/types'

type SaveArticleFormData = {
  title: string
  body: string
  status: ArticleStatus
  burn_price: number | null
  cover_image_url: string | null
}

export async function saveArticle(id: string | null, formData: SaveArticleFormData) {
  const supabase = await createClient()

  // Always validate auth via getUser() — validates the token server-side
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Use getSession() ONLY to read JWT claims — auth already validated above
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const claims = session?.access_token ? decodeJwt(session.access_token) : {}
  const role = (claims as Record<string, unknown>).user_role as string | undefined

  // Editors can only set draft or pending_review — not published or redacted
  if (role === 'editor') {
    if (formData.status !== 'draft' && formData.status !== 'pending_review') {
      throw new Error('Editors cannot set this status')
    }
  }

  if (id === null) {
    // New article: generate slug, insert with author_id
    let slug = generateSlug(formData.title)

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: formData.title,
        slug,
        body: formData.body,
        status: formData.status,
        burn_price: formData.burn_price,
        cover_image_url: formData.cover_image_url,
        author_id: user.id,
      })
      .select()
      .single()

    if (error) {
      // Slug conflict: error code 23505 is unique constraint violation
      if (error.code === '23505') {
        slug = `${slug}-${Date.now()}`
        const { data: retryData, error: retryError } = await supabase
          .from('articles')
          .insert({
            title: formData.title,
            slug,
            body: formData.body,
            status: formData.status,
            burn_price: formData.burn_price,
            cover_image_url: formData.cover_image_url,
            author_id: user.id,
          })
          .select()
          .single()

        if (retryError) {
          throw new Error(retryError.message)
        }

        revalidatePath('/admin')
        return retryData
      }

      throw new Error(error.message)
    }

    revalidatePath('/admin')
    return data
  } else {
    // Edit existing article
    let query = supabase
      .from('articles')
      .update({
        title: formData.title,
        body: formData.body,
        status: formData.status,
        burn_price: formData.burn_price,
        cover_image_url: formData.cover_image_url,
      })
      .eq('id', id)

    // Editors can only edit their own articles
    if (role === 'editor') {
      query = query.eq('author_id', user.id)
    }

    const { data, error } = await query.select().single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/admin')
    return data
  }
}

export async function publishArticle(id: string, burnPrice: number) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Role check: only admin can publish
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const claims = session?.access_token ? decodeJwt(session.access_token) : {}
  const role = (claims as Record<string, unknown>).user_role as string | undefined

  if (role !== 'admin') {
    throw new Error('Only admins can publish articles')
  }

  // Validate burn price
  if (burnPrice <= 0) {
    throw new Error('Burn price must be greater than 0')
  }

  const published_at = new Date().toISOString()
  const alpha_gate_until = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('articles')
    .update({
      status: 'published',
      burn_price: burnPrice,
      published_at,
      alpha_gate_until,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  return data
}

export async function unpublishArticle(id: string) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Role check: only admin can unpublish
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const claims = session?.access_token ? decodeJwt(session.access_token) : {}
  const role = (claims as Record<string, unknown>).user_role as string | undefined

  if (role !== 'admin') {
    throw new Error('Only admins can unpublish articles')
  }

  const { data, error } = await supabase
    .from('articles')
    .update({
      status: 'draft',
      published_at: null,
      alpha_gate_until: null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  return data
}
