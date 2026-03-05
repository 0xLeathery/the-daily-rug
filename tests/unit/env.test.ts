import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('.env.example completeness', () => {
  test('contains all required environment variables', () => {
    const envExample = readFileSync(resolve(__dirname, '../../.env.example'), 'utf-8')
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
      'NEXT_PUBLIC_SITE_URL',
    ]
    for (const v of requiredVars) {
      expect(envExample).toContain(v)
    }
  })

  test('service role key is NOT prefixed with NEXT_PUBLIC_', () => {
    const envExample = readFileSync(resolve(__dirname, '../../.env.example'), 'utf-8')
    expect(envExample).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
    expect(envExample).not.toContain('NEXT_PUBLIC_R2_')
  })
})
