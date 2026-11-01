<template>
  <!--
    One quiet line under the card title. First part: when — the first and
    last assigned period, "na stałe" for a permanent habit, or how long the
    object has existed when nothing is assigned yet. Second part: where it
    belongs — priorities and life areas by name. Names that do not fit are
    cut and the full list shows on hover; a click opens the links editor.
  -->
  <p class="mg-v2-meta ocm">
    <component
      :is="whenInteractive ? 'button' : 'span'"
      v-if="whenLabel"
      :type="whenInteractive ? 'button' : undefined"
      class="ocm__when"
      :class="whenInteractive ? 'ocm__trigger' : ''"
      :aria-label="whenInteractive ? whenAriaLabel : undefined"
      @click="whenInteractive && $emit('open-periods')"
    >
      {{ whenLabel }}
    </component>
    <button
      v-if="linkNames.length > 0"
      type="button"
      class="ocm__links ocm__trigger"
      :title="linkNames.join(' · ')"
      :aria-label="linksAriaLabel"
      @click="$emit('open-links')"
    >
      <span class="ocm__names">{{ linkNames.join(' · ') }}</span>
    </button>
    <button
      v-else-if="emptyLinksLabel"
      type="button"
      class="ocm__links ocm__trigger ocm__links--empty"
      @click="$emit('open-links')"
    >
      {{ emptyLinksLabel }}
    </button>
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'
import { formatPeriodRange, weeksSince } from '@/utils/periodRangeFormat'

const props = withDefaults(
  defineProps<{
    /** Assigned period refs (weeks or months); omit for objects without periods. */
    periods?: string[]
    cadence?: 'weekly' | 'monthly'
    isPermanent?: boolean
    /** Fallback when nothing is assigned: "od N tygodni" since this date. */
    createdAt?: string
    /** The when-part opens the periods picker only when the host can show it. */
    whenInteractive?: boolean
    priorityIds?: string[]
    lifeAreaIds?: string[]
    priorityOptions?: ObjectsLibraryFilterOption[]
    lifeAreaOptions?: ObjectsLibraryFilterOption[]
    /** Shown as a quiet trigger when nothing is linked; omit to render nothing. */
    emptyLinksLabel?: string
  }>(),
  {
    periods: () => [],
    cadence: 'weekly',
    isPermanent: false,
    createdAt: undefined,
    whenInteractive: false,
    priorityIds: () => [],
    lifeAreaIds: () => [],
    priorityOptions: () => [],
    lifeAreaOptions: () => [],
    emptyLinksLabel: undefined,
  }
)

defineEmits<{ 'open-periods': []; 'open-links': [] }>()

const { t, tp, locale } = useT()

const whenLabel = computed(() => {
  if (props.isPermanent) return t('planning.objects.periodsLine.permanent')
  if (props.periods.length > 0) {
    return formatPeriodRange(props.periods, props.cadence, locale.value)
  }
  if (props.createdAt) {
    const weeks = weeksSince(props.createdAt)
    if (weeks === 0) return t('planning.objects.periodsLine.sinceThisWeek')
    return tp(
      weeks,
      'planning.objects.periodsLine.since.one',
      'planning.objects.periodsLine.since.few',
      'planning.objects.periodsLine.since.many'
    )
  }
  return ''
})

const whenAriaLabel = computed(
  () => `${t('planning.objects.periodsLine.label')}: ${whenLabel.value}`
)

// Priorities first, then life areas — only ids that resolve to an option,
// the same list the pickers use.
const linkNames = computed(() => [
  ...props.priorityOptions
    .filter(option => props.priorityIds.includes(option.id))
    .map(option => option.label),
  ...props.lifeAreaOptions
    .filter(option => props.lifeAreaIds.includes(option.id))
    .map(option => option.label),
])

const linksAriaLabel = computed(
  () => `${t('planning.objects.timeline.links')}: ${linkNames.value.join(', ')}`
)
</script>

<style scoped>
.ocm {
  flex-wrap: nowrap;
}

.ocm__when {
  flex: 0 0 auto;
  white-space: nowrap;
}

.ocm__links {
  flex: 0 1 auto;
  min-width: 0;
}

.ocm__names {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A trigger keeps the text's geometry; hover lays it on paper. */
.ocm__trigger {
  margin: 0 calc(-1 * var(--mg-space-1));
  padding: 0 var(--mg-space-1);
  border: 0;
  border-radius: var(--mg-radius-sm);
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--mg-duration-fast) ease;
}

.ocm__trigger:hover,
.ocm__trigger:focus-visible {
  background: var(--mg-color-paper);
}

.ocm__trigger:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}

.ocm__links--empty {
  color: var(--mg-color-primary-strong);
  opacity: 0.7;
}

.ocm__links--empty:hover {
  opacity: 1;
}
</style>
