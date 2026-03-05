import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'

export async function POST(request: NextRequest) {
  // 1. Extract bearer token from Authorization header
  const authHeader = request.headers.get('authorization') ?? ''
  const rawToken = authHeader.split('Bearer ').at(1)?.trim()
  if (!rawToken || rawToken.length < 8) {
    return NextResponse.json({ error: 'Missing or invalid bearer token' }, { status: 401 })
  }

  // 2. Validate API key via service role client (bypasses RLS)
  const adminClient = createAdminClient()
  const keyPrefix = rawToken.slice(0, 8)

  const { data: keyRows, error: keyError } = await adminClient
    .rpc('validate_api_key', {
      p_raw_token: rawToken,
      p_key_prefix: keyPrefix,
    })

  if (keyError || !keyRows || keyRows.length === 0 || !keyRows[0].is_valid) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
  }

  const validKey = keyRows[0]

  // 3. Parse request body
  let body: { title?: string; body?: string; image_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, body: articleBody, image_url } = body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!articleBody || typeof articleBody !== 'string') {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  // 4. Insert article with agent's profile_id as author, status = pending_review
  const slug = generateSlug(title)

  const { data: article, error: insertError } = await adminClient
    .from('articles')
    .insert({
      title: title.trim(),
      slug,
      body: articleBody,
      cover_image_url: image_url ?? null,
      author_id: validKey.profile_id,
      status: 'pending_review' as const,
    })
    .select()
    .single()

  if (insertError) {
    // Handle unique slug conflict
    if (insertError.code === '23505' && insertError.message?.includes('slug')) {
      // Append timestamp suffix for uniqueness
      const uniqueSlug = `${slug}-${Date.now()}`
      const { data: retryArticle, error: retryError } = await adminClient
        .from('articles')
        .insert({
          title: title.trim(),
          slug: uniqueSlug,
          body: articleBody,
          cover_image_url: image_url ?? null,
          author_id: validKey.profile_id,
          status: 'pending_review' as const,
        })
        .select()
        .single()

      if (retryError) {
        return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
      }

      // Update last_used_at
      await adminClient
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', validKey.key_id)

      return NextResponse.json({ article: retryArticle }, { status: 201 })
    }

    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }

  // 5. Update last_used_at on the API key
  await adminClient
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', validKey.key_id)

  return NextResponse.json({ article }, { status: 201 })
}
