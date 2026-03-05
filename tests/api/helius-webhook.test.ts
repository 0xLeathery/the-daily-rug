import { describe, test, expect, vi, beforeEach } from 'vitest'

// Bypass server-only import guard — must be before any route imports
vi.mock('server-only', () => ({}))

// Use vi.hoisted so mockParseLogs is available inside the hoisted vi.mock factory
const { mockParseLogs } = vi.hoisted(() => ({
  mockParseLogs: vi.fn(),
}))

// Mock @coral-xyz/anchor EventParser + BorshCoder
// Must use class/function constructors (not arrow functions) for `new` compatibility
vi.mock('@coral-xyz/anchor', () => ({
  EventParser: class EventParser {
    parseLogs: ReturnType<typeof vi.fn>
    constructor() { this.parseLogs = mockParseLogs }
  },
  BorshCoder: class BorshCoder {
    constructor() {}
  },
}))

// Mock @solana/web3.js PublicKey — only used for PROGRAM_ID constant at module level
// Must use a class or function constructor (not arrow function) per Vitest mock requirements
vi.mock('@solana/web3.js', () => ({
  PublicKey: class PublicKey {
    private addr: string
    constructor(addr: string) { this.addr = addr }
    toBase58() { return this.addr }
  },
}))

// Mock the IDL import
vi.mock('@/anchor/target/idl/burn_for_article.json', () => ({
  default: { address: 'DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW', events: [], types: [] },
}))

// Mock Supabase admin client
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/webhooks/helius/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Request-like object for the webhook route */
function makeRequest({
  authorization,
  body,
}: {
  authorization?: string
  body?: unknown
}) {
  const headers = new Map<string, string>()
  if (authorization !== undefined) {
    headers.set('authorization', authorization)
  }

  return {
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    json: () => Promise.resolve(body ?? []),
  } as unknown as Request
}

/** A sample ArticleKilled event data object (matches IDL fields) */
function makeArticleKilledEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: 'ArticleKilled',
    data: {
      article_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      burner: { toString: () => 'BurnerWallet111111111111111111111111111111111' },
      amount: { toString: () => '500000000' }, // BN-like
      timestamp: { toNumber: () => 1740000000 }, // BN-like
      mint: { toString: () => 'MintAddress111111111111111111111111111111111' },
      ...overrides,
    },
  }
}

/** A sample Helius transaction object */
function makeTx(signature = 'sig-abc-123', overrides: Record<string, unknown> = {}) {
  return {
    transaction: { signatures: [signature] },
    meta: { logMessages: ['Program log: some log', 'Program data: base64encodeddata'] },
    ...overrides,
  }
}

/**
 * Build a chainable Supabase mock admin client.
 * fromBehaviors: map of table name → { insert?, update? } results
 */
function makeAdminClient(fromBehaviors: {
  processed_webhooks?: { insertError?: { code?: string; message?: string } | null }
  articles?: { updateError?: { message?: string } | null }
}) {
  const insertMock = vi.fn().mockResolvedValue({
    data: null,
    error: fromBehaviors.processed_webhooks?.insertError ?? null,
  })

  const eqMock = vi.fn().mockResolvedValue({
    data: null,
    error: fromBehaviors.articles?.updateError ?? null,
  })

  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

  const fromMock = vi.fn((table: string) => {
    if (table === 'processed_webhooks') {
      return { insert: insertMock }
    }
    if (table === 'articles') {
      return { update: updateMock }
    }
    return {}
  })

  return {
    from: fromMock,
    _mocks: { insertMock, updateMock, eqMock, fromMock },
  }
}

/**
 * Build a Supabase admin client mock that returns different results per tx call.
 * insertResults: array of error values for successive insert calls
 * updateResults: array of error values for successive update calls
 */
function makeMultiTxAdminClient({
  insertResults,
  updateResults,
}: {
  insertResults: Array<{ code?: string; message?: string } | null>
  updateResults: Array<{ message?: string } | null>
}) {
  let insertCallIdx = 0
  let updateCallIdx = 0

  const insertMock = vi.fn().mockImplementation(() => {
    const error = insertResults[insertCallIdx] ?? null
    insertCallIdx++
    return Promise.resolve({ data: null, error })
  })

  const eqMocks: ReturnType<typeof vi.fn>[] = updateResults.map((updateError) =>
    vi.fn().mockResolvedValue({ data: null, error: updateError })
  )

  const updateMock = vi.fn().mockImplementation(() => {
    const idx = updateCallIdx
    updateCallIdx++
    return { eq: eqMocks[idx] ?? eqMocks[eqMocks.length - 1] }
  })

  const fromMock = vi.fn((table: string) => {
    if (table === 'processed_webhooks') {
      return { insert: insertMock }
    }
    if (table === 'articles') {
      return { update: updateMock }
    }
    return {}
  })

  return {
    from: fromMock,
    _mocks: { insertMock, updateMock, eqMocks, fromMock },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/helius', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: HELIUS_WEBHOOK_AUTH env var
    process.env.HELIUS_WEBHOOK_AUTH = 'test-secret-token'
  })

  test('returns 401 when Authorization header is missing', async () => {
    const request = makeRequest({ authorization: undefined, body: [] })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  test('returns 401 when Authorization header is wrong', async () => {
    const request = makeRequest({ authorization: 'wrong-token', body: [] })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  test('parses ArticleKilled event from logMessages and updates article to redacted', async () => {
    const killedEvent = makeArticleKilledEvent()
    // mockParseLogs returns a generator/iterable of events
    mockParseLogs.mockReturnValue([killedEvent])

    const mockClient = makeAdminClient({
      processed_webhooks: { insertError: null },
      articles: { updateError: null },
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const tx = makeTx('sig-happy-path')
    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [tx],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // processed_webhooks insert called with correct webhook_id
    expect(mockClient._mocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ webhook_id: 'sig-happy-path' })
    )

    // articles update called with redacted status and burn details
    expect(mockClient._mocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'redacted',
        burned_by: 'BurnerWallet111111111111111111111111111111111',
        burn_tx: 'sig-happy-path',
      })
    )
  })

  test('records burn details (burned_by, burned_amount, burn_tx, burned_at)', async () => {
    const killedEvent = makeArticleKilledEvent()
    mockParseLogs.mockReturnValue([killedEvent])

    const mockClient = makeAdminClient({
      processed_webhooks: { insertError: null },
      articles: { updateError: null },
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-details-test')],
    })

    await POST(request)

    // Check all burn detail fields are present
    expect(mockClient._mocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        burned_by: 'BurnerWallet111111111111111111111111111111111',
        burned_amount: '500000000',
        burn_tx: 'sig-details-test',
        burned_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO timestamp
      })
    )
  })

  test('returns 200 for duplicate webhook_id (idempotency)', async () => {
    const killedEvent = makeArticleKilledEvent()
    mockParseLogs.mockReturnValue([killedEvent])

    // Simulate unique violation on insert
    const mockClient = makeAdminClient({
      processed_webhooks: { insertError: { code: '23505', message: 'duplicate key' } },
      articles: { updateError: null },
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-duplicate')],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // articles.update must NOT have been called (idempotency — no re-processing)
    expect(mockClient._mocks.updateMock).not.toHaveBeenCalled()
  })

  test('returns 500 when Supabase update fails (triggers Helius retry)', async () => {
    const killedEvent = makeArticleKilledEvent()
    mockParseLogs.mockReturnValue([killedEvent])

    const mockClient = makeAdminClient({
      processed_webhooks: { insertError: null },
      articles: { updateError: { message: 'connection timeout' } },
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-db-fail')],
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  test('handles array payload with multiple transactions', async () => {
    const killedEvent = makeArticleKilledEvent()
    // First tx has event, second tx has no event
    mockParseLogs
      .mockReturnValueOnce([killedEvent])
      .mockReturnValueOnce([])

    const mockClient = makeAdminClient({
      processed_webhooks: { insertError: null },
      articles: { updateError: null },
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-tx1'), makeTx('sig-tx2')],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Only one insert and one update — for the first tx
    expect(mockClient._mocks.insertMock).toHaveBeenCalledTimes(1)
    expect(mockClient._mocks.updateMock).toHaveBeenCalledTimes(1)
  })

  test('skips transactions without ArticleKilled event', async () => {
    // parseLogs returns empty — no ArticleKilled event
    mockParseLogs.mockReturnValue([])

    const mockClient = makeAdminClient({})
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-no-event')],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // No DB calls should have been made
    expect(mockClient._mocks.fromMock).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // GAP closure tests: batch processing and field validation
  // ---------------------------------------------------------------------------

  test('batch: tx1 duplicate (23505) + tx2 new processes tx2 and returns 200', async () => {
    const killedEvent1 = makeArticleKilledEvent()
    const killedEvent2 = makeArticleKilledEvent({
      article_id: [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    })
    // parseLogs returns event for each tx
    mockParseLogs
      .mockReturnValueOnce([killedEvent1])
      .mockReturnValueOnce([killedEvent2])

    // tx1 insert gets 23505 duplicate, tx2 insert + update succeed
    const mockClient = makeMultiTxAdminClient({
      insertResults: [{ code: '23505', message: 'duplicate key' }, null],
      updateResults: [null],
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-batch-tx1'), makeTx('sig-batch-tx2')],
    })

    const response = await POST(request)
    // Must NOT early-return — tx2 should still be processed
    expect(response.status).toBe(200)

    // insert called twice (both txs attempted)
    expect(mockClient._mocks.insertMock).toHaveBeenCalledTimes(2)

    // update called once for tx2 (tx1 was duplicate, skipped)
    expect(mockClient._mocks.updateMock).toHaveBeenCalledTimes(1)
  })

  test('batch: tx1 success + tx2 update fail returns 200 (partial success)', async () => {
    const killedEvent1 = makeArticleKilledEvent()
    const killedEvent2 = makeArticleKilledEvent({
      article_id: [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    })
    mockParseLogs
      .mockReturnValueOnce([killedEvent1])
      .mockReturnValueOnce([killedEvent2])

    // Both inserts succeed; tx1 update succeeds, tx2 update fails
    const mockClient = makeMultiTxAdminClient({
      insertResults: [null, null],
      updateResults: [null, { message: 'connection timeout' }],
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-partial-tx1'), makeTx('sig-partial-tx2')],
    })

    const response = await POST(request)
    // tx1 was processed successfully — should return 200, not 500
    expect(response.status).toBe(200)
    expect(mockClient._mocks.updateMock).toHaveBeenCalledTimes(2)
  })

  test('batch: all txs update fail returns 500 to trigger Helius retry', async () => {
    const killedEvent1 = makeArticleKilledEvent()
    const killedEvent2 = makeArticleKilledEvent({
      article_id: [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    })
    mockParseLogs
      .mockReturnValueOnce([killedEvent1])
      .mockReturnValueOnce([killedEvent2])

    // Both inserts succeed but both updates fail
    const mockClient = makeMultiTxAdminClient({
      insertResults: [null, null],
      updateResults: [{ message: 'db error' }, { message: 'db error' }],
    })
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-all-fail-tx1'), makeTx('sig-all-fail-tx2')],
    })

    const response = await POST(request)
    // All txs failed — should return 500
    expect(response.status).toBe(500)
  })

  test('null timestamp: skips tx gracefully, returns 200, no update called', async () => {
    const killedEvent = makeArticleKilledEvent({ timestamp: null })
    mockParseLogs.mockReturnValue([killedEvent])

    const mockClient = makeAdminClient({})
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-null-timestamp')],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    // No update should have been called — tx was skipped
    expect(mockClient._mocks.updateMock).not.toHaveBeenCalled()
  })

  test('undefined amount: skips tx gracefully, returns 200, no update called', async () => {
    const killedEvent = makeArticleKilledEvent({ amount: undefined })
    mockParseLogs.mockReturnValue([killedEvent])

    const mockClient = makeAdminClient({})
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-undefined-amount')],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(mockClient._mocks.updateMock).not.toHaveBeenCalled()
  })

  test('null article_id: skips tx gracefully, returns 200, no update called', async () => {
    const killedEvent = makeArticleKilledEvent({ article_id: null })
    mockParseLogs.mockReturnValue([killedEvent])

    const mockClient = makeAdminClient({})
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [makeTx('sig-null-article-id')],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(mockClient._mocks.updateMock).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // INT-02: Null-signature guard tests
  // ---------------------------------------------------------------------------

  test('skips tx with no signature (empty signatures array), returns 200, no DB calls', async () => {
    // Include a valid ArticleKilled event to prove guard fires BEFORE event processing
    const killedEvent = makeArticleKilledEvent()
    mockParseLogs.mockReturnValue([killedEvent])

    const mockClient = makeAdminClient({})
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    // tx with empty signatures array — signatures?.[0] is undefined
    const txPayload = {
      transaction: { signatures: [] },
      meta: { logMessages: ['Program log: some log', 'Program data: base64encodeddata'] },
    }

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [txPayload],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    // No DB calls at all — guard fires before event parsing
    expect(mockClient._mocks.fromMock).not.toHaveBeenCalled()
  })

  test('skips tx with null transaction object, returns 200, no DB calls', async () => {
    const mockClient = makeAdminClient({})
    vi.mocked(createAdminClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAdminClient>
    )

    // Malformed tx with no transaction field at all
    const txPayload = {
      meta: { logMessages: ['Program data: somebase64'] },
    }

    const request = makeRequest({
      authorization: 'test-secret-token',
      body: [txPayload],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(mockClient._mocks.fromMock).not.toHaveBeenCalled()
  })
})
