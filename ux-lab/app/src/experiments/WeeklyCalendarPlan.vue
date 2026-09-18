<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import QuickPlanPanel from './QuickPlanPanel.vue'
import { addDays, weekdayIndexMonday } from '~lab/lab/actionConceptData'
import { useLabStore } from '~lab/stores/lab.store'
const props = defineProps<{ dayRef: string; targeting?: boolean }>()
const emit = defineEmits<{ navigate: [date: string]; expand: [expanded: boolean]; pick: [date: string]; cancelTargeting: [] }>()
const lab = useLabStore()
const expanded = ref(false)
const editButton = ref<HTMLButtonElement>()
const container = ref<HTMLElement>()
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(props.dayRef, i - weekdayIndexMonday(props.dayRef))))
const label = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T12:00:00`).toLocaleDateString('pl-PL', options)
async function expand(value: boolean) {
  expanded.value = value
  emit('expand', value)
  await nextTick()
  if (value) { container.value?.querySelector<HTMLElement>('.quick-plan')?.focus({ preventScroll: true }); container.value?.scrollIntoView({ block: 'nearest', behavior: 'instant' }) }
  else editButton.value?.focus({ preventScroll: true })
}
</script>

<template>
  <div ref="container" class="weekly-calendar" :class="{ 'weekly-calendar--expanded': expanded }">
    <div v-show="!expanded">
      <header class="wc-head">
        <strong>{{ targeting ? 'Wybierz dzień' : label(dayRef, { weekday: 'long', day: 'numeric', month: 'long' }) }}</strong>
        <button v-if="targeting" aria-label="Anuluj przenoszenie" @click="emit('cancelTargeting')"><AppIcon name="close" /></button>
        <button v-else ref="editButton" aria-label="Rozwiń kalendarz do planu tygodnia" title="Plan tygodnia" :aria-expanded="expanded" @click="expand(true)"><AppIcon name="edit_calendar" /></button>
      </header>
      <div class="wc-week">
        <button aria-label="Poprzedni tydzień w kalendarzu dnia" :disabled="targeting" @click="emit('navigate', addDays(dayRef, -7))"><AppIcon name="chevron_left" /></button>
        <button v-for="d in days" :key="d" :aria-label="`Pokaż dzień: ${label(d, {weekday: 'long', day: 'numeric', month: 'long'})}`" :aria-pressed="d === dayRef" :class="{ 'wc-today': d === lab.fixture.refs.today }" @click="targeting ? emit('pick', d) : emit('navigate', d)"><small>{{ label(d, {weekday: 'short'}) }}</small><b>{{ label(d, {day: 'numeric'}) }}</b></button>
        <button aria-label="Następny tydzień w kalendarzu dnia" :disabled="targeting" @click="emit('navigate', addDays(dayRef, 7))"><AppIcon name="chevron_right" /></button>
      </div>
      <button v-if="!targeting && dayRef !== lab.fixture.refs.today" class="wc-return" @click="emit('navigate', lab.fixture.refs.today)">Wróć do dziś</button>
    </div>
    <QuickPlanPanel v-show="expanded" wide weekly-only :initial-day="dayRef" @close="expand(false)" />
  </div>
</template>

<style scoped>
.weekly-calendar{font-family:'Nunito',sans-serif;color:var(--mg-color-ink);min-width:0}
.wc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 2px 10px}
.wc-head strong{font-size:16px}
.weekly-calendar button{border:0;background:transparent;color:inherit;cursor:pointer;padding:7px;border-radius:13px 16px 12px 15px;font:inherit}
.weekly-calendar button:hover{background:var(--mg-color-paper)}
.weekly-calendar button:focus-visible{outline:2px solid rgb(var(--color-primary-strong));outline-offset:2px}
.weekly-calendar .material-symbols-outlined{font-size:19px;color:rgb(var(--color-primary-strong))}
.wc-head>button{display:grid;place-items:center;width:34px;height:34px;background:var(--mg-color-mist)}
.wc-week{display:grid;grid-template-columns:24px repeat(7,minmax(0,1fr)) 24px;gap:3px;align-items:center}
.wc-week>button{display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 2px;position:relative}
.wc-week small{font-size:10px;color:var(--mg-color-muted)}
.wc-week b{font-size:16px}
.wc-week button[aria-pressed=true]{background:var(--mg-color-paper);box-shadow:inset 2px 2px 4px rgb(var(--neo-shadow-dark)/.12),inset -2px -2px 4px rgb(var(--neo-shadow-light)/.7)}
.wc-week .wc-today b{text-decoration:underline;text-underline-offset:5px;text-decoration-color:rgb(var(--color-primary))}
.wc-return{display:block;margin:8px auto 0;font-size:11px!important}
</style>
