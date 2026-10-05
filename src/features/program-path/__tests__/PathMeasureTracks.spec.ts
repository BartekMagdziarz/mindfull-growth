import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import PathMeasureTracks from '@/features/program-path/PathMeasureTracks.vue'
import type { AssessmentAttempt, AssessmentId } from '@/domain/assessments'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { useAssessmentStore } from '@/stores/assessment.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

// The component loads attempts on mount; the mock serves the same fixtures the store is patched with.
const ATTEMPTS: Record<string, AssessmentAttempt[]> = {}
vi.mock('@/repositories/assessmentsDexieRepository', () => ({
  assessmentsDexieRepository: {
    getAttemptsByAssessment: vi.fn(async (id: string) => ATTEMPTS[id] ?? []),
  },
}))

/** A phased path measuring SCS-SF three times and FSCRS twice. */
const PATH: ProgramDefinition = {
  slug: 'shame-compassion',
  i18nKey: 'programs.shame-compassion',
  icon: 'x',
  estimatedWeeks: 8,
  outcomeSlugs: ['scs-sf', 'fscrs'],
  phases: [
    { key: 'w1', fromStepIndex: 0, week: 1 },
    { key: 'w4', fromStepIndex: 2, week: 4 },
    { key: 'w8', fromStepIndex: 4, week: 8 },
  ],
  steps: [
    { exerciseSlug: 'scs-sf', minGapDays: 0 },
    { exerciseSlug: 'fscrs', minGapDays: 0 },
    { exerciseSlug: 'scs-sf', minGapDays: 3 },
    { exerciseSlug: 'shame-map', minGapDays: 1 },
    { exerciseSlug: 'scs-sf', minGapDays: 4 },
    { exerciseSlug: 'fscrs', minGapDays: 0 },
  ],
}

function attempt(id: string, assessmentId: AssessmentId, completedAt: string, scales: Record<string, number>): AssessmentAttempt {
  return {
    id,
    assessmentId,
    instrumentVersion: '1.0.0',
    language: 'pl',
    startedAt: completedAt,
    completedAt,
    status: 'completed',
    scoringKeyVersion: '1.0.0',
    missingDataPolicyVersion: '1',
    responseCount: 12,
    totalItems: 12,
    computedScales: Object.entries(scales).map(([scaleId, rawMean]) => ({
      scaleId,
      labelKey: `assessments.x.scales.${scaleId}`,
      answeredCount: 1,
      itemCount: 1,
      rawMean,
      normalizedMean: rawMean,
    })),
    createdAt: completedAt,
    updatedAt: completedAt,
  }
}

const enrollment: ProgramEnrollment = {
  id: 'enr',
  programSlug: 'shame-compassion',
  status: 'active',
  startedAt: '2026-09-01T10:00:00.000Z',
  currentStepIndex: 3,
  completedSteps: [
    { stepIndex: 0, completedAt: '2026-09-01T11:00:00.000Z', recordId: 'scs-start' },
    { stepIndex: 1, completedAt: '2026-09-01T11:30:00.000Z', recordId: 'fscrs-start' },
    // the mid step was completed without a record id → matched by day
    { stepIndex: 2, completedAt: '2026-09-20T12:00:00.000Z' },
  ],
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
  useUserPreferencesStore().$patch({ locale: 'pl' })
  const store = useAssessmentStore()
  Object.assign(ATTEMPTS, {
      'scs-sf': [
        attempt('scs-start', 'scs-sf', '2026-09-01T11:00:00.000Z', { total: 2.1 }),
        // a standalone retake outside the steps — must not appear
        attempt('scs-stray', 'scs-sf', '2026-09-10T11:00:00.000Z', { total: 4.9 }),
        attempt('scs-mid', 'scs-sf', '2026-09-20T09:00:00.000Z', { total: 2.8 }),
      ],
      fscrs: [
        attempt('fscrs-start', 'fscrs', '2026-09-01T11:30:00.000Z', {
          inadequateSelf: 3.1,
          hatedSelf: 1.2,
          reassuredSelf: 1.4,
        }),
      ],
    })
  store.$patch({ attemptsByAssessment: { ...ATTEMPTS } })
})

/** The grids sit behind "Szczegóły"; the tracks themselves carry no text. */
async function openDetails(): Promise<void> {
  await fireEvent.click(screen.getByRole('button', { name: 'Szczegóły' }))
}

describe('PathMeasureTracks', () => {
  it('draws one track per scale with the first and the latest measurement as discs', () => {
    render(PathMeasureTracks, { props: { program: PATH, enrollment } })

    // SCS-SF total + three FSCRS scales; the SCS track has start and latest, FSCRS only the start.
    const tracks = document.querySelectorAll('.sk')
    expect(tracks).toHaveLength(4)
    expect(tracks[0]!.querySelectorAll('.sk__start')).toHaveLength(1)
    expect(tracks[0]!.querySelectorAll('.sk__now')).toHaveLength(1)
    expect(tracks[1]!.querySelectorAll('.sk__now')).toHaveLength(0)
    expect(screen.queryAllByRole('table')).toHaveLength(0)
  })

  it('renders one series per instrument with a column per measuring step, labelled by phase', async () => {
    render(PathMeasureTracks, { props: { program: PATH, enrollment } })
    await openDetails()

    const tables = screen.getAllByRole('table')
    expect(tables).toHaveLength(2)

    const scs = within(tables[0]!)
    expect(scs.getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual([
      expect.any(String),
      expect.stringContaining('Rozpoznanie'),
      expect.stringContaining('Inne spojrzenie'),
      expect.stringContaining('Utrwalenie'),
    ])
  })

  it('fills columns only from the steps’ own attempts (by id, else by day) and leaves future ones empty', async () => {
    render(PathMeasureTracks, { props: { program: PATH, enrollment } })
    await openDetails()

    const scs = within(screen.getAllByRole('table')[0]!)
    const values = scs.getAllByRole('cell').map((cell) => cell.textContent?.trim().split(/\s/)[0])
    // start by record id, mid by same local day (the stray 4.9 retake is ignored), end pending
    expect(values).toEqual(['2,10', '2,80', '–'])
  })

  it('shows one row per scale for a multi-scale instrument, named in the path’s plain words when it has them', async () => {
    render(PathMeasureTracks, { props: { program: PATH, enrollment } })
    await openDetails()

    const fscrs = within(screen.getAllByRole('table')[1]!)
    const rows = fscrs.getAllByRole('rowheader').map((h) => h.textContent?.trim())
    // programs.shame-compassion.scaleLabels overrides the instrument's scale names
    expect(rows).toEqual(['Czuję, że nie wystarczam', 'Niechęć do siebie', 'Uspokajam siebie'])
    const firstRowCells = fscrs.getAllByRole('cell').slice(0, 2).map((c) => c.textContent?.trim().split(/\s/)[0])
    expect(firstRowCells).toEqual(['3,10', '–'])
  })

  it('falls back to the legacy before/after labels and the single outcomeSlug for paths without phases', async () => {
    const legacy: ProgramDefinition = {
      ...PATH,
      phases: undefined,
      outcomeSlugs: undefined,
      outcomeSlug: 'scs-sf',
    }
    render(PathMeasureTracks, { props: { program: legacy, enrollment } })
    await openDetails()

    expect(screen.getAllByRole('table')).toHaveLength(1)
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    expect(headers[1]).toContain('Na początku')
    expect(headers[2]).toContain('Na końcu')
  })
})
