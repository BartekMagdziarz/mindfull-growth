import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppNavDock from '../AppNavDock.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/today', component: { template: '<div />' } },
      { path: '/today/:dayRef', component: { template: '<div />' } },
      { path: '/calendar', component: { template: '<div />' } },
      { path: '/calendar/day/:dayRef', component: { template: '<div />' } },
      { path: '/calendar/week/:weekRef', component: { template: '<div />' } },
      { path: '/objects/:family', component: { template: '<div />' } },
      { path: '/objects/priorities/ritual', component: { template: '<div />' } },
      { path: '/journal', component: { template: '<div />' } },
      { path: '/emotions', component: { template: '<div />' } },
      { path: '/history', component: { template: '<div />' } },
      { path: '/exercises', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
}

async function renderDock(path: string) {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()

  return render(AppNavDock, {
    global: {
      plugins: [router],
    },
  })
}

describe('AppNavDock', () => {
  it('renders the eight destinations with Today first and no pin/peek controls', async () => {
    const { container } = await renderDock('/journal')

    const items = screen.getAllByText(
      /Today|Calendar|Objects|Journal|Emotions|History|Exercises|Profile/,
    )
    expect(items[0]).toHaveTextContent('Today')
    expect(items[1]).toHaveTextContent('Calendar')
    expect(container.querySelectorAll('a.dock-item')).toHaveLength(8)
    // The dock is permanently visible in its collapsed form: no pin toggle,
    // no edge handle to reveal it.
    expect(container.querySelector('button')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Open navigation' })).not.toBeInTheDocument()
  })

  it.each(['/calendar', '/calendar/day/2026-03-12', '/calendar/week/2026-W11'])(
    'marks Calendar active on %s',
    async (path) => {
      await renderDock(path)

      expect(screen.getByText('Calendar').closest('a')).toHaveClass('dock-item--active')
      expect(screen.getByText('Today').closest('a')).not.toHaveClass('dock-item--active')
    },
  )

  it.each(['/today', '/today/2026-03-12'])('marks Today active on %s', async (path) => {
    await renderDock(path)

    expect(screen.getByText('Today').closest('a')).toHaveClass('dock-item--active')
    expect(screen.getByText('Calendar').closest('a')).not.toHaveClass('dock-item--active')
  })

  it.each(['/objects/goals', '/objects/habits', '/objects/priorities/ritual'])(
    'marks Objects active across every object family on %s',
    async (path) => {
      await renderDock(path)

      expect(screen.getByText('Objects').closest('a')).toHaveClass('dock-item--active')
    },
  )
})
