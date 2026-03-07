import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import HabitForm from '../HabitForm.vue'
import type { HabitFormData } from '../HabitForm.vue'

const baseForm = {
  name: 'Morning Walk',
  cadence: 'weekly' as const,
  lifeAreaIds: [],
  priorityIds: [],
  isActive: true,
  isPaused: false,
  trackerType: 'count' as const,
  targetCount: 3,
  rollup: 'sum' as const,
}

describe('HabitForm', () => {
  it('renders tracker type selector with all options', () => {
    render(HabitForm, {
      props: {
        form: { ...baseForm },
        'onUpdate:form': () => {},
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: {
          CascadingLinkMenu: { template: '<div />' },
          LinkedPill: { template: '<div />' },
        },
      },
    })

    expect(screen.getByText('Count')).toBeInTheDocument()
    expect(screen.getByText('Completion')).toBeInTheDocument()
    expect(screen.getByText('Measure')).toBeInTheDocument()
    expect(screen.getByText('Rating')).toBeInTheDocument()
  })

  it('does not show target count input for count tracker type', () => {
    render(HabitForm, {
      props: {
        form: { ...baseForm, trackerType: 'count' as const },
        'onUpdate:form': () => {},
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: {
          CascadingLinkMenu: { template: '<div />' },
          LinkedPill: { template: '<div />' },
        },
      },
    })

    expect(screen.queryByText('Target per period')).not.toBeInTheDocument()
  })

  it('shows target count input for adherence tracker type', () => {
    render(HabitForm, {
      props: {
        form: { ...baseForm, trackerType: 'adherence' as const },
        'onUpdate:form': () => {},
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: {
          CascadingLinkMenu: { template: '<div />' },
          LinkedPill: { template: '<div />' },
        },
      },
    })

    expect(screen.getByText('Target per period')).toBeInTheDocument()
  })

  it('shows value fields for value tracker type', () => {
    render(HabitForm, {
      props: {
        form: {
          ...baseForm,
          trackerType: 'value' as const,
          targetValue: 25,
          unit: 'km',
          direction: 'increase' as const,
          rollup: 'last' as const,
        },
        'onUpdate:form': () => {},
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: {
          CascadingLinkMenu: { template: '<div />' },
          LinkedPill: { template: '<div />' },
        },
      },
    })

    expect(screen.getByText('Target')).toBeInTheDocument()
    expect(screen.getByText('Unit')).toBeInTheDocument()
    expect(screen.getByText('Direction')).toBeInTheDocument()
    expect(screen.getByText('Increase')).toBeInTheDocument()
    expect(screen.getByText('Decrease')).toBeInTheDocument()
  })

  it('shows cadence selector', async () => {
    const form: HabitFormData = { ...baseForm }

    render(HabitForm, {
      props: {
        form,
        'onUpdate:form': (next: typeof form) => Object.assign(form, next),
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: {
          CascadingLinkMenu: { template: '<div />' },
          LinkedPill: { template: '<div />' },
        },
      },
    })

    const cadenceSelect = screen.getByLabelText('Cadence')
    expect(cadenceSelect).toBeInTheDocument()
    await fireEvent.update(cadenceSelect, 'monthly')
  })
})
