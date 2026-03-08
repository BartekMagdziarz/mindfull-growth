<template>
  <div class="grid gap-4 md:grid-cols-2">
    <button
      type="button"
      class="neo-raised neo-focus w-full rounded-[28px] p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
      @click="emit('journalAction')"
    >
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PencilSquareIcon class="h-6 w-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-lg font-semibold text-on-surface">{{ journalTitle }}</p>
              <p class="mt-1 text-sm text-on-surface-variant">{{ journalDescription }}</p>
            </div>
            <span
              v-if="hasJournalToday"
              class="inline-flex items-center rounded-full border border-success/15 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success"
            >
              {{ t('today.capture.journalRecorded') }}
            </span>
          </div>

          <p class="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
            {{
              hasJournalToday
                ? t('today.capture.journalCount', { count: journalCount })
                : t('today.capture.guidedPrompt')
            }}
          </p>
        </div>
      </div>
    </button>

    <button
      type="button"
      class="neo-raised neo-focus w-full rounded-[28px] p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
      @click="emit('emotionAction')"
    >
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HeartIcon class="h-6 w-6" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-lg font-semibold text-on-surface">{{ t('today.capture.emotionTitle') }}</p>
          <p class="mt-1 text-sm text-on-surface-variant">
            {{ emotionDescription }}
          </p>

          <div class="mt-4 flex items-center gap-3">
            <div class="flex gap-1.5" role="progressbar" :aria-valuenow="emotionCount" :aria-valuemax="emotionTarget">
              <span
                v-for="dot in emotionTarget"
                :key="dot"
                class="h-3 w-3 rounded-full transition-all duration-300"
                :class="dot <= emotionCount ? 'bg-primary/80' : 'border-2 border-primary/25'"
              />
            </div>
            <span class="text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
              {{ t('today.capture.emotionProgress', { logged: emotionCount, target: emotionTarget }) }}
            </span>
          </div>
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HeartIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  hasJournalToday: boolean
  journalCount: number
  emotionCount: number
  emotionTarget: number
}>()

const emit = defineEmits<{
  journalAction: []
  emotionAction: []
}>()

const journalTitle = computed(() =>
  props.hasJournalToday ? t('today.capture.continueJournal') : t('today.capture.startJournal'),
)

const journalDescription = computed(() =>
  props.hasJournalToday
    ? t('today.capture.continueJournalDescription')
    : t('today.capture.startJournalDescription'),
)

const emotionDescription = computed(() => {
  if (props.emotionCount >= props.emotionTarget) {
    return t('today.capture.emotionComplete')
  }
  if (props.emotionCount > 0) {
    return t('today.capture.emotionContinue')
  }
  return t('today.capture.emotionStart')
})
</script>
