<template>
  <div class="rounded-[24px] border border-neu-border/15 bg-section/35 px-4 py-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <EntityIcon :icon="item.parentIcon" size="xs" :circle="false" />
        <p class="truncate text-sm font-semibold text-on-surface">
          {{ item.parentName }}
        </p>
        <span
          class="inline-flex items-center rounded-full border border-neu-border/20 bg-background/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant"
        >
          {{ item.parentKind === 'project' ? t('today.progress.projectSource') : t('today.progress.habitSource') }}
        </span>
      </div>

      <span
        v-if="item.projectIsDone"
        class="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success"
      >
        {{ t('today.progress.doneProject') }}
      </span>
    </div>

    <p class="mt-3 text-sm text-on-surface-variant">
      {{ item.tracker.name }}
    </p>

    <div class="mt-4">
      <TrackerInlineInput
        :tracker="item.tracker"
        :period-type="item.cadence"
        :start-date="item.startDate"
        :end-date="item.endDate"
        compact
        @logged="emit('logged', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TrackerInlineInput from '@/components/planning/TrackerInlineInput.vue'
import EntityIcon from '@/components/planning/EntityIcon.vue'
import { useT } from '@/composables/useT'
import type { TodayProgressItem as TodayProgressItemModel } from '@/types/today'

const { t } = useT()

defineProps<{
  item: TodayProgressItemModel
}>()

const emit = defineEmits<{
  logged: [trackerId: string]
}>()
</script>
