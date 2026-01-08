'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AuthDialog } from '@/components/auth-dialog'

interface AuthContextType {
  showLoginModal: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const router = useRouter()

  const showLoginModal = () => {
    setLoginModalOpen(true)
  }

  const handleLoginSuccess = () => {
    setLoginModalOpen(false)
  }

  const handleLoginCancel = () => {
    setLoginModalOpen(false)
    router.push('/')
    toast.warning('You must be logged in to do that')
  }

  return (
    <AuthContext.Provider value={{ showLoginModal }}>
      {children}
      <AuthDialog
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={handleLoginSuccess}
        onCancel={handleLoginCancel}
      />
    </AuthContext.Provider>
  )
}
