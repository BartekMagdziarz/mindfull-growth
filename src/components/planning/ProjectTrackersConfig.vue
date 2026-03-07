<template>
  <div class="space-y-4">
    <!-- Section Header -->
    <div class="flex items-center justify-between">
      <div>
        <label class="text-sm font-medium text-on-surface">Progress Trackers</label>
        <p class="text-xs text-on-surface-variant">
          Track milestones or recurring activities for this project
        </p>
      </div>
      <button
        type="button"
        class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        @click="addTracker"
      >
        <PlusIcon class="w-4 h-4" />
        Add Tracker
      </button>
    </div>

    <!-- Tracker List -->
    <div v-if="localTrackers.length > 0" class="space-y-3">
      <div
        v-for="(tracker, index) in localTrackers"
        :key="tracker.id"
        class="border border-neu-border/20 rounded-xl p-3 space-y-3"
      >
        <!-- Tracker Header (Name + Delete) -->
        <div class="flex items-start gap-2">
          <div class="flex-1">
            <label :for="`tracker-name-${index}`" class="sr-only">Tracker name</label>
            <input
              :id="`tracker-name-${index}`"
              v-model="tracker.name"
              type="text"
              placeholder="e.g., Gym Sessions, Meditation"
              class="neo-input w-full px-3 py-1.5 text-on-surface placeholder:text-on-surface-variant text-sm"
              @input="emitUpdate"
            />
          </div>
          <button
            type="button"
            class="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors"
            aria-label="Remove tracker"
            @click="removeTracker(index)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>

        <!-- Tracker Cadence -->
        <div>
          <label class="block text-xs font-medium text-on-surface-variant mb-1.5">
            Cadence
          </label>
          <div class="flex gap-2">
            <button
              type="button"
              :class="[
                'flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tracker.cadence === 'weekly'
                  ? 'shadow-neu-pressed bg-neu-base text-primary border border-neu-border/40'
                  : 'bg-surface-variant text-on-surface-variant hover:bg-primary/10',
              ]"
              @click="setCadence(index, 'weekly')"
            >
              Weekly
            </button>
            <button
              type="button"
              :class="[
                'flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tracker.cadence === 'monthly'
                  ? 'shadow-neu-pressed bg-neu-base text-primary border border-neu-border/40'
                  : 'bg-surface-variant text-on-surface-variant hover:bg-primary/10',
              ]"
              @click="setCadence(index, 'monthly')"
            >
              Monthly
            </button>
          </div>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{
              tracker.cadence === 'weekly'
                ? 'Tracked per week'
                : 'Tracked per month'
            }}
          </p>
        </div>

        <!-- Target Count (adherence only) -->
        <div v-if="tracker.type === 'adherence'">
          <label class="block text-xs font-medium text-on-surface-variant mb-1.5">
            Target Count
          </label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="tracker.targetCount <= 1"
              class="p-1.5 rounded-lg bg-surface-variant text-on-surface-variant hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="decrementCount(index)"
            >
              <MinusIcon class="w-4 h-4" />
            </button>
            <input
              v-model.number="tracker.targetCount"
              type="number"
              min="1"
              max="100"
              class="neo-input w-16 text-center px-2 py-1 text-on-surface"
              @input="emitUpdate"
            />
            <button
              type="button"
              :disabled="tracker.targetCount >= 100"
              class="p-1.5 rounded-lg bg-surface-variant text-on-surface-variant hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="incrementCount(index)"
            >
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Quick Presets -->
        <div v-if="tracker.type === 'adherence'" class="flex flex-wrap gap-1.5">
          <button
            v-for="preset in countPresets"
            :key="preset"
            type="button"
            :class="[
              'px-2 py-1 rounded text-xs transition-colors',
              tracker.targetCount === preset
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-surface-variant text-on-surface-variant hover:bg-primary/10',
            ]"
            @click="setCount(index, preset)"
          >
            {{ preset }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-4 text-sm text-on-surface-variant border border-dashed border-neu-border/30 rounded-xl"
    >
      No trackers configured. Add one to track project progress.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRaw } from 'vue'
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { TrackerType, TrackerCadence } from '@/domain/planning'

/**
 * Local draft shape for configuring project trackers.
 * Maps to the Tracker entity fields relevant for project-level configuration.
 */
interface DraftTracker {
  id: string
  name: string
  type: TrackerType
  cadence: TrackerCadence
  targetCount: number
  tickLabels?: string[]
}

const props = withDefaults(
  defineProps<{
    modelValue?: DraftTracker[]
  }>(),
  {
    modelValue: () => [],
  }
)

const emit = defineEmits<{
  'update:modelValue': [trackers: DraftTracker[]]
}>()

// Local state
const localTrackers = ref<DraftTracker[]>([...props.modelValue])

const countPresets = [5, 10, 15, 20, 30]

// Sync with external changes
watch(
  () => props.modelValue,
  (newValue) => {
    localTrackers.value = [...newValue]
  },
  { deep: true }
)

function addTracker() {
  const newTracker: DraftTracker = {
    id: crypto.randomUUID(),
    name: '',
    type: 'count',
    cadence: 'weekly',
    targetCount: 10,
  }
  localTrackers.value.push(newTracker)
  emitUpdate()
}

function removeTracker(index: number) {
  localTrackers.value.splice(index, 1)
  emitUpdate()
}

function setCadence(index: number, cadence: TrackerCadence) {
  localTrackers.value[index].cadence = cadence
  // Set sensible defaults based on cadence
  if (cadence === 'monthly') {
    localTrackers.value[index].targetCount = 4 // Default to 4 per month
  }
  emitUpdate()
}

function setCount(index: number, count: number) {
  localTrackers.value[index].targetCount = count
  emitUpdate()
}

function incrementCount(index: number) {
  if (localTrackers.value[index].targetCount < 100) {
    localTrackers.value[index].targetCount++
    emitUpdate()
  }
}

function decrementCount(index: number) {
  if (localTrackers.value[index].targetCount > 1) {
    localTrackers.value[index].targetCount--
    emitUpdate()
  }
}

function emitUpdate() {
  const normalized = localTrackers.value.map((tracker) => {
    const raw = toRaw(tracker) as DraftTracker
    return {
      ...raw,
      tickLabels: raw.tickLabels ? [...raw.tickLabels] : undefined,
    }
  })
  emit('update:modelValue', normalized)
}
</script>
