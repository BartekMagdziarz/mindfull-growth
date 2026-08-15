<template>
  <section class="target-planner" aria-label="Rozłożenie obiektów i targetów na tygodnie">
    <div class="target-planner__head">
      <span>Obiekt</span>
      <span v-for="week in weeks" :key="week.weekRef">T{{ week.weekRef.split('-W')[1] }}</span>
      <span>Target</span>
    </div>

    <article v-for="item in items" :key="item.key" class="target-row">
      <div class="target-row__main" :class="{ editing: expandedKey === item.key && aggregation[item.key] === 'sum' }">
        <span class="target-row__label"><AppIcon :name="iconFor(item.family)" /><span><small>{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong></span></span>
        <div
          v-for="week in weeks"
          :key="week.weekRef"
          class="target-row__week-cell"
          :class="{ 'has-value': expandedKey === item.key && aggregation[item.key] === 'sum' && isAssigned(item.key, week.weekRef) }"
        >
          <button
            type="button"
            class="target-row__week"
            :class="{ active: isAssigned(item.key, week.weekRef) }"
            :aria-label="`${item.title}, ${week.weekRef}`"
            @click="toggleAssignment(item.key, week.weekRef)"
          ><i /></button>
          <span v-if="expandedKey === item.key && aggregation[item.key] === 'sum' && isAssigned(item.key, week.weekRef)" class="target-row__week-value">
            <strong v-if="distributionMode[item.key] === 'auto'" :aria-label="`Target T${week.weekRef.split('-W')[1]}: ${automaticWeekTarget(item.key, week.weekRef)}`">{{ automaticWeekTarget(item.key, week.weekRef) }}</strong>
            <input v-else :aria-label="`Target T${week.weekRef.split('-W')[1]}`" :value="weekTarget(item.key, week.weekRef)" type="number" min="0" step="1" @input="setWeekTarget(item.key, week.weekRef, $event)" />
          </span>
        </div>
        <button type="button" class="target-row__target" :aria-expanded="expandedKey === item.key" @click="expandedKey = expandedKey === item.key ? null : item.key">
          <span>{{ targetOperator[item.key] }} {{ monthTarget[item.key] }}</span><AppIcon name="expand_more" />
        </button>
      </div>

      <div class="target-row__underbar" :class="{ editing: expandedKey === item.key }">
        <div class="target-row__quick-actions">
          <button type="button" @click="assignWholeMonth(item.key)"><AppIcon name="calendar_month" />Cały miesiąc</button>
          <button type="button" @click="clearAssignments(item.key)"><AppIcon name="ink_eraser" />Wyczyść</button>
        </div>

        <div v-if="expandedKey === item.key" class="target-editor">
          <label class="target-editor__month-value">
            <span>Target</span>
            <span class="target-editor__value"><b>{{ targetOperator[item.key] }}</b><input v-model.number="monthTarget[item.key]" :aria-label="`Target miesiąca: ${item.title}`" type="number" min="0" step="1" /></span>
          </label>
          <div class="distribution-switch" role="group" :aria-label="`Podział targetu na tygodnie: ${item.title}`">
            <button type="button" :class="{ active: distributionMode[item.key] === 'auto' }" @click="setDistributionMode(item.key, 'auto')"><AppIcon name="auto_awesome" />Auto</button>
            <button type="button" :class="{ active: distributionMode[item.key] === 'manual' }" @click="setDistributionMode(item.key, 'manual')"><AppIcon name="tune" />Ręcznie</button>
          </div>
          <p v-if="aggregation[item.key] === 'sum' && assignedWeeks(item.key).length" class="target-editor__balance" :class="distributionMode[item.key] === 'auto' ? 'equal' : targetBalance(item.key).state"><AppIcon :name="distributionMode[item.key] === 'auto' ? 'task_alt' : targetBalance(item.key).icon" /><span><strong>{{ distributionMode[item.key] === 'auto' ? 'Gotowe' : targetBalance(item.key).label }}</strong><small>{{ compactDistributionSummary(item.key) }}</small></span></p>
          <p v-else class="target-editor__empty"><AppIcon name="info" /><span>{{ aggregation[item.key] === 'sum' ? 'Wybierz tydzień' : 'Bez podziału tygodniowego' }}</span></p>
          <button type="button" class="target-editor__reset" :aria-label="`Przywróć target: ${item.title}`" @click="resetTarget(item.key)"><AppIcon name="restart_alt" /><span>Przywróć</span></button>
          <button type="button" class="target-editor__advanced-trigger" :aria-expanded="advancedKey === item.key" @click="advancedKey = advancedKey === item.key ? null : item.key"><AppIcon name="settings" /><span>Ustawienia</span><AppIcon name="expand_more" /></button>
        </div>
      </div>

      <div v-if="expandedKey === item.key && advancedKey === item.key" class="target-editor__advanced">
        <label><span>Warunek</span><select v-model="targetOperator[item.key]"><option value="≥">co najmniej</option><option value="≤">co najwyżej</option><option value="=">dokładnie</option></select></label>
        <label><span>Sposób liczenia</span><select v-model="aggregation[item.key]"><option value="sum">suma</option><option value="average">średnia</option><option value="last">ostatnia wartość</option></select></label>
        <label v-if="item.entryMode === 'completion'"><span>Dni z wpisem</span><input v-model.number="entryDays[item.key]" type="number" min="0" max="31" step="1" /></label>
      </div>
    </article>

    <p v-if="!items.length" class="target-planner__empty"><AppIcon name="arrow_back" />Najpierw wybierz obiekty wspierające kierunki.</p>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject, LabWeekSnapshot } from '@product/dev/richVerificationScenario'

const props = defineProps<{ items: LabFixtureObject[]; weeks: LabWeekSnapshot[]; modelValue: Set<string> }>()
const emit = defineEmits<{
  'update:modelValue': [value: Set<string>]
  'summary-change': [value: Array<{ itemKey: string; operator: string; monthTarget: number; aggregation: string; entryDays: number | null; assignedWeekRefs: string[]; weekTargets: Record<string, number> }>]
}>()

const expandedKey = ref<string | null>(null)
const advancedKey = ref<string | null>(null)
const defaultTargets: Record<string, number> = { 'goal-10k': 1, 'habit-monthly-move': 12, 'goal-mvp': 1, 'kr-functions': 2 }
const monthTarget = reactive<Record<string, number>>(Object.fromEntries(props.items.map(item => [item.key, defaultTargets[item.key] ?? 1])))
const targetOperator = reactive<Record<string, string>>(Object.fromEntries(props.items.map(item => [item.key, '≥'])))
const aggregation = reactive<Record<string, 'sum' | 'average' | 'last'>>(Object.fromEntries(props.items.map(item => [item.key, 'sum'])))
const entryDays = reactive<Record<string, number>>(Object.fromEntries(props.items.map(item => [item.key, item.key === 'habit-monthly-move' ? 12 : 1])))
const distributionMode = reactive<Record<string, 'auto' | 'manual'>>(Object.fromEntries(props.items.map(item => [item.key, 'auto'])))
const weekTargets = reactive<Record<string, number>>({})

function assignmentKey(itemKey: string, weekRef: string) { return `${itemKey}:${weekRef}` }
function isAssigned(itemKey: string, weekRef: string) { return props.modelValue.has(assignmentKey(itemKey, weekRef)) }
function toggleAssignment(itemKey: string, weekRef: string) {
  const next = new Set(props.modelValue)
  const key = assignmentKey(itemKey, weekRef)
  next.has(key) ? next.delete(key) : next.add(key)
  emit('update:modelValue', next)
}
function assignedWeeks(itemKey: string) { return props.weeks.filter(week => isAssigned(itemKey, week.weekRef)) }
function assignWholeMonth(itemKey: string) { const next = new Set(props.modelValue); props.weeks.forEach(week => next.add(assignmentKey(itemKey, week.weekRef))); emit('update:modelValue', next) }
function clearAssignments(itemKey: string) { emit('update:modelValue', new Set([...props.modelValue].filter(key => !key.startsWith(`${itemKey}:`)))) }
function weekTargetKey(itemKey: string, weekRef: string) { return `${itemKey}:${weekRef}` }
function automaticWeekTarget(itemKey: string, weekRef: string) {
  const activeWeeks = assignedWeeks(itemKey)
  const index = activeWeeks.findIndex(week => week.weekRef === weekRef)
  if (index < 0 || !activeWeeks.length) return 0
  const target = monthTarget[itemKey] ?? 0
  const base = Math.floor(target / activeWeeks.length)
  return base + (index < target - base * activeWeeks.length ? 1 : 0)
}
function weekTarget(itemKey: string, weekRef: string) { return weekTargets[weekTargetKey(itemKey, weekRef)] ?? automaticWeekTarget(itemKey, weekRef) }
function setWeekTarget(itemKey: string, weekRef: string, event: Event) { weekTargets[weekTargetKey(itemKey, weekRef)] = Number((event.target as HTMLInputElement).value) || 0 }
function setDistributionMode(itemKey: string, mode: 'auto' | 'manual') {
  distributionMode[itemKey] = mode
  if (mode === 'manual') assignedWeeks(itemKey).forEach(week => { const key = weekTargetKey(itemKey, week.weekRef); if (weekTargets[key] == null) weekTargets[key] = automaticWeekTarget(itemKey, week.weekRef) })
}
function targetSum(itemKey: string) { return assignedWeeks(itemKey).reduce((sum, week) => sum + weekTarget(itemKey, week.weekRef), 0) }
function targetBalance(itemKey: string) {
  const difference = targetSum(itemKey) - (monthTarget[itemKey] ?? 0)
  if (difference === 0) return { state: 'equal', icon: 'task_alt', label: 'Targety się bilansują' }
  if (difference < 0) return { state: 'under', icon: 'south_east', label: `Brakuje ${Math.abs(difference)}` }
  return { state: 'over', icon: 'north_east', label: `O ${difference} ponad target` }
}
function compactDistributionSummary(itemKey: string) {
  const values = assignedWeeks(itemKey).map(week => distributionMode[itemKey] === 'auto' ? automaticWeekTarget(itemKey, week.weekRef) : weekTarget(itemKey, week.weekRef))
  return `${monthTarget[itemKey]} = ${values.join(' + ')}`
}
function resetTarget(itemKey: string) {
  monthTarget[itemKey] = defaultTargets[itemKey] ?? 1
  targetOperator[itemKey] = '≥'
  aggregation[itemKey] = 'sum'
  entryDays[itemKey] = itemKey === 'habit-monthly-move' ? 12 : 1
  distributionMode[itemKey] = 'auto'
  advancedKey.value = null
  Object.keys(weekTargets).filter(key => key.startsWith(`${itemKey}:`)).forEach(key => delete weekTargets[key])
}
function iconFor(family: LabFixtureObject['family']) { return ({ goal: 'outlined_flag', keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed' })[family] }
function familyLabel(family: LabFixtureObject['family']) { return ({ goal: 'Cel', keyResult: 'Rezultat', habit: 'Nawyk', tracker: 'Tracker', intention: 'Intencja' })[family] }

watch(
  [() => props.modelValue, monthTarget, targetOperator, aggregation, entryDays, distributionMode, weekTargets, () => props.items],
  () => emit('summary-change', props.items.map(item => ({
    itemKey: item.key,
    operator: targetOperator[item.key] ?? '≥',
    monthTarget: monthTarget[item.key] ?? 0,
    aggregation: aggregation[item.key] ?? 'sum',
    entryDays: item.entryMode === 'completion' ? entryDays[item.key] ?? null : null,
    assignedWeekRefs: assignedWeeks(item.key).map(week => week.weekRef),
    weekTargets: Object.fromEntries(assignedWeeks(item.key).map(week => [week.weekRef, weekTarget(item.key, week.weekRef)])),
  }))),
  { deep: true, immediate: true },
)
</script>

<style scoped>
.target-planner { display: grid; min-width: 760px; gap: 7px; }
.target-planner__head, .target-row__main { display: grid; grid-template-columns: minmax(220px, 1fr) repeat(5, 54px) 104px; align-items: center; gap: 7px; }
.target-planner__head { padding: 4px 10px 7px; color: var(--ritual-muted); font-size: 7px; font-weight: 900; text-align: center; text-transform: uppercase; }.target-planner__head span:first-child { text-align: left; }
.target-row { display: grid; gap: 6px; padding: 10px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 18px 15px 19px 16px; background: var(--ritual-paper); }
.target-row__label { display: flex; align-items: center; gap: 8px; min-width: 0; }.target-row__label > .material-symbols-outlined { color: var(--ritual-strong); font-size: 18px; }.target-row__label > span { display: grid; gap: 1px; min-width: 0; }.target-row__label small { color: var(--ritual-blue); font-size: 6px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }.target-row__label strong { overflow: hidden; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.target-row__week-cell { display: grid; place-items: center; gap: 3px; min-width: 0; }.target-row__week { display: grid; place-items: center; width: 32px; height: 32px; margin: auto; border: 1px dashed rgb(var(--sky-300) / .7); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: transparent; cursor: pointer; }.target-row__week i { width: 11px; height: 11px; border-radius: 50%; }.target-row__week.active { border-style: solid; background: rgb(var(--sky-200) / .68); box-shadow: inset 2px 2px 4px rgb(var(--neo-inset-dark) / .1); }.target-row__week.active i { background: rgb(var(--sky-700)); }
.target-row__week-value { display: grid; place-items: center; width: 42px; min-height: 24px; }.target-row__week-value strong { display: grid; place-items: center; width: 100%; min-height: 24px; border-radius: 9px 7px 10px 8px; color: var(--ritual-strong); background: rgb(var(--sky-100) / .58); font-size: 8px; }.target-row__week-value input { width: 42px; min-height: 24px; padding: 0 4px; border: 1px solid rgb(var(--sky-300) / .48); border-radius: 9px 7px 10px 8px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .86); font-size: 8px; text-align: center; outline: none; }.target-row__week-value input:focus { border-color: rgb(var(--sky-600) / .58); box-shadow: 0 0 0 2px rgb(var(--sky-200) / .52); }
.target-row__target { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-height: 31px; padding: 0 9px; border: 0; border-radius: 13px 10px 14px 11px; color: var(--ritual-strong); background: rgb(var(--sky-100) / .66); font-size: 8px; font-weight: 900; cursor: pointer; }.target-row__target .material-symbols-outlined { font-size: 15px; }
.target-row__underbar { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(0, 1.95fr); align-items: center; gap: 10px; min-height: 28px; }.target-row__underbar.editing { padding-top: 5px; border-top: 1px dashed rgb(var(--sky-300) / .34); }.target-row__quick-actions { display: flex; gap: 5px; }.target-row__quick-actions button, .target-editor button { display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 26px; padding: 4px 7px; border: 0; border-radius: 9px; color: var(--ritual-muted); background: rgb(var(--sky-100) / .42); font-size: 6px; font-weight: 800; cursor: pointer; }.target-row__quick-actions .material-symbols-outlined, .target-editor button .material-symbols-outlined { font-size: 12px; }
.target-editor { display: grid; grid-template-columns: 108px 134px minmax(116px, 1fr) auto auto; align-items: center; gap: 6px; min-width: 0; padding: 4px 5px; border-radius: 12px 10px 13px 11px; background: rgb(var(--color-primary-soft) / .32); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .06); }
.target-editor__month-value { display: grid; grid-template-columns: auto 72px; align-items: center; gap: 5px; min-width: 0; color: var(--ritual-muted); font-size: 5.5px; font-weight: 800; }.target-editor__value { display: grid; grid-template-columns: 24px 1fr; align-items: center; overflow: hidden; min-height: 25px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 9px 7px 10px 8px; background: rgb(var(--sky-50) / .8); }.target-editor__value b { text-align: center; font-size: 7px; }.target-editor input, .target-editor select, .target-editor__advanced input, .target-editor__advanced select { width: 100%; min-height: 26px; padding: 0 7px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 9px 7px 10px 8px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .8); font-size: 6.5px; outline: none; }.target-editor__value input { min-height: 24px; border: 0; border-left: 1px solid rgb(var(--neo-border) / .1); border-radius: 0; background: transparent; }
.distribution-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }.distribution-switch button { min-height: 26px; background: rgb(var(--sky-50) / .56); }.distribution-switch button.active { color: var(--ritual-strong); background: rgb(var(--sky-200) / .76); box-shadow: inset 2px 2px 4px rgb(var(--neo-inset-dark) / .1); }
.target-editor__balance, .target-editor__empty { display: flex; align-items: center; gap: 5px; min-width: 0; margin: 0; color: var(--ritual-muted); }.target-editor__balance > span { display: grid; min-width: 0; }.target-editor__balance strong { white-space: nowrap; color: var(--ritual-ink); font-size: 6.5px; }.target-editor__balance small { overflow: hidden; color: var(--ritual-muted); font-size: 5.5px; text-overflow: ellipsis; white-space: nowrap; }.target-editor__balance.equal > .material-symbols-outlined { color: rgb(var(--sky-700)); }.target-editor__balance.under > .material-symbols-outlined, .target-editor__balance.over > .material-symbols-outlined { color: rgb(var(--rose-500)); }.target-editor__empty { font-size: 5.5px; white-space: nowrap; }.target-editor__reset span { display: none; }.target-editor__advanced-trigger { white-space: nowrap; }.target-editor__advanced-trigger > .material-symbols-outlined:last-child { font-size: 11px; }
.target-editor__advanced { display: grid; grid-template-columns: 1fr 1.2fr .7fr; gap: 8px; padding: 8px 10px; border-radius: 13px 10px 14px 11px; background: rgb(var(--color-primary-soft) / .26); }.target-editor__advanced label { display: grid; grid-template-columns: auto minmax(90px, 1fr); align-items: center; gap: 6px; }.target-editor__advanced label > span { color: var(--ritual-muted); font-size: 6px; font-weight: 800; }.target-planner__empty { color: var(--ritual-muted); font-size: 8px; }
</style>
