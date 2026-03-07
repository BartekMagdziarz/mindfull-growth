import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import { defineComponent, h, ref } from 'vue'
import JournalView from '../JournalView.vue'

const mockRouterPush = vi.fn()

vi.mock('vue-router', () => {
  return {
    useRouter: () => ({
      push: mockRouterPush,
    }),
  }
})

vi.mock('@/components/AppSnackbar.vue', () => {
  return {
    default: defineComponent({
      name: 'AppSnackbarStub',
      setup(_, { expose }) {
        const message = ref('')
        const visible = ref(false)

        const show = (text: string) => {
          message.value = text
          visible.value = true
        }

        const hide = () => {
          visible.value = false
        }

        expose({ show, hide })

        return () =>
          visible.value ? h('div', { 'data-testid': 'snackbar' }, message.value) : null
      },
    }),
  }
})

describe('JournalView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the action cards', () => {
    render(JournalView)

    expect(screen.getByText('Free form')).toBeInTheDocument()
    expect(screen.getByText('Guided')).toBeInTheDocument()
  })

  it('navigates to the journal editor for free form', async () => {
    render(JournalView)

    await fireEvent.click(screen.getByText('Free form'))

    expect(mockRouterPush).toHaveBeenCalledWith('/journal/edit')
  })

  it('shows a snackbar for guided journaling', async () => {
    render(JournalView)

    await fireEvent.click(screen.getByText('Guided'))

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Coming soon')
  })

})
