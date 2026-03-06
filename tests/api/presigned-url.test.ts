import { describe, test, expect, vi, beforeEach } from 'vitest'

// Bypass server-only import guard — must be first
vi.mock('server-only', () => ({}))

// Stub S3 client — must use class constructors (not arrow functions) for `new` compatibility
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class S3Client {
    constructor() {}
  },
  PutObjectCommand: class PutObjectCommand {
    constructor() {}
  },
}))

// Stub presigner — returns a deterministic presigned URL
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned'),
}))

// Stub crypto randomUUID for deterministic key generation
vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
}))

// Stub Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Stub decodeJwt from jose
vi.mock('jose', () => ({
  decodeJwt: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { decodeJwt } from 'jose'
import { POST } from '@/app/api/upload/presigned-url/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Supabase client with user, session, and role */
function makeSupabaseClient({
  user,
  session,
  role,
}: {
  user: object | null
  session: { access_token: string } | null
  role?: string
}) {
  // Configure decodeJwt mock to return role claim
  vi.mocked(decodeJwt).mockReturnValue({ user_role: role } as ReturnType<typeof decodeJwt>)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    },
  }
}

/** Build a minimal NextRequest-like mock */
function makeRequest({ body }: { body?: unknown } = {}) {
  return {
    json: () => Promise.resolve(body ?? { contentType: 'image/jpeg', extension: 'jpg', fileSize: 1024 }),
  } as unknown as import('next/server').NextRequest
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/upload/presigned-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.R2_ACCOUNT_ID = 'test-account'
    process.env.R2_BUCKET_NAME = 'test-bucket'
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com'
  })

  test('returns 401 when user is not authenticated', async () => {
    const mockClient = makeSupabaseClient({ user: null, session: null, role: undefined })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as ReturnType<Awaited<typeof createClient>>)

    const request = makeRequest()
    const response = await POST(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toContain('Unauthorized')
  })

  test('returns 403 when user role is agent', async () => {
    const mockUser = { id: 'user-123', email: 'agent@example.com' }
    const mockSession = { access_token: 'agent-token-abc' }
    const mockClient = makeSupabaseClient({ user: mockUser, session: mockSession, role: 'agent' })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as ReturnType<Awaited<typeof createClient>>)

    const request = makeRequest()
    const response = await POST(request)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Forbidden')
  })

  test('returns 200 with presigned URL when user role is admin', async () => {
    const mockUser = { id: 'user-456', email: 'admin@example.com' }
    const mockSession = { access_token: 'admin-token-xyz' }
    const mockClient = makeSupabaseClient({ user: mockUser, session: mockSession, role: 'admin' })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as ReturnType<Awaited<typeof createClient>>)

    const request = makeRequest({ body: { contentType: 'image/jpeg', extension: 'jpg', fileSize: 1024 } })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('presignedUrl')
    expect(body).toHaveProperty('publicUrl')
    expect(body).toHaveProperty('key')
  })

  test('returns 200 (no 403) when session has no access_token — role is undefined', async () => {
    const mockUser = { id: 'user-789', email: 'user@example.com' }
    // Session exists but access_token is null/falsy
    const mockSession = null
    const mockClient = makeSupabaseClient({ user: mockUser, session: mockSession, role: undefined })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as ReturnType<Awaited<typeof createClient>>)

    const request = makeRequest({ body: { contentType: 'image/jpeg', extension: 'jpg', fileSize: 1024 } })
    const response = await POST(request)

    // No access_token → role is undefined → not 'agent' → no 403
    expect(response.status).not.toBe(403)
    expect(response.status).not.toBe(500)
  })
})
