# TAPAS emergency frontend repair — 7 September 2026

## Outcome

T1 and T2 implemented. T3 frontend experiences and restored components implemented; operational ward science/alerts still require genuine feeds. T4 browser/PWA/mobile work verified; physical device installation has not been tested.

The independent MapLibre graduated-circle layer uses 68 genuine national Open-Meteo model points. Regional view requests up to 40 samples and city view up to 25, debounced 500 ms. Returned model cells are deduplicated, plotted at the provider coordinates, and may be fewer than requested samples. City opening zoom respects model resolution. The legend sits below the canvas; map navigation has 44 px targets. No ward rectangles are bundled.

Heat Index uses the cited NOAA Rothfusz regression with both humidity corrections, applicability screening, finite/null guards and explicit Celsius/Fahrenheit conversions. UTCI is unavailable without a validated MRT implementation; WBGT is unavailable without natural wet-bulb/globe inputs or a supplied validated feed. No radiation/night UTCI result or work permission is invented.

## Genuine recordings and source behavior

- Weather: 98 recorded locations = 68 national requests plus 30 geocoded cities. Original responses and URLs in src/data/weather-snapshot.json; first weather capture 2026-09-07T15:27:16.157Z. Provider valid times remain unchanged. The compact heat index is reproducible with scripts/derive-weather.cjs and was verified byte-for-byte identical (SHA-256 dac781b2e343a6361584749585eb4ae236159e787819020b238ac8d559268a5f).
- POIs: 40 original Mumbai OpenStreetMap records, with per-record and OSM database timestamps preserved. Normalization filters unusable/out-of-radius entries. Hyderabad/Karimnagar recording attempts returned 504/429; no substitute facilities were invented.
- Recordings and capture scripts committed in 6aec630. Frontend implementation changes remain in the working tree with earlier authorized changes preserved.
- Data resolution: validated live response, validated browser cache, genuine matching snapshot, then explicit unavailable. Snapshot weather is limited to a recorded provider point within 10 km and labels that distance. Cached/snapshot timestamps are not replaced with the current time.
- Search: real Nominatim responses were checked for Hyderabad, Mumbai and Karimnagar. Explicit submit and a shared 1.1-second request gate respect public Nominatim policy; the browser supplies its Referer. Search is not constrained to bundled cities.
- Nearby help: Overpass medical/drinking-water records, source links, straight-line Haversine distances and real-coordinate Google Maps directions. Availability is unverified. Cooling/misting/shelter data remains explicitly absent without a sourced feed.

## Experiences

/login provides citizen entry and public demo accounts. /officer shares local map, weather, resources, precautions and links to occupational/alert views. /authority composes the same components with national sampled Heat Index ranking and local drill-down. Frontend role guards, reload persistence, role switching and logout work; this is not secure authentication.

The occupational chart and work/rest table preserve missing values; Level 5 alerts, expiry filtering, geographic matching and failed CAP-download handling are tested. These views do not manufacture operational records when their feed is absent. NDMA precautions respond to actual calculated categories.

## Verification actually executed

| Check | Result |
| --- | --- |
| npm.cmd run build | PASS; all seven application routes and production worker built |
| npm.cmd run lint | PASS; no ESLint warnings/errors (Next reports its command deprecation) |
| npm.cmd run typecheck | PASS after the final build |
| npm.cmd test | 77/77 PASS, including 8 thermal tests and 6 repair data invariants |
| tsc.cmd -p tsconfig.sw.json --noEmit --incremental false | PASS |
| Citizen/repair/role development browser suite | 23/23 PASS |
| Final production live-provider/PWA/repair/role suite | 11/11 PASS; overlaps earlier checks, 27 distinct browser tests in total |
| National cold map with weather provider blocked | 728 ms from navigation start to rendered MapLibre points; 68 source points and Snapshot provenance |
| Real search flow | Hyderabad → Mumbai → Karimnagar; each had actual rendered model points, genuine conditions/fallback labels; Mumbai had directions to real OSM listings |
| Mobile widths | 320, 360, 375, 390, 412 px; public and role routes without horizontal overflow; additional public checks at 768/1280 px |
| Offline | One worker; preserved selected URL; precached unvisited occupational route; unknown-route offline page; cached Delhi weather does not leak into Mumbai |

Screenshots were inspected in artifacts/qa: repaired-national-heat.png, local-map-390.png, login-390.png, authority-390.png and citizen-390.png. These show actual browser output, not generated mockups. Browser tests use installed Chrome. Deterministic fixtures stay exclusively under src/tests and never enter operational code.

## Remaining external dependencies

Operational ward risk, occupational WBGT, mortality, alerts and CAP exports need a genuine scoped scientific backend. Real administrative boundaries, current relief inventories and authority notice feeds remain optional deployment dependencies. Public weather/geocoder/Overpass services may throttle or time out; OSM coverage and operational availability are incomplete. Secure production authorization requires a server. Uncached basemap tiles require connectivity; browser storage may be evicted. Physical Android/iOS install behavior was not tested.

## Main changed areas

- Map/data: src/lib/heatGrid.ts, src/components/map/HeatMap.tsx, ThermalLayer.tsx, src/lib/weather.ts, src/lib/dataState.ts, src/lib/client.ts, src/components/data/.
- Science/help: src/lib/thermal/, src/lib/content/precautions.ts, src/lib/geocoding.ts, src/lib/resources.ts, src/components/help/, src/components/weather/.
- Shared selection/roles: src/components/providers/LocationProvider.tsx, src/components/dashboard/CitizenDashboard.tsx, src/lib/auth/demoAuth.ts, src/components/auth/RoleGuard.tsx, src/app/login/, officer/, authority/.
- Verification/PWA/documentation: src/tests/, src/sw.ts, src/lib/pwa.ts, next.config.ts, public/manifest.json, README.md, .env.example, docs/REPAIR_LOG.md.

Local production preview: http://localhost:3100/dashboard and http://localhost:3100/login.
