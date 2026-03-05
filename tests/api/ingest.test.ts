import { describe, test } from 'vitest'

describe('POST /api/v1/ingest', () => {
  test.todo('returns 401 when no bearer token provided')
  test.todo('returns 401 when invalid bearer token provided')
  test.todo('returns 201 with valid bearer token and creates article with status pending_review')
  test.todo('sets author_id to the agent profile_id associated with the API key')
  test.todo('updates last_used_at on the api_key after successful ingest')
})
