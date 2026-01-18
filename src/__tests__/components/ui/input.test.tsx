import React from 'react'
import { render, screen } from '../../test-utils'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('renders different input types', () => {
    const { rerender } = render(<Input type="text" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'text')

    rerender(<Input type="password" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')

    rerender(<Input type="email" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')

    rerender(<Input type="number" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number')
  })

  it('handles disabled state', () => {
    render(<Input disabled data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed')
  })

  it('accepts and applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveClass('custom-class')
  })

  it('handles value changes', async () => {
    const handleChange = jest.fn()
    const { userEvent } = await import('../../test-utils')
    const user = userEvent.setup()

    render(<Input onChange={handleChange} data-testid="input" />)
    const input = screen.getByTestId('input')
    
    await user.type(input, 'test')
    expect(handleChange).toHaveBeenCalled()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} data-testid="input" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('supports controlled input', async () => {
    const { userEvent } = await import('../../test-utils')
    const user = userEvent.setup()
    
    function ControlledInput() {
      const [value, setValue] = React.useState('')
      return (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="input"
        />
      )
    }

    render(<ControlledInput />)
    const input = screen.getByTestId('input')
    
    await user.type(input, 'hello')
    expect(input).toHaveValue('hello')
  })

  it('applies focus styles', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('focus-visible:ring-2')
  })

  it('handles read-only state', () => {
    render(<Input readOnly value="Read only" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveValue('Read only')
  })
})

