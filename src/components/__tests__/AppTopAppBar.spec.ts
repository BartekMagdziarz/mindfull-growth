import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppTopAppBar from '../AppTopAppBar.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/today', component: { template: '<div />' } },
      { path: '/planning', component: { template: '<div />' } },
      { path: '/planning/week/new', component: { template: '<div />' } },
      { path: '/journal', component: { template: '<div />' } },
      { path: '/emotions', component: { template: '<div />' } },
      { path: '/history', component: { template: '<div />' } },
      { path: '/exercises', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
}

describe('AppTopAppBar', () => {
  it('renders the Planning hub navigation link', async () => {
    const router = createTestRouter()
    await router.push('/today')
    await router.isReady()

    render(AppTopAppBar, {
      global: {
        plugins: [router],
      },
    })

    const planningLink = screen.getByText('Planning hub').closest('a')
    expect(planningLink).not.toBeNull()
    expect(planningLink).toHaveAttribute('to', '/planning')
  })

  it('marks Planning hub active for nested planning routes', async () => {
    const router = createTestRouter()
    await router.push('/planning/week/new')
    await router.isReady()

    render(AppTopAppBar, {
      global: {
        plugins: [router],
      },
    })

    const planningLink = screen.getByText('Planning hub').closest('a')
    expect(planningLink).not.toBeNull()
    expect(planningLink).toHaveClass(
      'text-primary-strong',
      'bg-section-strong',
      'shadow-elevation-1',
    )
  })
})
