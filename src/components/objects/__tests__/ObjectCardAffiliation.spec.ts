import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import ObjectCardAffiliation from '@/components/objects/ObjectCardAffiliation.vue'

const priorityOptions = [
  { id: 'pr-1', label: '2026 · Fitness', icon: 'flag' },
  { id: 'pr-2', label: '2026 · Family time' },
]
const lifeAreaOptions = [
  { id: 'la-1', label: 'Health', icon: 'favorite' },
  { id: 'la-2', label: 'Work' },
  { id: 'la-3', label: 'Family' },
  { id: 'la-4', label: 'Growth' },
]

function renderRow(props: Partial<InstanceType<typeof ObjectCardAffiliation>['$props']> = {}) {
  return render(ObjectCardAffiliation, {
    props: {
      priorityIds: [],
      lifeAreaIds: [],
      priorityOptions,
      lifeAreaOptions,
      groupLabel: 'Links',
      ...props,
    },
  })
}

describe('ObjectCardAffiliation', () => {
  it('draws priorities first, then life areas, and opens the matching category on click', async () => {
    const { emitted } = renderRow({ priorityIds: ['pr-1'], lifeAreaIds: ['la-1'] })
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['2026 · Fitness', 'Health'])
    expect(buttons[0]).toHaveClass('mg-v2-glyph--pencil')
    expect(buttons[1]).not.toHaveClass('mg-v2-glyph--pencil')

    await fireEvent.click(buttons[1])
    expect(emitted().open).toEqual([['lifeArea']])
  })

  it('skips ids that do not resolve to an active option', () => {
    renderRow({ priorityIds: ['pr-gone'], lifeAreaIds: ['la-1'] })
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('folds the overflow into a +N glyph that names the hidden links', () => {
    renderRow({ priorityIds: ['pr-1', 'pr-2'], lifeAreaIds: ['la-1', 'la-2', 'la-3', 'la-4'] })
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    expect(buttons[3]).toHaveTextContent('+3')
    expect(buttons[3]).toHaveAttribute('aria-label', 'Work, Family, Growth')
  })

  it('renders a dashed add glyph when empty and an empty label is given, nothing otherwise', () => {
    const { unmount } = renderRow({ emptyLabel: 'Add a link' })
    expect(screen.getByRole('button', { name: 'Add a link' })).toHaveClass('mg-v2-glyph--empty')
    unmount()
    renderRow()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
