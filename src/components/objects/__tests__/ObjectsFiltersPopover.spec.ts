import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/vue'
import ObjectsFiltersPopover from '@/components/objects/ObjectsFiltersPopover.vue'
import type { ObjectsLibraryQuery } from '@/services/objectsLibraryQueries'

const lifeAreas = [
  { id: 'la-1', label: 'Health' },
  { id: 'la-2', label: 'Work' },
  { id: 'la-3', label: 'Family' },
]
const priorities = [{ id: 'pr-1', label: '2026 · Fitness' }]

const labels = {
  filtersLabel: 'Filters',
  lifeAreasLabel: 'Life areas',
  prioritiesLabel: 'Priorities',
  lifecycleLabel: 'Lifecycle',
  closedLabel: 'Show closed and archived',
  selectPlaceholder: 'Select…',
  noOptionsLabel: 'No options available yet',
  resetLabel: 'Reset filters',
}

function makeQuery(overrides: Partial<ObjectsLibraryQuery> = {}): ObjectsLibraryQuery {
  return {
    family: 'goals',
    q: '',
    lifeAreaIds: [],
    priorityIds: [],
    showClosed: false,
    ...overrides,
  }
}

function renderPopover(query = makeQuery(), options = { lifeAreas, priorities }) {
  return render(ObjectsFiltersPopover, { props: { ...labels, query, ...options } })
}

describe('ObjectsFiltersPopover', () => {
  it('counts active filters on the chip', () => {
    renderPopover(makeQuery({ lifeAreaIds: ['la-1', 'la-2'], showClosed: true }))
    expect(screen.getByRole('button', { name: /Filters/ })).toHaveTextContent('Filters · 3')
  })

  it('opens a dialog with two selects and a switch, and emits toggles', async () => {
    const { emitted } = renderPopover()
    await fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Filters' })

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Life areas' }))
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }))
    expect(emitted()['toggle:lifeArea']).toEqual([['la-2']])

    await fireEvent.click(within(dialog).getByRole('switch'))
    expect(emitted()['toggle:closed']).toHaveLength(1)
  })

  it('summarises selections and disables an empty select', async () => {
    renderPopover(makeQuery({ lifeAreaIds: ['la-1', 'la-2', 'la-3'] }), { lifeAreas, priorities: [] })
    await fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByRole('button', { name: 'Life areas' })).toHaveTextContent('Health +2')
    const prioritySelect = screen.getByRole('button', { name: 'Priorities' })
    expect(prioritySelect).toBeDisabled()
    expect(prioritySelect).toHaveTextContent('No options available yet')
  })

  it('moves focus between options with arrow keys and closes the list on Escape', async () => {
    renderPopover()
    await fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Life areas' }))
    const [first, second] = screen.getAllByRole('checkbox')
    expect(document.activeElement).toBe(first)

    await fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)
    await fireEvent.keyDown(second, { key: 'Home' })
    expect(document.activeElement).toBe(first)

    await fireEvent.keyDown(first, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    // The filters dialog itself stays open — Escape only closed the nested list.
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })

  it('offers a reset only when something is active', async () => {
    const { emitted, rerender } = renderPopover()
    await fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument()

    await rerender({ ...labels, lifeAreas, priorities, query: makeQuery({ priorityIds: ['pr-1'] }) })
    await fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(emitted()['reset:filters']).toHaveLength(1)
  })
})
