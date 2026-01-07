'use client'

import { ApolloProvider } from '@apollo/client'
import { apolloClient } from '@/lib/apollo-client'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
      <Toaster />
    </ApolloProvider>
  )
}

