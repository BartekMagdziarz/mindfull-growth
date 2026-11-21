import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import ExercisePage from '../ExercisePage.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

const stubs = {
  AppIcon: { props: ['name'], template: '<span />' },
}

describe('ExercisePage', () => {
  beforeEach(() => push.mockClear())

  it('goes back to the exercise catalog by default', async () => {
    render(ExercisePage, { props: { title: 'Mapa wartości' }, global: { stubs } })

    await fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(push).toHaveBeenCalledWith('/exercises')
  })

  it('runs a back handler instead of navigating when one is given', async () => {
    const handler = vi.fn()
    render(ExercisePage, { props: { title: 'Dziennik', backTo: handler }, global: { stubs } })

    await fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(handler).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
  })
})
