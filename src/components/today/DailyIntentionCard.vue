<template>
  <AppCard class="w-full max-w-md" padding="lg">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-semibold text-on-surface">Today's Focus</h3>
      <router-link
        v-if="currentWeekEntry"
        :to="{ name: 'journey-weekly', params: { id: currentWeekEntry.id } }"
        class="text-xs text-primary hover:underline"
      >
        Edit
      </router-link>
    </div>

    <!-- Has intention -->
    <template v-if="weeklyIntention">
      <div class="flex gap-3">
        <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <SparklesIcon class="w-5 h-5 text-green-600" />
        </div>
        <div class="flex-1">
          <p class="text-on-surface leading-relaxed">{{ weeklyIntention }}</p>
          <p class="text-xs text-on-surface-variant mt-2">
            From {{ weekLabel }}
          </p>
        </div>
      </div>
    </template>

    <!-- No intention set -->
    <template v-else-if="currentWeekEntry">
      <div class="text-center py-4">
        <p class="text-on-surface-variant text-sm mb-3">
          No intention set for this week
        </p>
        <router-link
          :to="{ name: 'journey-weekly', params: { id: currentWeekEntry.id } }"
          class="text-primary text-sm hover:underline"
        >
          Add weekly intention
        </router-link>
      </div>
    </template>

    <!-- No weekly entry at all -->
    <template v-else>
      <div class="text-center py-4">
        <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-section flex items-center justify-center">
          <CalendarIcon class="w-6 h-6 text-on-surface-variant" />
        </div>
        <p class="text-on-surface-variant text-sm mb-3">
          Start your week with an intention
        </p>
        <router-link
          to="/journey"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-strong transition-colors"
        >
          <PlusIcon class="w-4 h-4" />
          Create weekly entry
        </router-link>
      </div>
    </template>

    <!-- Daily quick note -->
    <div v-if="weeklyIntention" class="mt-4 pt-4 border-t border-outline/20">
      <div class="flex items-center gap-2 mb-2">
        <SunIcon class="w-4 h-4 text-amber-500" />
        <span class="text-sm font-medium text-on-surface">Morning note</span>
      </div>
      <template v-if="morningIntention">
        <p class="text-sm text-on-surface-variant">{{ morningIntention }}</p>
      </template>
      <template v-else>
        <button
          @click="openQuickNote"
          class="text-sm text-primary hover:underline"
        >
          Add today's focus
        </button>
      </template>
    </div>

    <!-- Quick note modal -->
    <Teleport to="body">
      <div
        v-if="showQuickNoteModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeQuickNote"
      >
        <div class="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-elevation-3">
          <h4 class="text-lg font-semibold text-on-surface mb-4">
            Today's Focus
          </h4>
          <textarea
            v-model="quickNoteText"
            placeholder="What's your main focus for today?"
            rows="3"
            class="w-full px-3 py-2 rounded-lg bg-section text-on-surface placeholder-on-surface-variant border border-outline/30 focus:border-primary outline-none resize-none mb-4"
          ></textarea>
          <div class="flex gap-3">
            <button
              @click="closeQuickNote"
              class="flex-1 px-4 py-2 rounded-xl border border-outline/30 text-on-surface hover:bg-section transition-colors"
            >
              Cancel
            </button>
            <button
              @click="saveQuickNote"
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
import {
  SparklesIcon,
  CalendarIcon,
  PlusIcon,
  SunIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import { usePeriodicEntryStore } from '@/stores/periodicEntry.store'
import { getWeekRange, formatDateRange } from '@/utils/periodUtils'

const periodicEntryStore = usePeriodicEntryStore()

// Get current week's entry
const currentWeekEntry = computed(() => {
  const now = new Date()
  const weekRange = getWeekRange(now)
  const weekStart = weekRange.start.toISOString().split('T')[0]

  return periodicEntryStore.weeklyEntries.find(
    entry => entry.periodStartDate === weekStart
  )
})

const weeklyIntention = computed(() => currentWeekEntry.value?.intention)

const morningIntention = computed(() => currentWeekEntry.value?.morningIntention)

const weekLabel = computed(() => {
  if (!currentWeekEntry.value) return ''
  const start = new Date(currentWeekEntry.value.periodStartDate)
  const end = new Date(currentWeekEntry.value.periodEndDate)
  return formatDateRange(start, end, 'weekly')
})

// Quick note modal
const showQuickNoteModal = ref(false)
const quickNoteText = ref('')

function openQuickNote() {
  quickNoteText.value = morningIntention.value || ''
  showQuickNoteModal.value = true
}

function closeQuickNote() {
  showQuickNoteModal.value = false
  quickNoteText.value = ''
}

async function saveQuickNote() {
  if (!currentWeekEntry.value) return

  await periodicEntryStore.updateEntry(currentWeekEntry.value.id, {
    morningIntention: quickNoteText.value,
  })
  closeQuickNote()
}
</script>
