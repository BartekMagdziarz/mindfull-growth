import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'

type MeasurementUpdate = { entryMode: MeasurementEntryMode; target: MeasurementTarget }

function renderSentence(props: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
  cadence?: 'weekly' | 'monthly'
}) {
  return render(MeasurementTargetSentence, { props })
}

function lastMeasurement(emitted: Record<string, unknown[][]>): MeasurementUpdate {
  const events = emitted['update:measurement']
  expect(events?.length).toBeGreaterThan(0)
  return events[events.length - 1][0] as MeasurementUpdate
}

describe('MeasurementTargetSentence entryDays clause', () => {
  it('adds a default min condition via the "+ warunek dni" button (weekly)', async () => {
    const { emitted } = renderSentence({
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
    })

    await fireEvent.click(screen.getByRole('button', { name: '+ days condition' }))

    const update = lastMeasurement(emitted() as Record<string, unknown[][]>)
    expect(update.entryMode).toBe('rating')
    expect(update.target.entryDays).toEqual({ operator: 'min', value: 5 })
  })

  it('defaults to 20 days for monthly cadence', async () => {
    const { emitted } = renderSentence({
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 10 },
      cadence: 'monthly',
    })

    await fireEvent.click(screen.getByRole('button', { name: '+ days condition' }))

    expect(lastMeasurement(emitted() as Record<string, unknown[][]>).target.entryDays).toEqual({
      operator: 'min',
      value: 20,
    })
  })

  it('hides the clause entirely for completion mode', () => {
    renderSentence({
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 5 },
    })

    expect(screen.queryByRole('button', { name: '+ days condition' })).toBeNull()
    expect(screen.queryByLabelText('Days with an entry')).toBeNull()
  })

  it('renders the clause and clamps the committed value to the cadence range', async () => {
    const { emitted } = renderSentence({
      entryMode: 'rating',
      target: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'min', value: 5 },
      },
    })

    const input = screen.getByLabelText('Days with an entry')
    await fireEvent.update(input, '12')
    await fireEvent.change(input)

    expect(lastMeasurement(emitted() as Record<string, unknown[][]>).target.entryDays).toEqual({
      operator: 'min',
      value: 7,
    })
  })

  it('removes the condition when the value is cleared', async () => {
    const { emitted } = renderSentence({
      entryMode: 'rating',
      target: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'min', value: 5 },
      },
    })

    const input = screen.getByLabelText('Days with an entry')
    await fireEvent.update(input, '')
    await fireEvent.change(input)

    const update = lastMeasurement(emitted() as Record<string, unknown[][]>)
    expect(update.target.entryDays).toBeUndefined()
    expect(update.target).toEqual({
      kind: 'rating',
      aggregation: 'average',
      operator: 'gte',
      value: 3,
    })
  })

  it('keeps the condition when the primary value changes', async () => {
    const { emitted } = renderSentence({
      entryMode: 'rating',
      target: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'max', value: 3 },
      },
    })

    const input = screen.getByLabelText('Target value')
    await fireEvent.update(input, '4')
    await fireEvent.change(input)

    const update = lastMeasurement(emitted() as Record<string, unknown[][]>)
    expect(update.target.value).toBe(4)
    expect(update.target.entryDays).toEqual({ operator: 'max', value: 3 })
  })
})
