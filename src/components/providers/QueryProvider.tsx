'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A heat forecast is issued a few times a day, not continuously —
            // refetching on every tab focus would only burn a field officer's
            // data plan.
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
            staleTime: 30 * 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}
