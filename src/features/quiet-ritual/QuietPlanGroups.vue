<template>
  <div class="qr-plan-groups">
    <ul v-if="flat && sortedItems.length" class="qr-plan-flat">
      <li v-for="item in sortedItems" :key="item.key">
        <button
          type="button"
          :aria-label="`Zmień przypisanie: ${item.title}, ${context}`"
          :title="SUBJECT_LABEL[item.subjectType]"
          @click="emit('edit', item.key)"
        >
          <AppIcon :name="item.icon ?? SUBJECT_ICON[item.subjectType]" /><span class="qr-plan-title">{{ item.title }}</span>
        </button>
      </li>
    </ul>
    <details v-for="group in flat ? [] : groups" :key="group.key" class="qr-plan-group">
      <summary :aria-label="`${group.label}: ${group.items.length}, ${context}`">
        <AppIcon :name="group.icon" /><span>{{ group.label }}</span
        ><small>{{ group.items.length }}</small
        ><AppIcon class="qr-group-chevron" name="expand_more" />
      </summary>
      <ul>
        <li v-for="item in group.items" :key="item.key">
          <button type="button" :aria-label="`Zmień przypisanie: ${item.title}, ${context}`" @click="emit('edit', item.key)">
            {{ item.title }}
          </button>
        </li>
      </ul>
    </details>
    <details v-if="spanGroups.length" class="qr-plan-group qr-plan-group--span">
      <summary :aria-label="`${spanLabel}: ${sortedSpanItems.length}`">
        <AppIcon name="date_range" /><span>{{ spanLabel }}</span><small>{{ sortedSpanItems.length }}</small>
        <AppIcon class="qr-group-chevron" name="expand_more" />
      </summary>
      <ul v-for="group in spanGroups" :key="group.key">
        <li v-for="item in group.items" :key="item.key">
          <button type="button" :aria-label="`Zmień przypisanie: ${item.title}, ${spanLabel}`" @click="emit('edit', item.key)">
            {{ item.title }}
          </button>
        </li>
      </ul>
    </details>
    <ul v-else-if="sortedSpanItems.length" class="qr-plan-flat qr-plan-flat--week" :aria-label="spanLabel">
      <li v-for="item in sortedSpanItems" :key="item.key" class="qr-plan-week">
        <button
          type="button"
          :aria-label="`Zmień przypisanie: ${item.title}, ${spanLabel}`"
          :title="`${SUBJECT_LABEL[item.subjectType]} · ${spanLabel}`"
          @click="emit('edit', item.key)"
        >
          <AppIcon :name="item.icon ?? SUBJECT_ICON[item.subjectType]" /><span class="qr-plan-title">{{ item.title }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
export interface QuietPlanGroupItem {
  key: string
  title: string
  subjectType: MeasurementSubjectType
  icon?: string
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { MeasurementSubjectType } from '@/domain/planningState'
import AppIcon from '@/components/shared/AppIcon.vue'
import { SUBJECT_ICON, SUBJECT_LABEL } from './quietRitualModel'

/**
 * Names are visible by default (a flat list; the family is carried by the icon).
 * Collapsible family groups are the overflow fallback for a day/week card that
 * holds more than `flatLimit` dated placements. Whole-period placements repeat
 * in every card, quieter, below the dated ones.
 */
const props = withDefaults(
  defineProps<{
    items: QuietPlanGroupItem[]
    /** Placements that cover the whole period instead of this cell. */
    spanItems?: QuietPlanGroupItem[]
    spanLabel?: string
    context: string
    flatLimit?: number
  }>(),
  { spanItems: () => [], spanLabel: 'cały tydzień', flatLimit: 8 },
)

const emit = defineEmits<{ edit: [key: string] }>()

const groupDefs: Array<{ key: string; label: string; icon: string; families: MeasurementSubjectType[] }> = [
  { key: 'goals', label: 'Cele', icon: 'flag', families: ['keyResult'] },
  { key: 'habits', label: 'Nawyki', icon: 'routine', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', icon: 'monitoring', families: ['tracker'] },
  { key: 'intentions', label: 'Intencje', icon: 'gps_fixed', families: ['weeklyIntention'] },
]

const familyOrder = (item: QuietPlanGroupItem) => groupDefs.findIndex(group => group.families.includes(item.subjectType))
const byFamily = (items: QuietPlanGroupItem[]) => [...items].sort((left, right) => familyOrder(left) - familyOrder(right))

const flat = computed(() => props.items.length <= props.flatLimit)
const sortedItems = computed(() => byFamily(props.items))
const sortedSpanItems = computed(() => byFamily(props.spanItems))
const groups = computed(() => groupBy(props.items))
/** Whole-period placements repeat in every card, so they collapse sooner. */
const spanGroups = computed(() => (props.spanItems.length > props.flatLimit / 2 ? groupBy(props.spanItems) : []))

function groupBy(items: QuietPlanGroupItem[]) {
  return groupDefs
    .map(group => ({ ...group, items: items.filter(item => group.families.includes(item.subjectType)) }))
    .filter(group => group.items.length)
}
</script>

<style scoped>
.qr-plan-groups {
  display: grid;
  gap: 6px;
  align-content: start;
}
.qr-plan-flat {
  display: grid;
  gap: 5px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.qr-plan-flat li {
  min-width: 0;
}
.qr-plan-flat li button {
  display: flex;
  align-items: start;
  gap: 7px;
  width: 100%;
  border: 0;
  padding: 8px 8px;
  border-radius: var(--mg-radius-sm);
  background: var(--qr-inner);
  color: var(--qr-ink);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}
.qr-plan-flat li button > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.qr-plan-flat .material-symbols-outlined {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 16px;
  color: var(--qr-accent);
}
.qr-plan-flat li button:hover {
  outline: 1px solid var(--qr-line-mid);
}
.qr-plan-flat li button:focus-visible {
  outline: 2px solid var(--qr-accent);
}
.qr-plan-flat--week li button {
  background: transparent;
  border: 1px dashed var(--qr-line-mid);
  color: var(--qr-muted);
}
.qr-plan-flat + .qr-plan-flat--week,
.qr-plan-group + .qr-plan-flat--week,
.qr-plan-flat + .qr-plan-group--span,
.qr-plan-group + .qr-plan-group--span {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--qr-line-soft);
}
.qr-plan-group--span {
  background: transparent;
  border: 1px dashed var(--qr-line-mid);
}
.qr-plan-group--span > summary {
  color: var(--qr-muted);
}
.qr-plan-group {
  min-width: 0;
  border-radius: var(--mg-radius-sm);
  background: var(--qr-inner);
}
.qr-plan-group > summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  min-height: 38px;
  cursor: pointer;
  list-style: none;
  color: var(--qr-ink);
  font-size: 13px;
}
.qr-plan-group > summary::-webkit-details-marker {
  display: none;
}
.qr-plan-group > summary > span:nth-child(2) {
  flex: 1;
  font-weight: 650;
}
.qr-plan-group small {
  font-size: 11px;
  color: var(--qr-muted);
}
.qr-plan-group .material-symbols-outlined {
  font-size: 16px;
  color: var(--qr-accent);
}
.qr-group-chevron {
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
}
.qr-plan-group:hover .qr-group-chevron,
.qr-plan-group:focus-within .qr-group-chevron,
.qr-plan-group[open] .qr-group-chevron {
  opacity: 1;
}
.qr-plan-group[open] .qr-group-chevron {
  transform: rotate(180deg);
}
.qr-plan-group > summary:focus-visible {
  outline: 2px solid var(--qr-accent);
  outline-offset: 2px;
  border-radius: inherit;
}
.qr-plan-group ul {
  display: grid;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0 6px 7px;
}
.qr-plan-group li button {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--qr-ink);
  padding: 8px 7px;
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.qr-plan-group li button:hover {
  outline: 1px solid var(--qr-line-mid);
}
.qr-plan-group li button:focus-visible {
  outline: 2px solid var(--qr-accent);
}
@media (prefers-reduced-motion: reduce) {
  .qr-group-chevron {
    transition: none;
  }
}
</style>
