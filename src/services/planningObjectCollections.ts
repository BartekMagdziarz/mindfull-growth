import type { LifeArea } from '@/domain/lifeArea'
import type { Goal, Habit, Initiative, KeyResult, Priority, Tracker } from '@/domain/planning'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { loadPlanningCached } from '@/services/planningQueryCache'

interface PlanningCoreObjects {
  goals: Goal[]
  keyResults: KeyResult[]
  habits: Habit[]
  trackers: Tracker[]
  initiatives: Initiative[]
}

export interface PlanningLibraryObjects extends PlanningCoreObjects {
  lifeAreas: LifeArea[]
  priorities: Priority[]
}

const planningCoreObjectsCache = new Map<string, { revision: number; value: PlanningCoreObjects | Promise<PlanningCoreObjects> }>()
const planningLibraryObjectsCache = new Map<
  string,
  { revision: number; value: PlanningLibraryObjects | Promise<PlanningLibraryObjects> }
>()

export async function loadPlanningCoreObjects(): Promise<PlanningCoreObjects> {
  return loadPlanningCached(planningCoreObjectsCache, 'core', async () => {
    const [goals, keyResults, habits, trackers, initiatives] = await Promise.all([
      goalDexieRepository.listAll(),
      keyResultDexieRepository.listAll(),
      habitDexieRepository.listAll(),
      trackerDexieRepository.listAll(),
      initiativeDexieRepository.listAll(),
    ])

    return {
      goals,
      keyResults,
      habits,
      trackers,
      initiatives,
    }
  })
}

export async function loadPlanningLibraryObjects(): Promise<PlanningLibraryObjects> {
  return loadPlanningCached(planningLibraryObjectsCache, 'library', async () => {
    const [core, lifeAreas, priorities] = await Promise.all([
      loadPlanningCoreObjects(),
      lifeAreaDexieRepository.getAll(),
      priorityDexieRepository.listAll(),
    ])

    return {
      ...core,
      lifeAreas,
      priorities,
    }
  })
}
