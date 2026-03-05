import { describe, test } from 'vitest'

describe('Burn Eligibility', () => {
  test.todo('not connected: button visible but disabled')
  test.todo('connected, balance < 100K: disabled with threshold message')
  test.todo('connected, balance >= 100K but < burn_price: deficit message with buy link')
  test.todo('connected, balance >= burn_price: enabled')
  test.todo('already redacted: shows tombstone, no burn button')
})
