import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import EmotionQuadrantSuffix from '../EmotionQuadrantSuffix.vue'
import type { Quadrant } from '@/domain/emotion'

describe('EmotionQuadrantSuffix', () => {
  it('renders nothing when quadrant is null', () => {
    const { container } = render(EmotionQuadrantSuffix, {
      props: { quadrant: null },
    })

    // The button is wrapped in <Transition>, so query the button directly
    expect(container.querySelector('button.quadrant-suffix')).toBeNull()
  })

  it('renders the quadrant icon, label and close icon when quadrant is set', () => {
    render(EmotionQuadrantSuffix, {
      props: { quadrant: 'high-energy-high-pleasantness' as Quadrant },
    })

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // The label comes from the locale; in tests t() returns the key path or
    // resolved value depending on test setup. We assert the button has
    // appropriate classes / structure regardless of locale resolution.
    expect(button.querySelector('.suffix-icon')).not.toBeNull()
    expect(button.querySelector('.suffix-label')).not.toBeNull()
    expect(button.querySelector('.suffix-close')).not.toBeNull()
  })

  it('emits "clear" when clicked', async () => {
    const { emitted } = render(EmotionQuadrantSuffix, {
      props: { quadrant: 'low-energy-low-pleasantness' as Quadrant },
    })

    const button = screen.getByRole('button')
    await fireEvent.click(button)

    expect(emitted('clear')).toBeTruthy()
    expect(emitted('clear')).toHaveLength(1)
  })

  it('uses backToQuadrants as the aria-label', () => {
    render(EmotionQuadrantSuffix, {
      props: { quadrant: 'high-energy-low-pleasantness' as Quadrant },
    })

    const button = screen.getByRole('button')
    const ariaLabel = button.getAttribute('aria-label')
    // The translated value or the key path — either way the attribute is set.
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel?.length ?? 0).toBeGreaterThan(0)
  })

  it('renders different content per quadrant value (data-testid changes)', async () => {
    const { rerender } = render(EmotionQuadrantSuffix, {
      props: { quadrant: 'high-energy-high-pleasantness' as Quadrant },
    })

    expect(
      screen.getByTestId('emotion-quadrant-suffix-high-energy-high-pleasantness')
    ).toBeInTheDocument()

    await rerender({ quadrant: 'low-energy-low-pleasantness' as Quadrant })

    expect(
      screen.getByTestId('emotion-quadrant-suffix-low-energy-low-pleasantness')
    ).toBeInTheDocument()
  })

  it('hides the button when quadrant transitions to null', async () => {
    const { rerender } = render(EmotionQuadrantSuffix, {
      props: { quadrant: 'high-energy-high-pleasantness' as Quadrant },
    })

    expect(screen.getByRole('button')).toBeInTheDocument()

    await rerender({ quadrant: null })

    // After transition, the button should be removed; in JSDOM with no real
    // CSS transitions Vue collapses it immediately.
    expect(screen.queryByRole('button')).toBeNull()
  })
})
