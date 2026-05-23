import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/vue'
import KrStatusPill from '../KrStatusPill.vue'

describe('KrStatusPill', () => {
  it('renders solid met color for monthly met', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly', monthlyStatus: 'met', label: 'Test KR' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(var(--neo-chart-primary-end))')
    expect(pill).toHaveAttribute('aria-label', 'Test KR: met')
  })

  it('renders solid missed color for monthly missed', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly', monthlyStatus: 'missed' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(var(--rose-300))')
  })

  it('renders solid no-data color for monthly no-data', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly', monthlyStatus: 'no-data' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(var(--neo-border))')
  })

  it('renders solid no-data color when monthly status is undefined', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(var(--neo-border))')
  })

  it('renders proportional gradient for weekly cadence', () => {
    render(KrStatusPill, {
      props: { cadence: 'weekly', weeksMet: 3, weeksTotal: 5, label: 'Weekly KR' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.background).toContain('linear-gradient')
    expect(pill.style.background).toContain('60%')
    expect(pill).toHaveAttribute('aria-label', 'Weekly KR: 3/5 weeks met')
  })

  it('renders solid met color for all-met weekly', () => {
    render(KrStatusPill, {
      props: { cadence: 'weekly', weeksMet: 4, weeksTotal: 4 },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(var(--neo-chart-primary-end))')
  })

  it('renders solid missed color for all-missed weekly', () => {
    render(KrStatusPill, {
      props: { cadence: 'weekly', weeksMet: 0, weeksTotal: 4 },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(var(--rose-300))')
  })

  it('renders solid no-data color for zero-total weekly', () => {
    render(KrStatusPill, {
      props: { cadence: 'weekly', weeksMet: 0, weeksTotal: 0 },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(var(--neo-border))')
  })

  it('has correct accessibility attributes', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly', monthlyStatus: 'met', label: 'Revenue target' },
    })

    const pill = screen.getByRole('img')
    expect(pill).toHaveAttribute('title', 'Revenue target: met')
    expect(pill).toHaveAttribute('aria-label', 'Revenue target: met')
  })
})
