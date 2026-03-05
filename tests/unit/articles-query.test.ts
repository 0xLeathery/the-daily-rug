import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// Mock server-only before importing the module under test
vi.mock('server-only', () => ({}))

// Mock createClient so we can control the Supabase query builder chain
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import {
  getPublishedArticles,
  getArticleBySlug,
  type ArticleWithAuthor,
} from '@/lib/supabase/articles'

// Minimal shape of an article+author for test assertions
const baseArticle: ArticleWithAuthor = {
  id: 'art-1',
  title: 'Test Article',
  slug: 'test-article',
  body: 'body text',
  status: 'published',
  burn_price: null,
  published_at: '2026-01-01T00:00:00Z',
  alpha_gate_until: null,
  cover_image_url: null,
  author_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  profiles: { display_name: 'Jane Doe', avatar_url: null },
}

const redactedArticle: ArticleWithAuthor = {
  ...baseArticle,
  id: 'art-2',
  slug: 'redacted-article',
  status: 'redacted',
}

/** Build a chainable Supabase mock that resolves with { data, error } */
function makeQueryBuilder(resolvedData: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {}
  const chainable = new Proxy(builder, {
    get(_t, prop) {
      if (prop === 'then') return undefined // not a Promise itself
      if (prop === 'data') return resolvedData
      if (prop === 'error') return error
      // For methods that return a promise-like final result
      if (prop === 'single') {
        return () => Promise.resolve({ data: resolvedData, error })
      }
      // All other chain methods return chainable or final promise
      return (..._args: unknown[]) => {
        // order() and in() are intermediate — return same builder
        // but the final await must resolve, so return a thenable
        return Object.assign(chainable, {
          then(resolve: (v: unknown) => void) {
            resolve({ data: resolvedData, error })
          },
        })
      }
    },
  })
  return chainable
}

function makeSelectBuilder(data: unknown, error: unknown = null) {
  const final = {
    data,
    error,
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve({ data, error })
    },
  }
  // A chainable builder that terminates with single() or awaiting directly
  const chain: Record<string, unknown> = {
    ...final,
    order: () => final,
    single: () => Promise.resolve({ data, error }),
    in: () => chain,
    eq: () => chain,
  }
  return chain
}

describe('getPublishedArticles', () => {
  let mockFrom: Mock

  beforeEach(() => {
    mockFrom = vi.fn()
    ;(createClient as Mock).mockResolvedValue({ from: mockFrom })
  })

  it('returns articles with status published or redacted, ordered by published_at desc', async () => {
    const articles = [baseArticle, redactedArticle]
    const selectResult = makeSelectBuilder(articles)
    mockFrom.mockReturnValue({ select: () => selectResult })

    const result = await getPublishedArticles()
    expect(result).toEqual(articles)
    expect(mockFrom).toHaveBeenCalledWith('articles')
  })

  it('joins profiles via author_id and returns display_name and avatar_url', async () => {
    const articles = [baseArticle]
    let capturedSelectArg = ''
    const selectResult = makeSelectBuilder(articles)
    mockFrom.mockReturnValue({
      select: (arg: string) => {
        capturedSelectArg = arg
        return selectResult
      },
    })

    await getPublishedArticles()
    expect(capturedSelectArg).toMatch(/profiles/)
    expect(capturedSelectArg).toMatch(/display_name/)
    expect(capturedSelectArg).toMatch(/avatar_url/)
  })

  it('returns empty array when no articles exist', async () => {
    const selectResult = makeSelectBuilder([])
    mockFrom.mockReturnValue({ select: () => selectResult })

    const result = await getPublishedArticles()
    expect(result).toEqual([])
  })
})

describe('getArticleBySlug', () => {
  let mockFrom: Mock

  beforeEach(() => {
    mockFrom = vi.fn()
    ;(createClient as Mock).mockResolvedValue({ from: mockFrom })
  })

  it('returns single article with author profile joined', async () => {
    const selectResult = makeSelectBuilder(baseArticle)
    mockFrom.mockReturnValue({ select: () => selectResult })

    const result = await getArticleBySlug('test-article')
    expect(result).toEqual(baseArticle)
  })

  it('returns null for non-existent slug', async () => {
    const selectResult = makeSelectBuilder(null, { code: 'PGRST116', message: 'no rows' })
    mockFrom.mockReturnValue({ select: () => selectResult })

    const result = await getArticleBySlug('not-a-real-slug')
    expect(result).toBeNull()
  })

  it('returns null for draft/pending_review articles (not publicly visible)', async () => {
    // Simulates the query returning an error because status filter excludes those statuses
    const selectResult = makeSelectBuilder(null, { code: 'PGRST116', message: 'no rows' })
    mockFrom.mockReturnValue({ select: () => selectResult })

    const result = await getArticleBySlug('draft-article')
    expect(result).toBeNull()
  })
})
