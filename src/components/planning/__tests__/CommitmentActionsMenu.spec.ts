import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import CommitmentActionsMenu from '../CommitmentActionsMenu.vue'

describe('CommitmentActionsMenu', () => {
  it('positions teleported menu in viewport and closes on Escape', async () => {
    render(CommitmentActionsMenu, {
      props: {
        addCategories: [{ id: 'lifeArea', label: 'Life area' }],
        addItemsByCategory: {
          lifeArea: [{ id: 'la-1', label: 'Health', icon: 'heart', color: '#00aa55' }],
        },
        removableLinks: [],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Open commitment actions' }))

    const menu = screen.getByRole('button', { name: 'Delete commitment' }).closest('div')
    expect(menu).toBeTruthy()

    const left = Number.parseFloat((menu as HTMLElement).style.left)
    const top = Number.parseFloat((menu as HTMLElement).style.top)

    expect(Number.isNaN(left)).toBe(false)
    expect(Number.isNaN(top)).toBe(false)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(top).toBeGreaterThanOrEqual(0)

    await fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Delete commitment' })).not.toBeInTheDocument()
  })

  it('emits add/remove/delete actions', async () => {
    const { emitted } = render(CommitmentActionsMenu, {
      props: {
        addCategories: [
          { id: 'project', label: 'Project' },
          { id: 'lifeArea', label: 'Life area' },
        ],
        addItemsByCategory: {
          project: [{ id: 'proj-1', label: 'Project X', icon: 'layers' }],
          lifeArea: [{ id: 'la-1', label: 'Health', icon: 'heart' }],
        },
        removableLinks: [
          { category: 'lifeArea', id: 'la-2', label: 'Career', icon: 'briefcase' },
        ],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Open commitment actions' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Add link' }))
    await fireEvent.click(screen.getByText('Project X'))

    const addCalls = emitted('add-link') || []
    expect(addCalls).toEqual([[{ category: 'project', itemId: 'proj-1' }]])

    await fireEvent.click(screen.getByRole('button', { name: 'Open commitment actions' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Remove link' }))
    await fireEvent.click(screen.getByText('Career'))

    const removeCalls = emitted('remove-link') || []
    expect(removeCalls).toEqual([[{ category: 'lifeArea', itemId: 'la-2' }]])

    await fireEvent.click(screen.getByRole('button', { name: 'Open commitment actions' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Delete commitment' }))

    const deleteCalls = emitted('delete') || []
    expect(deleteCalls.length).toBe(1)
  })
})
