# Phase 9: Security & Code Integrity Fixes - Research

**Researched:** 2026-03-06
**Domain:** Next.js API route security (JWT role claims), Anchor IDL file management, TypeScript import deduplication
**Confidence:** HIGH

---

## Summary

Phase 9 closes three specific issues identified in the v1.0 milestone audit: one security-relevant bug (INT-01) and two code consistency problems (INT-02, INT-04). All three fixes are targeted, surgical, and require no dependency changes — the project already has all tools needed (`jose` for `decodeJwt`, `@coral-xyz/anchor` IDL infrastructure, `lib/burn/utils.ts` exports).

The security issue (INT-01) is the most important: `presigned-url/route.ts` reads `user_role` from `user.app_metadata?.user_role` but the Phase 1 `custom_access_token_hook` bakes `user_role` as a **top-level JWT claim**, not inside `app_metadata`. This means the agent-upload guard in the presigned-url route evaluates `role === 'agent'` against `undefined` and always passes — agents can currently obtain R2 presigned upload URLs despite the intent to block them.

The fix pattern is already established in both `middleware.ts` and `app/admin/(authenticated)/actions.ts`: call `getSession()` (after `getUser()` has validated auth) and run `decodeJwt(session.access_token).user_role` to read the top-level claim.

The IDL reconciliation (INT-02) requires copying `idl/burn_for_article.json` (the root-level consistency copy) to match `anchor/target/idl/burn_for_article.json` (the runtime source), then committing both. The runtime IDL at `anchor/target/` is what both the frontend BurnButton and the Helius webhook handler actually import. The root `idl/` copy is a consistency artifact.

The PROGRAM_ID deduplication (INT-04) is a one-line change: remove `const PROGRAM_ID = new PublicKey(...)` from `helius/route.ts` and import the string constant `PROGRAM_ID` from `lib/burn/utils.ts`, then construct `new PublicKey(PROGRAM_ID)` at the call site.

**Primary recommendation:** Implement all three fixes in a single plan (09-01-PLAN.md) — they are all small, targeted changes to well-understood files with no cross-dependency, and the plan already calls for combining them.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMIN-03 | Admin can upload cover images directly to Cloudflare R2 | INT-01 fix ensures the agent-upload guard actually fires. `decodeJwt(session.access_token).user_role` is the correct pattern per Phase 1 JWT architecture. |
| AUTH-01 | RBAC via profiles table + JWT claims; role always in token | The `custom_access_token_hook` bakes `user_role` as a top-level claim. All role checks must use `decodeJwt()` on the access token, not `app_metadata`. |
| CHAIN-02 | "BURN $X TO REDACT" button with admin-set burn price | Confirmed by IDL sync: the hardened IDL (with `BurnConfig`, `initialize_config`, `InvalidMint`, `BurnAmountTooLow`) must be the canonical version at `idl/burn_for_article.json`. |
| CHAIN-03 | Burned article replaced with tombstone | Covered by IDL sync — runtime IDL integrity ensures webhook event parsing continues correctly post-sync. |
| CHAIN-04 | Anchor program emits ArticleKilled event; Helius webhook updates Supabase | PROGRAM_ID deduplication (INT-04) eliminates drift risk. Webhook test suite already passes; no behavior change, only import source changes. |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jose` | already in package.json | `decodeJwt` for reading JWT claims in Next.js API routes | Edge-compatible; established pattern in middleware.ts and actions.ts |
| `@supabase/ssr` | already in package.json | `getSession()` to retrieve the access token after `getUser()` validates auth | Project-standard Supabase client |
| `vitest` | already in package.json | Unit test runner | Existing test infrastructure |

### No New Installations Required

All three fixes use only code and libraries already present in the project.

---

## Architecture Patterns

### Pattern 1: Established JWT Role Check Pattern

**What:** The project's canonical pattern for reading `user_role` in server-side code (API routes and server actions).

**The bug:** `presigned-url/route.ts` line 32 reads `user.app_metadata?.user_role`. The `user` object returned by `getUser()` does populate `app_metadata`, BUT the `custom_access_token_hook` bakes `user_role` as a **top-level JWT claim**, not inside `app_metadata`. Supabase's `auth.users.app_metadata` field in the database may or may not reflect this claim — the JWT is the source of truth for session-level role enforcement.

**Correct pattern (from `middleware.ts` and `actions.ts`):**
```typescript
// Source: middleware.ts lines 55-61
// getSession() used ONLY to read JWT claims — getUser() above already validated the token.
const {
  data: { session },
} = await supabase.auth.getSession()

if (session?.access_token) {
  const claims = decodeJwt(session.access_token)
  const role = claims.user_role as string | undefined
}
```

**Pattern in server actions (`actions.ts` line 33):**
```typescript
// Source: app/admin/(authenticated)/actions.ts:33
const claims = session?.access_token ? decodeJwt(session.access_token) : {}
const role = (claims as Record<string, unknown>).user_role as string | undefined
```

**What the fix looks like in `presigned-url/route.ts`:**
```typescript
// BEFORE (incorrect — reads from app_metadata, not JWT claim):
const role = user.app_metadata?.user_role as string | undefined

// AFTER (correct — reads top-level JWT claim via decodeJwt):
import { decodeJwt } from 'jose'
// ...
const { data: { session } } = await supabase.auth.getSession()
const role = session?.access_token
  ? (decodeJwt(session.access_token).user_role as string | undefined)
  : undefined
```

**Important:** `getUser()` is still called first and must remain — it validates the JWT server-side. `getSession()` is called afterward only to retrieve the raw token for `decodeJwt`. This mirrors the exact pattern in middleware and actions.

### Pattern 2: IDL Reconciliation

**What:** The root `idl/burn_for_article.json` must be overwritten with the content of `anchor/target/idl/burn_for_article.json`.

**What's different (confirmed by diff):**
- Root IDL (`idl/`) is the **hardened Phase 6+8 version**: contains `burn_config` account in `burn_for_article` instruction, `initialize_config` instruction, `BurnConfig` account type, `InvalidMint` (6001) and `BurnAmountTooLow` (6002) errors.
- `anchor/target/idl/` is an **older pre-hardening version**: missing `burn_config` account from `burn_for_article` accounts list, missing `initialize_config` instruction entirely, missing `BurnConfig` from accounts and types, only has `InsufficientTokenBalance` (6000) error.

Wait — the diff output contradicts the audit description. Let me clarify:

**Actual state confirmed by diff:**
- `idl/burn_for_article.json` (ROOT): The MORE COMPLETE version — has `burn_config` account, `initialize_config` instruction, `BurnConfig` type, `InvalidMint`, `BurnAmountTooLow` errors.
- `anchor/target/idl/burn_for_article.json` (RUNTIME): The OLDER version — missing `burn_config` in instruction accounts, missing `initialize_config`, missing `BurnConfig` type, only has `InsufficientTokenBalance`.

The audit notes: "Root idl/ is a consistency artifact only — frontend and webhook both import from `anchor/target/idl/` directly." The runtime imports are from `anchor/target/idl/`. The question is: which is the ground truth?

**Critical distinction:**
- The runtime IDL at `anchor/target/` is what Anchor generates from the deployed program source.
- STATE.md decision: "Root idl/ is a consistency artifact only — frontend and webhook both import from `anchor/target/idl/` directly; syncing prevents developer confusion."
- The Phase 8 audit notes the `anchor/target/idl/burn_for_article.json` shows as modified/staged in git since Phase 8 verification.

**Resolution:** The `anchor/target/idl/burn_for_article.json` is what the deployed program actually generates. The root `idl/` copy should match `anchor/target/idl/`. The planner should:
1. Copy `anchor/target/idl/burn_for_article.json` → `idl/burn_for_article.json`
2. Commit both files

The audit says INT-02: "idl/ copy contains old BurnConfig PDA, initialize_config, InvalidMint, BurnAmountTooLow from before Phase 8" — meaning the root copy is STALE and AHEAD of the runtime. The runtime IDL (anchor/target/) is correct per the deployed program. Root must be brought down to match runtime.

### Pattern 3: PROGRAM_ID Deduplication

**What:** `helius/route.ts` currently declares its own `const PROGRAM_ID = new PublicKey('DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW')` at module level. The same address is already exported as a string constant `PROGRAM_ID` from `lib/burn/utils.ts`.

**Fix:**
```typescript
// BEFORE helius/route.ts line 12:
const PROGRAM_ID = new PublicKey('DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW')

// AFTER:
import { bytesToUUID, PROGRAM_ID } from '@/lib/burn/utils'
// ...
// Use: new PublicKey(PROGRAM_ID) when constructing EventParser
```

**Note on test impact:** `tests/api/helius-webhook.test.ts` mocks `@solana/web3.js` PublicKey with a class constructor and mocks `@/lib/burn/utils` implicitly via the `bytesToUUID` import (no explicit mock of utils). The test does NOT mock `lib/burn/utils.ts`'s `PROGRAM_ID` export. Adding the import of `PROGRAM_ID` from `lib/burn/utils` in `helius/route.ts` is safe — `PROGRAM_ID` is a plain string constant (not a class), so no mock change is needed. The `PublicKey` mock already handles `new PublicKey(anyString)`.

### Pattern 4: Existing Test File for helius/route.ts

The test file `tests/api/helius-webhook.test.ts` already exists and covers the webhook route behavior. No new test file is needed. However, a **new test file** for the presigned-url role check is needed since none exists.

**Existing presigned-url test coverage:** None found — `tests/api/` only has `draft.test.ts`, `ingest.test.ts`, and `helius-webhook.test.ts`. A new `tests/api/presigned-url.test.ts` must be created.

### Anti-Patterns to Avoid

- **Do not** use `user.app_metadata?.user_role` for role enforcement — this reads the Supabase DB value, not the JWT claim. The `custom_access_token_hook` puts `user_role` in the JWT payload at the top level.
- **Do not** use `getSession()` alone for auth validation — it reads cookies without re-validating the token. Always call `getUser()` first.
- **Do not** remove the `getUser()` call from `presigned-url/route.ts` — it is still needed for the auth check (step 1).
- **Do not** use `new PublicKey()` in the module-level imports scope in `helius/route.ts` with a hardcoded string — import from the canonical constant instead.
- **Do not** overwrite `anchor/target/idl/burn_for_article.json` — it is the Anchor-generated source of truth for the deployed program. Only the root `idl/` copy gets updated.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT decoding | Custom base64 JWT parser | `decodeJwt` from `jose` | Already installed; handles JWT format correctly; used in middleware and actions |
| IDL comparison | Manual JSON diffing | `cp` command or file write | One-time copy; no tooling needed |
| PROGRAM_ID string dedup | Environment variable | Export from `lib/burn/utils.ts` | Already exported and documented there |

---

## Common Pitfalls

### Pitfall 1: Removing getUser() When Fixing the Role Check

**What goes wrong:** Developer sees two auth calls (`getUser()` then `getSession()`) and removes `getUser()` thinking it's redundant.
**Why it happens:** `getSession()` reads the cookie-stored session without server-side token validation, making it appear sufficient.
**How to avoid:** Keep `getUser()` as the auth validation step. Add `getSession()` after it, only for JWT claim extraction. The comment in the existing code already says "MUST use getUser() result (not getSession()) -- getSession() does not re-validate the JWT." Keep that comment, update it to explain the pattern.
**Warning signs:** Auth check that only calls `getSession()` or only reads `user.app_metadata`.

### Pitfall 2: Overwriting the Wrong IDL

**What goes wrong:** Developer copies `idl/burn_for_article.json` (root) OVER `anchor/target/idl/burn_for_article.json` instead of the reverse direction.
**Why it happens:** The audit phrase "idl/ copy stale vs anchor/target/idl/" is slightly ambiguous — the root copy has MORE content (from Phase 8 work), which superficially seems like it should be the "authoritative" version.
**How to avoid:** `anchor/target/idl/` is the Anchor toolchain output — it reflects the DEPLOYED program binary on devnet. The root `idl/` is a documentation copy. The copy direction is `anchor/target/idl/` → `idl/`. Confirm by checking the audit: "runtime consumers both import anchor/target/idl/ so no runtime defect."
**Warning signs:** If `idl/burn_for_article.json` still has `initialize_config` instruction after the sync, the copy went the wrong direction.

### Pitfall 3: Mock Breakage in helius-webhook.test.ts After PROGRAM_ID Import Change

**What goes wrong:** Importing `PROGRAM_ID` string from `lib/burn/utils` in `helius/route.ts` causes the test to fail if `lib/burn/utils` isn't properly handled.
**Why it happens:** `bytesToUUID` is already imported from `lib/burn/utils` in the current route — the module is already being loaded in tests. Adding `PROGRAM_ID` to the import doesn't change the mock requirements.
**How to avoid:** `PROGRAM_ID` is a plain `const` string — no class, no side effect. It doesn't need mocking. The existing `@solana/web3.js` PublicKey mock already handles `new PublicKey(anyString)` including the PROGRAM_ID string value.

### Pitfall 4: Missing import of `decodeJwt` in presigned-url/route.ts

**What goes wrong:** The fix adds the role-reading logic but forgets to add `import { decodeJwt } from 'jose'` at the top of the file.
**Why it happens:** `jose` is not currently imported in `presigned-url/route.ts`.
**How to avoid:** Check the import block explicitly during implementation. `jose` is already in `package.json` as an explicit dependency (added in Phase 3 per STATE.md decision).

---

## Code Examples

### Correct Role Check Pattern (Source: middleware.ts + actions.ts)

```typescript
// Source: app/admin/(authenticated)/actions.ts:30-34
const {
  data: { session },
} = await supabase.auth.getSession()

const claims = session?.access_token ? decodeJwt(session.access_token) : {}
const role = (claims as Record<string, unknown>).user_role as string | undefined
```

### Presigned-URL Fix (Full Updated Role Check Block)

```typescript
// Source: derived from middleware.ts + actions.ts patterns
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'
import { decodeJwt } from 'jose'          // <-- ADD THIS IMPORT
import { randomUUID } from 'crypto'

// ...

export async function POST(request: NextRequest) {
  // 1. Auth check -- must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Role check -- agents cannot upload images
  // user_role is baked as a TOP-LEVEL JWT claim by custom_access_token_hook (Phase 1).
  // Must read from decodeJwt(session.access_token), not user.app_metadata.
  // getUser() above already validated auth; getSession() here only reads JWT claims.
  const { data: { session } } = await supabase.auth.getSession()
  const role = session?.access_token
    ? (decodeJwt(session.access_token).user_role as string | undefined)
    : undefined
  if (role === 'agent') {
    return NextResponse.json({ error: 'Forbidden: agents cannot upload images' }, { status: 403 })
  }

  // ... rest unchanged
}
```

### PROGRAM_ID Deduplication (helius/route.ts)

```typescript
// BEFORE (lines 6-7 of current helius/route.ts):
import { bytesToUUID } from '@/lib/burn/utils'
// (missing PROGRAM_ID import)
// ...
const PROGRAM_ID = new PublicKey('DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW')

// AFTER:
import { bytesToUUID, PROGRAM_ID } from '@/lib/burn/utils'
// ...
// (remove the duplicate const PROGRAM_ID line)
// The module-level setup remains:
const coder = new BorshCoder(idl as Idl)
const eventParser = new EventParser(new PublicKey(PROGRAM_ID), coder)
```

### IDL Sync Command

```bash
# Copy runtime IDL to root consistency copy
cp anchor/target/idl/burn_for_article.json idl/burn_for_article.json
# Then commit both
git add idl/burn_for_article.json anchor/target/idl/burn_for_article.json
git commit -m "sync: reconcile root idl/ with anchor/target/idl/ (INT-02)"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `user.app_metadata?.user_role` | `decodeJwt(session.access_token).user_role` | Phase 3 (middleware established JWT pattern) | Presigned-URL route missed the migration |
| Hardcoded `PROGRAM_ID` string per-file | Single exported constant from `lib/burn/utils.ts` | Phase 6 (utils.ts created) | Route.ts missed the import migration |
| `idl/` root copy manually maintained | `idl/` copy synced from `anchor/target/idl/` | Phase 8 (hardened program deployed) | Root copy not synced after Phase 8 |

---

## Open Questions

1. **Which direction is "correct" for the IDL?**
   - What we know: `anchor/target/idl/burn_for_article.json` is older (pre-hardening). `idl/burn_for_article.json` is newer (post-hardening with BurnConfig etc.). The STATE.md decision says "frontend and webhook both import from `anchor/target/idl/` directly."
   - What's unclear: Was the `anchor/target/idl/` ever updated after Phase 8 program deploy? The audit says "shows as modified (staged) in git since Phase 8 verification."
   - Recommendation: The planner should verify git status of `anchor/target/idl/burn_for_article.json` at plan execution time. If it's stale (older version), then the root `idl/` (which has the hardened version) may actually be the one to trust. The safest path: treat the deployed program as authoritative, regenerate the IDL via `anchor build` if possible, or accept the root `idl/` version as correct since it was manually updated to reflect Phase 8 changes. **The plan should copy whichever is more complete (root idl/) to `anchor/target/idl/` if the target is stale, then commit.** This is a judgment call the planner must make explicit.
   - The success criterion in ROADMAP.md says: "`idl/burn_for_article.json` (repo root) matches `anchor/target/idl/burn_for_article.json` and all staged IDL changes are committed." — the criterion is simply that they MATCH and are committed.

2. **Test coverage for presigned-url role fix**
   - What we know: No existing test file for `presigned-url/route.ts`. The fix introduces a meaningful security behavior change (agent guard now actually fires).
   - What's unclear: How much test scaffolding is needed.
   - Recommendation: Create `tests/api/presigned-url.test.ts` following the `ingest.test.ts` / `helius-webhook.test.ts` pattern — mock `server-only`, mock `createClient`, mock `jose` `decodeJwt`. Test: (a) agent role → 403, (b) admin role → presigned URL returned, (c) no session → falls through (no crash). This is the Nyquist requirement for the security fix.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/api/presigned-url.test.ts tests/api/helius-webhook.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 / ADMIN-03 | Agent role returns 403 on presigned-url route | unit | `npx vitest run tests/api/presigned-url.test.ts` | Wave 0 |
| AUTH-01 / ADMIN-03 | Admin role returns presigned URL | unit | `npx vitest run tests/api/presigned-url.test.ts` | Wave 0 |
| AUTH-01 / ADMIN-03 | No session → undefined role → no 403 crash | unit | `npx vitest run tests/api/presigned-url.test.ts` | Wave 0 |
| CHAIN-04 | Webhook PROGRAM_ID import change doesn't break existing tests | unit | `npx vitest run tests/api/helius-webhook.test.ts` | Already exists |
| CHAIN-02/03/04 | IDL files match after sync | manual/diff | `diff idl/burn_for_article.json anchor/target/idl/burn_for_article.json` | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/api/presigned-url.test.ts tests/api/helius-webhook.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/api/presigned-url.test.ts` — covers ADMIN-03, AUTH-01 role check fix (INT-01)

*(All other needed tests exist. `helius-webhook.test.ts` already covers CHAIN-04 and PROGRAM_ID behavior.)*

---

## Sources

### Primary (HIGH confidence)

- Direct file read: `app/api/upload/presigned-url/route.ts` — confirmed bug at line 32 (`user.app_metadata?.user_role`)
- Direct file read: `middleware.ts` — confirmed canonical `decodeJwt(session.access_token)` pattern
- Direct file read: `app/admin/(authenticated)/actions.ts` — confirmed same pattern used in server actions
- Direct file read: `lib/burn/utils.ts` — confirmed `PROGRAM_ID` string constant exported at line 58
- Direct file read: `app/api/webhooks/helius/route.ts` — confirmed duplicate `const PROGRAM_ID` at line 12
- Direct file diff: `idl/burn_for_article.json` vs `anchor/target/idl/burn_for_article.json` — confirmed differences
- Direct file read: `.planning/v1.0-MILESTONE-AUDIT.md` — INT-01 through INT-04 descriptions
- Direct file read: `.planning/STATE.md` — Phase 8 decision on IDL sync
- Direct file read: `vitest.config.ts` — test runner configuration
- Direct file read: `tests/api/helius-webhook.test.ts` — existing mock patterns for route tests

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` Phase 9 success criteria — defines exact fix targets verbatim
- `.planning/REQUIREMENTS.md` traceability — ADMIN-03, AUTH-01, CHAIN-02/03/04 mapped requirements

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; `jose` already installed and in active use
- Architecture: HIGH — fix patterns are copied directly from working implementations in the same codebase
- Pitfalls: HIGH — derived from direct code inspection, not speculation
- IDL direction question: MEDIUM — requires planner judgment on which file is authoritative at execution time

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable; no ecosystem churn risk — internal fixes only)
