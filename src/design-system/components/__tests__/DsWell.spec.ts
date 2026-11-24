import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import DsWell from '../DsWell.vue'

describe('DsWell', () => {
  it('renders the empty well at the „Plan dnia” size, hidden from assistive tech', () => {
    const { container } = render(DsWell)
    const well = container.querySelector('span')!
    expect(well.className).toBe('mg-well mg-well--lg')
    expect(well.getAttribute('aria-hidden')).toBe('true')
  })

  it('maps state, size and data mark to the shared anatomy', () => {
    const { container } = render(DsWell, { props: { state: 'done', size: 'xs', data: true } })
    const well = container.querySelector('.mg-well')!
    expect(well.classList.contains('mg-well--done')).toBe(true)
    expect(well.classList.contains('mg-well--xs')).toBe(true)
    expect(well.classList.contains('mg-well--data')).toBe(true)
  })

  it('carries content as an icon well and names itself when labelled', () => {
    const { container } = render(DsWell, {
      props: { state: 'current', label: 'Wtorek' },
      slots: { default: 'W' },
    })
    const well = container.querySelector('.mg-well')!
    expect(well.classList.contains('mg-well--icon')).toBe(true)
    expect(well.classList.contains('mg-well--current')).toBe(true)
    expect(well.getAttribute('role')).toBe('img')
    expect(well.getAttribute('aria-label')).toBe('Wtorek')
    expect(well.textContent).toBe('W')
  })

  it('recolours only through the data-chart variables', () => {
    const { container } = render(DsWell, {
      props: { state: 'done', field: 'var(--q-top)', mark: 'var(--q-sel)' },
    })
    const well = container.querySelector<HTMLElement>('.mg-well')!
    expect(well.style.getPropertyValue('--mg-well-field')).toBe('var(--q-top)')
    expect(well.style.getPropertyValue('--mg-well-mark')).toBe('var(--q-sel)')
  })

  it('is a real button when it is the control', () => {
    const { container } = render(DsWell, { props: { as: 'button', label: 'Zrobione' } })
    const button = container.querySelector('button')!
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-hidden')).toBeNull()
    expect(button.getAttribute('role')).toBeNull()
  })
})
