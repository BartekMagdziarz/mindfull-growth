<template>
  <section class="weekly-planner" aria-label="Rozłożenie obiektów na dni tygodnia">
    <div class="weekly-planner__head"><span>Obiekt</span><span v-for="day in days" :key="day.dayRef">{{ day.shortLabel }}</span><span>Target</span></div>
    <article v-for="item in visibleItems" :key="item.key" class="weekly-row">
      <div class="weekly-row__main">
        <span class="weekly-row__label"><AppIcon :name="iconFor(item.family)" /><span><small>{{ priorityKeys.has(item.key) ? 'Fokus · ' : '' }}{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong></span></span>
        <button v-for="day in days" :key="day.dayRef" type="button" class="weekly-row__day" :class="{ active: isAssigned(item.key, day.dayRef) }" :aria-label="`${item.title}, ${day.shortLabel}`" @click="toggleAssignment(item.key, day.dayRef)"><i /></button>
        <button type="button" class="weekly-row__target" :aria-expanded="expandedKey === item.key" @click="expandedKey = expandedKey === item.key ? null : item.key"><span>≥ {{ targets[item.key] }}</span><AppIcon name="expand_more" /></button>
      </div>
      <div class="weekly-row__underbar" :class="{ editing: expandedKey === item.key }">
        <div class="weekly-row__actions"><button type="button" @click="assignWholeWeek(item.key)"><AppIcon name="date_range" />Cały tydzień</button><button type="button" @click="clearAssignments(item.key)"><AppIcon name="ink_eraser" />Wyczyść</button></div>
        <div v-if="expandedKey === item.key" class="weekly-target-editor">
          <label><span>Target</span><input v-model.number="targets[item.key]" :aria-label="`Target tygodnia: ${item.title}`" type="number" min="0" /></label>
          <label v-if="item.entryMode === 'completion'"><span>Dni z wpisem</span><input v-model.number="entryDays[item.key]" :aria-label="`Dni z wpisem: ${item.title}`" type="number" min="0" max="7" /></label>
          <p><AppIcon name="event_available" /><span><strong>{{ assignedDays(item.key).length }} dni</strong><small>{{ assignedDaysLabel(item.key) }}</small></span></p>
          <button type="button" @click="resetTarget(item.key)"><AppIcon name="restart_alt" />Przywróć</button>
        </div>
      </div>
    </article>
    <button v-if="dormantItems.length" type="button" class="weekly-planner__rest" :aria-expanded="showRest" @click="showRest = !showRest"><span><AppIcon name="inventory_2" /><span><strong>Pozostałe obiekty</strong><small>{{ dormantItems.length }} poza pierwszym planem</small></span></span><AppIcon name="expand_more" /></button>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject, LabWeekDay } from '@product/dev/richVerificationScenario'

const props = defineProps<{ items: LabFixtureObject[]; days: LabWeekDay[]; priorityKeys: Set<string>; modelValue: Set<string> }>()
const emit = defineEmits<{
  'update:modelValue': [value: Set<string>]
  'summary-change': [value: Array<{ itemKey: string; target: number; entryDays: number | null; assignedDayRefs: string[] }>]
}>()
const expandedKey = ref<string | null>(props.items[0]?.key ?? null)
const showRest = ref(false)
const defaultTarget = (item: LabFixtureObject) => Number(item.targetLabel?.match(/\d+/)?.[0] ?? 1)
const targets = reactive<Record<string, number>>(Object.fromEntries(props.items.map(item => [item.key, defaultTarget(item)])))
const entryDays = reactive<Record<string, number>>(Object.fromEntries(props.items.map(item => [item.key, Math.min(7, defaultTarget(item))])))
const focusItems = computed(() => props.items.filter(item => props.priorityKeys.has(item.key)))
const dormantItems = computed(() => props.items.filter(item => !props.priorityKeys.has(item.key)))
const visibleItems = computed(() => showRest.value ? [...focusItems.value, ...dormantItems.value] : focusItems.value)

function assignmentKey(itemKey: string, dayRef: string) { return `${itemKey}:${dayRef}` }
function isAssigned(itemKey: string, dayRef: string) { return props.modelValue.has(assignmentKey(itemKey, dayRef)) }
function assignedDays(itemKey: string) { return props.days.filter(day => isAssigned(itemKey, day.dayRef)) }
function assignedDaysLabel(itemKey: string) { const labels = assignedDays(itemKey).map(day => day.shortLabel); return labels.length ? labels.join(' · ') : 'bez przypisanego dnia' }
function toggleAssignment(itemKey: string, dayRef: string) { const next = new Set(props.modelValue); const key = assignmentKey(itemKey, dayRef); next.has(key) ? next.delete(key) : next.add(key); emit('update:modelValue', next) }
function assignWholeWeek(itemKey: string) { const next = new Set(props.modelValue); props.days.forEach(day => next.add(assignmentKey(itemKey, day.dayRef))); emit('update:modelValue', next) }
function clearAssignments(itemKey: string) { emit('update:modelValue', new Set([...props.modelValue].filter(key => !key.startsWith(`${itemKey}:`)))) }
function resetTarget(itemKey: string) { const item = props.items.find(candidate => candidate.key === itemKey); if (item) { targets[itemKey] = defaultTarget(item); entryDays[itemKey] = Math.min(7, defaultTarget(item)) } }
function iconFor(family: LabFixtureObject['family']) { return ({ goal: 'outlined_flag', keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed' })[family] }
function familyLabel(family: LabFixtureObject['family']) { return ({ goal: 'Cel', keyResult: 'Rezultat', habit: 'Nawyk', tracker: 'Tracker', intention: 'Intencja' })[family] }

watch(
  [() => props.modelValue, targets, entryDays, () => props.items],
  () => emit('summary-change', props.items.map(item => ({
    itemKey: item.key,
    target: targets[item.key] ?? defaultTarget(item),
    entryDays: item.entryMode === 'completion' ? entryDays[item.key] ?? null : null,
    assignedDayRefs: assignedDays(item.key).map(day => day.dayRef),
  }))),
  { deep: true, immediate: true },
)
</script>

<style scoped>
.weekly-planner { display: grid; min-width: 790px; gap: 7px; }.weekly-planner__head, .weekly-row__main { display: grid; grid-template-columns: minmax(210px, 1fr) repeat(7, 46px) 92px; align-items: center; gap: 5px; }.weekly-planner__head { padding: 4px 10px 7px; color: var(--ritual-muted); font-size: 7px; font-weight: 900; text-align: center; text-transform: uppercase; }.weekly-planner__head span:first-child { text-align: left; }.weekly-row { display: grid; gap: 6px; padding: 9px 10px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 17px 14px 18px 15px; background: var(--ritual-paper); }.weekly-row__label { display: flex; align-items: center; gap: 7px; min-width: 0; }.weekly-row__label > .material-symbols-outlined { color: var(--ritual-strong); font-size: 18px; }.weekly-row__label > span { display: grid; gap: 1px; min-width: 0; }.weekly-row__label small { color: var(--ritual-blue); font-size: 5.5px; font-weight: 900; text-transform: uppercase; }.weekly-row__label strong { overflow: hidden; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }.weekly-row__day { display: grid; place-items: center; width: 30px; height: 30px; margin: auto; border: 1px dashed rgb(var(--sky-300) / .68); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: transparent; cursor: pointer; }.weekly-row__day i { width: 10px; height: 10px; border-radius: 50%; }.weekly-row__day.active { border-style: solid; background: rgb(var(--sky-200) / .66); }.weekly-row__day.active i { background: rgb(var(--sky-700)); }.weekly-row__target { display: flex; align-items: center; justify-content: space-between; min-height: 29px; padding: 0 8px; border: 0; border-radius: 12px 9px 13px 10px; color: var(--ritual-strong); background: rgb(var(--sky-100) / .65); font-size: 7px; font-weight: 900; cursor: pointer; }.weekly-row__target .material-symbols-outlined { font-size: 14px; }
.weekly-row__underbar { display: grid; grid-template-columns: minmax(210px, 1fr) minmax(0, 2.08fr); align-items: center; gap: 10px; min-height: 27px; }.weekly-row__underbar.editing { padding-top: 5px; border-top: 1px dashed rgb(var(--sky-300) / .34); }.weekly-row__actions { display: flex; gap: 5px; }.weekly-row__actions button, .weekly-target-editor button { display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 26px; padding: 4px 7px; border: 0; border-radius: 9px; color: var(--ritual-muted); background: rgb(var(--sky-100) / .42); font-size: 6px; font-weight: 800; cursor: pointer; }.weekly-row__actions .material-symbols-outlined, .weekly-target-editor .material-symbols-outlined { font-size: 12px; }
.weekly-target-editor { display: grid; grid-template-columns: 92px 98px minmax(125px, 1fr) auto; align-items: center; gap: 6px; min-width: 0; padding: 4px 5px; border-radius: 12px 10px 13px 11px; background: rgb(var(--color-primary-soft) / .32); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .06); }.weekly-target-editor label { display: grid; grid-template-columns: auto 46px; align-items: center; gap: 5px; min-width: 0; }.weekly-target-editor label span { color: var(--ritual-muted); font-size: 5.5px; font-weight: 800; white-space: nowrap; }.weekly-target-editor input { width: 46px; min-height: 25px; padding: 0 6px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 9px 7px 10px 8px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .76); font-size: 7px; }.weekly-target-editor p { display: flex; align-items: center; gap: 5px; min-width: 0; margin: 0; color: var(--ritual-strong); }.weekly-target-editor p > .material-symbols-outlined { flex: 0 0 auto; }.weekly-target-editor p > span { display: grid; min-width: 0; }.weekly-target-editor p strong { font-size: 6.5px; }.weekly-target-editor p small { overflow: hidden; color: var(--ritual-muted); font-size: 5.5px; text-overflow: ellipsis; white-space: nowrap; }
.weekly-planner__rest { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 12px; border: 1px dashed rgb(var(--sky-300) / .5); border-radius: 15px 12px 16px 13px; color: var(--ritual-muted); background: rgb(var(--sky-100) / .28); cursor: pointer; }.weekly-planner__rest > span { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 7px; text-align: left; }.weekly-planner__rest > span > .material-symbols-outlined { grid-row: 1 / 3; color: var(--ritual-strong); }.weekly-planner__rest span span { display: grid; gap: 1px; }.weekly-planner__rest strong { font-size: 7px; }.weekly-planner__rest small { font-size: 6px; }.weekly-planner__rest > .material-symbols-outlined { color: var(--ritual-blue); font-size: 15px; }
</style>
