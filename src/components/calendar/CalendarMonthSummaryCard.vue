<template>
  <button
    type="button"
    class="group block w-full text-left neo-focus"
    @click="$emit('click')"
  >
    <AppCard
      padding="lg"
      variant="raised-strong"
      class="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-neu-raised"
    >
      <div class="flex h-full flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <h3 class="text-[1.75rem] font-semibold tracking-[-0.02em] text-on-surface">
            {{ title }}
          </h3>

          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-outline/20 bg-section/55 text-on-surface-variant transition-colors duration-200 group-hover:text-primary-strong"
            aria-hidden="true"
          >
            <AppIcon name="open_in_new" class="text-base" />
          </span>
        </div>

        <div
          v-if="goalGroups.length > 0 || habitGroups.length > 0"
          class="mt-auto space-y-2"
        >
          <!-- Goals — each goal is icon + pills, all flow inline and wrap -->
          <div
            v-if="goalGroups.length > 0"
            class="flex flex-wrap items-center gap-x-3 gap-y-1.5"
          >
            <span
              v-for="group in goalGroups"
              :key="`goal-${group.goalId}`"
              class="inline-flex items-center gap-1"
            >
              <EntityIcon
                v-if="group.goalIcon"
                :icon="group.goalIcon"
                size="xs"
                :circle="false"
              />
              <KrStatusPill
                v-for="pill in group.pills"
                :key="pill.id"
                :cadence="pill.cadence"
                :monthly-status="pill.monthlyStatus"
                :weeks-met="pill.weeksMet"
                :weeks-total="pill.weeksTotal"
                :label="pill.title"
                color-theme="keyResult"
              />
            </span>
          </div>

          <!-- Divider between goals and habits -->
          <div
            v-if="goalGroups.length > 0 && habitGroups.length > 0"
            class="border-t border-outline/10"
          />

          <!-- Habits — icon + single pill pairs, all flow inline -->
          <div
            v-if="habitGroups.length > 0"
            class="flex flex-wrap items-center gap-x-3 gap-y-1.5"
          >
            <span
              v-for="group in habitGroups"
              :key="`habit-${group.habitId}`"
              class="inline-flex items-center gap-1"
            >
              <EntityIcon
                v-if="group.habitIcon"
                :icon="group.habitIcon"
                size="xs"
                :circle="false"
              />
              <KrStatusPill
                :cadence="group.pill.cadence"
                :monthly-status="group.pill.monthlyStatus"
                :weeks-met="group.pill.weeksMet"
                :weeks-total="group.pill.weeksTotal"
                :label="group.pill.title"
                color-theme="habit"
              />
            </span>
          </div>
        </div>

        <p
          v-else
          class="mt-auto text-xs text-on-surface-variant/60"
        >
          No active goals
        </p>
      </div>
    </AppCard>
  </button>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import KrStatusPill from '@/components/calendar/KrStatusPill.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import type { YearMonthGoalGroup, YearMonthHabitGroup } from '@/services/calendarViewQueries'
import AppIcon from '@/components/shared/AppIcon.vue'

interface Props {
  title: string
  goalGroups?: YearMonthGoalGroup[]
  habitGroups?: YearMonthHabitGroup[]
}

withDefaults(defineProps<Props>(), {
  goalGroups: () => [],
  habitGroups: () => [],
})

defineEmits<{
  click: []
}>()
</script>
