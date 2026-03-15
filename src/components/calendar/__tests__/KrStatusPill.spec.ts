import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/vue'
import KrStatusPill from '../KrStatusPill.vue'

describe('KrStatusPill', () => {
  it('renders solid sky-400 for monthly met', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly', monthlyStatus: 'met', label: 'Test KR' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(56, 189, 248)')
    expect(pill).toHaveAttribute('aria-label', 'Test KR: met')
  })

  it('renders solid rose-300 for monthly missed', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly', monthlyStatus: 'missed' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(253, 164, 175)')
  })

  it('renders solid slate-300 for monthly no-data', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly', monthlyStatus: 'no-data' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(203, 213, 225)')
  })

  it('renders solid slate-300 when monthly status is undefined', () => {
    render(KrStatusPill, {
      props: { cadence: 'monthly' },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(203, 213, 225)')
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

  it('renders solid sky-400 for all-met weekly', () => {
    render(KrStatusPill, {
      props: { cadence: 'weekly', weeksMet: 4, weeksTotal: 4 },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(56, 189, 248)')
  })

  it('renders solid rose-300 for all-missed weekly', () => {
    render(KrStatusPill, {
      props: { cadence: 'weekly', weeksMet: 0, weeksTotal: 4 },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(253, 164, 175)')
  })

  it('renders solid slate-300 for zero-total weekly', () => {
    render(KrStatusPill, {
      props: { cadence: 'weekly', weeksMet: 0, weeksTotal: 0 },
    })

    const pill = screen.getByRole('img')
    expect(pill.style.backgroundColor).toBe('rgb(203, 213, 225)')
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
