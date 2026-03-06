---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: "Completed 10-01-PLAN.md (loading skeleton + is_agent avatar/badge: INT-03, INT-05 closed)"
last_updated: "2026-03-06T05:35:02.705Z"
last_activity: "2026-03-05 — Phase 1 data layer complete: Supabase + R2 provisioned and verified end-to-end"
progress:
  total_phases: 10
  completed_phases: 10
  total_plans: 33
  completed_plans: 33
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** The burn-to-redact mechanic must work flawlessly — every token burnt to silence a story is a deflationary event that feeds the narrative and the chart.
**Current focus:** Phase 1 - Data Layer

## Current Position

Phase: 1 of 7 (Data Layer) — COMPLETE
Plan: 5 of 5 in current phase
Status: Phase 1 complete, ready for Phase 2 (Anchor Program)
Last activity: 2026-03-05 — Phase 1 data layer complete: Supabase + R2 provisioned and verified end-to-end

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0h

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-data-layer P01 | 6 | 2 tasks | 17 files |
| Phase 01-data-layer P02 | 3 | 2 tasks | 5 files |
| Phase 01-data-layer P03 | 2 | 2 tasks | 5 files |
| Phase 01-data-layer P04 | 4 | 2 tasks | 4 files |
| Phase 01-data-layer P05 | 60 | 3 tasks | 1 files |
| Phase 02-anchor-program P01 | 95 | 2 tasks | 18 files |
| Phase 02-anchor-program P02 | 10 | 2 tasks | 1 files |
| Phase 03-app-shell-auth-wallet P01 | 6 | 2 tasks | 10 files |
| Phase 03-app-shell-auth-wallet P02 | 15 | 2 tasks | 8 files |
| Phase 03-app-shell-auth-wallet P03 | 2 | 2 tasks | 3 files |
| Phase 04-admin-content-pipeline P02 | 1 | 1 tasks | 1 files |
| Phase 04-admin-content-pipeline P01 | 3 | 2 tasks | 5 files |
| Phase 04-admin-content-pipeline P03 | 4 | 3 tasks | 8 files |
| Phase 04-admin-content-pipeline P03 | 35 | 4 tasks | 8 files |
| Phase 04-admin-content-pipeline P04 | 3 | 2 tasks | 5 files |
| Phase 05-public-site-token-gate P01 | 3 | 2 tasks | 8 files |
| Phase 05-public-site-token-gate P03 | 8 | 2 tasks | 4 files |
| Phase 05-public-site-token-gate P02 | 19 | 2 tasks | 6 files |
| Phase 05-public-site-token-gate P04 | 2 | 2 tasks | 5 files |
| Phase 06-burn-mechanic P01 | 4 | 2 tasks | 13 files |
| Phase 06-burn-mechanic P02 | 2 | 1 tasks | 2 files |
| Phase 06-burn-mechanic P03 | 4 | 2 tasks | 7 files |
| Phase 06-burn-mechanic P04 | 2 | 2 tasks | 8 files |
| Phase 06-burn-mechanic P05 | 8 | 1 tasks | 1 files |
| Phase 06-burn-mechanic P07 | 4 | 1 tasks | 2 files |
| Phase 06-burn-mechanic P06 | 4 | 1 tasks | 2 files |
| Phase 07-polish-launch-prep P01 | 3 | 2 tasks | 6 files |
| Phase 07-polish-launch-prep P02 | 5 | 2 tasks | 6 files |
| Phase 07-polish-launch-prep P03 | 5 | 1 tasks | 1 files |
| Phase 08-harden-burn-pipeline P01 | 1 | 2 tasks | 3 files |
| Phase 08-harden-burn-pipeline P02 | 5 | 3 tasks | 1 files |
| Phase 09-security-code-integrity-fixes P01 | 3 | 3 tasks | 4 files |
| Phase 09-security-code-integrity-fixes P02 | 7 | 1 tasks | 1 files |
| Phase 10-ui-completions P01 | 12 | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Anchor program for burns (not raw SPL transfer): enables on-chain Article ID tagging and clean `ArticleKilled` event for Helius
- Helius webhooks over polling: real-time redaction, no lag
- Token gate at 1M tokens (6-decimal Pump.fun token = 1_000_000 * 10^6 raw units)
- Two separate Supabase clients required from Phase 1: service role key must never reach client bundle
- [Phase 01-data-layer]: Tailwind v4 installed (not v3) — CSS-only config via @theme in globals.css, no tailwind.config.ts
- [Phase 01-data-layer]: Package name is tmzolana (lowercase) — npm prohibits capital letters in package names
- [Phase 01-data-layer]: Playwright fixme stubs require async callbacks: test.fixme('title', async () => {}) for CLI discoverability
- [Phase 01-data-layer]: get_my_role() SECURITY DEFINER STABLE reads user_role from JWT — eliminates DB round-trip on every RLS policy evaluation
- [Phase 01-data-layer]: custom_access_token_hook bakes role into JWT at token issuance — role always in token, RLS never queries profiles table
- [Phase 01-data-layer]: api_keys use bcrypt via pgcrypto crypt() with bf/12 salt — raw tokens discarded, only hashes stored
- [Phase 01-data-layer]: Dual Supabase client architecture: server.ts with server-only import guard + admin client (service role), browser.ts with NEXT_PUBLIC_ vars only
- [Phase 01-data-layer]: Middleware creates inline createServerClient (not imported from lib/supabase/server.ts) — Edge Runtime cannot use cookies() from next/headers
- [Phase 01-data-layer]: Admin layout checks user existence only; role-based enforcement (JWT claims) deferred to Phase 3 per CONTEXT.md
- [Phase 01-data-layer]: Database Row types must use `type` not `interface` in TS5 strict — interfaces don't satisfy Record<string,unknown> for Supabase GenericTable
- [Phase 01-data-layer]: Slug uniqueness conflicts resolved with timestamp suffix: ${slug}-${Date.now()}
- [Phase 01-data-layer]: Admin dashboard moved into (authenticated) route group to fix middleware redirect loop on /admin
- [Phase 01-data-layer]: CORS AllowedHeaders set to [Content-Type] not wildcard — R2 returns 403 with wildcard headers
- [Phase 02-anchor-program]: emit!() confirmed for Helius webhooks (writes Program data: line to logMessages); emit_cpi!() embeds in inner instructions and cannot be subscribed to in real-time
- [Phase 02-anchor-program]: Solana 3.1.9 / platform-tools v1.52 required (3.0.15 platform-tools v1.51 incompatible with blake3 1.8.x dependency chain due to constant_time_eq 0.4.2 needing Rust 1.85+)
- [Phase 02-anchor-program]: Plain init (not init_if_needed) for burn PDA: AccountAlreadyInitialized error IS the double-burn prevention
- [Phase 02-anchor-program]: emit!() confirmed working on devnet — ArticleKilled event visible in logMessages as Program data: line; emit_cpi!() would be invisible to Helius real-time webhooks
- [Phase 02-anchor-program]: Devnet program ID DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW is canonical address for Phase 6 BurnButton and Helius webhook integration
- [Phase 03-app-shell-auth-wallet]: Oswald font weight 700 used for display font (900 not available in next/font Oswald variant)
- [Phase 03-app-shell-auth-wallet]: wallets=[] with Wallet Standard auto-detection — no explicit PhantomWalletAdapter/SolflareWalletAdapter needed
- [Phase 03-app-shell-auth-wallet]: useTokenBalance returns null when NEXT_PUBLIC_TOKEN_MINT not set — safe pre-launch fallback
- [Phase 03-app-shell-auth-wallet]: anchor/ excluded from Next.js tsconfig.json — Anchor test files use Mocha globals incompatible with Next.js tsc check
- [Phase 03-app-shell-auth-wallet]: jose installed as explicit dependency for decodeJwt in Edge Runtime middleware
- [Phase 03-app-shell-auth-wallet]: NextResponse.rewrite() (not redirect) to /not-found for non-admin /admin access — URL unchanged, hides admin route structure
- [Phase 03-app-shell-auth-wallet]: user_role read as TOP-LEVEL JWT claim (not app_metadata.user_role) per Phase 1 custom_access_token_hook; getSession() only for claim reading after getUser() validates auth
- [Phase 03-app-shell-auth-wallet]: formatBalance always uses toFixed(1) for K/M — no conditional whole-number suppression; test contract requires '850.0K' and '1.0M'
- [Phase 03-app-shell-auth-wallet]: truncateAddress guard changed from <= 8 to < 8 — exactly-8-char addresses must be truncated per test contract
- [Phase 03-app-shell-auth-wallet]: Tailwind brand token classes (bg-brand-black, text-brand-yellow, text-brand-red) are the canonical pattern for brand colors — no inline style={{}} hex literals
- [Phase 04-admin-content-pipeline]: No production code changes needed for AGENT-01/AGENT-02 — Phase 1 ingest route already satisfies requirements; plan was verification-only
- [Phase 04-admin-content-pipeline]: server-only bypass pattern: vi.mock('server-only', () => ({})) placed before route import — established for all future API route unit tests
- [Phase 04-admin-content-pipeline]: vi.mock('server-only') pattern unlocks server action unit testing in Vitest without Next.js runtime
- [Phase 04-admin-content-pipeline]: allowedRoles array in middleware.ts is the canonical pattern for role gating — admin and editor allowed through /admin routes
- [Phase 04-admin-content-pipeline]: Editor role scoped to own articles via .eq('author_id', user.id) at DB query level in saveArticle
- [Phase 04-admin-content-pipeline]: RichTextEditor uses forwardRef to expose setContent via RichTextEditorRef — required by Plan 04 AIDraftPanel for programmatic content injection
- [Phase 04-admin-content-pipeline]: Fact-check gate requires all three: factChecked checkbox, burnPrice > 0, and article already saved (has id) before Publish button enables
- [Phase 04-admin-content-pipeline]: RichTextEditor uses forwardRef to expose setContent via RichTextEditorRef — required by Plan 04 AIDraftPanel for programmatic content injection
- [Phase 04-admin-content-pipeline]: Fact-check gate requires all three: factChecked checkbox, burnPrice > 0, and article already saved (has id) before Publish button enables
- [Phase 04-admin-content-pipeline]: Anthropic mock uses module-level mockAnthropicCreate vi.fn() assigned as class property — required for Vitest module hoisting
- [Phase 04-admin-content-pipeline]: AIDraftPanel shown for admin role only (not editor) — editors do not need AI drafting
- [Phase 04-admin-content-pipeline]: hasContent() strips empty Tiptap <p></p> tags before overwrite check — avoids false-positive confirms
- [Phase 05-public-site-token-gate]: lib/articles/gate.ts has no server-only import — gate logic is pure and client-safe, needed by both RSC and client hooks
- [Phase 05-public-site-token-gate]: Supabase join uses profiles!author_id(...) FK hint notation to disambiguate the named foreign key relationship
- [Phase 05-public-site-token-gate]: INITIAL_REAL_TOKEN_RESERVES = 793_100_000_000_000n community-sourced from pump.fun layout — validate against live account data before Phase 5 ships
- [Phase 05-public-site-token-gate]: Children always rendered in DOM (blurred) — v1 security model: content is time-delayed public (2 hours), not a permanent secret
- [Phase 05-public-site-token-gate]: Lazy useState initializer for AlphaGateCountdown timeLeft: computed once at mount prevents re-lock-on-rerender pitfall
- [Phase 05-public-site-token-gate]: tsconfig.json target bumped to ES2020 — required for BigInt literal support in fetchProgress.ts; safe for Next.js 15 + Solana web3.js runtime
- [Phase 05-public-site-token-gate]: BondingCurveBanner uses cancelled flag pattern (not AbortController) for useEffect async cleanup — connection.getAccountInfo() has no AbortSignal support
- [Phase 05-public-site-token-gate]: DisclaimerModal starts hidden (show=false), useEffect checks localStorage post-hydration — no SSR flash on return visits
- [Phase 05-public-site-token-gate]: SiteHeader Buy CTA conditionally renders only when both TOKEN_MINT and TOKEN_TICKER env vars are set — pre-launch safe fallback
- [Phase 05-public-site-token-gate]: OG metadataBase uses NEXT_PUBLIC_SITE_URL if set, undefined otherwise — no hardcoded URLs in root layout
- [Phase 06-burn-mechanic]: serverExternalPackages: ['@coral-xyz/anchor'] in next.config.ts — Anchor uses Buffer extensively, must not be bundled into edge contexts
- [Phase 06-burn-mechanic]: burned_amount stored as BIGINT (raw u64 token amount including 6 decimals) — matches on-chain representation, avoids floating-point precision loss
- [Phase 06-burn-mechanic]: vi.hoisted() required for mock variables in vi.mock() class constructors — Vitest hoists mock factories before const declarations
- [Phase 06-burn-mechanic]: Class constructors in vi.mock() factories (not arrow functions) — V8 requires proper constructors for new-instantiated classes in Vitest
- [Phase 06-burn-mechanic]: BurnButton eligibility tests written as pure function extraction (node environment, no jsdom) — eligibility logic is pure and testable without React rendering
- [Phase 06-burn-mechanic]: ArticleLiveWrapper renders inline tombstone on animation completion rather than page navigation — preserves burn context for same-session viewers
- [Phase 06-burn-mechanic]: BurnConfig uses init (not init_if_needed) — AccountAlreadyInitialized error IS the re-init protection
- [Phase 06-burn-mechanic]: Mint validation done as account constraint (not handler require!()) — fails at deserialization before any state mutation
- [Phase 06-burn-mechanic]: BurnConfig seeds are [b"burn_config"] singleton PDA — one config per program deployment
- [Phase 06-burn-mechanic]: skipPreflight: true for adversarial tests — localnet blockhash timing issues with skipPreflight: false cause Blockhash not found simulation errors before constraint checks run
- [Phase 06-burn-mechanic]: Broad error OR-chain for adversarial assertions — Anchor error format varies between AnchorError, SendTransactionError, and simulation errors; primary invariant is didFail=true
- [Phase 06-burn-mechanic]: Test 11 zero-filled article_id designed to pass — confirms zero bytes are valid PDA seeds and program has no article_id whitelist/reject logic
- [Phase 06-burn-mechanic]: Length check after Buffer.from(hex,'hex') catches both non-hex strings (0 bytes) and wrong-length strings in one guard — uuidToBytes and bytesToUUID now throw on invalid input (GAP-UTIL-01, GAP-UTIL-02)
- [Phase 06-burn-mechanic]: Batch partial success returns 200: at least one tx succeeded means Helius should not retry entire batch
- [Phase 06-burn-mechanic]: Field validation uses falsy check (!killedEvent.data.X) to cover both null and undefined uniformly
- [Phase 07-polish-launch-prep]: pickVariant uses char-code sum mod count for SSR-safe determinism in TombstoneGraphic — no Math.random to prevent hydration mismatch
- [Phase 07-polish-launch-prep]: TombstoneGraphic is server+client compatible (no 'use client' directive) — pure JSX/SVG rendering with no hooks
- [Phase 07-polish-launch-prep]: flex-col sm:flex-row pattern: canonical responsive stacking for header + dialog buttons — logo+tagline on top, Buy CTA + wallet on bottom at 375px; collapses to single row at sm+ (640px)
- [Phase 07-polish-launch-prep]: app/error.tsx (not global-error.tsx): renders within root layout, SiteHeader and SiteFooter remain visible on errors; 'use client' required by Next.js App Router convention
- [Phase 07-polish-launch-prep]: SkeletonCard shimmer uses inline style referencing @keyframes shimmer from globals.css — consistent with Phase 6 burn-glitch/burn-reveal pattern, avoids Tailwind arbitrary animation class syntax
- [Phase 07-polish-launch-prep]: Seed inserts into auth.users (trigger fires), then INSERT ON CONFLICT DO UPDATE patches profile to role=agent, is_agent=true
- [Phase 07-polish-launch-prep]: burned_amount in seed uses raw u64 BIGINT (human tokens * 10^6) — matches Phase 6 on-chain representation and Phase 6 decision
- [Phase 08-harden-burn-pipeline]: Null-signature guard placed BEFORE eventParser.parseLogs() — prevents NOT NULL violation on processed_webhooks.webhook_id and skips all downstream processing
- [Phase 08-harden-burn-pipeline]: Root idl/ is a consistency artifact only — frontend and webhook both import from anchor/target/idl/ directly; syncing prevents developer confusion
- [Phase 08-harden-burn-pipeline]: BurnConfig init deferred until real token launch: program is live on devnet but PDA uninitialized — plain init constraint prevents changing pinned mint without redeploy
- [Phase 08-harden-burn-pipeline]: init-config.ts committed to repo with TOKEN_MINT env var override and idempotency guard — run once after real Pump.fun token mint deploys
- [Phase 09-security-code-integrity-fixes]: user_role read from decodeJwt(session.access_token) in presigned-url route — app_metadata never holds the claim because custom_access_token_hook bakes it as a top-level JWT claim
- [Phase 09-security-code-integrity-fixes]: anchor/target/idl/burn_for_article.json synced to Phase 8 hardened IDL — must match root idl/ after any hardening pass; frontend and webhook both import from anchor/target/idl/
- [Phase 09-security-code-integrity-fixes]: PROGRAM_ID string constant exported from lib/burn/utils.ts, wrapped in new PublicKey() at call site in helius/route.ts — no local duplicate declaration
- [Phase 09-security-code-integrity-fixes]: amount mock uses toNumber: () => 500000000 (not toString) — matches route's .toNumber() call at helius/route.ts line 81
- [Phase 09-security-code-integrity-fixes]: burned_amount assertion changed from string '500000000' to number 500000000 — .toNumber() returns a JS number, not a string
- [Phase 10-ui-completions]: app/loading.tsx is a Server Component (no use client) — renders 6 SkeletonCards in responsive grid matching homepage breakpoints
- [Phase 10-ui-completions]: Badge logic tested as pure function in node env — avoids jsdom complexity while validating is_agent ternary (AI/HUMAN)
- [Phase 10-ui-completions]: *.supabase.co wildcard added to next.config.ts remotePatterns — covers all Supabase storage subdomains for avatar image safety

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: Anchor `emit!()` vs `emit_cpi!()` distinction for Helius log visibility needs devnet verification before Phase 6 webhook handler is built
- Phase 5: Pump.fun bonding curve byte offsets are community-sourced — validate against live account data before shipping
- Phase 6: Helius webhook payload shape for Anchor program invocations needs devnet end-to-end testing

## Session Continuity

Last session: 2026-03-06T05:35:02.702Z
Stopped at: Completed 10-01-PLAN.md (loading skeleton + is_agent avatar/badge: INT-03, INT-05 closed)
Resume file: None
