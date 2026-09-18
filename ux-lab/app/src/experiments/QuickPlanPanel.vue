<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { useLabStore } from '~lab/stores/lab.store'
import { addDays, plannableObjects, familyIcon, weekdayIndexMonday } from '~lab/lab/actionConceptData'
const props = defineProps<{ wide?: boolean; weeklyOnly?: boolean; initialDay?: string }>()
const emit = defineEmits<{ close: [] }>()
const lab = useLabStore()
const anchor = lab.fixture.refs.today
const selected = ref(props.initialDay ?? addDays(anchor, 1))
watch(() => props.initialDay, date => { if (date) selected.value = date })
const scale = ref<'day' | 'week' | 'month'>('week')
const candidates = plannableObjects(lab.fixture).filter(o => o.family !== 'goal' && (!props.weeklyOnly || o.cadence !== 'monthly'))
type Placement = { id: number; key: string; date: string; scope: 'day' | 'week' | 'month'; target: string }
const initial: Placement[] = candidates.slice(0, 5).flatMap((o, i) => [0, 2, 5].map((offset, j) => ({ id: i * 10 + j, key: o.key, date: addDays(props.weeklyOnly ? addDays(anchor, -weekdayIndexMonday(anchor)) : anchor, offset + i % 2), scope: 'day' as const, target: '' })))
if (candidates[5]) initial.push({ id: 90, key: candidates[5].key, date: anchor, scope: 'week', target: '' })
if (!props.weeklyOnly && candidates[6]) initial.push({ id: 91, key: candidates[6].key, date: anchor, scope: 'month', target: '' })
const placements = ref<Placement[]>(initial)
let sequence = 100
const undo = ref<Placement[] | null>(null)
const message = ref('')
const editId = ref<number | null>(null)
const adding = ref(false)
const editor = ref<HTMLFormElement>()
const surface = ref<HTMLElement>()
function cancelEdit() { adding.value = false; editId.value = null; void nextTick(() => surface.value?.focus()) }
const draft = ref({ key: candidates[0]?.key ?? '', date: selected.value, scope: 'day' as Placement['scope'], target: '' })
const object = (p: Placement) => candidates.find(o => o.key === p.key)!
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => new Date(`${date}T12:00:00`).toLocaleDateString('pl-PL', options)
const weekStart = (date: string) => addDays(date, -weekdayIndexMonday(date))
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart(selected.value), i)))
const monthStart = computed(() => selected.value.slice(0, 7) + '-01')
const weeks = computed(() => Array.from({ length: 6 }, (_, i) => addDays(weekStart(monthStart.value), i * 7)).filter(d => d.slice(0, 7) === selected.value.slice(0, 7) || addDays(d, 6).slice(0, 7) === selected.value.slice(0, 7)))
const heading = computed(() => scale.value === 'month' ? dateLabel(selected.value, { month: 'long', year: 'numeric' }) : scale.value === 'week' ? `${dateLabel(days.value[0], { day: 'numeric' })}–${dateLabel(days.value[6])}` : dateLabel(selected.value, { weekday: 'long', day: 'numeric', month: 'long' }))
const dated = (date: string) => placements.value.filter(p => p.scope === 'day' && p.date === date)
const flex = computed(() => placements.value.filter(p => p.scope === 'week' ? weekStart(p.date) === weekStart(selected.value) : p.scope === 'month' && p.date.slice(0, 7) === selected.value.slice(0, 7)))
const monthItems = (week: string) => placements.value.filter(p => p.scope !== 'month' && weekStart(p.date) === week).filter((p, i, list) => list.findIndex(q => q.key === p.key) === i)
function navigate(n: number) {
  if (scale.value === 'month') { const d = new Date(`${monthStart.value}T12:00:00`); d.setMonth(d.getMonth() + n); selected.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
  else selected.value = addDays(selected.value, n * (scale.value === 'week' ? 7 : 1))
  adding.value = false; editId.value = null
}
async function begin(p?: Placement) {
  editId.value = p?.id ?? null; adding.value = !p
  draft.value = p ? { ...p } : { key: candidates[0]?.key ?? '', date: selected.value, scope: scale.value === 'month' ? 'month' : 'day', target: '' }
  await nextTick()
  editor.value?.querySelector<HTMLElement>('input, select')?.focus()
}
function remember(text: string) { undo.value = placements.value.map(p => ({ ...p })); message.value = text }
function save() {
  if (!draft.value.key || !/^\d{4}-\d{2}-\d{2}$/.test(draft.value.date)) return
  if (placements.value.some(p => p.id !== editId.value && p.key === draft.value.key && p.scope === draft.value.scope && (p.scope === 'week' ? weekStart(p.date) === weekStart(draft.value.date) : p.scope === 'month' ? p.date.slice(0,7) === draft.value.date.slice(0,7) : p.date === draft.value.date))) { message.value = 'Ten obiekt jest już zaplanowany w tym terminie.'; return }
  remember(editId.value === null ? 'Dodano do planu.' : 'Zmieniono to przypisanie.')
  if (editId.value !== null) placements.value = placements.value.map(p => p.id === editId.value ? { ...draft.value, id: p.id } : p)
  else placements.value.push({ ...draft.value, id: sequence++ })
  selected.value = draft.value.date; editId.value = null; adding.value = false
}
function remove(p: Placement) { remember('Usunięto to przypisanie z planu.'); placements.value = placements.value.filter(o => o.id !== p.id); editId.value = null }
</script>

<template>
  <section ref="surface" tabindex="-1" class="quick-plan mg-design-v2" :class="{ 'quick-plan--wide': props.wide, 'quick-plan--integrated': props.weeklyOnly }" :aria-label="weeklyOnly ? 'Plan tygodnia' : 'Szybki plan'" @keydown.esc.stop.prevent="adding || editId !== null ? cancelEdit() : emit('close')">
    <header class="sp-head"><h2>{{ weeklyOnly ? 'Plan tygodnia' : 'Szybki plan' }}</h2><button :aria-label="weeklyOnly ? 'Wróć do widoku dnia' : 'Zamknij szybki plan'" @click="emit('close')"><AppIcon :name="weeklyOnly ? 'close_fullscreen' : 'close'" /><span v-if="weeklyOnly">Wróć do dnia</span></button></header>
    <div class="sp-nav"><button aria-label="Poprzedni okres planu" @click="navigate(-1)"><AppIcon name="chevron_left" /></button><strong>{{ heading }}</strong><button aria-label="Następny okres planu" @click="navigate(1)"><AppIcon name="chevron_right" /></button><button v-if="weeklyOnly && weekStart(selected) !== weekStart(anchor)" @click="selected = anchor">Bieżący tydzień</button><button v-if="weeklyOnly" class="sp-add" @click="begin()"><AppIcon name="add" /> Dodaj</button></div>
    <div v-if="!weeklyOnly" class="sp-toolbar"><div class="sp-segment" role="group" aria-label="Skala planu"><button v-for="s in (['day', 'week', 'month'] as const)" :key="s" :aria-pressed="scale === s" @click="scale = s">{{ {day:'Dzień',week:'Tydzień',month:'Miesiąc'}[s] }}</button></div><button @click="selected = addDays(anchor, 1); scale = 'day'">Jutro</button><button class="sp-add" @click="begin()"><AppIcon name="add" /> Dodaj</button></div>
    <div v-if="scale === 'week' && !weeklyOnly" class="sp-days"><button v-for="d in days" :key="d" :aria-pressed="selected === d" :aria-label="dateLabel(d, {weekday:'long',day:'numeric',month:'long'})" @click="selected = d"><small>{{ dateLabel(d, {weekday:'short'}) }}</small><strong>{{ dateLabel(d, {day:'numeric'}) }}</strong></button></div>
    <div v-if="scale === 'month'" class="sp-weeks"><button v-for="w in weeks" :key="w" @click="selected = w < monthStart ? monthStart : w; scale = 'week'"><span class="sp-week-title">{{ dateLabel(w) }} – {{ dateLabel(addDays(w,6)) }}<AppIcon name="chevron_right" /></span><span v-if="monthItems(w).length" class="sp-preview"><span v-for="p in monthItems(w).slice(0,3)" :key="p.key">{{ object(p).title }}</span><small v-if="monthItems(w).length > 3">+ pozostałe</small></span><small v-else>Brak przypisań do dni i tygodnia</small></button></div>
    <template v-else>
      <div v-if="wide && scale === 'week'" class="sp-board"><section v-for="d in days" :key="d"><button class="sp-board-date"  :aria-pressed="weeklyOnly ? selected === d : undefined" @click="selected = d; if (!weeklyOnly) scale = 'day'">{{ dateLabel(d, {weekday:'short',day:'numeric'}) }}</button><button v-for="p in dated(d)" :key="p.id" class="sp-board-item" @click="begin(p)"><AppIcon :name="familyIcon[object(p).family]" />{{ object(p).title }}</button><small v-if="!dated(d).length">Wolne miejsce</small><button :aria-label="`Dodaj na ${dateLabel(d)}`" @click="selected = d; begin()"><AppIcon name="add" /></button></section></div>
      <section v-else class="sp-list"><h3 v-if="scale === 'week'">{{ dateLabel(selected, {weekday:'long',day:'numeric',month:'long'}) }}</h3><p v-if="!dated(selected).length" class="sp-empty">Na ten dzień nic jeszcze nie zaplanowano.<button @click="begin()">Dodaj do dnia</button></p><div v-for="p in dated(selected)" :key="p.id" class="sp-row"><AppIcon :name="familyIcon[object(p).family]" /><button class="sp-title" @click="begin(p)">{{ object(p).title }}<small v-if="p.target">{{ p.target }}</small></button><button :aria-label="`Edytuj: ${object(p).title}`" @click="begin(p)"><AppIcon name="edit" /></button><button :aria-label="`Usuń z planu: ${object(p).title}`" @click="remove(p)"><AppIcon name="close" /></button></div></section>
    </template>
    <section v-if="flex.length || weeklyOnly" class="sp-flex"><h3>{{ weeklyOnly ? 'W tym tygodniu · bez daty' : 'Bez konkretnej daty' }}</h3><button v-for="p in flex.filter(p => scale !== 'month' || p.scope === 'month')" :key="p.id" @click="begin(p)"><AppIcon :name="familyIcon[object(p).family]" /><span>{{ object(p).title }}<small>{{ p.scope === 'week' ? 'W tym tygodniu' : 'W tym miesiącu' }}</small></span><AppIcon name="edit" /></button></section>
    <form v-if="adding || editId !== null" ref="editor" class="sp-editor" @submit.prevent="save">
      <h3>{{ adding ? 'Dodaj do planu' : 'Edytuj przypisanie' }}</h3>
      <label v-if="adding">Obiekt<select v-model="draft.key"><option v-for="o in candidates" :key="o.key" :value="o.key">{{ o.title }}</option></select></label><strong v-else>{{ candidates.find(o => o.key === draft.key)?.title }}</strong>
      <div class="sp-fields"><label>Termin<input v-model="draft.date" type="date" required /></label><label>Przypisanie<select v-model="draft.scope"><option value="day">Ten dzień</option><option value="week">Ten tydzień · bez daty</option><option v-if="!weeklyOnly" value="month">Ten miesiąc · bez daty</option></select></label></div>
      <details v-if="!weeklyOnly"><summary>Cel w tym przypisaniu</summary><label>Wartość i jednostka<input v-model="draft.target" placeholder="np. 30 min" /></label><small>Przykładowy edytor; docelowo pola zgodne z typem obiektu.</small></details>
      <div class="sp-editor-actions"><button v-if="editId !== null" type="button" @click="remove(placements.find(p => p.id === editId)!)">Usuń z planu</button><button type="button" @click="cancelEdit">Anuluj</button><button class="sp-save" type="submit">{{ adding ? 'Dodaj' : 'Zapisz zmianę' }}</button></div>
    </form>
    <div v-if="message" class="sp-toast" role="status">{{ message }}<button v-if="undo" @click="placements = undo; undo = null; message = 'Cofnięto zmianę.'">Cofnij</button></div>
  </section>
</template>

<style scoped>
.quick-plan{min-width:0;width:100%;color:var(--mg-color-ink);background:var(--mg-color-surface);font:14px 'Nunito',sans-serif;padding:22px;border-radius:25px 29px 23px 28px;box-shadow:-5px -5px 14px rgb(var(--neo-shadow-light)/.65),5px 5px 14px rgb(var(--neo-shadow-dark)/.17)}
.quick-plan *{box-sizing:border-box}.quick-plan button{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;border-radius:12px 15px 11px 14px;padding:8px;display:inline-flex;align-items:center;gap:8px;transition:background .15s}.quick-plan button:hover{background:var(--mg-color-paper)}.quick-plan :is(button,input,select,summary):focus-visible{outline:2px solid rgb(var(--color-primary-strong));outline-offset:3px}.quick-plan .material-symbols-outlined{font-size:19px;color:rgb(var(--color-primary-strong))}.sp-head,.sp-nav,.sp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px}.sp-head h2{font-size:21px;font-weight:800;margin:0}.sp-nav{margin:17px 0 10px}.sp-nav strong{text-align:center;font-size:16px}.sp-toolbar{gap:5px;flex-wrap:wrap}.sp-segment{display:flex;background:var(--mg-color-mist);padding:3px;border-radius:15px}.quick-plan button[aria-pressed=true]{background:var(--mg-color-paper);font-weight:800;color:rgb(var(--sky-800));box-shadow:inset 2px 2px 4px rgb(var(--neo-shadow-dark)/.14),inset -2px -2px 4px rgb(var(--neo-shadow-light)/.6)}.sp-add{margin-left:auto}.sp-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:20px 0}.sp-days button{flex-direction:column;gap:3px}.sp-days small{font-size:11px}.sp-days strong{font-size:18px}.sp-list h3,.sp-flex h3,.sp-editor h3{font-size:12px;margin:18px 0 10px;font-weight:800;color:var(--mg-color-muted)}.sp-row{display:flex;gap:5px;align-items:center;padding:8px 6px;border-bottom:1px solid rgb(var(--neo-border)/.22)}.sp-title{flex:1;text-align:left;flex-direction:column;align-items:flex-start!important}.sp-row small{font-size:11px}.sp-flex{border-top:1px dashed rgb(var(--neo-border)/.65);margin-top:22px}.sp-flex>button{display:flex;width:100%;text-align:left;padding:10px 6px}.sp-flex>button>span:nth-child(2){flex:1}.sp-flex small{display:block;font-size:11px;color:var(--mg-color-muted);margin-top:3px}.sp-editor{background:var(--mg-color-mist);padding:16px;border-radius:18px;margin-top:18px}.sp-editor h3{margin-top:0}.sp-editor label{display:grid;gap:6px;font-size:12px;margin-top:12px}.sp-editor input,.sp-editor select{width:100%;min-width:0;padding:10px;border:1px solid rgb(var(--neo-border)/.4);border-radius:10px;background:var(--mg-color-paper);color:inherit;font:inherit}.sp-fields{display:grid;grid-template-columns:1fr 1.25fr;gap:12px}.sp-editor details{margin:15px 0;font-size:12px}.sp-editor summary{cursor:pointer}.sp-editor small{display:block;margin-top:8px}.sp-editor-actions{display:flex;justify-content:flex-end;gap:4px;margin-top:16px;font-size:12px}.quick-plan .sp-save{background:rgb(var(--color-primary-strong));color:white}.sp-toast{display:flex;align-items:center;justify-content:space-between;background:var(--mg-color-paper);padding:9px 14px;border-radius:14px;margin-top:18px;font-size:12px}.sp-empty{padding:24px 8px;color:var(--mg-color-muted);font-size:13px}.sp-empty button{display:flex;margin-top:10px}.sp-weeks{display:grid;gap:8px;margin-top:18px}.sp-weeks>button{display:block;text-align:left;background:var(--mg-color-mist);padding:14px}.sp-week-title{display:flex;justify-content:space-between;align-items:center;font-weight:750}.sp-preview{display:grid;gap:4px;margin-top:9px;font-size:12px;color:var(--mg-color-muted)}.sp-weeks small{font-size:11px}.sp-board{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;margin-top:20px}.sp-board>section{background:var(--mg-color-mist);border-radius:18px;padding:9px;min-height:200px;display:flex;flex-direction:column;gap:8px}.quick-plan .sp-board-item{background:var(--mg-color-paper);font-size:12px;text-align:left;display:block;overflow-wrap:anywhere}.sp-board-item .material-symbols-outlined{display:block;margin-bottom:5px}.sp-board small{font-size:11px}.sp-board-date{font-weight:800!important}.quick-plan--wide .sp-days{display:none}.quick-plan--wide .sp-weeks{grid-template-columns:repeat(2,1fr)}.quick-plan--wide .sp-editor{max-width:640px;margin-left:auto;margin-right:auto}

.quick-plan--integrated{padding:8px 6px;box-shadow:none;background:transparent;border-radius:0}
.quick-plan--integrated .sp-head h2{font-size:18px}
.quick-plan--integrated .sp-head>button{font-size:12px}
.quick-plan--integrated .sp-nav{justify-content:flex-start;margin:16px 0}
.quick-plan--integrated .sp-board{margin-top:0;gap:8px}
.quick-plan--integrated .sp-board>section{min-height:260px;padding:7px}
.quick-plan--integrated .sp-board-date{width:100%;justify-content:center;font-size:12px}
.quick-plan--integrated .sp-flex{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:12px}
.quick-plan--integrated .sp-flex h3{margin:0;font-size:11px}
.quick-plan--integrated .sp-flex>button{width:auto;background:var(--mg-color-mist);padding:8px 12px;font-size:12px}
.quick-plan--integrated .sp-flex small{display:none}
.quick-plan--integrated .sp-editor{max-width:none;padding:14px 18px}
.quick-plan--integrated .sp-fields{max-width:630px}
</style>
