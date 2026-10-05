<template>
  <section v-if="practices.length" class="mg-v2-surface mg-v2-surface--raised-sm maintenance" data-testid="maintenance-repeats">
    <div class="maintenance__copy">
      <h2>{{ t('programs.maintenance.title') }}</h2>
      <p v-if="!planned">{{ t('programs.maintenance.lead', { rhythm: rhythmLabel }) }}</p>
      <p v-else>{{ t('programs.maintenance.done', { date: firstDateLabel }) }}</p>
      <ul class="maintenance__list">
        <li v-for="practice in practices" :key="practice.slug">
          <AppIcon :name="practice.icon" />
          <span>{{ practice.title }}</span>
          <small v-if="planned">{{ firstDateLabel }}</small>
        </li>
      </ul>
    </div>
    <button v-if="!planned" type="button" class="mg-v2-button mg-v2-button--primary" :disabled="busy" @click="plan">
      {{ t('programs.maintenance.cta') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { MicroStepValue } from '@/domain/microExercises'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { formatDayShort } from '@/utils/periodLabels'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

/**
 * After "Co zostaje ze mną" (the maintenance plan that closes the path): the
 * practices the user chose to keep become repeat plans — one next occurrence
 * each, at the chosen rhythm from today; completing one offers the next, as
 * every repeat does. The personal plan for a hard moment is not a plan item.
 */
const props = defineProps<{ responses: Record<string, MicroStepValue> }>()

const { t, locale } = useT()
const planStore = useExercisePlanStore()
const busy = ref(false)
const planned = ref(false)

const RHYTHM_DAYS: Record<string, number> = { daily: 1, every2: 2, every3: 3, weekly: 7 }
const rhythm = computed(() => (typeof props.responses.rhythm === 'string' ? props.responses.rhythm : 'every2'))
const days = computed(() => RHYTHM_DAYS[rhythm.value] ?? 2)
const rhythmLabel = computed(() => t(`exerciseWizards.micro.maintenancePlan.rhythm.options.${rhythm.value}`))
const firstDay = computed(() => addDaysToDayRef(getPeriodRefsForDate(new Date()).day, days.value))
const firstDateLabel = computed(() => formatDayShort(firstDay.value, locale.value))

const practices = computed(() => {
  const keep = props.responses.keep
  const slugs = Array.isArray(keep) ? keep.filter((item): item is string => typeof item === 'string' && item !== 'response') : []
  return slugs.flatMap((slug) => {
    const entry = getCatalogEntry(slug)
    return entry ? [{ slug, icon: entry.icon, title: t(`exercises.cards.${entry.i18nKey}.title`) }] : []
  })
})

async function plan(): Promise<void> {
  busy.value = true
  try {
    for (const practice of practices.value) await planStore.createPlan(practice.slug, firstDay.value, 'repeat')
    planned.value = true
  } catch (err) {
    console.error('Failed to plan the kept practices:', err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.maintenance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-4);
  margin-top: var(--mg-space-4);
  padding: var(--mg-space-4);
}
.maintenance__copy {
  display: grid;
  gap: var(--mg-space-2);
  min-width: 0;
}
.maintenance__copy h2 {
  margin: 0;
  font-size: var(--mg-font-size-md);
  font-weight: 800;
}
.maintenance__copy p {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}
.maintenance__list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.maintenance__list li {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
}
.maintenance__list .material-symbols-outlined {
  color: var(--mg-color-primary-strong);
  font-size: 18px;
}
.maintenance__list small {
  color: var(--mg-color-muted);
  font-weight: 600;
}
</style>
