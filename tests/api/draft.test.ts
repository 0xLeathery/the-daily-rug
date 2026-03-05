import { describe, test, expect, vi, beforeEach } from 'vitest'

// Bypass server-only import guard — must be before any route imports
vi.mock('server-only', () => ({}))

// Mock the Supabase server client (createClient uses cookies + supabase-ssr)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

// Mock Anthropic SDK
// We use a module-level variable so tests can reconfigure create per test
const mockAnthropicCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockAnthropicCreate,
      }
    },
  }
})

import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/ai/draft/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal NextRequest-like object for the draft route */
function makeRequest({
  body,
}: {
  body?: Record<string, unknown>
}) {
  return {
    json: () => Promise.resolve(body ?? {}),
  } as unknown as import('next/server').NextRequest
}

/** Make a fake async iterator for Anthropic streaming */
function makeStreamIterator(textChunks: string[]) {
  const events = textChunks.map((text) => ({
    type: 'content_block_delta' as const,
    delta: { type: 'text_delta' as const, text },
  }))
  return {
    [Symbol.asyncIterator]() {
      let index = 0
      return {
        async next() {
          if (index < events.length) {
            return { done: false, value: events[index++] }
          }
          return { done: true, value: undefined }
        },
      }
    },
  }
}

/** Mock Supabase client with getUser result */
function makeSupabaseClient({ user }: { user: Record<string, unknown> | null }) {
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user },
    error: user === null ? { message: 'No session' } : null,
  })
  return {
    auth: { getUser: getUserMock },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/ai/draft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns 401 when user is not authenticated', async () => {
    // No authenticated user
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient({ user: null }) as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    )

    const request = makeRequest({ body: { topic: 'Solana drama' } })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  test('returns 400 when topic is missing', async () => {
    // Authenticated user but no topic
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient({ user: { id: 'user-123' } }) as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    )

    const request = makeRequest({ body: {} })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Topic is required')
  })

  test('returns 400 when topic is empty string', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient({ user: { id: 'user-123' } }) as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    )

    const request = makeRequest({ body: { topic: '' } })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Topic is required')
  })

  test('returns 200 with streaming text/plain response for authenticated user with valid topic', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient({ user: { id: 'user-123' } }) as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    )

    // Configure Anthropic mock to return a streaming iterator
    mockAnthropicCreate.mockResolvedValue(makeStreamIterator(['Hello ', 'World']))

    const request = makeRequest({ body: { topic: 'Solana rug pull drama' } })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })

  test('streaming response body contains text chunks from Anthropic', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient({ user: { id: 'user-123' } }) as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    )

    mockAnthropicCreate.mockResolvedValue(makeStreamIterator(['GM ser, ', 'WAGMI news']))

    const request = makeRequest({ body: { topic: 'Ape season returns' } })
    const response = await POST(request)

    // Read the streaming body
    const text = await response.text()
    expect(text).toBe('GM ser, WAGMI news')
  })
})
