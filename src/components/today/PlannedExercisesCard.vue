<template>
  <article ref="rootRef" class="dz-card neo-raised relative flex flex-col gap-[10px] p-3">
    <header class="dz-card__head">
      <button
        type="button"
        class="dz-card__label"
        @click="router.push('/exercises')"
      >
        {{ t('planning.today.wellness.plannedExercises') }}
      </button>
      <button
        type="button"
        class="dz-actions-btn neo-focus"
        :aria-label="t('planning.today.wellness.ariaPlannedActions')"
        @click.stop="menuOpen = !menuOpen"
      >
        <AppIcon name="more_horiz" class="text-base" />
      </button>
    </header>

    <div
      v-if="menuOpen"
      class="absolute right-2 top-8 z-20 min-w-[140px] overflow-hidden rounded-xl border border-outline/30 bg-surface shadow-lg"
      @click.stop
    >
      <button type="button" class="dz-menu-item" @click="moveToTomorrow">
        {{ t('planning.today.wellness.plannedMoveTomorrow') }}
      </button>
      <button type="button" class="dz-menu-item" @click="openDatePicker">
        {{ t('planning.today.wellness.plannedPickDate') }}
      </button>
      <button type="button" class="dz-menu-item" @click="skip">
        {{ t('planning.today.wellness.plannedSkip') }}
      </button>
    </div>

    <div v-if="nextItem && nextEntry" class="dz-cta">
      <button
        type="button"
        class="dz-slot dz-slot--empty neo-focus"
        :aria-label="t('planning.today.wellness.ariaPlannedStart')"
        @click="router.push(nextEntry.route)"
      >
        <AppIcon :name="nextEntry.icon" class="text-[30px]" />
      </button>
      <p class="dz-title">{{ t(`exercises.cards.${nextEntry.i18nKey}.title`) }}</p>
      <p v-if="isOverdue" class="dz-caption">
        <span class="dz-overdue">{{ t('planning.today.wellness.plannedOverdue') }}</span>
        {{ plannedDateLabel }}
      </p>
      <p v-else class="dz-caption">{{ t('planning.today.wellness.plannedForToday') }}</p>
      <p v-if="items.length > 1" class="dz-caption">
        {{
          tp(
            items.length - 1,
            'planning.today.wellness.plannedMoreCount.one',
            'planning.today.wellness.plannedMoreCount.few',
            'planning.today.wellness.plannedMoreCount.many',
          )
        }}
      </p>
    </div>

    <input
      ref="dateInputRef"
      type="date"
      class="sr-only"
      :min="minMoveDate"
      tabindex="-1"
      aria-hidden="true"
      @change="handleDateChange"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { addDaysToDayRef } from '@/utils/periods'

const props = defineProps<{
  /** Due + overdue plans for today, pre-sorted oldest first (selectDueItems). */
  items: ExercisePlanItem[]
  todayRef: DayRef
}>()

const router = useRouter()
const { t, tp, locale } = useT()
const planStore = useExercisePlanStore()

const rootRef = ref<HTMLElement | null>(null)
const dateInputRef = ref<HTMLInputElement | null>(null)
const menuOpen = ref(false)

const nextItem = computed(() => props.items[0] ?? null)
const nextEntry = computed(() =>
  nextItem.value ? getCatalogEntry(nextItem.value.exerciseSlug) : undefined,
)
const isOverdue = computed(
  () => nextItem.value !== null && nextItem.value.dayRef < props.todayRef,
)
const minMoveDate = computed(() => addDaysToDayRef(props.todayRef, 1))

const plannedDateLabel = computed(() => {
  if (!nextItem.value) return ''
  return new Date(nextItem.value.dayRef).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
  })
})

function moveToTomorrow(): void {
  menuOpen.value = false
  if (!nextItem.value) return
  void planStore.movePlan(nextItem.value.id, addDaysToDayRef(props.todayRef, 1)).catch((err) => {
    console.error('Failed to move exercise plan:', err)
  })
}

function openDatePicker(): void {
  menuOpen.value = false
  dateInputRef.value?.showPicker()
}

function handleDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value && nextItem.value) {
    void planStore.movePlan(nextItem.value.id, input.value as DayRef).catch((err) => {
      console.error('Failed to move exercise plan:', err)
    })
  }
  input.value = ''
}

function skip(): void {
  menuOpen.value = false
  if (!nextItem.value) return
  void planStore.skipPlan(nextItem.value.id).catch((err) => {
    console.error('Failed to skip exercise plan:', err)
  })
}

function handleOutsideClick(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>

<style scoped>
.dz-card {
  border-radius: 1.4rem;
}

.dz-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
}

.dz-card__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 200ms ease;
}
.dz-card__label:hover {
  color: rgb(var(--color-primary));
}

.dz-actions-btn {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: rgb(var(--neo-muted));
  transition: color 200ms ease;
}
.dz-actions-btn:hover {
  color: rgb(var(--color-primary));
}

.dz-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--color-on-surface));
  background: none;
  border: none;
  cursor: pointer;
}
.dz-menu-item:hover {
  background: rgb(var(--color-primary) / 0.08);
}

.dz-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0 2px;
}

.dz-slot {
  width: 88px;
  height: 88px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, background 200ms ease;
}
button.dz-slot {
  cursor: pointer;
}

.dz-slot--empty {
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  border: 1px dashed rgb(var(--color-primary) / 0.55);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.85),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.30);
  color: rgb(var(--color-primary-strong));
}
.dz-slot--empty:hover {
  border-color: rgb(var(--color-primary));
  transform: translateY(-1px);
  box-shadow:
    -6px -6px 12px rgb(var(--neo-shadow-light) / 0.9),
    6px 6px 12px rgb(var(--neo-shadow-dark) / 0.34);
}
.dz-slot:active {
  transform: translateY(0);
}

.dz-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  color: rgb(var(--color-on-surface));
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dz-caption {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-align: center;
  color: rgb(var(--neo-muted));
}

.dz-overdue {
  display: inline-block;
  padding: 1px 6px;
  margin-right: 2px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-warning));
  border: 1px solid rgb(var(--color-warning) / 0.4);
}
</style>
