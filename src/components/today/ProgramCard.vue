<template>
  <article class="dz-card neo-raised flex flex-col gap-[10px] p-3">
    <header class="dz-card__head">
      <button type="button" class="dz-card__label" @click="router.push('/exercises')">
        {{ t('planning.today.wellness.programs') }}
      </button>
    </header>

    <div
      v-for="row in rows"
      :key="row.enrollment.id"
      class="dz-program"
    >
      <button
        v-if="row.due && row.entry"
        type="button"
        class="dz-program__cta neo-focus"
        :aria-label="t('planning.today.wellness.ariaProgramStart')"
        @click="router.push(row.entry.route)"
      >
        <AppIcon :name="row.entry.icon" class="text-xl" />
      </button>
      <span v-else class="dz-program__cta dz-program__cta--idle">
        <AppIcon :name="row.programIcon" class="text-xl" />
      </span>

      <div class="min-w-0">
        <button
          type="button"
          class="dz-program__title neo-focus"
          :aria-label="t('planning.today.wellness.ariaProgramOpen')"
          @click="router.push({ name: 'program-detail', params: { slug: row.enrollment.programSlug } })"
        >
          {{ row.title }}
        </button>
        <p class="dz-program__caption">{{ row.caption }}</p>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import { getProgramDefinition } from '@/data/programCatalog'
import type { DayRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'

const props = defineProps<{
  /** Active enrollments only (the tile renders only when non-empty). */
  enrollments: ProgramEnrollment[]
  todayRef: DayRef
}>()

const router = useRouter()
const { t, locale } = useT()
const planStore = useExercisePlanStore()

/**
 * One compact row per active path: progress caption (walked steps of
 * total, P12), plus the current step's CTA when its plan item is due —
 * otherwise the "from {date}" caption (early completion doesn't unlock
 * a step, D2).
 */
const rows = computed(() =>
  props.enrollments.map((enrollment) => {
    const program = getProgramDefinition(enrollment.programSlug)
    const item = planStore.pendingItems.find(
      (candidate) => candidate.source === 'program' && candidate.sourceRef === enrollment.id,
    )
    const due = Boolean(item && item.dayRef <= props.todayRef)
    const caption = [
      t('planning.today.wellness.programStepProgress', {
        current: Math.min(enrollment.currentStepIndex + 1, program?.steps.length ?? 0),
        total: program?.steps.length ?? 0,
      }),
      !due && item ? t('planning.today.wellness.programFrom', { date: formatDay(item.dayRef) }) : '',
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      enrollment,
      title: program ? t(`${program.i18nKey}.title`) : enrollment.programSlug,
      programIcon: program?.icon ?? 'route',
      entry: item ? getCatalogEntry(item.exerciseSlug) : undefined,
      due,
      caption,
    }
  }),
)

function formatDay(dayRef: DayRef): string {
  return new Date(dayRef).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
  })
}
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

.dz-program {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dz-program__cta {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  border: 1px dashed rgb(var(--color-primary) / 0.55);
  color: rgb(var(--color-primary-strong));
  cursor: pointer;
  transition: transform 200ms ease, border-color 200ms ease;
}
button.dz-program__cta:hover {
  border-color: rgb(var(--color-primary));
  transform: translateY(-1px);
}
button.dz-program__cta:active {
  transform: translateY(0);
}

.dz-program__cta--idle {
  border-style: solid;
  border-color: rgb(var(--neo-border) / 0.4);
  color: rgb(var(--neo-muted));
  cursor: default;
}

.dz-program__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
  color: rgb(var(--color-on-surface));
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 200ms ease;
}
.dz-program__title:hover {
  color: rgb(var(--color-primary));
}

.dz-program__caption {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgb(var(--neo-muted));
}
</style>
