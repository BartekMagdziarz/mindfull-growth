<template>
  <div class="qr-plan-groups" :class="{ 'qr-plan-groups--flat': flat }">
    <ul v-if="flat && sortedItems.length" class="qr-plan-flat">
      <li v-for="item in sortedItems" :key="item.key">
        <button
          type="button"
          :aria-label="`Zmień przypisanie: ${item.title}, ${context}`"
          :title="familyLabel[item.family]"
          @click="$emit('edit', item.key)"
        >
          <AppIcon :name="familyIcon[item.family]" /><span class="qr-plan-title">{{ item.title }}</span>
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
          <button
            type="button"
            :aria-label="`Zmień przypisanie: ${item.title}, ${context}`"
            @click="$emit('edit', item.key)"
          >
            {{ item.title }}
          </button>
        </li>
      </ul>
    </details>
    <ul v-if="sortedWeekItems.length" class="qr-plan-flat qr-plan-flat--week" aria-label="Cały tydzień, bez terminu">
      <li v-for="item in sortedWeekItems" :key="item.key" class="qr-plan-week">
        <button
          type="button"
          :aria-label="`Zmień przypisanie: ${item.title}, cały tydzień`"
          :title="`${familyLabel[item.family]} · cały tydzień, bez terminu`"
          @click="$emit('edit', item.key)"
        >
          <AppIcon :name="familyIcon[item.family]" /><span class="qr-plan-title">{{ item.title }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import { familyIcon } from '~lab/lab/actionConceptData'
// Names are visible by default (flat list, family = icon). Collapsible family groups
// are the overflow fallback for a day with more than `flatLimit` dated placements.
// Whole-week (undated) placements repeat in every day card, quieter, below the dated ones.
const props = withDefaults(
  defineProps<{
    items: LabFixtureObject[]
    weekItems?: LabFixtureObject[]
    context: string
    flatLimit?: number
  }>(),
  { weekItems: () => [], flatLimit: 8 }
)
defineEmits<{ edit: [key: string] }>()
const groupDefs = [
  { key: 'goals', label: 'Cele', icon: 'flag', families: ['goal', 'keyResult'] },
  { key: 'habits', label: 'Nawyki', icon: 'routine', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', icon: 'monitoring', families: ['tracker'] },
  { key: 'intentions', label: 'Intencje', icon: 'gps_fixed', families: ['intention'] },
]
const familyLabel: Record<string, string> = {
  goal: 'Cel',
  keyResult: 'Cel',
  habit: 'Nawyk',
  tracker: 'Tracker',
  intention: 'Intencja',
}
const familyOrder = (item: LabFixtureObject) =>
  groupDefs.findIndex(group => group.families.includes(item.family))
const flat = computed(() => props.items.length <= props.flatLimit)
const byFamily = (items: LabFixtureObject[]) =>
  [...items].sort((a, b) => familyOrder(a) - familyOrder(b))
const sortedItems = computed(() => byFamily(props.items))
const sortedWeekItems = computed(() => byFamily(props.weekItems))
const groups = computed(() =>
  groupDefs
    .map(group => ({
      ...group,
      items: props.items.filter(item => group.families.includes(item.family)),
    }))
    .filter(group => group.items.length)
)
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
  border-radius: 11px 14px 10px 13px;
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
  outline: 1px solid rgb(var(--sky-400) / 0.4);
}
.qr-plan-flat li button:focus-visible {
  outline: 2px solid var(--qr-accent);
}
.qr-plan-flat--week li button {
  background: transparent;
  border: 1px dashed rgb(var(--sky-400) / 0.55);
  color: var(--qr-muted);
}
.qr-plan-flat--week .material-symbols-outlined {
  color: rgb(var(--sky-400));
}
.qr-plan-flat + .qr-plan-flat--week,
.qr-plan-group + .qr-plan-flat--week {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgb(var(--sky-400) / 0.25);
}
.qr-plan-group {
  min-width: 0;
  border-radius: 12px 15px 10px 13px;
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
  transition:
    opacity 0.15s,
    transform 0.15s;
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
.qr-plan-group li {
  min-width: 0;
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
  outline: 1px solid rgb(var(--sky-400) / 0.4);
}
.qr-plan-group li button:focus-visible {
  outline: 2px solid var(--qr-accent);
}
@media (hover: none) {
  .qr-group-chevron {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .qr-group-chevron {
    transition: none;
  }
}
</style>
