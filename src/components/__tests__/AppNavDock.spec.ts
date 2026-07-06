import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
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
      { path: '/objects/:family', component: { template: '<div />' } },
      { path: '/journal', component: { template: '<div />' } },
      { path: '/emotions', component: { template: '<div />' } },
      { path: '/history', component: { template: '<div />' } },
      { path: '/exercises', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
}

async function renderDock(path: string, props: { pinned: boolean }) {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()

  return render(AppNavDock, {
    props,
    global: {
      plugins: [router],
    },
  })
}

describe('AppNavDock', () => {
  it('renders all nav items with Today first', async () => {
    const { container } = await renderDock('/journal', { pinned: true })

    const items = screen.getAllByText(
      /Today|Calendar|Objects|Journal|Emotions|History|Exercises|Profile/,
    )
    expect(items[0]).toHaveTextContent('Today')
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(container.querySelectorAll('a.dock-item')).toHaveLength(8)
  })

  it.each(['/today', '/today/2026-03-12'])(
    'marks Today active on %s',
    async (path) => {
      await renderDock(path, { pinned: true })

      expect(screen.getByText('Today').closest('a')).toHaveClass(
        'dock-item--active',
      )
      expect(screen.getByText('Calendar').closest('a')).not.toHaveClass(
        'dock-item--active',
      )
    },
  )

  it('emits update:pinned with the toggled value when the pin button is clicked', async () => {
    const { emitted } = await renderDock('/today', { pinned: false })

    await fireEvent.click(
      screen.getByRole('button', { name: 'Pin navigation' }),
    )

    expect(emitted('update:pinned')).toEqual([[true]])
  })

  it('offers unpinning when pinned', async () => {
    const { emitted } = await renderDock('/today', { pinned: true })

    await fireEvent.click(
      screen.getByRole('button', { name: 'Unpin navigation' }),
    )

    expect(emitted('update:pinned')).toEqual([[false]])
  })

  it('renders the edge handle only when unpinned', async () => {
    await renderDock('/today', { pinned: false })

    expect(
      screen.getByRole('button', { name: 'Open navigation' }),
    ).toBeInTheDocument()
  })

  it('hides the edge handle when pinned', async () => {
    await renderDock('/today', { pinned: true })

    expect(
      screen.queryByRole('button', { name: 'Open navigation' }),
    ).not.toBeInTheDocument()
  })
})
