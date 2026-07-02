# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- [PRD.md](PRD.md) — the spec the app implements. Treat as source of truth for scope before adding features.
- [practice.hwpx](practice.hwpx) — original team report template, **mirrored at** `dashboard/public/template.hwpx` so the server-side HWPX builder can read it via `fs`. Keep the two in sync if the upstream template ever changes.
- [dashboard/](dashboard/) — the Next.js app (the actual product). All commands below assume `cd dashboard`.

## Commands

```bash
cd dashboard

npm run dev        # local dev (Turbopack, http://localhost:3000)
npm run build      # production build — also runs TypeScript check
npm run lint       # eslint

vercel --prod      # deploy to Vercel (project already linked, alias https://dashboard-nu-one-97.vercel.app)
```

There is no test suite. `npm run build` is the closest thing to a smoke test — it type-checks and statically renders pages.

## Next.js 16 caveat (important)

This project uses **Next.js 16**, not 15. The bundled [dashboard/AGENTS.md](dashboard/AGENTS.md) warns:

> APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code.

Notable real differences worth remembering: dynamic-route `params` is a `Promise`, `searchParams` is a `Promise`, Tailwind v4 with `@import "tailwindcss"` + `@theme` (no `tailwind.config.js`), `RouteContext<...>` global helper for route handlers.

## Architecture

### State lives in the browser (no DB, no auth)

This is an MVP. All persistent state is held in the **client's `localStorage`** via [`useDashboardStore`](dashboard/src/store/useDashboardStore.ts) (Zustand + `persist` middleware). There is no Supabase, no auth, no server-side data. The PRD anticipates Supabase as the next step — when adding it, replace the actions inside `useDashboardStore` rather than scattering DB calls across components.

The page is fully client-rendered. [DashboardClient.tsx](dashboard/src/components/DashboardClient.tsx) gates render on a `useEffect`-set `hydrated` flag — if you bypass that guard you will hit Zustand-persist hydration mismatches with the server-rendered shell.

**Selector reference stability**: any Zustand selector that returns a *derived* collection (filter/map/Array.from) must wrap with `useShallow` from `zustand/react/shallow`, otherwise `useSyncExternalStore` logs *"The result of getSnapshot should be cached to avoid an infinite loop"* and renders thrash. See [`useLeaderSuggestions`](dashboard/src/store/useDashboardStore.ts) for the pattern. Selectors that return store-owned object references (e.g. the active week) do not need it.

### HWPX builder ([dashboard/src/lib/hwpx.ts](dashboard/src/lib/hwpx.ts))

The whole point of this app is to regenerate the team's `.hwpx` report from edited data. The builder is invoked from the `POST /api/hwpx` route handler ([dashboard/src/app/api/hwpx/route.ts](dashboard/src/app/api/hwpx/route.ts)) which receives a `Week` JSON and returns a binary HWPX.

Key design decisions — keep them in mind before refactoring:

1. **String-based, not XML-parsed.** The builder operates on `Contents/section0.xml` as a string and uses regex+slice. Hancom Office is strict about attribute order and self-closing forms — round-tripping through `fast-xml-parser` or DOMParser produces files Hancom rejects, even when they pass schema validation. Don't switch parsers without first verifying the output opens cleanly in Hancom.

2. **Template structure is load-bearing.** The template MUST have exactly 2 `<hp:tbl>` blocks: table 0 = 수행 Project (header + 1 "group-first" row with rowSpan + 1 plain data row), table 1 = 발주예상 (header + 1 data row). Education and 기타 content live **after the last `</hp:tbl>`**. The builder enforces this slice — `replacePostTablesText` only modifies the post-tables region so that education-role keywords ("안전", "기계", "토목" …) do not clobber identical strings inside the 수행 table's cells.

3. **`<hp:t>` has no attributes.** Use exact `<hp:t>` matching, never `<hp:t[^>]*>` — the latter also matches `<hp:tc>`, `<hp:tbl>`, etc., and silently produces wildly broken output (e.g. tables duplicated 3x). Same goes for verification scripts.

4. **Empty cells use self-closing `<hp:run charPrIDRef="X"/>`.** `setRunText` must handle three shapes: existing `<hp:t>...</hp:t>`, self-closing `<hp:run/>`, and empty `<hp:run></hp:run>`. Skipping the self-closing case is why upcoming-project rows came out blank during initial development.

5. **Group rows clone from template rows.** Don't hand-write `<hp:tc>` XML — splice cells from `groupFirstTemplate` (9 cells, with the "구분" rowSpan cell) or `dataTemplate` (8 cells) and update `<hp:cellSpan>` / `<hp:cellAddr>` and `<hp:tbl rowCnt="…">` to match.

### Deployed environment

- Vercel project `jihyo-s-projects1/dashboard`, signed in as `dkswlgy05-tech`.
- Production URL: https://dashboard-nu-one-97.vercel.app
- The Vercel project's **Root Directory is `dashboard/`** — necessary because the Next.js app is in a subfolder. If you connect this repo to Vercel via GitHub integration, set the same Root Directory or builds will fail with "package.json not found".

## Styling

Linear/Notion-flavored: neutral grays + a single blue accent, hairline 1px borders, 8px grid, Pretendard via CDN `<link>` in [layout.tsx](dashboard/src/app/layout.tsx). Tokens are defined in [globals.css](dashboard/src/app/globals.css) under `@theme` (Tailwind v4). When adding a new component, reach for the existing `hairline`, `cell-input`, `focus-ring` utilities and the `bg-surface` / `text-fg-muted` color tokens before adding ad-hoc classes.
