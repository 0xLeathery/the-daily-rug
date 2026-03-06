# Phase 10: UI Completions - Research

**Researched:** 2026-03-06
**Domain:** Next.js App Router loading states, React Suspense, Next.js `loading.tsx` convention, avatar rendering in RSC
**Confidence:** HIGH

## Summary

Phase 10 is a targeted gap-closure phase with two small, fully isolated deliverables. Both are identified precisely in the v1.0 audit (INT-03 and INT-05) and require surgical edits to existing files — no new packages, no schema changes, no API work.

**INT-03 (SHARE-02):** `SkeletonCard.tsx` was built in Phase 7 but never wired into the article listing. The homepage (`app/page.tsx`) is a Next.js App Router Server Component that awaits `getPublishedArticles()` before rendering. The correct mechanism for a loading fallback in this architecture is a co-located `app/loading.tsx` file. Next.js App Router automatically wraps the page in a `<Suspense>` boundary and renders `loading.tsx` while the page component streams in. `SkeletonCard` already exists and matches the article card shape exactly — it just needs `loading.tsx` to render a grid of 6 skeleton cards.

**INT-05 (ART-06):** `avatar_url` is already fetched from Supabase in `getArticleBySlug` (the `profiles!author_id` join includes `display_name` AND `avatar_url`) and is present in the `ArticleWithAuthor` type. It is simply not rendered on `app/articles/[slug]/page.tsx`. The fix is to add a Next.js `<Image>` component alongside the existing `display_name` span in the author meta line. The Profile type also has `is_agent: boolean` — the ART-06 spec calls for "distinct badges for Human vs. AI Agent authors," so the author attribution must also render a Human/AI badge using `is_agent`.

Both fixes are self-contained within existing server components — no `'use client'` directive, no new hooks, no state. The `SkeletonCard` shimmer animation is already defined in `globals.css` (`@keyframes shimmer`) and the component already uses it via `inline style`. The `next/image` remote pattern for `*.r2.dev` is already configured in `next.config.ts`.

**Primary recommendation:** Wire `SkeletonCard` via `app/loading.tsx` (6-card grid matching homepage layout). Render avatar with `<Image>` in the author meta line plus an `is_agent` badge — no layout refactor needed, just extend the existing `flex` row.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHARE-02 | All pages are responsive and functional on mobile viewports | The `loading.tsx` skeleton grid uses the same responsive grid classes as `app/page.tsx` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). The avatar/badge addition uses the existing `flex flex-wrap gap-4` author meta row — no new mobile breakpoints needed. |
| ART-06 | Article listings and detail pages display the assigned Author profile with distinct badges for Human vs. AI Agent authors | `avatar_url` and `is_agent` are both already in `ArticleWithAuthor` (fetched via `profiles!author_id` join). Only rendering is missing. Avatar must use `<Image>` with `width={24} height={24}`. Badge uses `is_agent` boolean to switch between "AI" and "HUMAN" label in brand styling. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 (installed) | `app/loading.tsx` Suspense convention, `<Image>` for avatar | Already the project framework; `loading.tsx` is the idiomatic streaming skeleton mechanism |
| React | 19.2.3 (installed) | Server Component rendering, no new hooks needed | Homepage and article page are both RSC — no client-side loading state exists |
| Tailwind v4 | `^4` (installed) | Responsive grid, brand tokens, badge styling | Canonical project CSS system; `sm:` breakpoints already established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/image` | (bundled with Next.js) | Render avatar with optimization | Avatar is a remote URL from R2/Supabase storage; `<Image>` enforces allowlisted hostnames and handles lazy loading |
| Vitest | `^4.0.18` (installed) | Unit tests for avatar rendering logic | Existing test infrastructure; article-detail page logic tested in `articles-query.test.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `app/loading.tsx` | Manual `<Suspense>` wrapper in `page.tsx` | `loading.tsx` is the Next.js 13+ App Router convention; it works at the segment level automatically; `<Suspense>` in page.tsx would require converting the page to a Client Component or nesting RSC boundaries — unnecessary complexity |
| `app/loading.tsx` | `BondingCurveBanner` client-side spinner | The article grid itself needs the skeleton, not the banner |
| `<Image>` for avatar | `<img>` tag | `next/image` is required for remote URLs per project `next.config.ts` `remotePatterns`; `<img>` would cause a Next.js lint warning and miss optimization |
| Inline avatar fallback (initials) | Omit avatar when null | Graceful fallback — if `avatar_url` is null, show no image (or a generic icon). The existing `display_name` span already handles null gracefully with `&&` guard. |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
app/
├── loading.tsx          # NEW — App Router Suspense fallback for homepage
├── page.tsx             # EXISTS — homepage RSC (no changes)
├── articles/
│   └── [slug]/
│       └── page.tsx     # EXISTS — edit author meta line only
components/
└── public/
    └── SkeletonCard.tsx # EXISTS — no changes needed
```

### Pattern 1: `app/loading.tsx` — Next.js App Router Streaming Skeleton

**What:** A file named `loading.tsx` co-located with a page (in the same route segment directory) acts as the Suspense fallback. Next.js App Router automatically wraps the segment's page in `<Suspense fallback={<Loading />}>`. It renders immediately (no data fetching) and is replaced by the real page once the server finishes fetching.

**When to use:** Any route segment where the `page.tsx` is a Server Component with async data fetching. The `app/page.tsx` homepage awaits `getPublishedArticles()` — exactly the pattern `loading.tsx` is designed for.

**How it maps to the homepage layout:** The homepage renders: `<BondingCurveBanner>` + a grid of `<ArticleHeroCard>` (first article) + `<ArticleCard>` (rest). The skeleton should mirror this structure: show 6 `<SkeletonCard>` components in the same grid layout. Showing 6 skeletons is the right number — the grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` so 6 fills 2 rows at all breakpoints.

**Example:**
```typescript
// Source: Next.js App Router conventions (https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
// app/loading.tsx
import SkeletonCard from '@/components/public/SkeletonCard'

export default function Loading() {
  return (
    <main className="min-h-screen bg-brand-black">
      {/* BondingCurveBanner is a client component with its own loading state — skip skeleton for it */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mirror the homepage grid: 1 col mobile, 2 tablet, 3 desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </main>
  )
}
```

**Important:** `loading.tsx` must NOT have `'use client'` — it is a Server Component by default and renders on the server immediately. Adding `'use client'` is unnecessary and would prevent streaming.

**CRITICAL — BondingCurveBanner interaction:** `BondingCurveBanner` is a Client Component that fetches on-chain data. It renders its own loading state internally (`null` or spinner while data loads). The `loading.tsx` skeleton replaces the entire segment (including the banner position). The banner is NOT included in the skeleton — simpler and avoids needing to import a client component into the loading fallback.

### Pattern 2: Author Avatar + is_agent Badge in Article Detail Page

**What:** Extend the existing author meta row in `app/articles/[slug]/page.tsx` (lines 115–120) to render:
1. Avatar image (when `avatar_url` is non-null) using `next/image`
2. Author name (already exists)
3. Human/AI badge using `is_agent` boolean

**When to use:** Applies to all published articles whose author profile has an `avatar_url`. When null, show no image (the name + badge alone is the fallback).

**Data already available:** `article.profiles` is `Pick<Profile, 'display_name' | 'avatar_url'> | null`. The `is_agent` field is on `Profile` but is NOT in the current `ArticleWithAuthor` pick — it must be added to the `profiles!author_id(...)` select query in `lib/supabase/articles.ts` AND to the `ArticleWithAuthor` type definition.

**Current select query (articles.ts line 17):**
```typescript
.select('*, profiles!author_id(display_name, avatar_url)')
```

**Required update:**
```typescript
.select('*, profiles!author_id(display_name, avatar_url, is_agent)')
```

**Current ArticleWithAuthor type:**
```typescript
export type ArticleWithAuthor = Article & {
  profiles: Pick<Profile, 'display_name' | 'avatar_url'> | null
}
```

**Required update:**
```typescript
export type ArticleWithAuthor = Article & {
  profiles: Pick<Profile, 'display_name' | 'avatar_url' | 'is_agent'> | null
}
```

**Rendering pattern:**
```typescript
// app/articles/[slug]/page.tsx — updated author meta line
// Source: existing pattern in this file + next/image docs
import Image from 'next/image'

// In the JSX, replacing lines 115-120:
<div className="flex flex-wrap gap-4 items-center text-brand-white/60 font-mono text-sm mb-8">
  {article.profiles?.display_name && (
    <div className="flex items-center gap-2">
      {article.profiles.avatar_url && (
        <Image
          src={article.profiles.avatar_url}
          alt={article.profiles.display_name}
          width={24}
          height={24}
          className="rounded-full object-cover"
        />
      )}
      <span>Written by: {article.profiles.display_name}</span>
      {article.profiles.is_agent ? (
        <span className="bg-brand-red/20 text-brand-red font-mono text-xs px-2 py-0.5 uppercase tracking-wider">
          AI
        </span>
      ) : (
        <span className="bg-brand-white/10 text-brand-white/60 font-mono text-xs px-2 py-0.5 uppercase tracking-wider">
          HUMAN
        </span>
      )}
    </div>
  )}
  {publishedDate && <span>{publishedDate}</span>}
</div>
```

**Avatar image hostname:** Avatar URLs come from Supabase Storage (typically `*.supabase.co`) or R2 (`*.r2.dev`). The current `next.config.ts` `remotePatterns` only allows `*.r2.dev`. If avatars are stored in Supabase Storage, the `supabase.co` hostname must also be added. Given the project stores all uploads in R2, avatars uploaded via admin will use `*.r2.dev` — already allowed. Seed avatars should use the same R2 bucket.

**IMPORTANT:** If `avatar_url` could come from an untrusted source or another hostname, a fallback `<img>` pattern or adding the Supabase Storage hostname to `remotePatterns` may be needed. Safest: also add the project's Supabase storage hostname to `remotePatterns` as a precaution.

### Anti-Patterns to Avoid

- **Adding `'use client'` to `app/loading.tsx`:** Unnecessary. Loading files are Server Components. The `SkeletonCard` is also a Server Component (no hooks, no `'use client'`). The shimmer animation is CSS-only via `inline style` — no JS needed.
- **Using `<Suspense>` manually in `page.tsx`:** This duplicates what `loading.tsx` does automatically. Use the file convention, not manual wrapping.
- **Using `<img>` for avatar:** Bypasses Next.js image optimization and hostname validation. Always use `<Image>` from `next/image` for remote URLs.
- **Forgetting `is_agent` in the Supabase select:** The type system will not catch a missing field in the select string. If `is_agent` is not added to the SQL select, it returns `undefined` at runtime, causing the badge to silently default to "HUMAN" for all authors.
- **Hardcoding avatar image dimensions:** `<Image>` requires explicit `width` and `height` (or `fill` with a positioned container). A `24x24` circular avatar is the standard inline author attribution size.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading skeleton for SSR page | Client-side loading state + `useEffect` data fetch | `app/loading.tsx` (Next.js App Router convention) | SSR pages cannot have client-side loading states; `loading.tsx` works at the streaming layer |
| Shimmer CSS animation | JS animation library or custom requestAnimationFrame | `@keyframes shimmer` already in `globals.css` + `SkeletonCard` `inline style` | Already implemented in Phase 7; zero new code |
| Avatar image rendering | Custom `<img>` with manual src validation | `next/image` `<Image>` component | Handles lazy loading, size optimization, and hostname allowlisting |

**Key insight:** Both deliverables are wiring tasks, not build tasks. The hard work (SkeletonCard component + shimmer CSS, avatar_url in DB query) was done in prior phases. Phase 10 is connecting existing pieces.

---

## Common Pitfalls

### Pitfall 1: `is_agent` Not Included in Supabase Select String
**What goes wrong:** The badge renders as "HUMAN" for all authors, including AI agents. No TypeScript error because `is_agent` would be typed as optional or `boolean | undefined`.
**Why it happens:** The Supabase select string `profiles!author_id(display_name, avatar_url)` omits `is_agent`. The field must be explicitly named in the select to be returned.
**How to avoid:** Update BOTH the select string in `lib/supabase/articles.ts` AND the `ArticleWithAuthor` type's `Pick` to include `is_agent`.
**Warning signs:** All author badges show "HUMAN" even for rows where `profiles.is_agent = true`.

### Pitfall 2: Avatar hostname not in `next.config.ts` `remotePatterns`
**What goes wrong:** `<Image>` throws a runtime error: "hostname 'xyz.supabase.co' is not configured under images.remotePatterns".
**Why it happens:** Next.js enforces an allowlist for remote image hostnames. R2 (`*.r2.dev`) is already configured, but Supabase Storage uses a different hostname.
**How to avoid:** If any avatar URL might come from Supabase Storage (not R2), add the Supabase project storage hostname to `remotePatterns`. Since seed data and admin uploads all go to R2 in this project, this may not be triggered — but defensively add `*.supabase.co` to `remotePatterns` if avatars can come from Supabase Auth/Storage.
**Warning signs:** Next.js development server error about unconfigured hostname when an article with an avatar is viewed.

### Pitfall 3: `loading.tsx` Imports Client Component Directly
**What goes wrong:** If `loading.tsx` imports `BondingCurveBanner` (a `'use client'` component), the loading fallback becomes tied to the client bundle, defeating the streaming benefit.
**Why it happens:** Mixing server/client boundaries in the loading file.
**How to avoid:** Keep `loading.tsx` to pure server-renderable content only. `BondingCurveBanner` has its own internal loading state and doesn't need to be in the skeleton.

### Pitfall 4: Skeleton Count Mismatch with Hero Card Layout
**What goes wrong:** The homepage uses a separate `ArticleHeroCard` for the first article (full-width), then a grid for the rest. If the skeleton shows 6 equal-size cards without a hero placeholder, the layout shift on load could be jarring.
**Why it happens:** The skeleton grid doesn't match the actual page structure.
**How to avoid:** The skeleton can simplify — 6 equal `SkeletonCard` in the grid is acceptable since `loading.tsx` is transient (typically < 500ms on first load). The alternative of adding a separate hero skeleton placeholder adds complexity for minimal visual payoff. Keep it simple: 6-card grid.

### Pitfall 5: `ArticleWithAuthor` Type Update Not Propagated
**What goes wrong:** TypeScript error at the avatar/badge render site: `Property 'is_agent' does not exist on type 'Pick<Profile, "display_name" | "avatar_url">'`.
**Why it happens:** The `Pick` in `ArticleWithAuthor` must be updated in sync with the select string change.
**How to avoid:** Update both `lib/supabase/articles.ts` in the same edit: the select string AND the `ArticleWithAuthor` type alias.

---

## Code Examples

### `app/loading.tsx` — Homepage Skeleton Fallback
```typescript
// Source: Next.js App Router loading.tsx convention
// https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
import SkeletonCard from '@/components/public/SkeletonCard'

export default function Loading() {
  return (
    <main className="min-h-screen bg-brand-black">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </main>
  )
}
```

### `lib/supabase/articles.ts` — Add `is_agent` to Select and Type
```typescript
// Source: existing project pattern in lib/supabase/articles.ts
export type ArticleWithAuthor = Article & {
  profiles: Pick<Profile, 'display_name' | 'avatar_url' | 'is_agent'> | null
}

// Updated select strings (both getPublishedArticles and getArticleBySlug):
.select('*, profiles!author_id(display_name, avatar_url, is_agent)')
```

### `app/articles/[slug]/page.tsx` — Author Meta Line with Avatar + Badge
```typescript
// Source: next/image docs + existing page.tsx pattern
// Add to imports:
import Image from 'next/image'  // already imported — Image is already used for cover

// Replace lines 115-120 (author meta):
<div className="flex flex-wrap gap-4 items-center text-brand-white/60 font-mono text-sm mb-8">
  {article.profiles?.display_name && (
    <div className="flex items-center gap-2">
      {article.profiles.avatar_url && (
        <Image
          src={article.profiles.avatar_url}
          alt={article.profiles.display_name}
          width={24}
          height={24}
          className="rounded-full object-cover"
        />
      )}
      <span>Written by: {article.profiles.display_name}</span>
      {article.profiles.is_agent ? (
        <span className="bg-brand-red/20 text-brand-red font-mono text-xs px-2 py-0.5 uppercase tracking-wider">
          AI
        </span>
      ) : (
        <span className="bg-brand-white/10 text-brand-white/60 font-mono text-xs px-2 py-0.5 uppercase tracking-wider">
          HUMAN
        </span>
      )}
    </div>
  )}
  {publishedDate && <span>{publishedDate}</span>}
</div>
```

**Note:** `Image` is already imported at line 2 of `app/articles/[slug]/page.tsx` — it is used for the cover image. No new import is needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/_app.js` loading spinner | `app/loading.tsx` Suspense convention | Next.js 13+ App Router | File-based; no manual `<Suspense>` wrapper required |
| `pages/` Router — no streaming | App Router streaming with partial hydration | Next.js 13+ | `loading.tsx` enables instant skeleton render before data arrives |
| Manual Supabase select field enumeration | FK hint notation `profiles!author_id(...)` | Phase 5 project decision | Disambiguates multi-FK relationships; already established in this project |

**Deprecated/outdated:**
- `getServerSideProps` + `fallback` loading pattern: Pages Router approach; this project uses App Router RSC exclusively.

---

## Open Questions

1. **Avatar URL hostname — Supabase Storage vs R2**
   - What we know: Admin image uploads go to R2 (`*.r2.dev`, already in `remotePatterns`). Agent avatar_urls set via seed or admin panel should also use R2.
   - What's unclear: Whether any profile's `avatar_url` might be set to a Supabase Storage URL (e.g., from Supabase Auth profile photos). Current seed data sets avatar to null.
   - Recommendation: Add `*.supabase.co` to `remotePatterns` as a precaution. Cost is near zero; prevents a hard runtime error if any avatar comes from Supabase Storage.

2. **Hero card skeleton fidelity**
   - What we know: The homepage has a special `ArticleHeroCard` (full-width, taller) for the first article, then a grid for the rest.
   - What's unclear: Whether the loading skeleton should replicate the hero + grid structure or just show 6 equal cards.
   - Recommendation: Use 6 equal `SkeletonCard` in the grid. The loading state is transient; matching structure adds code complexity for minimal benefit. The 6-card grid is acceptable as a skeleton placeholder.

3. **`is_agent` badge on the article listing cards (ArticleCard / ArticleHeroCard)**
   - What we know: ART-06 says "article listings AND detail pages display the assigned Author profile with distinct badges." The listing cards (`ArticleCard.tsx`, `ArticleHeroCard.tsx`) currently show no author attribution at all.
   - What's unclear: Whether Phase 10 must add author attribution to listing cards too, or only the detail page.
   - Recommendation: The audit's INT-05 specifically calls out `app/articles/[slug]/page.tsx` only. The phase goal says "render author avatars on article detail pages." Phase 10 scope is the detail page only. Listing cards can remain as-is (they already show status badge + title + burn price — adding author info would crowd the card layout).

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/unit/articles-query.test.ts` |
| Full suite command | `npx vitest run tests/unit/` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHARE-02 | `loading.tsx` renders 6 SkeletonCard components | unit (smoke) | `npx vitest run tests/unit/` | ❌ Wave 0 — new file `tests/unit/loading-skeleton.test.ts` |
| ART-06 | `getPublishedArticles` select includes `is_agent` in join string | unit | `npx vitest run tests/unit/articles-query.test.ts` | ✅ exists — extend with `is_agent` assertion |
| ART-06 | `getArticleBySlug` select includes `is_agent` in join string | unit | `npx vitest run tests/unit/articles-query.test.ts` | ✅ exists — extend with `is_agent` assertion |
| ART-06 | Avatar renders when `avatar_url` is present | manual / visual | DevTools on article detail page with seeded agent author | N/A |
| ART-06 | "AI" badge appears for `is_agent: true` profiles | unit (logic) | `npx vitest run tests/unit/loading-skeleton.test.ts` | ❌ Wave 0 |
| ART-06 | "HUMAN" badge appears for `is_agent: false` profiles | unit (logic) | `npx vitest run tests/unit/loading-skeleton.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/articles-query.test.ts`
- **Per wave merge:** `npx vitest run tests/unit/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/loading-skeleton.test.ts` — new file; smoke test that `Loading` default export exists and renders SkeletonCard count; badge logic tests for `is_agent` true/false rendering
- [ ] Extend `tests/unit/articles-query.test.ts` — add assertions that captured select string includes `is_agent` (similar to the existing `display_name` and `avatar_url` assertions at line 122-124)

*(Vitest and all tooling infrastructure is already installed and configured — no Wave 0 framework setup needed)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read:
  - `components/public/SkeletonCard.tsx` — component exists, no changes needed
  - `app/page.tsx` — homepage is async RSC; no `loading.tsx` exists at `app/`
  - `app/articles/[slug]/page.tsx` — `Image` already imported; `avatar_url` not rendered; `is_agent` not in select
  - `lib/supabase/articles.ts` — `avatar_url` in select and type; `is_agent` missing from both
  - `lib/supabase/types.ts` — `Profile.is_agent: boolean` confirmed present
  - `app/globals.css` — `@keyframes shimmer` confirmed at lines 63-67
  - `next.config.ts` — `remotePatterns` only includes `*.r2.dev`
  - `vitest.config.ts` — confirmed `environment: 'node'`, `include: ['tests/**/*.test.ts']`
  - `tests/unit/articles-query.test.ts` — existing assertions for `display_name` and `avatar_url` in select
  - `.planning/v1.0-MILESTONE-AUDIT.md` — INT-03 and INT-05 gap descriptions
- Next.js App Router `loading.tsx` convention — project already uses Next.js 16.1.6 App Router; `loading.tsx` is the standard file-based Suspense mechanism established in Next.js 13+

### Secondary (MEDIUM confidence)
- `next/image` `remotePatterns` behavior — confirmed from project `next.config.ts` pattern and Next.js 15/16 docs; hostname must be explicitly allowlisted

### Tertiary (LOW confidence)
- Supabase Storage URL hostname for potential avatar URLs — not verified; project uploads go to R2; adding `*.supabase.co` to `remotePatterns` is a precaution only

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all tooling present for 9 completed phases
- Architecture patterns: HIGH — both patterns derived directly from existing codebase code read and Next.js App Router conventions already in use
- Pitfalls: HIGH — derived from actual code constraints (missing field in select, missing hostname in remotePatterns, Server Component rules for loading.tsx)
- Test gaps: HIGH — existing test file pattern is clear; new test cases follow identical mock structure

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable stack; no fast-moving dependencies in scope)
