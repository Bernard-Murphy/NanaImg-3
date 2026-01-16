import React from 'react'
import { render, screen } from '../../test-utils'
import Spinner from '@/components/ui/spinner'

describe('Spinner', () => {
  it('renders with default props', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { container, rerender } = render(<Spinner size="sm" />)
    let svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '1rem')
    expect(svg).toHaveAttribute('height', '1rem')

    rerender(<Spinner size="md" />)
    svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '2rem')
    expect(svg).toHaveAttribute('height', '2rem')

    rerender(<Spinner size="lg" />)
    svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '3rem')
    expect(svg).toHaveAttribute('height', '3rem')

    rerender(<Spinner size="xl" />)
    svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '4rem')
    expect(svg).toHaveAttribute('height', '4rem')
  })

  it('renders with custom color', () => {
    const { container } = render(<Spinner color="blue" />)
    const circle = container.querySelector('circle')
    const animate = circle?.querySelector('animate[attributeName="stroke"]')
    expect(animate).toHaveAttribute('values', 'rgb(13, 110, 253)')
  })

  it('renders with multiColor option', () => {
    const { container } = render(<Spinner multiColor />)
    const circle = container.querySelector('circle')
    const animate = circle?.querySelector('animate[attributeName="stroke"]')
    expect(animate).toHaveAttribute('values', '#4285F4;#DE3E35;#F7C223;#1B9A59;#4285F4')
  })

  it('renders with white color by default', () => {
    const { container } = render(<Spinner />)
    const circle = container.querySelector('circle')
    const animate = circle?.querySelector('animate[attributeName="stroke"]')
    expect(animate).toHaveAttribute('values', '#fff')
  })

  it('applies custom className', () => {
    const { container } = render(<Spinner className="custom-spinner" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('custom-spinner')
  })

  it('renders with named colors', () => {
    const colors = [
      { name: 'primary', rgb: 'rgb(18, 102, 241)' },
      { name: 'danger', rgb: 'rgb(249, 49, 84)' },
      { name: 'success', rgb: 'rgb(0, 183, 74)' },
    ]

    colors.forEach(({ name, rgb }) => {
      const { container } = render(<Spinner color={name} />)
      const circle = container.querySelector('circle')
      const animate = circle?.querySelector('animate[attributeName="stroke"]')
      expect(animate).toHaveAttribute('values', rgb)
    })
  })
})

