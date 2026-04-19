<template>
  <div>
    <article
      class="neo-inset rounded-3xl border-primary/10 px-4 py-5 transition-shadow duration-200"
    >
      <!-- Title -->
      <button
        type="button"
        class="mb-4 flex items-center"
        @click="router.push('/journal')"
      >
        <span
          class="text-sm font-semibold text-on-surface transition-colors duration-200 hover:text-primary"
        >{{ t('planning.calendar.wellness.journal') }}</span>
      </button>

      <!-- Content row: dots (left ~50%) | streak (center) | add button (right) -->
      <div class="flex items-center gap-3">
        <!-- Day dots (~half width) -->
        <div class="flex items-center justify-between gap-1" style="flex: 0 1 50%">
          <div
            v-for="slot in recentDays"
            :key="slot.dateKey"
            class="flex flex-col items-center gap-1.5"
          >
            <div class="relative flex items-center justify-center">
              <div
                class="h-7 w-7 rounded-full transition-all duration-300"
                :class="dotClass(slot)"
              />
              <div
                v-if="slot.isToday"
                class="pointer-events-none absolute inset-[-3px] rounded-full border-[1.5px] border-primary/25"
              />
            </div>
            <span
              class="text-[9px] font-medium leading-none"
              :class="slot.isToday ? 'text-primary/60' : 'text-on-surface-variant/40'"
            >{{ slot.dayLabel }}</span>
          </div>
        </div>

        <!-- Streak indicator (between dots and button) -->
        <div class="streak-circle flex flex-col items-center justify-center" :class="streak > 0 ? 'streak-circle--active' : 'streak-circle--empty'">
          <AppIcon name="local_fire_department" class="text-sm leading-none" :class="streak > 0 ? 'text-primary' : 'text-on-surface-variant/25'" />
          <span class="text-[11px] font-bold leading-none" :class="streak > 0 ? 'text-on-surface' : 'text-on-surface-variant/30'">{{ streak }}</span>
        </div>

        <!-- Add button -->
        <button
          type="button"
          class="group/add add-btn ml-auto neo-raised neo-focus flex items-center justify-center transition-all duration-200 hover:-translate-y-px hover:shadow-neu-raised-lg active:translate-y-0 active:shadow-neu-pressed"
          :aria-label="t('planning.calendar.wellness.newEntry')"
          @click.stop="router.push('/journal/edit')"
        >
          <AppIcon
            name="note_add"
            class="text-[28px] leading-none text-on-surface-variant/35 transition-colors duration-200 group-hover/add:text-primary/70"
          />
        </button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { buildRecentDays, type CalendarDaySlot } from '@/utils/wellnessCalendar'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

const props = defineProps<{
  referenceDate: Date
  dayWordCounts: Map<string, number>
}>()

const router = useRouter()
const { t } = useT()
const prefsStore = useUserPreferencesStore()

const locale = computed(() => prefsStore.locale ?? 'en')
const recentDays = computed(() => buildRecentDays(props.referenceDate, 7, locale.value))

const streak = computed(() => {
  const days = [...recentDays.value].reverse()
  let count = 0
  for (let i = 0; i < days.length; i++) {
    if (props.dayWordCounts.has(days[i].dateKey)) {
      count++
    } else if (i === 0 && days[i].isToday) {
      continue
    } else {
      break
    }
  }
  return count
})

function dotClass(slot: CalendarDaySlot): string {
  if (props.dayWordCounts.has(slot.dateKey)) {
    return 'dot-filled'
  }
  if (slot.isFuture) {
    return 'bg-on-surface-variant/5'
  }
  return 'dot-empty'
}
</script>

<style scoped>
.streak-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  gap: 1px;
}

.streak-circle--active {
  background: rgb(var(--neo-surface-base));
  border: 1.5px solid rgb(var(--color-primary) / 0.2);
  box-shadow:
    inset -1.5px -1.5px 3px rgb(var(--neo-inset-light) / 0.7),
    inset 1.5px 1.5px 3px rgb(var(--neo-inset-dark) / 0.18);
}

.streak-circle--empty {
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1.5px -1.5px 3px rgb(var(--neo-inset-light) / 0.5),
    inset 1.5px 1.5px 3px rgb(var(--neo-inset-dark) / 0.12);
}

.add-btn {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 1rem;
}

.dot-filled {
  background: rgb(var(--color-primary) / 0.55);
  box-shadow: 0 0 5px rgb(var(--color-primary) / 0.15);
}

.dot-empty {
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1.5px -1.5px 3px rgb(var(--neo-inset-light) / 0.7),
    inset 1.5px 1.5px 3px rgb(var(--neo-inset-dark) / 0.22);
}
</style>
