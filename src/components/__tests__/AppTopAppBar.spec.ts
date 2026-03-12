import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppTopAppBar from '../AppTopAppBar.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/calendar', component: { template: '<div />' } },
      { path: '/journal', component: { template: '<div />' } },
      { path: '/emotions', component: { template: '<div />' } },
      { path: '/history', component: { template: '<div />' } },
      { path: '/exercises', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
}

describe('AppTopAppBar', () => {
  it('renders Calendar and omits removed legacy links', async () => {
    const router = createTestRouter()
    await router.push('/journal')
    await router.isReady()

    render(AppTopAppBar, {
      global: {
        plugins: [router],
      },
    })

    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
    expect(screen.queryByText('Planning hub')).not.toBeInTheDocument()
  })
})
