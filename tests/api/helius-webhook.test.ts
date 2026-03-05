import { describe, test } from 'vitest'

describe('Helius Webhook Handler', () => {
  test.todo('returns 401 when Authorization header is missing')
  test.todo('returns 401 when Authorization header is wrong')
  test.todo('parses ArticleKilled event from logMessages and updates article to redacted')
  test.todo('records burn details (burned_by, burned_amount, burn_tx, burned_at)')
  test.todo('returns 200 for duplicate webhook_id (idempotency)')
  test.todo('returns 500 when Supabase update fails (triggers Helius retry)')
  test.todo('handles array payload with multiple transactions')
  test.todo('skips transactions without ArticleKilled event')
})
