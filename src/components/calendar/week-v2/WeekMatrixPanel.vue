<script setup lang="ts">
import type { StreamMatrixCellVM, StreamMatrixRowVM } from '@/components/calendar/stream/streamModel'
import { MATRIX_SECTIONS, composeCellLabel, sectionTitleKey } from '@/domain/reflectionMatrix'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

defineProps<{ matrix: StreamMatrixRowVM[] | null; unlocked: boolean }>()
const emit = defineEmits<{ openReflection: [] }>()
const { t } = useT()

function cellTitle(row: StreamMatrixRowVM, cell: StreamMatrixCellVM): string {
  return `${composeCellLabel(t, row.areaKey, cell.section)}: ${cell.rating === null ? '—' : `${cell.rating}/5`}`
}
</script>

<template>
  <section class="week-matrix" data-testid="week-v2-matrix">
    <p class="week-matrix__label">{{ t('planning.calendar.weekV2.matrix') }}</p>
    <div v-if="matrix" class="week-matrix__grid">
      <span aria-hidden="true" />
      <span v-for="section in MATRIX_SECTIONS" :key="section" class="week-matrix__head">
        {{ t(sectionTitleKey(section)) }}
      </span>
      <template v-for="row in matrix" :key="row.areaKey">
        <span class="week-matrix__area" :title="t(`planning.reflection.weekly.areas.${row.areaKey}.title`)">
          <AppIcon :name="row.icon" />
        </span>
        <span
          v-for="cell in row.cells"
          :key="cell.section"
          class="week-matrix__cell"
          :class="{ 'week-matrix__cell--empty': cell.rating === null }"
          :style="cell.color ? { background: cell.color } : undefined"
          :title="cellTitle(row, cell)"
        >
          {{ cell.rating ?? '—' }}
        </span>
      </template>
    </div>
    <button v-else type="button" class="week-matrix__empty neo-focus" @click="emit('openReflection')">
      <AppIcon name="auto_awesome" />
      <span>{{ unlocked ? t('planning.calendar.weekV2.noReflection') : t('planning.calendar.weekV2.reflectionLocked') }}</span>
    </button>
  </section>
</template>

<style scoped>
.week-matrix { display: flex; flex-direction: column; gap: 9px; }
.week-matrix__label, .week-matrix__head { color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.week-matrix__grid { display: grid; gap: 7px; grid-template-columns: 28px repeat(3, minmax(0, 1fr)); }
.week-matrix__head { align-self: end; overflow: hidden; text-align: center; text-overflow: ellipsis; }
.week-matrix__area { align-items: center; color: rgb(var(--color-primary-strong)); display: flex; justify-content: center; }
.week-matrix__cell { align-items: center; border-radius: 10px; box-shadow: 2px 2px 5px rgb(var(--neo-shadow-dark) / .32), -2px -2px 5px rgb(var(--neo-shadow-light) / .65); color: rgb(var(--neo-text)); display: flex; font-size: 10px; font-weight: 700; justify-content: center; min-height: 31px; }
.week-matrix__cell--empty { background: rgb(var(--neo-surface-base) / .5); box-shadow: inset 1px 1px 3px rgb(var(--neo-inset-dark) / .25), inset -1px -1px 3px rgb(var(--neo-inset-light) / .55); color: rgb(var(--neo-muted)); }
.week-matrix__empty { align-items: center; background: rgb(var(--neo-surface-base)); border: 0; border-radius: 14px; box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .28), inset -2px -2px 5px rgb(var(--neo-inset-light) / .6); color: rgb(var(--neo-muted)); cursor: pointer; display: flex; gap: 8px; justify-content: center; min-height: 80px; padding: 12px; }
</style>
