# Emergency frontend repair log

- History contains one commit (3d23e4e); HEAD~5 does not exist, so the regression is in the current working changes rather than attributable to five commits.
- HeatMap renders only backend ward risk and optional POIs; missing scientific boundaries remove every heat mark while the basemap still loads.
- Weather/weather KPIs depend on a selected location and have no bundled genuine snapshot; cold national view has no weather values.
- API has validated browser-cache fallback but no explicit snapshot result, and the main risk card cannot classify source weather.
- Nearby default Private.coffee requests timed out in prior real browser testing; cached/snapshot POI fallback is absent.
- Existing nullable science, CAP validation, shared location state and production offline shell are retained; no reset is used.
- Initial concurrent typecheck collided with Next rebuilding generated types; checks will run sequentially after builds.

- Repaired: independent 68-point national Open-Meteo heat layer, adaptive regional/city requests, true provider-coordinate plotting, deduplication and a legend outside the mobile canvas.
- Repaired: explicit data states, validated cache/snapshot resolution, real weather KPIs and NOAA Heat Index; missing UTCI/WBGT stay unavailable.
- Repaired: arbitrary Nominatim search with explicit submission, shared location/race protection, real Overpass fallback and NDMA precautions.
- Restored: citizen, Mandal Officer and Higher Authority compositions with clearly insecure demo-session guards and logout.
- Verified: 77 unit tests, 27 distinct browser tests across development/production runs, clean build/lint/typecheck/SW check; final production national heat painted in 728 ms.
- Genuine recordings committed separately as 6aec630; no reset or unrelated working-tree rollback.

## 9 September 2026 — landing page, contract handoff, officer response demo

- Triage: build/lint/typecheck/tests were already clean (77/77) at session start — no regression to repair this session.
- Added `/` as a real landing page (`src/app/page.tsx` no longer redirects): dark hero with CSS-only drifting gradient blobs, a live city ticker reusing the same batched Open-Meteo parser as the national heat grid (`src/lib/landing.ts`), three role cards, and static "How it works" / capabilities / data-transparency / footer sections (`src/components/landing/`).
- Wrote `docs/API_CONTRACT.md`: the implementer-facing spec for Session 2's backend, pointing at the ward-risk contract that already exists in `src/lib/types.ts`/`src/lib/client.ts` rather than inventing a parallel one, and explicitly scoping out the direct-to-provider adapters (weather/geocoding/facilities) that need no backend.
- Added the officer "Prepare Response" demo panel (`src/components/officer/PrepareResponsePanel.tsx`, `src/data/demoContacts.ts`, `src/lib/officer/demoResponse.ts`), wired into `WardPanel` behind `officer && risk_level >= 4`. Confirmed by inspection that it stays correctly dormant today — the ward-risk backend it depends on doesn't exist until Session 2 runs — rather than showing on fabricated data.
- Verified: build, lint, `tsc --noEmit`, `tsc -p tsconfig.sw.json --noEmit`, `npm test` (77/77) all clean after every change; Playwright smoke checks confirm the landing page renders real Open-Meteo data, is overflow-free at 390px, and the officer login flow throws no console errors.
