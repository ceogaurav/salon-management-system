'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }))

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // If no valid Clerk key, render without ClerkProvider for development
  if (!publishableKey || publishableKey.includes('placeholder')) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className='w-full'>
          <div className='bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4'>
            <p className='text-sm text-yellow-700'>
              <strong>Development Mode:</strong> Clerk authentication not configured. Update .env.local with valid Clerk credentials.
            </p>
          </div>
          {children}
        </div>
      </QueryClientProvider>
    )
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  )
}