import { describe, test } from 'vitest'

describe('Database Schema', () => {
  test.todo('articles table has all required columns: id, title, slug, body, status, burn_price, published_at, alpha_gate_until, cover_image_url, author_id, created_at, updated_at')
  test.todo('articles status check constraint allows only: draft, pending_review, published, redacted')
  test.todo('profiles table has all required columns: id, role, display_name, avatar_url, is_agent, created_at')
  test.todo('profiles role check constraint allows only: admin, editor, agent')
  test.todo('profiles.id references auth.users with ON DELETE CASCADE')
  test.todo('articles.author_id references profiles.id')
  test.todo('api_keys table has all required columns: id, profile_id, name, key_prefix, key_hash, created_at, last_used_at, expires_at, is_active')
  test.todo('api_keys.key_prefix has UNIQUE constraint')
  test.todo('processed_webhooks table has all required columns: id, webhook_id, payload, processed_at')
  test.todo('processed_webhooks.webhook_id has UNIQUE constraint')
})
