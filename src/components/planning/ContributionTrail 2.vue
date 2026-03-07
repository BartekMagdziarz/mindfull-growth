<template>
  <div v-if="trail.length > 0" class="relative">
    <!-- Toggle button -->
    <button
      type="button"
      class="p-1 rounded-lg text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
      aria-label="Show contribution trail"
      @click="isOpen = !isOpen"
    >
      <InformationCircleIcon class="w-4 h-4" />
    </button>

    <!-- Trail popover -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-20 right-0 top-full mt-1 w-64 rounded-xl border border-neu-border/20 bg-neu-base shadow-neu-raised p-3"
      >
        <p class="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
          {{ t('planning.components.contributionTrail.title') }}
        </p>
        <div class="space-y-0">
          <div
            v-for="(node, index) in trail"
            :key="node.id"
            class="flex items-start gap-2"
          >
            <!-- Connector line -->
            <div class="flex flex-col items-center pt-1.5">
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :class="index === 0 ? 'bg-primary' : 'bg-on-surface-variant/40'"
              />
              <div
                v-if="index < trail.length - 1"
                class="w-px h-4 bg-outline/20"
              />
            </div>
            <!-- Node -->
            <RouterLink
              v-if="node.to"
              :to="node.to"
              class="text-xs leading-tight pb-1 text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <span class="font-medium text-on-surface">{{ node.label }}</span>
              <span class="text-on-surface-variant ml-1">({{ node.type }})</span>
            </RouterLink>
            <span
              v-else
              class="text-xs leading-tight pb-1 text-on-surface-variant"
            >
              <span class="font-medium text-on-surface">{{ node.label }}</span>
              <span class="text-on-surface-variant ml-1">({{ node.type }})</span>
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'
import { useProjectStore } from '@/stores/project.store'
import { useHabitStore } from '@/stores/habit.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useTrackerStore } from '@/stores/tracker.store'

const props = defineProps<{
  entityType: 'commitment' | 'kr' | 'habit'
  entityId: string
}>()

interface TrailNode {
  id: string
  label: string
  type: string
  to?: string
}

const { t } = useT()
const isOpen = ref(false)

const projectStore = useProjectStore()
const habitStore = useHabitStore()
const commitmentStore = useCommitmentStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const trackerStore = useTrackerStore()

const trail = computed<TrailNode[]>(() => {
  const nodes: TrailNode[] = []

  if (props.entityType === 'commitment') {
    const commitment = commitmentStore.commitments.find((c) => c.id === props.entityId)
    if (!commitment) return nodes

    nodes.push({
      id: commitment.id,
      label: commitment.name,
      type: t('planning.components.contributionTrail.entityTypes.commitment'),
    })

    // If linked to a project, add Project chain
    if (commitment.projectId) {
      const project = projectStore.getProjectById(commitment.projectId)
      if (project) {
        nodes.push({
          id: project.id,
          label: project.name,
          type: t('planning.components.contributionTrail.entityTypes.project'),
        })
        for (const laId of project.lifeAreaIds ?? []) {
          const la = lifeAreaStore.getLifeAreaById(laId)
          if (la) {
            nodes.push({
              id: la.id,
              label: la.name,
              type: t('planning.components.contributionTrail.entityTypes.lifeArea'),
              to: `/planning/life-areas/${la.id}`,
            })
          }
        }
      }
    }

    // Add priority chain from commitment
    for (const pId of commitment.priorityIds ?? []) {
      const p = priorityStore.getPriorityById(pId)
      if (p) {
        nodes.push({
          id: p.id,
          label: p.name,
          type: t('planning.components.contributionTrail.entityTypes.priority'),
        })
        for (const laId of p.lifeAreaIds ?? []) {
          const la = lifeAreaStore.getLifeAreaById(laId)
          if (la && !nodes.some((n) => n.id === la.id)) {
            nodes.push({
              id: la.id,
              label: la.name,
              type: t('planning.components.contributionTrail.entityTypes.lifeArea'),
              to: `/planning/life-areas/${la.id}`,
            })
          }
        }
      }
    }
  }

  if (props.entityType === 'habit') {
    const habit = habitStore.getHabitById(props.entityId)
    if (!habit) return nodes

    nodes.push({
      id: habit.id,
      label: habit.name,
      type: t('planning.components.contributionTrail.entityTypes.habit'),
      to: `/planning/habits/${habit.id}`,
    })

    const habitTrackers = trackerStore.getTrackersByHabit(habit.id)
    if (habitTrackers.length > 0) {
      nodes.push({
        id: habitTrackers[0].id,
        label: habitTrackers[0].name,
        type: t('planning.components.contributionTrail.entityTypes.tracker'),
      })
    }

  }

  return nodes
})

// Click-outside to close
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
