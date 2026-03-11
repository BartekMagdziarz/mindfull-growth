import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppTopAppBar from '../AppTopAppBar.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/journal', component: { template: '<div />' } },
      { path: '/emotions', component: { template: '<div />' } },
      { path: '/history', component: { template: '<div />' } },
      { path: '/exercises', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
}

describe('AppTopAppBar', () => {
  it('does not render Today or Planning links', async () => {
    const router = createTestRouter()
    await router.push('/journal')
    await router.isReady()

    render(AppTopAppBar, {
      global: {
        plugins: [router],
      },
    })

    expect(screen.queryByText('Today')).not.toBeInTheDocument()
    expect(screen.queryByText('Planning hub')).not.toBeInTheDocument()
  })
})
