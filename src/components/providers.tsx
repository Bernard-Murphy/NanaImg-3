'use client'

import { ApolloProvider } from '@apollo/client'
import { apolloClient } from '@/lib/apollo-client'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/auth-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ApolloProvider>
  )
}

