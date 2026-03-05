import { describe, test, expect, vi, beforeEach } from 'vitest'

// Must mock server-only before importing the page module
vi.mock('server-only', () => ({}))

// Mock the articles query module
vi.mock('@/lib/supabase/articles', () => ({
  getArticleBySlug: vi.fn(),
}))

import { getArticleBySlug } from '@/lib/supabase/articles'
import { generateMetadata } from '@/app/articles/[slug]/page'
import type { ArticleWithAuthor } from '@/lib/supabase/articles'

const mockGetArticleBySlug = vi.mocked(getArticleBySlug)

function makeParams(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) }
}

function makeArticle(overrides: Partial<ArticleWithAuthor> = {}): ArticleWithAuthor {
  return {
    id: 'art-1',
    title: 'Whale Silences Alpha',
    slug: 'whale-silences-alpha',
    body: '<p>Full article body.</p>',
    status: 'published',
    burn_price: null,
    published_at: '2026-03-01T12:00:00Z',
    alpha_gate_until: null,
    cover_image_url: null,
    author_id: 'user-1',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    profiles: { display_name: 'SolanaScoopBot', avatar_url: null },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateMetadata (article detail page)', () => {
  test('generateMetadata returns article title in og:title for valid slug', async () => {
    const article = makeArticle({ title: 'Whale Silences Alpha' })
    mockGetArticleBySlug.mockResolvedValue(article)

    const metadata = await generateMetadata(makeParams('whale-silences-alpha'))

    expect(metadata.title).toBe('Whale Silences Alpha | The Daily Rug')
    // openGraph.title should contain the article title
    const og = metadata.openGraph as Record<string, unknown>
    expect(og?.title).toBe('Whale Silences Alpha')
  })

  test('generateMetadata returns default title for missing article', async () => {
    mockGetArticleBySlug.mockResolvedValue(null)

    const metadata = await generateMetadata(makeParams('nonexistent-slug'))

    expect(metadata.title).toBe('Article Not Found | The Daily Rug')
  })

  test('generateMetadata includes cover_image_url in og:image when present', async () => {
    const article = makeArticle({
      cover_image_url: 'https://cdn.example.com/cover.jpg',
    })
    mockGetArticleBySlug.mockResolvedValue(article)

    const metadata = await generateMetadata(makeParams('whale-silences-alpha'))

    const og = metadata.openGraph as Record<string, unknown>
    const images = og?.images as Array<{ url: string }>
    expect(images).toHaveLength(1)
    expect(images[0].url).toBe('https://cdn.example.com/cover.jpg')
  })

  test('generateMetadata omits og:image when no cover_image_url', async () => {
    const article = makeArticle({ cover_image_url: null })
    mockGetArticleBySlug.mockResolvedValue(article)

    const metadata = await generateMetadata(makeParams('whale-silences-alpha'))

    const og = metadata.openGraph as Record<string, unknown>
    const images = og?.images as unknown[]
    expect(images).toHaveLength(0)
  })
})
