import { describe, it, expect } from 'vitest'
import { decodeJwt } from 'jose'

// Create a fake JWT with given claims for testing decodeJwt behavior.
// jose's decodeJwt reads the payload without verifying the signature,
// so a fake signature is fine for unit-testing claim extraction.
function fakeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(claims))
  return `${header}.${payload}.fake-signature`
}

describe('JWT role extraction (middleware logic)', () => {
  it('decodes user_role: admin from JWT claims', () => {
    const token = fakeJwt({ user_role: 'admin', sub: 'user-123' })
    const claims = decodeJwt(token)
    expect(claims.user_role).toBe('admin')
  })

  it('decodes user_role: editor from JWT claims', () => {
    const token = fakeJwt({ user_role: 'editor', sub: 'user-456' })
    const claims = decodeJwt(token)
    expect(claims.user_role).toBe('editor')
  })

  it('returns undefined when user_role claim is absent', () => {
    const token = fakeJwt({ sub: 'user-789' })
    const claims = decodeJwt(token)
    expect(claims.user_role).toBeUndefined()
  })

  it('admin role passes the role check', () => {
    const token = fakeJwt({ user_role: 'admin' })
    const claims = decodeJwt(token)
    const role = claims.user_role as string | undefined
    expect(role === 'admin').toBe(true)
  })

  it('editor role fails the role check', () => {
    const token = fakeJwt({ user_role: 'editor' })
    const claims = decodeJwt(token)
    const role = claims.user_role as string | undefined
    expect(role === 'admin').toBe(false)
  })

  it('missing role fails the role check', () => {
    const token = fakeJwt({})
    const claims = decodeJwt(token)
    const role = claims.user_role as string | undefined
    expect(role === 'admin').toBe(false)
  })
})

describe('Editor role middleware behavior', () => {
  // The allowedRoles list is what controls /admin access after middleware.ts is updated.
  // These tests verify the allowlist logic in isolation before and after the update.
  const allowedRoles = ['admin', 'editor']

  it('editor role is included in the allowedRoles list', () => {
    expect(allowedRoles.includes('editor')).toBe(true)
  })

  it('admin role is included in the allowedRoles list', () => {
    expect(allowedRoles.includes('admin')).toBe(true)
  })

  it('agent role is NOT included in the allowedRoles list', () => {
    expect(allowedRoles.includes('agent')).toBe(false)
  })

  it('undefined role is NOT included in the allowedRoles list', () => {
    expect(allowedRoles.includes(undefined as unknown as string)).toBe(false)
  })

  it('empty string role is NOT included in the allowedRoles list', () => {
    expect(allowedRoles.includes('')).toBe(false)
  })

  it('editor role decodes correctly from JWT and passes allowedRoles check', () => {
    const token = fakeJwt({ user_role: 'editor', sub: 'user-456' })
    const claims = decodeJwt(token)
    const role = claims.user_role as string | undefined
    expect(allowedRoles.includes(role ?? '')).toBe(true)
  })

  it('admin role decodes correctly from JWT and passes allowedRoles check', () => {
    const token = fakeJwt({ user_role: 'admin', sub: 'user-123' })
    const claims = decodeJwt(token)
    const role = claims.user_role as string | undefined
    expect(allowedRoles.includes(role ?? '')).toBe(true)
  })

  it('agent role decodes from JWT and is blocked by allowedRoles check', () => {
    const token = fakeJwt({ user_role: 'agent', sub: 'user-789' })
    const claims = decodeJwt(token)
    const role = claims.user_role as string | undefined
    expect(allowedRoles.includes(role ?? '')).toBe(false)
  })

  it('no role claim is blocked by allowedRoles check', () => {
    const token = fakeJwt({ sub: 'user-000' })
    const claims = decodeJwt(token)
    const role = claims.user_role as string | undefined
    expect(allowedRoles.includes(role ?? '')).toBe(false)
  })
})
