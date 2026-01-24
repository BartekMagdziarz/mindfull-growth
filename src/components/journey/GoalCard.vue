<template>
  <div
    :class="[
      'p-4 rounded-xl border transition-all duration-200',
      isInactive
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : 'bg-surface border-outline/30 hover:shadow-elevation-1 hover:-translate-y-0.5'
    ]"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <!-- Title -->
        <h3 :class="[
          'font-medium',
          isInactive ? 'text-gray-500 line-through' : 'text-on-surface'
        ]">
          {{ goal.title }}
        </h3>

        <!-- Description -->
        <p
          v-if="goal.description"
          class="text-sm text-on-surface-variant mt-1 line-clamp-2"
        >
          {{ goal.description }}
        </p>

        <!-- Meta info -->
        <div class="flex items-center gap-2 mt-2 flex-wrap">
          <!-- Source badge -->
          <span :class="['text-xs px-2 py-0.5 rounded-full', periodBadgeClass]">
            {{ periodLabel }}
          </span>

          <!-- Status badge -->
          <span
            v-if="goal.status !== 'active'"
            :class="['text-xs px-2 py-0.5 rounded-full', statusBadgeClass]"
          >
            {{ goal.status }}
          </span>

          <!-- Child goals count -->
          <span
            v-if="goal.childGoalIds.length > 0"
            class="text-xs text-on-surface-variant"
          >
            {{ goal.childGoalIds.length }} sub-goals
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="showActions" class="flex items-center gap-1">
        <button
          v-if="goal.status === 'active'"
          @click.stop="$emit('complete', goal.id)"
          class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          title="Mark complete"
        >
          <CheckIcon class="w-5 h-5" />
        </button>
        <button
          @click.stop="$emit('edit', goal.id)"
          class="p-2 text-on-surface-variant hover:bg-section rounded-lg transition-colors"
          title="Edit goal"
        >
          <PencilIcon class="w-4 h-4" />
        </button>
        <button
          @click.stop="showMenu = !showMenu"
          class="p-2 text-on-surface-variant hover:bg-section rounded-lg transition-colors relative"
        >
          <EllipsisVerticalIcon class="w-4 h-4" />

          <!-- Dropdown menu -->
          <div
            v-if="showMenu"
            class="absolute right-0 top-full mt-1 w-36 bg-surface rounded-xl shadow-elevation-2 border border-outline/30 py-1 z-10"
          >
            <button
              v-if="goal.status === 'active'"
              @click.stop="handleDefer"
              class="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-section"
            >
              Defer
            </button>
            <button
              v-if="goal.status === 'active'"
              @click.stop="handleDrop"
              class="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-section"
            >
              Drop
            </button>
            <button
              v-if="goal.status !== 'active'"
              @click.stop="handleReactivate"
              class="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-section"
            >
              Reactivate
            </button>
            <button
              @click.stop="$emit('cascade', goal.id)"
              class="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-section"
            >
              Cascade to...
            </button>
            <button
              @click.stop="$emit('delete', goal.id)"
              class="w-full px-3 py-2 text-left text-sm text-error hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CheckIcon,
  PencilIcon,
  EllipsisVerticalIcon,
} from '@heroicons/vue/24/outline'
import type { CascadingGoal } from '@/domain/lifeSeasons'

interface Props {
  goal: CascadingGoal
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
})

const emit = defineEmits<{
  complete: [id: string]
  edit: [id: string]
  defer: [id: string]
  drop: [id: string]
  reactivate: [id: string]
  cascade: [id: string]
  delete: [id: string]
}>()

const showMenu = ref(false)

const isInactive = computed(() =>
  props.goal.status === 'deferred' || props.goal.status === 'dropped'
)

const periodLabel = computed(() => {
  switch (props.goal.sourcePeriodType) {
    case 'yearly':
      return 'Yearly'
    case 'quarterly':
      return 'Quarterly'
    case 'weekly':
      return 'Weekly'
    case 'daily':
      return 'Daily'
    default:
      return props.goal.sourcePeriodType
  }
})

const periodBadgeClass = computed(() => {
  switch (props.goal.sourcePeriodType) {
    case 'yearly':
      return 'bg-purple-100 text-purple-700'
    case 'quarterly':
      return 'bg-blue-100 text-blue-700'
    case 'weekly':
      return 'bg-green-100 text-green-700'
    case 'daily':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
})

const statusBadgeClass = computed(() => {
  switch (props.goal.status) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'deferred':
      return 'bg-yellow-100 text-yellow-700'
    case 'dropped':
      return 'bg-gray-100 text-gray-500'
    default:
      return 'bg-gray-100 text-gray-700'
  }
})

function handleDefer() {
  showMenu.value = false
  emit('defer', props.goal.id)
}

function handleDrop() {
  showMenu.value = false
  emit('drop', props.goal.id)
}

function handleReactivate() {
  showMenu.value = false
  emit('reactivate', props.goal.id)
}
</script>
