import { test } from '@playwright/test'

// Wave 0 stubs — requires a running dev server and wallet browser extension.
// These will be implemented in Phase 5 (token gate) and Phase 6 (burn mechanic).

test.fixme('wallet connect button renders in header', async () => {
  // TODO: verify wallet connect button is visible in the site header
})

test.fixme('wallet modal opens on button click', async () => {
  // TODO: click the wallet connect button and verify the wallet picker modal appears
})

test.fixme('connected wallet shows truncated address', async () => {
  // TODO: connect a test wallet and verify the header shows a truncated address (e.g., 7xKp...3nFd)
})

test.fixme('token balance displays when wallet connected', async () => {
  // TODO: connect a test wallet and verify the token balance is displayed next to the address
})
