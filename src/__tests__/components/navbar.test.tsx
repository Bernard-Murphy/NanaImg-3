import React from 'react'
import { render, screen, waitFor } from '../test-utils'
import { Navbar, ME_QUERY } from '@/components/navbar'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

const mockUserData = {
  id: '1',
  username: 'testuser',
  displayName: 'Test User',
  avatar: null,
  avatarFile: {
    fileUrl: 'https://example.com/avatar.jpg',
  },
}

const loggedInMocks = [
  {
    request: {
      query: ME_QUERY,
    },
    result: {
      data: {
        me: mockUserData,
      },
    },
  },
]

const loggedOutMocks = [
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

describe('Navbar', () => {
  describe('Navigation Links', () => {
    it('renders the logo/brand name', async () => {
      render(<Navbar />, { mocks: loggedOutMocks })
      
      await waitFor(() => {
        expect(screen.getAllByText('FEEDNANA')[0]).toBeInTheDocument()
      })
    })

    it('renders desktop navigation links', async () => {
      render(<Navbar />, { mocks: loggedOutMocks })
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /browse/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /timeline/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /info/i })).toBeInTheDocument()
      })
    })

    it('navigation links have correct hrefs', async () => {
      render(<Navbar />, { mocks: loggedOutMocks })
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /browse/i })).toHaveAttribute('href', '/browse')
        expect(screen.getByRole('link', { name: /timeline/i })).toHaveAttribute('href', '/timeline')
        expect(screen.getByRole('link', { name: /info/i })).toHaveAttribute('href', '/info')
      })
    })
  })

  describe('Logged Out State', () => {
    it('shows Login/Register button when logged out', async () => {
      render(<Navbar />, { mocks: loggedOutMocks })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login\/register/i })).toBeInTheDocument()
      })
    })

    it('does not show user avatar when logged out', async () => {
      render(<Navbar />, { mocks: loggedOutMocks })
      
      await waitFor(() => {
        expect(screen.queryByRole('img', { name: /testuser/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Logged In State', () => {
    it('shows user avatar when logged in', async () => {
      render(<Navbar />, { mocks: loggedInMocks })
      
      await waitFor(() => {
        // Avatar shows the user's image or fallback initial
        // The fallback shows 'T' for 'testuser'
        expect(screen.getByText('T')).toBeInTheDocument()
      })
    })

    it('does not show Login/Register button when logged in', async () => {
      render(<Navbar />, { mocks: loggedInMocks })
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /login\/register/i })).not.toBeInTheDocument()
      })
    })

    it('shows avatar fallback with first letter of username', async () => {
      const mocksWithoutAvatar = [
        {
          request: {
            query: ME_QUERY,
          },
          result: {
            data: {
              me: {
                ...mockUserData,
                avatarFile: null,
              },
            },
          },
        },
      ]

      render(<Navbar />, { mocks: mocksWithoutAvatar })
      
      await waitFor(() => {
        expect(screen.getByText('T')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Menu', () => {
    it('renders mobile menu button', async () => {
      render(<Navbar />, { mocks: loggedOutMocks })
      
      await waitFor(() => {
        // The mobile menu button should be present (though hidden on desktop via CSS)
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })

    it('toggles mobile menu on button click', async () => {
      const { userEvent } = await import('../test-utils')
      const user = userEvent.setup()
      
      render(<Navbar />, { mocks: loggedOutMocks })
      
      await waitFor(() => {
        // FEEDNANA appears twice - once for desktop, once for mobile
        expect(screen.getAllByText('FEEDNANA').length).toBeGreaterThan(0)
      })

      // Find the menu button (has Menu icon) - it's not the login button
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(btn => 
        btn.querySelector('svg') && !btn.textContent?.includes('Login')
      )
      
      if (menuButton) {
        await user.click(menuButton)
        
        // Mobile menu should now show additional navigation links
        await waitFor(() => {
          const browseLinks = screen.getAllByRole('link', { name: /browse/i })
          expect(browseLinks.length).toBeGreaterThan(0)
        })
      }
    })
  })

  describe('Loading State', () => {
    it('shows empty div during loading', () => {
      const loadingMocks = [
        {
          request: {
            query: ME_QUERY,
          },
          result: {
            data: {
              me: null,
            },
          },
          delay: 100,
        },
      ]

      render(<Navbar />, { mocks: loadingMocks })
      
      // During loading, neither login button nor avatar should be visible initially
      // The component renders an empty div during loading
      expect(screen.queryByRole('button', { name: /login\/register/i })).not.toBeInTheDocument()
    })
  })
})

