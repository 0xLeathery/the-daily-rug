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
