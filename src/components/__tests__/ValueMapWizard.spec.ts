import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import ValueMapWizard from '../exercises/ValueMapWizard.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('ValueMapWizard', () => {
  it('starts with the overview and opens the sorting step', async () => {
    render(ValueMapWizard, {
      global: {
        stubs: {
          AppCard: { template: '<section><slot /></section>' },
          AppIcon: { props: ['name'], template: '<span />' },
          AppButton: {
            props: ['disabled', 'variant'],
            emits: ['click'],
            template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(screen.getByText('Map your values')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Sort the value cards')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search values...')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add your own value')).toBeInTheDocument()
  })

  it('requires enough sorted values before leaving the sorting step', async () => {
    render(ValueMapWizard, {
      global: {
        stubs: {
          AppCard: { template: '<section><slot /></section>' },
          AppIcon: { props: ['name'], template: '<span />' },
          AppButton: {
            props: ['disabled', 'variant'],
            emits: ['click'],
            template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    const continueButtons = screen.getAllByRole('button', { name: 'Continue' })
    expect(continueButtons[continueButtons.length - 1]).toBeDisabled()
  })
})
