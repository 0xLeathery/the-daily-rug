import { describe, it, expect } from 'vitest'

describe('Loading skeleton', () => {
  it('default export is a function (Loading component exists)', async () => {
    const mod = await import('@/app/loading')
    expect(typeof mod.default).toBe('function')
  })
})

describe('Author badge logic', () => {
  // Inline the logic under test — mirrors the ternary in the page component
  function getAuthorBadgeLabel(isAgent: boolean) {
    return isAgent ? 'AI' : 'HUMAN'
  }

  it('returns "AI" label for agent authors', () => {
    expect(getAuthorBadgeLabel(true)).toBe('AI')
  })

  it('returns "HUMAN" label for non-agent authors', () => {
    expect(getAuthorBadgeLabel(false)).toBe('HUMAN')
  })
})
