# Roadmap: TMZolana

## Overview

TMZolana is built in dependency order: the Supabase data layer and Anchor program are the twin roots that feed everything else. Once those foundations exist, the Next.js shell mounts the admin pipeline, which creates the content the public site needs. The public site then provides the article surface area for the burn mechanic — the core differentiator — to wire into. Polish closes the loop by hardening the Y2K aesthetic, error states, and launch-ready seed content.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Layer** - Supabase schema, RLS policies, R2 bucket, and security primitives that everything else builds on (completed 2026-03-05)
- [ ] **Phase 2: Anchor Program** - `burn_for_article` instruction with `ArticleKilled` event emission, deployed to devnet
- [ ] **Phase 3: App Shell + Auth + Wallet** - Next.js scaffold, WalletProvider, admin auth, and token balance hook
- [ ] **Phase 4: Admin Content Pipeline** - Admin CMS, Claude drafting, R2 image upload, and fact-check gate
- [x] **Phase 5: Public Site + Token Gate** - Article listing, detail pages, token-gated overlay, Alpha Gate timer, bonding curve progress (completed 2026-03-05)
- [x] **Phase 6: Burn Mechanic** - BurnButton, Helius webhook pipeline, on-chain redaction loop (completed 2026-03-05)
- [x] **Phase 7: Polish + Launch Prep** - Y2K aesthetic, tombstone graphic, error states, OG tags, mobile, seed articles (completed 2026-03-05)
- [ ] **Phase 8: Harden Burn-to-Redact Pipeline** - Deploy hardened Anchor program to devnet, sync IDL, initialize BurnConfig, fix webhook null-signature guard

## Phase Details

### Phase 1: Data Layer
**Goal**: The data foundation exists with correct security constraints and RBAC schema so no security posture needs to be retrofitted later
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01
**Success Criteria** (what must be TRUE):
  1. Supabase `articles` table exists with all required columns (id, title, body, status, burn_price, published_at, alpha_gate_until, cover_image_url, author_id) and role-based RLS policies
  2. `profiles` table exists linked to auth.users with role column (`admin`, `editor`, `agent`), display_name, avatar_url, is_agent flag — RLS policies enforce role-based access
  3. Admin Supabase auth is configured: an admin user can log in via email/password and admin-only routes are protected by session middleware
  4. Cloudflare R2 bucket exists with CORS policy allowing browser PUT uploads via presigned URLs
  5. Two separate Supabase client files exist (`lib/supabase/server.ts` with `import 'server-only'` and `lib/supabase/browser.ts`) with no service role key exposed to any client-side import path
  6. Environment configuration is complete: all required secrets are documented in `.env.example` and the app boots without errors
**Plans:** 5/5 plans complete

Plans:
- [ ] 01-01-PLAN.md — Next.js scaffold + test infrastructure (Vitest, Playwright, test stubs)
- [ ] 01-02-PLAN.md — Supabase schema migration + dual client architecture + TypeScript types
- [ ] 01-03-PLAN.md — Middleware + admin login + auth guard layout
- [ ] 01-04-PLAN.md — R2 presigned URL route + agent ingest API route
- [ ] 01-05-PLAN.md — External service setup (Supabase + R2) + end-to-end verification

### Phase 2: Anchor Program
**Goal**: A deployed, tested Anchor program on devnet that accepts a `burn_for_article` instruction and emits a verifiable `ArticleKilled` event
**Depends on**: Nothing (parallel with Phase 1)
**Requirements**: CHAIN-04
**Success Criteria** (what must be TRUE):
  1. `burn_for_article` instruction executes on devnet: burns the caller's SPL tokens and writes the transaction to the chain
  2. `ArticleKilled` event is emitted via `emit!()` and appears in the transaction's `logMessages` as a `Program data:` log line (not just the `events` field)
  3. The emitted event contains the `article_id` field that identifies which article was killed
  4. Program IDL is committed to the repo and can be imported by the frontend's `@coral-xyz/anchor` client
**Plans:** 1/2 plans executed

Plans:
- [ ] 02-01-PLAN.md — Scaffold Anchor workspace, implement burn_for_article instruction, write integration tests
- [ ] 02-02-PLAN.md — Deploy to devnet, verify event emission, commit IDL for frontend import

### Phase 3: App Shell + Auth + Wallet
**Goal**: Users can connect their Solana wallet to the site and admins can authenticate to access protected routes, with the Y2K tabloid aesthetic established across the app shell
**Depends on**: Phase 1
**Requirements**: WALL-01, WALL-02, WALL-03
**Success Criteria** (what must be TRUE):
  1. User can connect a Phantom, Solflare, or Backpack wallet from any page; the connected address is visible in the header
  2. The connected wallet's token balance is displayed in the header, using 6-decimal arithmetic so the displayed amount is correct for Pump.fun tokens
  3. Admin can log in via email/password at `/admin/login` and is redirected to `/admin`; unauthenticated requests to `/admin` routes are redirected to login
  4. WalletProvider is rendered without SSR hydration errors on any page
**Plans:** 3 plans

Plans:
- [ ] 03-01-PLAN.md — SolanaProvider + Y2K header + WalletArea + token balance hook
- [ ] 03-02-PLAN.md — Middleware JWT role gating + admin login restyle + test scaffolds
- [ ] 03-03-PLAN.md — Gap closure: fix formatBalance/truncateAddress bugs + migrate inline styles to Tailwind utilities

### Phase 4: Admin Content Pipeline
**Goal**: An admin can create, draft, and publish articles with images, including AI-assisted drafting via Claude, without touching the database directly
**Depends on**: Phase 3
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, EDIT-01, EDIT-02, AGENT-01, AGENT-02
**Success Criteria** (what must be TRUE):
  1. Admin can create a new article with title, body, cover image, status (draft/pending_review/published), and burn price from the admin panel
  2. Admin can click "Generate Draft" and receive a Claude-generated tabloid article draft pre-populated into the edit form
  3. Admin can upload a cover image directly from the browser to Cloudflare R2 and the uploaded URL is saved to the article record
  4. Admin cannot publish an article without checking a fact-check confirmation checkbox; the publish button is disabled until it is checked
**Plans:** 3/4 plans executed

Plans:
- [ ] 04-01-PLAN.md — Install deps, server actions with role validation, middleware editor access, Wave 0 tests
- [ ] 04-02-PLAN.md — Verify existing agent ingest API (AGENT-01, AGENT-02) with implemented tests
- [ ] 04-03-PLAN.md — Admin dashboard + article editor UI (Tiptap, cover image upload, fact-check gate)
- [ ] 04-04-PLAN.md — AI draft generation (Claude streaming API route + AIDraftPanel component)

### Phase 5: Public Site + Token Gate
**Goal**: Visitors can browse article listings and read content based on their token holdings, with a live bonding curve progress display
**Depends on**: Phase 4
**Requirements**: ART-01, ART-02, ART-03, ART-04, ART-05, ART-06, ART-07, CHAIN-01, SHARE-01, LEGAL-01
**Success Criteria** (what must be TRUE):
  1. Homepage lists all articles server-side with correct status badges (LIVE / TOKEN GATED / REDACTED) visible without JavaScript
  2. Homepage displays a bonding curve progress bar showing the percentage to PumpSwap graduation; if the token has graduated, a "Graduated to PumpSwap" banner is shown instead
  3. A connected wallet holding fewer than 1M tokens sees a blur/overlay on token-gated article content; a wallet holding 1M+ tokens sees the full article body
  4. A non-holder visiting a token-gated article sees a countdown timer showing time until the article becomes freely public ("Free in 1h 47m")
  5. After the 2-hour Alpha Gate window elapses, the article is automatically accessible to all visitors without requiring a wallet
  6. Article pages render rich OG meta tags so sharing on X/Twitter generates a preview card with the article title and cover image
**Plans:** 4/4 plans complete

Plans:
- [ ] 05-01-PLAN.md — Wave 0 tests + article query functions + gate logic + bonding curve parser
- [ ] 05-02-PLAN.md — Homepage article listing with newspaper layout + bonding curve banner
- [ ] 05-03-PLAN.md — Article detail page with token gate overlay + OG meta tags
- [ ] 05-04-PLAN.md — Legal disclaimer modal + site footer + Buy CTA in navigation

### Phase 6: Burn Mechanic
**Goal**: Any user can permanently redact an article by burning the required tokens through the Anchor program, and the redaction propagates automatically to the site
**Depends on**: Phase 2, Phase 5
**Requirements**: CHAIN-02, CHAIN-03, CHAIN-04
**Success Criteria** (what must be TRUE):
  1. Each article page shows a "BURN $X TO REDACT" button displaying the admin-set burn price for that article
  2. A connected wallet can click the burn button, sign the transaction, and submit it to the Anchor program on-chain
  3. After a successful burn, the article's status automatically updates to Redacted in Supabase within a few seconds (driven by Helius webhook — no manual admin action required)
  4. A redacted article displays the "REDACTED BY WHALE" tombstone graphic in place of its content for all visitors
  5. Duplicate Helius webhook deliveries for the same transaction do not cause double-processing (idempotency enforced via `processed_webhooks` table)
  6. The Anchor program only accepts burns of the correct SPL token mint (pinned via BurnConfig PDA) and enforces a minimum burn amount to prevent economic bypass attacks
**Plans:** 7 plans

Plans:
- [ ] 06-01-PLAN.md — Install @coral-xyz/anchor, DB migration, burn utilities, types update, Wave 0 test scaffolds
- [ ] 06-02-PLAN.md — Helius webhook route handler with event parsing and idempotency
- [ ] 06-03-PLAN.md — BurnButton component, Realtime subscription, destruction animation, tombstone burn credit
- [ ] 06-04-PLAN.md — Gap closure: BurnConfig PDA + initialize_config instruction + mint/amount validation hardening
- [ ] 06-05-PLAN.md — Gap closure: Adversarial edge case test coverage (wrong mint, amount=1, u64::MAX, zero article_id)
- [ ] 06-06-PLAN.md — Gap closure: Webhook batch processing bugs (early return, cascading failure, null field crashes)
- [ ] 06-07-PLAN.md — Gap closure: UUID utils input validation (reject invalid inputs instead of silent garbage)

### Phase 7: Polish + Launch Prep
**Goal**: The site is launch-ready with a complete Y2K tabloid aesthetic, hardened error states, seed content demonstrating all article states, and full mobile responsiveness
**Depends on**: Phase 6
**Requirements**: SHARE-02
**Success Criteria** (what must be TRUE):
  1. The site renders the Y2K tabloid aesthetic (high-contrast, loud typography, red/yellow/black palette) consistently across all pages
  2. Failed burn transactions and wallet disconnections display user-facing error messages rather than silent failures or broken UI
  3. At least 3 seed articles exist covering all three states (LIVE, TOKEN GATED, REDACTED) so the mechanic is demonstrable at launch
  4. All pages are functional and visually correct on mobile viewports (375px and up)
**Plans:** 3/3 plans complete

Plans:
- [ ] 07-01-PLAN.md — TombstoneGraphic SVG component (3 variants) + integrate into article page, inline tombstone, and homepage card stamps
- [ ] 07-02-PLAN.md — Mobile-responsive SiteHeader + BurnButton dialog + error.tsx + SkeletonCard with shimmer
- [ ] 07-03-PLAN.md — SQL seed script with 6 articles covering LIVE, TOKEN GATED, and REDACTED states

### Phase 8: Harden Burn-to-Redact Pipeline
**Goal**: The burn-to-redact flow is secure for launch — the hardened Anchor program is deployed to devnet with mint validation and min burn enforcement active, the frontend IDL is synced, and the webhook handler is resilient to edge cases
**Depends on**: Phase 6
**Requirements**: CHAIN-02, CHAIN-03, CHAIN-04
**Gap Closure:** Closes INT-01, INT-02, and degraded Burn-to-Redact flow from v1.0 audit

**Success Criteria** (what must be TRUE):
  1. The hardened Anchor program (with BurnConfig PDA, mint validation, min burn amount) is deployed to devnet and responds to RPC calls
  2. The frontend IDL (`idl/burn_for_article.json`) matches the deployed program's IDL — BurnConfig account, `initialize_config` instruction, `InvalidMint` and `BurnAmountTooLow` errors are all present
  3. `initialize_config` has been called on devnet to pin the allowed SPL token mint and set the minimum burn amount
  4. The Helius webhook handler skips transactions with missing signatures instead of crashing on `NOT NULL` constraint violation

**Plans:** 1/2 plans executed

Plans:
- [ ] 08-01-PLAN.md — Webhook null-signature guard + tests (INT-02) + IDL root sync (INT-01 partial)
- [ ] 08-02-PLAN.md — Devnet deploy of hardened program + BurnConfig initialization (INT-01 completion)

### Phase 9: Security & Code Integrity Fixes
**Goal**: Close the one security-relevant integration issue (agent-upload bypass) and two consistency issues (stale IDL, duplicate constant) identified in the v1.0 audit
**Depends on**: Phase 8
**Requirements**: ADMIN-03, AUTH-01, CHAIN-02, CHAIN-03, CHAIN-04
**Gap Closure:** Closes INT-01, INT-02, INT-04 from v1.0-MILESTONE-AUDIT.md

**Success Criteria** (what must be TRUE):
  1. `presigned-url/route.ts` reads `user_role` via `decodeJwt(session.access_token).user_role` (matching the middleware/actions pattern) — not from `user.app_metadata`
  2. `idl/burn_for_article.json` (repo root) matches `anchor/target/idl/burn_for_article.json` and all staged IDL changes are committed
  3. `helius/route.ts` imports `PROGRAM_ID` from `lib/burn/utils.ts` — the local duplicate `const PROGRAM_ID` is removed

Plans:
- [ ] 09-01-PLAN.md — Fix presigned-url role check + IDL reconciliation + remove PROGRAM_ID duplicate
- [ ] 09-02-PLAN.md — Gap closure: fix helius-webhook test amount mock mismatch (11 failing tests)

### Phase 10: UI Completions
**Goal**: Complete two partial UI implementations: wire the SkeletonCard loading state into article listings and render author avatars on article detail pages
**Depends on**: Phase 9
**Requirements**: SHARE-02, ART-06
**Gap Closure:** Closes INT-03, INT-05 from v1.0-MILESTONE-AUDIT.md

**Success Criteria** (what must be TRUE):
  1. `SkeletonCard.tsx` is imported and rendered as the loading placeholder in the article listing (homepage and/or article list component) during server-side data fetch or Suspense fallback
  2. Author `avatar_url` is displayed on `app/articles/[slug]/page.tsx` alongside `display_name` — matching the ART-06 spec for author attribution with avatar

Plans:
- [ ] 10-01-PLAN.md — Wire SkeletonCard into article listing + render avatar_url on article detail page

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10
Note: Phases 1 and 2 have no mutual dependency and can be worked in parallel.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Layer | 5/5 | Complete   | 2026-03-05 |
| 2. Anchor Program | 1/2 | In Progress|  |
| 3. App Shell + Auth + Wallet | 2/3 | In Progress|  |
| 4. Admin Content Pipeline | 3/4 | In Progress|  |
| 5. Public Site + Token Gate | 4/4 | Complete   | 2026-03-05 |
| 6. Burn Mechanic | 5/7 | In Progress|  |
| 7. Polish + Launch Prep | 3/3 | Complete   | 2026-03-05 |
| 8. Harden Burn-to-Redact Pipeline | 1/2 | In Progress|  |
| 9. Security & Code Integrity Fixes | 2/2 | Complete   | 2026-03-06 |
| 10. UI Completions | 1/1 | Complete    | 2026-03-06 |
