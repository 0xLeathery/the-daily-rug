import { describe, test, expect } from 'vitest'
import {
  uuidToBytes,
  bytesToUUID,
  BURN_ELIGIBILITY_THRESHOLD,
  TOKEN_DECIMALS,
  PROGRAM_ID,
} from '@/lib/burn/utils'

describe('burn utilities', () => {
  const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000'

  describe('uuidToBytes', () => {
    test('returns a 16-element number array', () => {
      const bytes = uuidToBytes(TEST_UUID)
      expect(bytes).toHaveLength(16)
    })

    test('each element is a number between 0 and 255', () => {
      const bytes = uuidToBytes(TEST_UUID)
      for (const b of bytes) {
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThanOrEqual(255)
      }
    })

    test('returns an Array (not a Buffer)', () => {
      const bytes = uuidToBytes(TEST_UUID)
      expect(Array.isArray(bytes)).toBe(true)
    })
  })

  describe('bytesToUUID', () => {
    test('formats output with correct hyphenation (8-4-4-4-12)', () => {
      const bytes = uuidToBytes(TEST_UUID)
      const result = bytesToUUID(bytes)
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })

  describe('round-trip identity', () => {
    test('bytesToUUID(uuidToBytes(uuid)) === uuid for known UUID', () => {
      const bytes = uuidToBytes(TEST_UUID)
      const result = bytesToUUID(bytes)
      expect(result).toBe(TEST_UUID)
    })

    test('round-trips correctly for a random-style UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      expect(bytesToUUID(uuidToBytes(uuid))).toBe(uuid)
    })

    test('produces exactly 16 bytes', () => {
      const bytes = uuidToBytes(TEST_UUID)
      expect(bytes.length).toBe(16)
    })
  })

  describe('edge cases', () => {
    describe('uuidToBytes invalid inputs', () => {
      test('throws on non-UUID string', () => {
        expect(() => uuidToBytes('not-a-uuid')).toThrow(/16 bytes|invalid/i)
      })

      test('throws on short string', () => {
        expect(() => uuidToBytes('short')).toThrow()
      })

      test('throws on empty string', () => {
        expect(() => uuidToBytes('')).toThrow()
      })
    })

    describe('bytesToUUID invalid inputs', () => {
      test('throws on empty array', () => {
        expect(() => bytesToUUID([])).toThrow(/16 bytes/i)
      })

      test('throws on array shorter than 16 bytes', () => {
        expect(() => bytesToUUID([1, 2, 3])).toThrow(/16 bytes/i)
      })

      test('throws on array longer than 16 bytes', () => {
        expect(() => bytesToUUID(new Array(32).fill(0))).toThrow(/16 bytes/i)
      })
    })
  })

  describe('constants', () => {
    test('BURN_ELIGIBILITY_THRESHOLD equals 100_000', () => {
      expect(BURN_ELIGIBILITY_THRESHOLD).toBe(100_000)
    })

    test('TOKEN_DECIMALS equals 6', () => {
      expect(TOKEN_DECIMALS).toBe(6)
    })

    test('PROGRAM_ID equals the canonical devnet address', () => {
      expect(PROGRAM_ID).toBe('DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW')
    })
  })
})
