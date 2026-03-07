<template>
  <AppCard
    class="neo-card neo-card--tracker relative h-full overflow-hidden group"
  >
    <div class="flex h-full flex-col items-center gap-2.5 px-3 py-3">
      <!-- Title -->
      <p class="block text-center text-lg font-semibold leading-snug text-on-surface line-clamp-2">
        {{ displayName }}
      </p>

      <!-- Cadence badge + Linked objects -->
      <div class="flex flex-wrap items-center justify-center gap-1.5">
        <span
          :class="[
            'neo-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
            'border border-neu-border/22 bg-section/60 text-on-surface-variant',
          ]"
        >
          {{ cadenceLabel }}
        </span>

        <CommitmentLinkedObjectsCluster
          :project="parentProject"
          :life-areas="explicitLifeAreas"
          :priorities="explicitPriorities"
          :derived-life-areas="derivedLifeAreas"
          :derived-priorities="derivedPriorities"
          disabled
        />
      </div>

      <!-- Tracker input -->
      <TrackerInlineInput
        class="w-full"
        :tracker="tracker"
        :period-type="periodType"
        :start-date="startDate"
        :end-date="endDate"
        compact
        @logged="$emit('logged', $event)"
      />
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'

const { t } = useT()
import CommitmentLinkedObjectsCluster from './CommitmentLinkedObjectsCluster.vue'
import TrackerInlineInput from './TrackerInlineInput.vue'
import type { Tracker, Project, Priority } from '@/domain/planning'
import type { Habit } from '@/domain/habit'
import type { LifeArea } from '@/domain/lifeArea'

const props = withDefaults(
  defineProps<{
    tracker: Tracker
    periodType: 'weekly' | 'monthly'
    startDate: string
    endDate: string
    parentProject?: Project
    parentHabit?: Habit
    availableLifeAreas?: LifeArea[]
    availablePriorities?: Priority[]
  }>(),
  {
    parentProject: undefined,
    parentHabit: undefined,
    availableLifeAreas: () => [],
    availablePriorities: () => [],
  }
)

defineEmits<{
  logged: [trackerId: string]
}>()

const displayName = computed(() => {
  if (props.parentHabit) return props.parentHabit.name
  return props.tracker.name
})

const cadenceLabel = computed(() => {
  if (props.parentHabit) return t('planning.components.trackerCard.cadenceLabels.habit')
  if (props.parentProject) return t('planning.components.trackerCard.cadenceLabels.project')
  return props.tracker.cadence === 'weekly'
    ? t('planning.components.trackerCard.cadenceLabels.week')
    : t('planning.components.trackerCard.cadenceLabels.month')
})

// Build linked objects from tracker + parent
const lifeAreaById = computed(() => new Map(props.availableLifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.availablePriorities.map((p) => [p.id, p])))

const explicitLifeAreas = computed(() => {
  const ids = props.tracker.lifeAreaIds ?? []
  return ids.map((id) => lifeAreaById.value.get(id)).filter(Boolean) as LifeArea[]
})

const explicitPriorities = computed(() => {
  const ids = props.tracker.priorityIds ?? []
  return ids.map((id) => priorityById.value.get(id)).filter(Boolean) as Priority[]
})

const derivedLifeAreas = computed(() => {
  const seen = new Set(props.tracker.lifeAreaIds ?? [])
  const derived: LifeArea[] = []

  // From parent project
  if (props.parentProject?.lifeAreaIds) {
    for (const id of props.parentProject.lifeAreaIds) {
      if (!seen.has(id)) {
        const la = lifeAreaById.value.get(id)
        if (la) derived.push(la)
        seen.add(id)
      }
    }
  }

  // From parent habit
  if (props.parentHabit?.lifeAreaIds) {
    for (const id of props.parentHabit.lifeAreaIds) {
      if (!seen.has(id)) {
        const la = lifeAreaById.value.get(id)
        if (la) derived.push(la)
        seen.add(id)
      }
    }
  }

  // From priorities (explicit + parent)
  const allPriorityIds = new Set([
    ...(props.tracker.priorityIds ?? []),
    ...(props.parentProject?.priorityIds ?? []),
    ...(props.parentHabit?.priorityIds ?? []),
  ])
  for (const priorityId of allPriorityIds) {
    const priority = priorityById.value.get(priorityId)
    if (priority?.lifeAreaIds) {
      for (const id of priority.lifeAreaIds) {
        if (!seen.has(id)) {
          const la = lifeAreaById.value.get(id)
          if (la) derived.push(la)
          seen.add(id)
        }
      }
    }
  }

  return derived
})

const derivedPriorities = computed(() => {
  const seen = new Set(props.tracker.priorityIds ?? [])
  const derived: Priority[] = []

  // From parent project
  if (props.parentProject?.priorityIds) {
    for (const id of props.parentProject.priorityIds) {
      if (!seen.has(id)) {
        const p = priorityById.value.get(id)
        if (p) derived.push(p)
        seen.add(id)
      }
    }
  }

  // From parent habit
  if (props.parentHabit?.priorityIds) {
    for (const id of props.parentHabit.priorityIds) {
      if (!seen.has(id)) {
        const p = priorityById.value.get(id)
        if (p) derived.push(p)
        seen.add(id)
      }
    }
  }

  return derived
})
</script>
