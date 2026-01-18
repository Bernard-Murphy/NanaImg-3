import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MockedProvider, MockedResponse } from '@apollo/client/testing'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: MockedResponse[]
  addTypename?: boolean
}

/**
 * Custom render function that wraps components with necessary providers
 * for testing (Apollo MockedProvider, etc.)
 */
function customRender(
  ui: ReactElement,
  {
    mocks = [],
    addTypename = false,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={addTypename}>
        {children}
      </MockedProvider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Override render with custom render
export { customRender as render }

