'use client'

import { useEffect } from 'react'

/**
 * Registers the generated service worker.
 *
 * Only in production builds: in dev the worker is not emitted, and a stale
 * registration would serve precached chunks over hot-reloaded ones.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('[tapas] service worker registration failed', error)
      })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)

    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
