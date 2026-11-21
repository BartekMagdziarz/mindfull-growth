<template>
  <ol class="ah" :class="`ah--${size}`" :aria-label="`${subject}: wcześniejsze tygodnie`">
    <li v-for="week in rows" :key="week.label" :class="{ 'ah__row--now': week.now }">
      <small>{{ week.label }}</small>
      <LoadStateTrack :load="week.load" :state="week.state" :subject="`${subject} · tydzień od ${week.label}`" :size="size" />
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadStateTrack from '@product/components/shared/charts/LoadStateTrack.vue'
import type { MaybeRating } from '@product/domain/loadState'
import type { PastWeek } from '~lab/lab/areaRatingStep'

/**
 * Wcześniejsze tygodnie obszaru tym samym znakiem co w kalendarzu: data
 * poniedziałku i leżący słupek z kropką. `current` dokłada bieżący tydzień
 * jako ostatni wiersz, rysowany na żywo z ocen kroku.
 */
const props = withDefaults(
  defineProps<{
    weeks: PastWeek[]
    subject: string
    size?: 'md' | 'sm' | 'xs'
    current?: { label: string; load: MaybeRating; state: MaybeRating } | null
    /** Najnowszy tydzień na górze (pod znakiem bieżącego tygodnia). */
    newestFirst?: boolean
  }>(),
  { size: 'sm', current: null, newestFirst: false }
)

const rows = computed(() => {
  const list: (PastWeek & { now?: boolean })[] = [...props.weeks]
  if (props.current) list.push({ ...props.current, now: true })
  return props.newestFirst ? list.reverse() : list
})
</script>

<style scoped>
.ah {
  --ah-gap: 8px;
  display: grid;
  gap: var(--ah-gap);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ah--xs {
  --ah-gap: 6px;
}
.ah > li {
  display: grid;
  grid-template-columns: var(--ah-date, 44px) minmax(0, 1fr);
  align-items: center;
  min-width: 0;
}
.ah small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ah .ah__row--now small {
  color: var(--mg-color-ink);
  font-weight: var(--mg-weight-title);
}
</style>
