<template>
  <AppCard class="neo-raised w-full overflow-hidden">
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0 flex-1 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            {{ t('today.priorityCompass.eyebrow') }}
          </p>
          <h2 class="text-2xl font-semibold leading-tight text-on-surface md:text-[2rem]">
            {{ t('today.priorityCompass.title') }}
          </h2>
          <p v-if="supportingLine" class="max-w-3xl text-sm leading-relaxed text-on-surface-variant">
            {{ supportingLine }}
          </p>
        </div>

        <AppButton variant="tonal" class="px-4 py-2 text-sm" @click="emit('openPlanning')">
          {{ t('today.priorityCompass.openPlanning') }}
        </AppButton>
      </div>

      <div v-if="items.length > 0" class="divide-y divide-neu-border/15">
        <TodayPriorityRow
          v-for="item in items"
          :key="item.id"
          :item="item"
        />
      </div>

      <div v-else class="rounded-2xl border border-neu-border/20 bg-section/45 px-5 py-4 text-sm text-on-surface-variant">
        {{ t('today.priorityCompass.empty') }}
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { TodayPriorityCompassItem } from '@/types/today'
import TodayPriorityRow from './TodayPriorityRow.vue'

const { t } = useT()

const props = defineProps<{
  items: TodayPriorityCompassItem[]
  yearTheme?: string
  weekFocusSentence?: string
}>()

const emit = defineEmits<{
  openPlanning: []
}>()

const supportingLine = computed(() => props.weekFocusSentence?.trim() || props.yearTheme?.trim() || '')
</script>
