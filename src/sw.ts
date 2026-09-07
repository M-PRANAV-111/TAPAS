/// <reference lib="webworker" />

/**
 * TAPAS service worker.
 *
 * Priorities, in order:
 *   1. The app shell must open with no network at all.
 *   2. The last good forecast must survive a dead connection.
 *   3. Stale data must never be presented as fresh — the UI reads
 *      `navigator.onLine` and the cache timestamp and says so.
 */

import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const TWO_HOURS = 2 * 60 * 60

const serwist = new Serwist({
  // App shell: every page, JS chunk and stylesheet, precached at install and
  // then served cache-first.
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Ward polygons never change between forecast runs.
      matcher: ({ url }) => url.pathname === '/ward-hyderabad.geojson',
      handler: new CacheFirst({
        cacheName: 'tapas-ward-geometry',
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 4 }),
        ],
      }),
    },
    {
      // The choropleth payload. Shown immediately from cache, refreshed in the
      // background, and expired after two hours so a stale day cannot linger.
      matcher: ({ url }) => url.pathname.startsWith('/api/risk/map'),
      handler: new StaleWhileRevalidate({
        cacheName: 'tapas-risk-map',
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: TWO_HOURS }),
        ],
      }),
    },
    {
      matcher: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
      handler: new CacheFirst({
        cacheName: 'tapas-map-tiles',
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      // Every other TAPAS endpoint: fresh when possible, cached copy when not.
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'tapas-api',
        networkTimeoutSeconds: 6,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
})

serwist.addEventListeners()
