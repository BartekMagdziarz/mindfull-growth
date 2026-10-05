import { computed, ref } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { ProgramDefinition, ProgramStep } from '@/domain/program'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import { pickableMoments } from './momentSeed'

/**
 * The route a program step launches: the exercise with the step's context
 * query — `continue=latest`, the step's own `launchQuery` (e.g. `partTag`),
 * `seed=fairDemand`, and `momentId` when a moment was picked.
 */
export function stepLaunchRoute(step: ProgramStep, momentId?: string | null): RouteLocationRaw | null {
  const entry = getCatalogEntry(step.exerciseSlug)
  if (!entry) return null
  const query: Record<string, string> = {
    ...(step.continueLatest ? { continue: 'latest' } : {}),
    ...(step.launchQuery ?? {}),
    ...(step.startFrom === 'fairDemand' ? { seed: 'fairDemand' } : {}),
    ...(momentId ? { momentId } : {}),
  }
  return Object.keys(query).length ? { path: entry.route, query } : entry.route
}

/**
 * Launching a step from the path view or the Today card: a step that starts
 * from a moment opens the picker first (when the path has any moments),
 * every other step goes straight to its exercise.
 */
export function useStepLauncher() {
  const router = useRouter()
  const entryStore = useMicroExerciseEntryStore()
  const pickerOpen = ref(false)
  const pending = ref<{ program: ProgramDefinition; step: ProgramStep } | null>(null)

  const pickerMoments = computed<MicroExerciseEntry[]>(() => {
    const kind = pending.value?.program.momentKind
    return kind ? pickableMoments(entryStore.entries, kind) : []
  })

  async function launch(program: ProgramDefinition, stepIndex: number): Promise<void> {
    const step = program.steps[stepIndex]
    if (!step) return
    if (step.startFrom === 'moment' && program.momentKind) {
      await entryStore.loadEntries()
      if (pickableMoments(entryStore.entries, program.momentKind).length > 0) {
        pending.value = { program, step }
        pickerOpen.value = true
        return
      }
    }
    const route = stepLaunchRoute(step)
    if (route) await router.push(route)
  }

  async function picked(entryId: string | null): Promise<void> {
    const target = pending.value
    pending.value = null
    if (!target) return
    const route = stepLaunchRoute(target.step, entryId)
    if (route) await router.push(route)
  }

  return { launch, picked, pickerOpen, pickerMoments }
}
