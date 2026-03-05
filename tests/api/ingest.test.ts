import { describe, test, expect, vi, beforeEach } from 'vitest'

// Bypass server-only import guard — must be before any route imports
vi.mock('server-only', () => ({}))

// Mock the Supabase admin client factory
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/v1/ingest/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal NextRequest-like object for the ingest route */
function makeRequest({
  authorization,
  body,
}: {
  authorization?: string
  body?: Record<string, unknown>
}) {
  const headers = new Map<string, string>()
  if (authorization !== undefined) {
    headers.set('authorization', authorization)
  }

  return {
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    json: () => Promise.resolve(body ?? {}),
  } as unknown as import('next/server').NextRequest
}

/** Mock Supabase admin client builder */
function makeAdminClient({
  validateApiKeyResult,
  insertResult,
}: {
  validateApiKeyResult: unknown[]
  insertResult: unknown
}) {
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  })

  const singleMock = vi.fn().mockResolvedValue({
    data: insertResult,
    error: null,
  })

  const selectMock = vi.fn().mockReturnValue({ single: singleMock })

  const insertMock = vi.fn().mockReturnValue({ select: selectMock })

  const fromMock = vi.fn((table: string) => {
    if (table === 'api_keys') {
      return { update: updateMock }
    }
    // articles
    return { insert: insertMock }
  })

  const rpcMock = vi.fn().mockResolvedValue({
    data: validateApiKeyResult,
    error: null,
  })

  return {
    rpc: rpcMock,
    from: fromMock,
    _mocks: { rpcMock, fromMock, insertMock, updateMock },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/v1/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns 401 when no bearer token provided', async () => {
    const mockClient = makeAdminClient({ validateApiKeyResult: [], insertResult: null })
    vi.mocked(createAdminClient).mockReturnValue(mockClient as ReturnType<typeof createAdminClient>)

    const request = makeRequest({ authorization: undefined })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBeDefined()
  })

  test('returns 401 when invalid bearer token provided', async () => {
    // Validate API key returns empty array — invalid token
    const mockClient = makeAdminClient({ validateApiKeyResult: [], insertResult: null })
    vi.mocked(createAdminClient).mockReturnValue(mockClient as ReturnType<typeof createAdminClient>)

    // "short" is only 5 chars — route rejects tokens < 8 chars before hitting DB
    const request = makeRequest({ authorization: 'Bearer short' })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBeDefined()
  })

  test('returns 201 with valid bearer token and creates article with status pending_review', async () => {
    const mockArticle = {
      id: 'article-uuid-1',
      title: 'Test Article',
      slug: 'test-article',
      body: '<p>Test body</p>',
      status: 'pending_review',
      author_id: 'agent-profile-123',
      cover_image_url: null,
      created_at: '2026-03-05T03:00:00Z',
    }

    const validKeyRow = [{ is_valid: true, profile_id: 'agent-profile-123', key_id: 'key-1' }]
    const mockClient = makeAdminClient({ validateApiKeyResult: validKeyRow, insertResult: mockArticle })
    vi.mocked(createAdminClient).mockReturnValue(mockClient as ReturnType<typeof createAdminClient>)

    const request = makeRequest({
      // Token is >= 8 chars and DB validates it
      authorization: 'Bearer valid-api-token-abc123',
      body: { title: 'Test Article', body: '<p>Test body</p>' },
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.article).toBeDefined()
    expect(json.article.status).toBe('pending_review')
  })

  test('sets author_id to the agent profile_id associated with the API key', async () => {
    const mockArticle = {
      id: 'article-uuid-2',
      title: 'Agent Article',
      slug: 'agent-article',
      body: '<p>Body text</p>',
      status: 'pending_review',
      author_id: 'agent-profile-123',
      cover_image_url: null,
      created_at: '2026-03-05T03:00:00Z',
    }

    const validKeyRow = [{ is_valid: true, profile_id: 'agent-profile-123', key_id: 'key-1' }]
    const mockClient = makeAdminClient({ validateApiKeyResult: validKeyRow, insertResult: mockArticle })
    vi.mocked(createAdminClient).mockReturnValue(mockClient as ReturnType<typeof createAdminClient>)

    const request = makeRequest({
      authorization: 'Bearer valid-api-token-abc123',
      body: { title: 'Agent Article', body: '<p>Body text</p>' },
    })

    await POST(request)

    // The insert must have been called with author_id = profile_id from the API key
    const { insertMock } = mockClient._mocks
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'agent-profile-123' })
    )
  })

  test('updates last_used_at on the api_key after successful ingest', async () => {
    const mockArticle = {
      id: 'article-uuid-3',
      title: 'Last Used Article',
      slug: 'last-used-article',
      body: '<p>Some body</p>',
      status: 'pending_review',
      author_id: 'agent-profile-123',
      cover_image_url: null,
      created_at: '2026-03-05T03:00:00Z',
    }

    const validKeyRow = [{ is_valid: true, profile_id: 'agent-profile-123', key_id: 'key-1' }]
    const mockClient = makeAdminClient({ validateApiKeyResult: validKeyRow, insertResult: mockArticle })
    vi.mocked(createAdminClient).mockReturnValue(mockClient as ReturnType<typeof createAdminClient>)

    const request = makeRequest({
      authorization: 'Bearer valid-api-token-abc123',
      body: { title: 'Last Used Article', body: '<p>Some body</p>' },
    })

    await POST(request)

    // from('api_keys') must have been called, and update() called with last_used_at
    const { updateMock } = mockClient._mocks
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ last_used_at: expect.any(String) })
    )
  })
})
