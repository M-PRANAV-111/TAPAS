import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // The service worker is only useful in a production build; leaving it on in
  // dev makes hot reload fight the precache.
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: false,
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
}

export default withSerwist(nextConfig)
