import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// Mock server-only (prevents import error in test environment)
vi.mock('server-only', () => ({}))

// Mock next/cache (revalidatePath not available in test environment)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock @/lib/supabase/server — we will control what createClient returns
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Import after mocks are set up
import { createClient } from '@/lib/supabase/server'
import { saveArticle, publishArticle } from '@/app/admin/(authenticated)/actions'

// fakeJwt helper: produces a JWT-shaped token with given claims.
// decodeJwt reads payload without verifying signature, so fake signature is fine.
function fakeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(claims))
  return `${header}.${payload}.fake-signature`
}

// Helper to build a mock Supabase client with controlled auth responses
function makeMockClient({
  userId = 'user-123',
  userNull = false,
  userRole = 'admin',
  sessionNull = false,
  insertError = null as { message: string; code?: string } | null,
  insertData = { id: 'art-1', title: 'Test', slug: 'test', body: '', status: 'draft', burn_price: null, published_at: null, alpha_gate_until: null, cover_image_url: null, author_id: 'user-123', created_at: '', updated_at: '' },
  updateError = null as { message: string } | null,
  updateData = { id: 'art-1', title: 'Test', slug: 'test', body: '', status: 'draft', burn_price: null, published_at: null, alpha_gate_until: null, cover_image_url: null, author_id: 'user-123', created_at: '', updated_at: '' },
} = {}) {
  const accessToken = sessionNull ? null : fakeJwt({ user_role: userRole, sub: userId })

  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: insertError ? null : insertData, error: insertError }),
    }),
  })

  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: updateError ? null : updateData, error: updateError }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: updateError ? null : updateData, error: updateError }),
      }),
    }),
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userNull ? null : { id: userId } },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: sessionNull ? null : { access_token: accessToken },
        },
      }),
    },
    from: vi.fn((table: string) => {
      void table
      return {
        insert: mockInsert,
        update: mockUpdate,
      }
    }),
    _mocks: { mockInsert, mockUpdate },
  }
}

describe('saveArticle server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws Unauthorized when no user is authenticated', async () => {
    const mockClient = makeMockClient({ userNull: true })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(
      saveArticle(null, {
        title: 'Test Article',
        body: '<p>Test</p>',
        status: 'draft',
        burn_price: null,
        cover_image_url: null,
      })
    ).rejects.toThrow('Unauthorized')
  })

  it('throws when editor tries to set status to published', async () => {
    const mockClient = makeMockClient({ userRole: 'editor' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(
      saveArticle(null, {
        title: 'Test Article',
        body: '<p>Test</p>',
        status: 'published',
        burn_price: null,
        cover_image_url: null,
      })
    ).rejects.toThrow('Editors cannot set this status')
  })

  it('throws when editor tries to set status to redacted', async () => {
    const mockClient = makeMockClient({ userRole: 'editor' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(
      saveArticle(null, {
        title: 'Test Article',
        body: '<p>Test</p>',
        status: 'redacted',
        burn_price: null,
        cover_image_url: null,
      })
    ).rejects.toThrow('Editors cannot set this status')
  })

  it('succeeds when editor sets status to draft', async () => {
    const mockClient = makeMockClient({ userRole: 'editor' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(
      saveArticle(null, {
        title: 'Test Article',
        body: '<p>Test</p>',
        status: 'draft',
        burn_price: null,
        cover_image_url: null,
      })
    ).resolves.toBeDefined()
  })

  it('succeeds when editor sets status to pending_review', async () => {
    const mockClient = makeMockClient({ userRole: 'editor' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(
      saveArticle(null, {
        title: 'Test Article',
        body: '<p>Test</p>',
        status: 'pending_review',
        burn_price: null,
        cover_image_url: null,
      })
    ).resolves.toBeDefined()
  })

  it('admin can set status to published', async () => {
    const mockClient = makeMockClient({ userRole: 'admin' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(
      saveArticle(null, {
        title: 'Test Article',
        body: '<p>Test</p>',
        status: 'published',
        burn_price: null,
        cover_image_url: null,
      })
    ).resolves.toBeDefined()
  })
})

describe('publishArticle server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when burnPrice is 0', async () => {
    const mockClient = makeMockClient({ userRole: 'admin' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(publishArticle('art-1', 0)).rejects.toThrow(
      'Burn price must be greater than 0'
    )
  })

  it('throws when burnPrice is negative', async () => {
    const mockClient = makeMockClient({ userRole: 'admin' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(publishArticle('art-1', -10)).rejects.toThrow(
      'Burn price must be greater than 0'
    )
  })

  it('throws when non-admin (editor) tries to publish', async () => {
    const mockClient = makeMockClient({ userRole: 'editor' })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(publishArticle('art-1', 100)).rejects.toThrow(
      'Only admins can publish articles'
    )
  })

  it('throws Unauthorized when no user is authenticated', async () => {
    const mockClient = makeMockClient({ userNull: true })
    ;(createClient as Mock).mockResolvedValue(mockClient)

    await expect(publishArticle('art-1', 100)).rejects.toThrow('Unauthorized')
  })

  it('sets alpha_gate_until to published_at + 2 hours', async () => {
    const now = Date.now()
    const twoHoursMs = 2 * 60 * 60 * 1000

    // Mock Date.now to get predictable values
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    const publishedAt = new Date(now).toISOString()
    const expectedAlphaGateUntil = new Date(now + twoHoursMs).toISOString()

    // Mock update chain for publishArticle
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'art-1',
        status: 'published',
        burn_price: 500,
        published_at: publishedAt,
        alpha_gate_until: expectedAlphaGateUntil,
      },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: fakeJwt({ user_role: 'admin', sub: 'user-1' }) } },
        }),
      },
      from: mockFrom,
    }

    ;(createClient as Mock).mockResolvedValue(mockClient)

    await publishArticle('art-1', 500)

    // Verify update was called with correct alpha_gate_until
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
        burn_price: 500,
        published_at: publishedAt,
        alpha_gate_until: expectedAlphaGateUntil,
      })
    )

    dateSpy.mockRestore()
  })
})
