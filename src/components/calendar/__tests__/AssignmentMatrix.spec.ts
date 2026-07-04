import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import AssignmentMatrix from '../AssignmentMatrix.vue'
import type {
  AssignmentMatrixColumn,
  AssignmentMatrixRow,
  AssignmentMatrixSection,
} from '../assignmentMatrixTypes'

const COLUMNS: AssignmentMatrixColumn[] = [
  { key: 'c1', label: 'PON', sublabel: '29' },
  { key: 'c2', label: 'WT', sublabel: '30' },
  { key: 'c3', label: 'ŚR', sublabel: '1 lip', marker: 'inny miesiąc' },
]

function makeRow(overrides: Partial<AssignmentMatrixRow> = {}): AssignmentMatrixRow {
  return {
    key: 'habit:h1',
    title: 'Medytacja',
    subjectType: 'habit',
    cells: {
      c1: { state: 'checked' },
      c2: { state: 'empty' },
      c3: { state: 'soft' },
    },
    hasPlacement: true,
    ...overrides,
  }
}

function renderMatrix(sections: AssignmentMatrixSection[]) {
  return render(AssignmentMatrix, {
    props: {
      columns: COLUMNS,
      sections,
      targetLabel: 'Cel',
      wholePeriodLabel: 'Cały tydzień',
      clearLabel: 'Wyczyść',
      expandLabel: 'Rozpisz',
    },
  })
}

describe('AssignmentMatrix', () => {
  it('renders sections, rows and column headers', () => {
    const screen = renderMatrix([
      { key: 'habits', label: 'Nawyki (1)', rows: [makeRow()] },
    ])

    expect(screen.getByText('Nawyki (1)')).toBeTruthy()
    expect(screen.getByText('Medytacja')).toBeTruthy()
    expect(screen.getByText('PON')).toBeTruthy()
    expect(screen.getByText('1 lip')).toBeTruthy()
    expect(screen.getByText('Cel')).toBeTruthy()
  })

  it('emits cellToggle with row and column keys', async () => {
    const screen = renderMatrix([
      { key: 'habits', label: 'Nawyki', rows: [makeRow()] },
    ])

    await fireEvent.click(screen.getByTestId('matrix-cell-habit:h1-c2'))
    expect(screen.emitted().cellToggle).toEqual([['habit:h1', 'c2']])
  })

  it('marks checked and soft cells as pressed, empty as not pressed', () => {
    const screen = renderMatrix([
      { key: 'habits', label: 'Nawyki', rows: [makeRow()] },
    ])

    expect(screen.getByTestId('matrix-cell-habit:h1-c1').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('matrix-cell-habit:h1-c2').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByTestId('matrix-cell-habit:h1-c3').getAttribute('aria-pressed')).toBe('true')
  })

  it('emits wholePeriod and clearRow; clear is disabled without placement', async () => {
    const screen = renderMatrix([
      {
        key: 'habits',
        label: 'Nawyki',
        rows: [makeRow(), makeRow({ key: 'habit:h2', title: 'Czytanie', hasPlacement: false })],
      },
    ])

    await fireEvent.click(screen.getByTestId('matrix-whole-habit:h1'))
    await fireEvent.click(screen.getByTestId('matrix-clear-habit:h1'))
    expect(screen.emitted().wholePeriod).toEqual([['habit:h1']])
    expect(screen.emitted().clearRow).toEqual([['habit:h1']])

    expect(
      (screen.getByTestId('matrix-clear-habit:h2') as HTMLButtonElement).disabled
    ).toBe(true)
  })

  it('renders a soft label pill and a cell badge', () => {
    const screen = renderMatrix([
      {
        key: 'habits',
        label: 'Nawyki',
        rows: [
          makeRow({
            softLabel: 'cały tydzień',
            cells: { c1: { state: 'soft', badge: '3' }, c2: { state: 'soft' }, c3: { state: 'soft' } },
          }),
        ],
      },
    ])

    expect(screen.getByText('cały tydzień')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('collapsible section starts collapsed and toggles open', async () => {
    const screen = renderMatrix([
      { key: 'habits', label: 'Nawyki', rows: [makeRow()] },
      {
        key: 'rest',
        label: 'Pozostałe (1)',
        collapsible: true,
        rows: [makeRow({ key: 'habit:h3', title: 'Spacer' })],
      },
    ])

    expect(screen.queryByText('Spacer')).toBeNull()
    await fireEvent.click(screen.getByTestId('matrix-section-rest'))
    expect(screen.getByText('Spacer')).toBeTruthy()
  })

  it('expandable row toggles the row-detail slot', async () => {
    const screen = render(AssignmentMatrix, {
      props: {
        columns: COLUMNS,
        sections: [
          { key: 'habits', label: 'Nawyki', rows: [makeRow({ expandable: true })] },
        ],
        targetLabel: 'Cel',
        wholePeriodLabel: 'Cały miesiąc',
        clearLabel: 'Wyczyść',
        expandLabel: 'Rozpisz na tygodnie',
      },
      slots: {
        'row-detail': '<div data-testid="detail-content">rozpisanie</div>',
      },
    })

    expect(screen.queryByTestId('detail-content')).toBeNull()
    await fireEvent.click(screen.getByTestId('matrix-expand-habit:h1'))
    expect(screen.getByTestId('detail-content')).toBeTruthy()
    await fireEvent.click(screen.getByTestId('matrix-expand-habit:h1'))
    expect(screen.queryByTestId('detail-content')).toBeNull()
  })

  it('renders a placeholder for a missing cell', () => {
    const screen = renderMatrix([
      {
        key: 'habits',
        label: 'Nawyki',
        rows: [makeRow({ cells: { c1: { state: 'checked' } } })],
      },
    ])

    expect(screen.queryByTestId('matrix-cell-habit:h1-c2')).toBeNull()
    expect(screen.getByTestId('matrix-row-habit:h1').textContent).toContain('—')
  })
})
