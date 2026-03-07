import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTrackerStore } from '@/stores/tracker.store'
import {
  trackerDexieRepository,
  trackerPeriodDexieRepository,
} from '@/repositories/planningDexieRepository'
import { connectTestDatabase, getTestDatabase } from '@/test/testDatabase'

describe('tracker.store reconcileProjectTrackers', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const db = await connectTestDatabase()
    await db.trackers.clear()
    await db.trackerPeriods.clear()
  })

  it('rolls back tracker and trackerPeriod mutations when reconcile fails', async () => {
    const store = useTrackerStore()
    const projectId = 'project-rollback'

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: projectId,
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Original KR',
      type: 'count',
      cadence: 'weekly',
      targetCount: 3,
      rollup: 'sum',
      sortOrder: 0,
      isActive: true,
    })

    await trackerPeriodDexieRepository.create({
      trackerId: tracker.id,
      startDate: '2026-02-02',
      endDate: '2026-02-08',
      periodTarget: 3,
      ticks: [
        { index: 0, completed: true },
        { index: 1, completed: false },
        { index: 2, completed: false },
      ],
      sourceType: 'planning',
    })

    await expect(
      store.reconcileProjectTrackers(projectId, [tracker], [
        {
          id: 'draft-invalid',
          type: 'count',
          cadence: 'weekly',
          targetCount: 2,
        },
      ])
    ).rejects.toThrow('Key Result name is required.')

    const db = getTestDatabase()
    const trackers = await db.trackers
      .where('[parentType+parentId]')
      .equals(['project', projectId])
      .toArray()
    expect(trackers).toHaveLength(1)
    expect(trackers[0].id).toBe(tracker.id)

    const periods = await db.trackerPeriods.where('trackerId').equals(tracker.id).toArray()
    expect(periods).toHaveLength(1)
    expect(periods[0].periodTarget).toBe(3)
  })
})
