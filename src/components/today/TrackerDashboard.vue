<template>
  <AppCard class="w-full max-w-md" padding="lg">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-on-surface">Today's Trackers</h3>
      <router-link
        to="/journey"
        class="text-xs text-primary hover:underline"
      >
        Manage
      </router-link>
    </div>

    <!-- Trackers list -->
    <div v-if="dailyTrackers.length > 0" class="space-y-2">
      <TrackerWidget
        v-for="tracker in dailyTrackers"
        :key="tracker.id"
        :tracker="tracker"
        :today-entry="getTodayEntry(tracker.id)"
        @toggle="handleToggle"
        @edit="handleEdit"
      />

      <!-- Progress summary -->
      <div class="pt-3 mt-3 border-t border-outline/20">
        <div class="flex items-center justify-between text-sm">
          <span class="text-on-surface-variant">Progress</span>
          <span class="font-medium text-on-surface">
            {{ completedCount }} / {{ dailyTrackers.length }}
          </span>
        </div>
        <div class="mt-2 h-2 bg-outline/20 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-300"
            :style="{ width: `${completionPercentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-6">
      <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-section flex items-center justify-center">
        <ChartBarIcon class="w-6 h-6 text-on-surface-variant" />
      </div>
      <p class="text-on-surface-variant text-sm mb-3">No trackers set up yet</p>
      <router-link
        to="/journey"
        class="text-primary text-sm hover:underline"
      >
        Create goals with trackers
      </router-link>
    </div>

    <!-- Edit modal -->
    <Teleport to="body">
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeEditModal"
      >
        <div class="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-elevation-3">
          <h4 class="text-lg font-semibold text-on-surface mb-4">
            {{ editingTracker?.name }}
          </h4>

          <!-- Count input -->
          <template v-if="editingTracker?.type === 'count'">
            <div class="flex items-center gap-4 mb-4">
              <button
                @click="decrementValue"
                class="w-12 h-12 rounded-full bg-section flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
              >
                <MinusIcon class="w-6 h-6" />
              </button>
              <input
                v-model.number="editValue"
                type="number"
                min="0"
                class="flex-1 text-center text-2xl font-semibold text-on-surface bg-transparent border-b-2 border-outline/30 focus:border-primary outline-none py-2"
              />
              <button
                @click="incrementValue"
                class="w-12 h-12 rounded-full bg-section flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
              >
                <PlusIcon class="w-6 h-6" />
              </button>
            </div>
            <p v-if="editingTracker.targetValue" class="text-center text-sm text-on-surface-variant mb-4">
              Target: {{ editingTracker.targetValue }} {{ editingTracker.unit || '' }}
            </p>
          </template>

          <!-- Scale input -->
          <template v-else-if="editingTracker?.type === 'scale'">
            <div class="mb-4">
              <input
                v-model.number="editValue"
                type="range"
                min="1"
                max="10"
                class="w-full accent-primary"
              />
              <div class="flex justify-between text-xs text-on-surface-variant mt-1">
                <span>1</span>
                <span class="text-lg font-semibold text-on-surface">{{ editValue }}</span>
                <span>10</span>
              </div>
            </div>
          </template>

          <!-- Note input -->
          <div class="mb-4">
            <label class="text-sm text-on-surface-variant mb-1 block">Note (optional)</label>
            <input
              v-model="editNote"
              type="text"
              placeholder="Add a note..."
              class="w-full px-3 py-2 rounded-lg bg-section text-on-surface placeholder-on-surface-variant border border-outline/30 focus:border-primary outline-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              @click="closeEditModal"
              class="flex-1 px-4 py-2 rounded-xl border border-outline/30 text-on-surface hover:bg-section transition-colors"
            >
              Cancel
            </button>
            <button
              @click="saveEntry"
              class="flex-1 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-strong transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChartBarIcon, MinusIcon, PlusIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import TrackerWidget from '@/components/journey/TrackerWidget.vue'
import { useGoalTrackerStore } from '@/stores/goalTracker.store'
import type { GoalTracker, TrackerEntry } from '@/domain/lifeSeasons'

const goalTrackerStore = useGoalTrackerStore()

// Computed
const dailyTrackers = computed(() => goalTrackerStore.dailyTrackers)
const todayEntries = computed(() => goalTrackerStore.getTodayEntries())

const completedCount = computed(() => {
  return dailyTrackers.value.filter(tracker => {
    const entry = getTodayEntry(tracker.id)
    if (!entry) return false

    if (tracker.type === 'boolean') {
      return entry.value === true
    }
    if (tracker.type === 'count' && tracker.targetValue) {
      return (entry.value as number) >= tracker.targetValue
    }
    return entry.value !== null && entry.value !== undefined
  }).length
})

const completionPercentage = computed(() => {
  if (dailyTrackers.value.length === 0) return 0
  return Math.round((completedCount.value / dailyTrackers.value.length) * 100)
})

// Edit modal state
const showEditModal = ref(false)
const editingTracker = ref<GoalTracker | null>(null)
const editValue = ref<number>(0)
const editNote = ref('')

function getTodayEntry(trackerId: string): TrackerEntry | undefined {
  return todayEntries.value.find((e: TrackerEntry) => e.trackerId === trackerId)
}

async function handleToggle(trackerId: string) {
  const tracker = dailyTrackers.value.find(t => t.id === trackerId)
  if (!tracker) return

  const existingEntry = getTodayEntry(trackerId)
  const newValue = existingEntry?.value === true ? false : true

  await goalTrackerStore.logTodayEntry(trackerId, newValue)
}

function handleEdit(trackerId: string) {
  const tracker = dailyTrackers.value.find(t => t.id === trackerId)
  if (!tracker) return

  editingTracker.value = tracker
  const existingEntry = getTodayEntry(trackerId)
  editValue.value = (existingEntry?.value as number) || 0
  editNote.value = existingEntry?.note || ''
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingTracker.value = null
  editValue.value = 0
  editNote.value = ''
}

function incrementValue() {
  editValue.value++
}

function decrementValue() {
  if (editValue.value > 0) {
    editValue.value--
  }
}

async function saveEntry() {
  if (!editingTracker.value) return

  await goalTrackerStore.logTodayEntry(
    editingTracker.value.id,
    editValue.value,
    editNote.value || undefined
  )
  closeEditModal()
}
</script>
