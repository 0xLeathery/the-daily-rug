---
phase: 10-ui-completions
plan: 01
subsystem: ui
tags: [next.js, react, typescript, vitest, supabase, tailwind]

# Dependency graph
requires:
  - phase: 07-polish-launch-prep
    provides: SkeletonCard component and shimmer CSS animation in globals.css
  - phase: 05-public-site-token-gate
    provides: ArticleWithAuthor type, profiles!author_id FK join pattern
affects:
  - public article detail page rendering
  - homepage loading experience

provides:
  - app/loading.tsx: Next.js App Router Suspense fallback with 6 SkeletonCard shimmer placeholders
  - is_agent field in ArticleWithAuthor type and both Supabase select strings
  - Author avatar (24x24 rounded Image) and AI/HUMAN badge on article detail page
  - *.supabase.co added to next.config.ts remotePatterns for avatar images

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Next.js App Router loading.tsx Suspense fallback pattern (server component, no use client)
    - is_agent ternary badge pattern: bg-brand-red/20 text-brand-red for AI, bg-brand-white/10 for HUMAN
    - TDD node-env badge logic test: extract pure function, test logic without jsdom rendering

key-files:
  created:
    - app/loading.tsx
    - tests/unit/loading-skeleton.test.ts
  modified:
    - lib/supabase/articles.ts
    - app/articles/[slug]/page.tsx
    - next.config.ts
    - tests/unit/articles-query.test.ts
    - tests/unit/article-metadata.test.ts

key-decisions:
  - "app/loading.tsx is a Server Component (no use client) — renders 6 SkeletonCard in responsive grid matching homepage breakpoints"
  - "Badge logic tested as pure function in node env (no jsdom needed) — avoids React rendering complexity while validating is_agent ternary"
  - "*.supabase.co wildcard added to remotePatterns to cover all project-specific storage subdomains"

patterns-established:
  - "Loading skeleton: loading.tsx mirrors page.tsx grid layout exactly — same max-w-7xl, px-4, py-6, grid-cols breakpoints"
  - "Author badge: AI badge uses brand-red palette (bg-brand-red/20 text-brand-red), HUMAN badge uses muted white (bg-brand-white/10 text-brand-white/60)"

requirements-completed: [SHARE-02, ART-06]

# Metrics
duration: 12min
completed: 2026-03-06
---

# Phase 10 Plan 01: UI Completions Summary

**Next.js App Router loading.tsx skeleton (6 SkeletonCards) + author avatar Image and AI/HUMAN is_agent badge on article detail page, closing INT-03 and INT-05**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-06T15:32:00Z
- **Completed:** 2026-03-06T15:33:50Z
- **Tasks:** 2 (TDD: RED commit + GREEN commit)
- **Files modified:** 7

## Accomplishments

- Created `app/loading.tsx` — Next.js Suspense fallback with 6 SkeletonCard shimmer placeholders in responsive 1/2/3-column grid, matching homepage layout exactly
- Extended `ArticleWithAuthor` type and both Supabase select strings to include `is_agent` field from profiles join
- Updated `app/articles/[slug]/page.tsx` author meta to render 24x24 rounded avatar `<Image>` (when `avatar_url` non-null) plus AI/HUMAN badge derived from `is_agent`
- Added `*.supabase.co` to `next.config.ts` remotePatterns for avatar image hostname safety
- All 128 unit tests pass; new tests cover Loading module existence, badge logic, and is_agent select string assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests (RED)** - `c9a109a` (test)
2. **Task 2: Implement all four files (GREEN)** - `bf59946` (feat)

## Files Created/Modified

- `/Users/annon/projects/TMZolana/app/loading.tsx` - New Suspense fallback; 6 SkeletonCards in responsive grid
- `/Users/annon/projects/TMZolana/lib/supabase/articles.ts` - Added is_agent to ArticleWithAuthor type and both select strings
- `/Users/annon/projects/TMZolana/app/articles/[slug]/page.tsx` - Author meta: avatar Image + display_name + AI/HUMAN badge
- `/Users/annon/projects/TMZolana/next.config.ts` - Added *.supabase.co to remotePatterns
- `/Users/annon/projects/TMZolana/tests/unit/loading-skeleton.test.ts` - New: Loading module existence + badge logic tests
- `/Users/annon/projects/TMZolana/tests/unit/articles-query.test.ts` - Extended: is_agent fixture + is_agent select assertions for both query functions
- `/Users/annon/projects/TMZolana/tests/unit/article-metadata.test.ts` - Added is_agent: false to ArticleWithAuthor fixture (type alignment)

## Decisions Made

- `app/loading.tsx` is a Server Component (no `use client`) — BondingCurveBanner is excluded since it has its own loading state and is a Client Component
- Badge logic tested as pure extracted function in node env — no jsdom required since the conditional is a simple ternary, not complex rendering
- `*.supabase.co` wildcard covers all Supabase storage subdomains without hardcoding project-specific hostname

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ArticleWithAuthor type mismatch in article-metadata.test.ts**
- **Found during:** Task 2 (TypeScript check after GREEN implementation)
- **Issue:** Adding `is_agent` to `Pick<Profile, ...>` in `ArticleWithAuthor` caused TS2741 error in `article-metadata.test.ts` fixture missing `is_agent: false`
- **Fix:** Added `is_agent: false` to the `makeArticle` profiles fixture in the test file
- **Files modified:** `tests/unit/article-metadata.test.ts`
- **Verification:** `npx tsc --noEmit` no longer reports this error; all 128 tests pass
- **Committed in:** `bf59946` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type fixture alignment caused by task's own type change)
**Impact on plan:** Necessary correctness fix; test fixture must match updated type. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `tests/api/presigned-url.test.ts` (4 TS2345 errors about `Promise<SupabaseClient>` vs `SupabaseClient`) remain from previous phases — out of scope for this task, logged to deferred items.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- INT-03 (SHARE-02) closed: homepage Suspense fallback renders shimmer skeleton cards
- INT-05 (ART-06) closed: article detail page shows avatar and AI/HUMAN badge
- Phase 10 plan 01 complete; ready for any remaining phase 10 plans

---
*Phase: 10-ui-completions*
*Completed: 2026-03-06*
