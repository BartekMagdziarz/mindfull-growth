import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CreateIFSPartPayload, IFSPart } from '@/domain/exercises'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { ProgramEnrollment } from '@/domain/program'
import { ifsPartDexieRepository } from '@/repositories/exercisesDexieRepository'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import {
  SHAME_COMPASS_PARTS,
  dismissShamePart,
  ensureShameParts,
  ensureShamePartsForEntry,
  reactionsFromShameMap,
  shamePartByReaction,
} from '@/services/shamePartsService'

vi.mock('@/repositories/exercisesDexieRepository', () => ({
  ifsPartDexieRepository: {
    getAll: vi.fn(async () => [] as IFSPart[]),
    create: vi.fn(async (payload: CreateIFSPartPayload) => ({
      id: `part-${payload.name}`,
      createdAt: '2026-10-04T10:00:00.000Z',
      updatedAt: '2026-10-04T10:00:00.000Z',
      ...payload,
    })),
  },
}))

vi.mock('@/repositories/microExerciseEntryDexieRepository', () => ({
  microExerciseEntryDexieRepository: {
    getBySlug: vi.fn(async () => [] as MicroExerciseEntry[]),
  },
}))

vi.mock('@/repositories/programEnrollmentDexieRepository', () => ({
  programEnrollmentDexieRepository: {
    listAll: vi.fn(async () => [] as ProgramEnrollment[]),
    update: vi.fn(async () => undefined),
  },
}))

function part(overrides: Partial<IFSPart>): IFSPart {
  return {
    id: 'p-1',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    name: 'Jakaś część',
    role: 'manager',
    bodyLocations: [],
    emotionIds: [],
    lifeAreaIds: [],
    ...overrides,
  }
}

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'enr-shame',
    programSlug: 'shame-compassion',
    status: 'active',
    startedAt: '2026-10-01T10:00:00.000Z',
    currentStepIndex: 2,
    completedSteps: [],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }
}

const mapEntry = (compass: unknown): Pick<MicroExerciseEntry, 'responses'> => ({
  responses: { compass: compass as string[] },
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('reactionsFromShameMap', () => {
  it('reads the compass answers and drops unknown ids', () => {
    expect(reactionsFromShameMap(mapEntry(['withdraw', 'bogus', 'attackOthers']))).toEqual([
      'withdraw',
      'attackOthers',
    ])
    expect(reactionsFromShameMap(mapEntry('avoid'))).toEqual(['avoid'])
    expect(reactionsFromShameMap({ responses: {} })).toEqual([])
  })
})

describe('ensureShameParts', () => {
  it('creates a tagged part per picked reaction with the default name, role and intention', async () => {
    const created = await ensureShameParts(mapEntry(['attackSelf', 'attackOthers']))

    const payloads = vi.mocked(ifsPartDexieRepository.create).mock.calls.map(call => call[0])
    expect(payloads).toHaveLength(2)
    expect(payloads[0]).toMatchObject({
      name: 'Krytyk',
      role: 'manager',
      positiveIntention: SHAME_COMPASS_PARTS.attackSelf.positiveIntention,
      triggerContexts: ['wstyd'],
      tags: ['shame-compass:attackSelf', 'program:shame-compassion'],
    })
    expect(payloads[1]).toMatchObject({
      name: 'Oskarżyciel',
      role: 'firefighter',
      tags: ['shame-compass:attackOthers', 'program:shame-compassion'],
    })
    expect(created.map(p => p.name)).toEqual(['Krytyk', 'Oskarżyciel'])
  })

  it('is idempotent: an existing tagged part (even renamed) is reused, never duplicated', async () => {
    vi.mocked(ifsPartDexieRepository.getAll).mockResolvedValueOnce([
      part({ id: 'p-critic', name: 'Sędzia', tags: ['shame-compass:attackSelf'] }),
    ])

    const result = await ensureShameParts(mapEntry(['attackSelf', 'withdraw']))

    expect(ifsPartDexieRepository.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ifsPartDexieRepository.create).mock.calls[0]?.[0]?.name).toBe('Ukrywający')
    expect(result.map(p => p.id)).toEqual(['p-critic', 'part-Ukrywający'])
  })

  it('does not recreate a reaction the user dismissed on the shame-path enrollment', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([
      enrollment({ partsDismissed: ['avoid'] }),
    ])

    const result = await ensureShameParts(mapEntry(['avoid', 'withdraw']))

    expect(ifsPartDexieRepository.create).toHaveBeenCalledTimes(1)
    expect(result.map(p => p.name)).toEqual(['Ukrywający'])
  })

  it('does nothing for an entry without compass answers', async () => {
    expect(await ensureShameParts({ responses: { areas: ['work'] } })).toEqual([])
    expect(ifsPartDexieRepository.getAll).not.toHaveBeenCalled()
  })
})

describe('ensureShamePartsForEntry', () => {
  it('loads the saved shame-map entry by id and returns null when it is gone', async () => {
    const saved = {
      id: 'map-1',
      exerciseSlug: 'shame-map',
      createdAt: '2026-10-04T10:00:00.000Z',
      updatedAt: '2026-10-04T10:00:00.000Z',
      responses: { compass: ['withdraw'] },
    }
    vi.mocked(microExerciseEntryDexieRepository.getBySlug)
      .mockResolvedValueOnce([saved])
      .mockResolvedValueOnce([saved])

    expect((await ensureShamePartsForEntry('map-1'))?.map(p => p.name)).toEqual(['Ukrywający'])
    expect(await ensureShamePartsForEntry('missing')).toBeNull()
  })
})

describe('dismissShamePart', () => {
  it('appends the reaction to the open enrollment once', async () => {
    const rows = [
      enrollment({ id: 'old', status: 'abandoned', createdAt: '2026-08-01T10:00:00.000Z' }),
      enrollment({ partsDismissed: ['avoid'] }),
    ]
    vi.mocked(programEnrollmentDexieRepository.listAll)
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(rows)

    await dismissShamePart('withdraw')
    await dismissShamePart('avoid')

    expect(programEnrollmentDexieRepository.update).toHaveBeenCalledTimes(1)
    expect(vi.mocked(programEnrollmentDexieRepository.update).mock.calls[0]).toEqual([
      'enr-shame',
      { partsDismissed: ['avoid', 'withdraw'] },
    ])
  })

  it('is a no-op without a shame-path enrollment', async () => {
    await dismissShamePart('withdraw')
    expect(programEnrollmentDexieRepository.update).not.toHaveBeenCalled()
  })
})

describe('shamePartByReaction', () => {
  it('finds the part by tag regardless of its current name', () => {
    const parts = [
      part({ id: 'a', name: 'Mój krytyk', tags: ['shame-compass:attackSelf', 'program:shame-compassion'] }),
      part({ id: 'b', name: 'Ukrywający' }),
    ]
    expect(shamePartByReaction(parts, 'attackSelf')?.id).toBe('a')
    // an untagged part with the default name is not the path's part
    expect(shamePartByReaction(parts, 'withdraw')).toBeUndefined()
  })
})
