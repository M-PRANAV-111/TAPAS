# TAPAS — Thermal Analytics & Public-health Advisory System

Ward-level heatwave early-warning dashboard for Indian municipal authorities.
Smart India Hackathon 2026 · problem statement **SIH26083** · pilot city
**Hyderabad (GHMC)**.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000> — `/` redirects to `/dashboard`.

The frontend expects the TAPAS API at `http://localhost:8000`. Point it
elsewhere with `NEXT_PUBLIC_API_URL` in `.env.local`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (service worker disabled) |
| `npm run build` | Production build, generates `public/sw.js` |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e (starts a dev server itself) |
| `npm run test:e2e:install` | One-time Chromium download for Playwright |

## Demo data fallback

If the backend is unreachable, the API client serves deterministic sample data
from `src/lib/demo.ts` instead of leaving the dashboard blank, and a **Demo
data** chip appears in the navbar. Nothing silently passes sample numbers off
as a live forecast. Turn it off with `NEXT_PUBLIC_DEMO_FALLBACK=false`, and
failed requests will surface as error states instead.

This exists so the dashboard is presentable — and the e2e suite runnable —
before the backend is up. Every number it produces is illustrative.

## API contract

`src/lib/types.ts` is the single source of truth for the shapes the UI
consumes; `src/lib/api.ts` normalises what the backend actually sends
(a bare array or an envelope, `risk_level` or `level`, missing optional fields)
so no single field can blank out a panel.

| Endpoint | Used by |
| --- | --- |
| `GET /api/risk/map?date=` | Map choropleth, occupational ward list |
| `GET /api/risk/ranking?date=&limit=` | Left ranking sidebar |
| `GET /api/risk/{ward_id}?days=5` | 5-day risk strip |
| `GET /api/forecast/{ward_id}` | 48-hour UTCI chart |
| `GET /api/occupational/{ward_id}?date=` | WBGT chart and work schedule |
| `GET /api/facilities/{ward_id}` | Facilities tab |
| `GET /api/alerts?level=&limit=` | Alerts page, ward advisory text |
| `GET /api/alerts/{id}/cap` | CAP 1.2 XML download |
| `GET /api/hindcast` | Validation table on `/about` |

## Structure

```
src/
├── app/              dashboard · occupational · alerts · about
├── components/
│   ├── map/          MapLibre choropleth, ward layer, day slider + legend
│   ├── ward/         drill-down panel, 5-day strip, UTCI chart, facilities
│   ├── risk/         RiskBadge, RiskRanking, DeathsDisplay
│   ├── alerts/       AlertCard, CapDownload
│   ├── occupational/ WbgtChart
│   ├── layout/       Navbar, OfflineBanner
│   ├── providers/    TanStack Query client, service worker registration
│   └── ui/           shadcn/ui primitives (slate base)
├── hooks/            useRiskMap · useWard · useAlerts · useOnlineStatus
├── lib/              api · types · constants · demo · utils
├── sw.ts             Serwist service worker
└── tests/            Vitest unit tests + Playwright e2e
```

## Design rules worth keeping

Three of these are load-bearing for the product, not style preferences:

1. **`DeathsDisplay` never shows a bare number.** The 90% range and the
   citation (de Bont et al. 2024) are part of the figure. Below half a death it
   says "excess mortality not expected" rather than rounding to zero.
2. **A UTCI value never appears without its ward baseline.** The chart draws
   the ward's own 97th-percentile climatology alongside the forecast, and the
   panel states the gap in words: *"Peak UTCI 46.1°C is 4.8°C above the 97th
   percentile for this ward in September."*
3. **The offline banner is not optional.** A warning system that fails silently
   offline is worse than none. The banner names the age of the data on screen,
   and dismissing it only silences the current outage.

Colour is never the only carrier of meaning: every risk colour travels with its
level number and label, and the map has an accessible text mirror of the
choropleth.

## PWA

- `public/manifest.json`, icons at `public/icons/icon-{192,512}.png`.
- Service worker built by Serwist from `src/sw.ts` into `public/sw.js`
  (production builds only — in dev it would fight hot reload).
- Caching: app shell precached; `/api/risk/map` stale-while-revalidate with a
  2-hour cap; ward polygons cache-first; OSM tiles cache-first, 500 entries;
  every other API call network-first with a cached fallback.
- Offline behaviour is verified: after one visit the app shell boots with no
  network, shows the last good forecast, the cached tiles and ward colours, and
  the offline banner. With nothing cached at all the map greys out and says
  "Cached data unavailable — connect to internet" rather than showing an empty
  city.

## Map tiles

Raster OpenStreetMap tiles — no key, no billing. OSM's tile usage policy is not
meant for production traffic, so before a real deployment point `BASE_STYLE` in
`src/components/map/HeatMap.tsx` at a self-hosted or commercial tile server.

## Ward geometry

`public/ward-hyderabad.geojson` holds five placeholder rectangles for the demo.
Replace it with actual GHMC ward boundaries (simplify with mapshaper to under
500 KB) — the only properties the app requires are `ward_id`, `name` and
`city`.

## Testing

16 unit tests cover the two components most likely to mislead a reader —
`RiskBadge` and `DeathsDisplay`. Six Playwright specs cover the flows a judge
will actually click: map load, ward drill-down, day switching, the WBGT chart,
alert cards with CAP export, and the offline banner.
