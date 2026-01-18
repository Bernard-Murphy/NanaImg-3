import React from 'react'
import { render, screen, waitFor } from '../test-utils'
import { AuthDialog } from '@/components/auth-dialog'
import { ME_QUERY } from '@/components/navbar'
import { gql } from '@apollo/client'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!, $recaptchaToken: String) {
    login(username: $username, password: $password, recaptchaToken: $recaptchaToken) {
      success
      message
      user {
        id
        username
      }
      token
    }
  }
`

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!, $recaptchaToken: String) {
    register(input: $input, recaptchaToken: $recaptchaToken) {
      success
      message
      user {
        id
        username
      }
      token
    }
  }
`

const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!, $username: String!, $recaptchaToken: String) {
    requestPasswordReset(email: $email, username: $username, recaptchaToken: $recaptchaToken)
  }
`

const defaultMocks = [
  {
    request: {
      query: ME_QUERY,
    },
    result: {
      data: {
        me: null,
      },
    },
  },
]

describe('AuthDialog', () => {
  describe('Dialog Opening', () => {
    it('renders trigger button', () => {
      render(
        <AuthDialog>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      expect(screen.getByRole('button', { name: /open auth/i })).toBeInTheDocument()
    })

    it('opens dialog when trigger is clicked', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await user.click(screen.getByRole('button', { name: /open auth/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Welcome to Feednana')).toBeInTheDocument()
      })
    })

    it('opens dialog with controlled state', async () => {
      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Welcome to Feednana')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('defaults to login tab', async () => {
      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      })
    })

    it('can switch to register tab', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /register/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /register/i }))
      
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
      })
    })

    it('can switch to forgot password tab', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /forgot password/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /forgot password/i }))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
      })
    })

    it('opens with specified default tab', async () => {
      render(
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="register">
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      })
    })
  })

  describe('Login Form Validation', () => {
    it('shows error when username is empty', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /^login$/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when password is empty', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/^username$/i), 'testuser')
      await user.click(screen.getByRole('button', { name: /^login$/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Register Form Validation', () => {
    it('validates username length', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="register">
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/username/i), 'ab')
      await user.click(screen.getByRole('button', { name: /^register$/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument()
      })
    })

    it('shows email input in register form', async () => {
      render(
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="register">
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        expect(emailInput).toBeInTheDocument()
        expect(emailInput).toHaveAttribute('type', 'email')
      })
    })

    it('validates password confirmation matches', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="register">
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/username/i), 'testuser')
      await user.type(screen.getByLabelText(/display name/i), 'Test User')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword')
      await user.click(screen.getByRole('button', { name: /^register$/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
      })
    })

    it('validates username format (alphanumeric and underscores only)', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="register">
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/username/i), 'invalid@user!')
      await user.click(screen.getByRole('button', { name: /^register$/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/username can only contain letters, numbers, and underscores/i)).toBeInTheDocument()
      })
    })
  })

  describe('Forgot Password Form', () => {
    it('renders forgot password form fields', async () => {
      render(
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="forgot">
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
      })
    })

    it('validates required fields', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()

      render(
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="forgot">
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /send reset link/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Description', () => {
    it('shows informative description text', async () => {
      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByText(/login or register to vote/i)).toBeInTheDocument()
      })
    })
  })

  describe('reCAPTCHA Notice', () => {
    it('shows reCAPTCHA privacy notice', async () => {
      render(
        <AuthDialog open={true} onOpenChange={() => {}}>
          <button>Open Auth</button>
        </AuthDialog>,
        { mocks: defaultMocks }
      )
      
      await waitFor(() => {
        expect(screen.getByText(/this site is protected by recaptcha/i)).toBeInTheDocument()
      })
    })
  })
})

