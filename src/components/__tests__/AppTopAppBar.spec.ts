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
      { path: '/today/:dayRef', component: { template: '<div />' } },
      { path: '/calendar', component: { template: '<div />' } },
      { path: '/objects/:family', component: { template: '<div />' } },
      { path: '/journal', component: { template: '<div />' } },
      { path: '/emotions', component: { template: '<div />' } },
      { path: '/history', component: { template: '<div />' } },
      { path: '/exercises', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
}

describe('AppTopAppBar', () => {
  it('renders Today first and omits removed legacy links', async () => {
    const router = createTestRouter()
    await router.push('/journal')
    await router.isReady()

    render(AppTopAppBar, {
      global: {
        plugins: [router],
      },
    })

    const navItems = screen.getAllByText(/Today|Calendar|Objects|Journal|Emotions|History|Exercises|Profile/)
    expect(navItems[0]).toHaveTextContent('Today')
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.queryByText('Planning hub')).not.toBeInTheDocument()
  })

  it.each(['/today', '/today/2026-03-12'])('marks Today active on %s', async (path) => {
    const router = createTestRouter()
    await router.push(path)
    await router.isReady()

    render(AppTopAppBar, {
      global: {
        plugins: [router],
      },
    })

    expect(screen.getByText('Today').closest('a')).toHaveClass('text-primary-strong')
  })
})
