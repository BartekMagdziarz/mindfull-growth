<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'

// Isolated illustrative September scenario. No product stores or persistence.
const route = useRoute()
const router = useRouter()
const today = '2026-09-19'
const anchor = '2026-09-14'
const add = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pl-PL', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
const day = computed(() => validDate(route.query.day) ? String(route.query.day) : today)
const offset = computed(() => { const n = Number(route.query.week ?? 0); return Number.isInteger(n) && Math.abs(n) < 520 ? n : 0 })
const days = computed(() => Array.from({ length: 7 }, (_, i) => add(anchor, offset.value * 7 + i)))
const weekTitle = computed(() => ({ 0: 'Ten tydzień', 1: 'Następny tydzień', '-1': 'Poprzedni tydzień' })[offset.value] ?? 'Tydzień')
const weekRange = computed(() => `${fmt(days.value[0], { day: 'numeric', month: 'short' })} – ${fmt(days.value[6], { day: 'numeric', month: 'short' })}`)
const filter = computed(() => ['Nawyki', 'Cele i rezultaty', 'Trackery'].includes(String(route.query.group)) ? String(route.query.group) : 'Nawyki')
type Item = { id: string; title: string; icon: string; group: string; unit?: string; target?: number; planned: number[]; values: Record<string, number> }
function initial(): Item[] {
  return [
    { id: 'cardio', title: 'Trening cardio', icon: 'directions_bike', group: 'Cele i rezultaty', planned: [1, 3, 5], values: { '2026-09-15': 1, '2026-09-17': 1, '2026-09-08': 1, '2026-09-10': 1 } },
    { id: 'reading', title: 'Czytanie', icon: 'menu_book', group: 'Nawyki', unit: 'min', target: 30, planned: [0, 1, 2, 3, 4, 5, 6], values: { '2026-09-14': 20, '2026-09-15': 35, '2026-09-16': 30, '2026-09-18': 15, '2026-09-08': 25, '2026-09-10': 40 } },
    { id: 'calm', title: 'Chwila uważności', icon: 'self_improvement', group: 'Nawyki', planned: [0, 1, 2, 3, 4, 5, 6], values: { '2026-09-14': 1, '2026-09-15': 1, '2026-09-17': 1, '2026-09-18': 1 } },
    { id: 'energy', title: 'Poziom energii', icon: 'bolt', group: 'Trackery', unit: '/ 5', planned: [0, 1, 2, 3, 4, 5, 6], values: { '2026-09-14': 3, '2026-09-15': 4, '2026-09-16': 2, '2026-09-18': 4 } },
    { id: 'walk', title: 'Spacer na świeżym powietrzu', icon: 'directions_walk', group: 'Nawyki', planned: [0, 2, 4, 5, 6], values: { '2026-09-14': 1, '2026-09-16': 1, '2026-09-18': 1, '2026-09-19': 1 } },
  ]
}
const items = reactive(initial())
const selected = computed(() => items.find(item => item.id === route.query.task))
const rows = computed(() => items.filter(item => planned(item, day.value)))
const groups = computed(() => [...new Set(rows.value.map(item => item.group))])
const max = computed(() => Math.max(selected.value?.target ?? 1, ...days.value.map(d => selected.value?.values[d] ?? 0)))
function met(item: Item, date: string) { return item.values[date] !== undefined && (item.target === undefined ? (item.unit ? true : item.values[date] > 0) : item.values[date] >= item.target) }
const overview = computed(() => Object.fromEntries(days.value.map(date => {
  const plannedItems = items.filter(item => item.group === filter.value && planned(item, date))
  const done = plannedItems.filter(item => met(item, date)).length
  return [date, { count: plannedItems.length, done }]
})))
// Same scale across groups: filtering never inflates one task into a busy day.
const overviewMax = 3
function overviewLabel(date: string) {
  const point = overview.value[date]
  return `${point.done} z ${point.count} ${filter.value === 'Trackery' ? 'wpisów' : 'wykonane'}${date < today && point.done < point.count ? ` · ${point.count - point.done} ${filter.value === 'Trackery' ? 'bez wpisu' : 'niezrealizowane'}` : ''}`
}
function planned(item: Item, date: string) { return item.planned.includes((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) }
function state(item: Item, date: string) {
  if (met(item, date)) return 'done'
  if (item.values[date] !== undefined && date < today) return 'missing'
  if (!planned(item, date)) return 'off'
  return date < today ? 'missing' : 'planned'
}
function status(item: Item, date: string) {
  if (item.values[date] !== undefined) return item.unit ? `${item.values[date]} ${item.unit}` : 'Wykonane'
  return ({ off: 'Bez planu', missing: 'Brak wpisu', planned: 'W planie', done: 'Wykonane' })[state(item, date)]
}
function query(values: Record<string, string | undefined>) { void router.replace({ query: { ...route.query, ...values } }) }
function select(item: Item) { query({ task: selected.value?.id === item.id ? undefined : item.id }) }
function changeWeek(n: number) {
  // Keep day-of-week and the selected task while moving the daily plan with the week.
  const weekday = (new Date(`${day.value}T12:00:00Z`).getUTCDay() + 6) % 7
  query({ week: String(offset.value + n), day: add(anchor, (offset.value + n) * 7 + weekday) })
}
function toggle(item: Item) { if (item.values[day.value] !== undefined) delete item.values[day.value]; else item.values[day.value] = 1 }
function save(item: Item, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (!raw) delete item.values[day.value]
  else if (Number.isFinite(Number(raw)) && Number(raw) >= 0 && (item.id !== 'energy' || Number(raw) <= 5)) item.values[day.value] = Number(raw)
}
function reset() { items.splice(0, items.length, ...initial()); query({ task: undefined, day: undefined, week: undefined, group: undefined }) }
</script>

<template>
  <div class="connected-day">
    <header class="cd-intro"><div><span>UX LAB · DZISIAJ / 20</span><h1>Tydzień blisko planu dnia</h1><p>Od planu do wykonania · widok grupy i pojedynczego zadania</p></div><button class="cd-reset" @click="reset"><AppIcon name="restart_alt" /> Reset</button></header>
    <main class="cd-paper">
      <header class="cd-navigation">
        <div class="cd-period"><h2>{{ weekTitle }}</h2><span>{{ weekRange }}</span></div>
        <div class="cd-filter"><button v-if="selected" @click="query({ task: undefined })" aria-label="Wróć do podglądu grupy"><AppIcon name="close" /> Podgląd grupy</button><select v-else aria-label="Grupa pokazywana w kalendarzu" :value="filter" @change="query({ group: ($event.target as HTMLSelectElement).value })"><option>Nawyki</option><option>Cele i rezultaty</option><option>Trackery</option></select></div>
        <nav aria-label="Nawigacja tygodniowa">
          <button :disabled="day === today && offset === 0" @click="query({ day: undefined, week: undefined })">Dziś</button>
          <button aria-label="Poprzedni tydzień" title="Poprzedni tydzień" @click="changeWeek(-1)"><AppIcon name="chevron_left" /></button>
          <button aria-label="Następny tydzień" title="Następny tydzień" @click="changeWeek(1)"><AppIcon name="chevron_right" /></button>
        </nav>
      </header>
      <div class="cd-week with-data" :class="{ 'with-bars': selected?.unit }">
        <button v-for="date in days" :key="date" class="cd-day" :class="{ active: day === date, today: date === today }" :aria-pressed="day === date" :aria-label="`${fmt(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${selected ? status(selected, date) : overviewLabel(date)}`" @click="query({ day: date })">
          <span class="cd-weekday">{{ fmt(date, { weekday: 'short' }) }}</span><span class="cd-number">{{ Number(date.slice(-2)) }}<em v-if="date === today"> · dziś</em></span>
          <div class="cd-evidence"><div class="cd-evidence-inner">
            <div class="cd-bar-field">
              <div v-if="!selected" class="cd-stack" :class="{ overdue: date < today && filter !== 'Trackery' }" :style="{ height: `${overview[date].count / overviewMax * 100}%` }"><i :style="{ height: `${overview[date].count ? overview[date].done / overview[date].count * 100 : 0}%` }" /></div>
              <template v-else-if="selected.unit">
                <span v-if="selected.target" class="cd-target" :style="{ bottom: `${selected.target / max * 100}%` }" />
                <div class="cd-stack cd-stack--value" :class="{ overdue: date < today && selected.target && !met(selected, date) }" :style="{ height: `${Math.max(selected.target ?? 0, selected.values[date] ?? 0) / max * 100}%` }"><i :style="{ height: `${selected.values[date] === undefined ? 0 : selected.values[date] / Math.max(selected.target ?? 0, selected.values[date], 1) * 100}%` }" /></div>
              </template>
              <span v-else class="cd-dot" :class="state(selected, date)" />
            </div>
            <small v-if="selected">{{ status(selected, date) }}</small>
            <small v-else class="cd-readout">{{ overviewLabel(date) }}</small>
          </div></div>
        </button>
      </div>
      <section class="cd-plan" aria-label="Plan dnia">
        <header><h2>Plan dnia</h2><span>{{ fmt(day, { weekday: 'long', day: 'numeric', month: 'long' }) }}</span></header>
        <p v-if="selected && !rows.includes(selected)" class="cd-outside">Podglądasz {{ selected.title.toLocaleLowerCase('pl') }} — poza planem tego dnia.</p>
        <div v-for="group in groups" :key="group" class="cd-group"><h3>{{ group }}</h3>
          <article v-for="item in rows.filter(row => row.group === group)" :key="item.id" class="cd-row" :class="{ selected: selected?.id === item.id }">
            <button class="cd-select" :aria-pressed="selected?.id === item.id" @click="select(item)"><span class="cd-task-icon"><AppIcon :name="item.icon" /></span><span><strong>{{ item.title }}</strong><small>{{ selected?.id === item.id ? (item.target ? `Podgląd tygodnia · cel: ${item.target} ${item.unit} dziennie` : 'Podgląd tygodnia powyżej') : item.unit ? (item.target ? `Cel: ${item.target} ${item.unit} dziennie` : 'Zapis dzienny') : 'Zobacz tydzień' }}</small></span><AppIcon v-if="selected?.id === item.id" name="expand_less" class="cd-link-icon" /></button>
            <label v-if="item.unit" class="cd-input"><input type="number" min="0" :aria-label="`${item.title} — wartość (${item.unit})`" :value="item.values[day] ?? ''" :max="item.id === 'energy' ? 5 : undefined" :disabled="day > today" placeholder="—" @change="save(item, $event)" /><span>{{ item.unit }}</span></label>
            <button v-else class="cd-complete" :aria-label="`${item.values[day] ? 'Cofnij wykonanie' : 'Oznacz jako wykonane'}: ${item.title}`" :aria-pressed="!!item.values[day]" :disabled="day > today" @click="toggle(item)"><span class="cd-dot" :class="item.values[day] ? 'done' : 'planned'" /></button>
          </article>
        </div>
      </section>
    </main>
    <footer class="cd-footnote">Prototyp interakcji · przykładowy tydzień 19 września 2026 · zmiany tylko w pamięci labu</footer>
  </div>
</template>

<style scoped>
.connected-day{--paper:rgb(var(--sky-100));--ink:rgb(var(--sky-800));--accent:rgb(var(--color-primary-strong));--field:color-mix(in srgb,var(--paper),white 46%);--soft:rgb(var(--sky-200));--muted:rgb(var(--sky-700));--depth:-5px -5px 14px rgb(var(--neo-shadow-light)/.65),5px 5px 14px rgb(var(--neo-shadow-dark)/.14);font-family:Nunito, sans-serif;color:var(--ink);padding:36px 40px 28px;max-width:1050px;margin:auto}
.connected-day button,.connected-day input{font:inherit;color:inherit}.connected-day button{cursor:pointer;border:0;background:transparent}.connected-day button:disabled{cursor:default;opacity:.4}.connected-day button:focus-visible,.connected-day input:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.connected-day .material-symbols-outlined{font-size:22px;color:var(--accent)}
.cd-intro{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}.cd-intro>div>span{font-size:10px;font-weight:800;letter-spacing:.16em;color:var(--muted)}.cd-intro h1{font-size:27px;margin:7px 0 4px;font-weight:800}.cd-intro p{margin:0;font-size:14px;color:var(--muted)}.cd-reset{display:flex;align-items:center;gap:7px;font-size:13px!important}.cd-paper{border-radius:30px 35px 29px 33px;background:var(--paper);box-shadow:var(--depth);padding:25px 28px 28px}.cd-navigation{display:flex;align-items:center;justify-content:space-between}.cd-navigation h2{font-size:18px;margin:0;font-weight:800}.cd-navigation nav{display:flex;align-items:center;gap:7px}.cd-navigation button{height:36px;min-width:36px;border-radius:13px}.cd-navigation button:hover:not(:disabled){background:var(--field)}
.cd-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.cd-day{display:flex;flex-direction:column;align-items:center;padding:13px 2px 9px!important;border-radius:19px 22px 18px 21px;transition:background .2s,box-shadow .2s}.cd-day.active{background:var(--field);box-shadow:inset -2px -2px 5px rgb(var(--neo-shadow-light)/.6),inset 2px 2px 5px rgb(var(--neo-shadow-dark)/.09)}.cd-day:hover{background:var(--field)}.cd-weekday{font-size:20px;font-weight:800}.cd-number{font-size:12px;line-height:1.4;margin-top:5px;color:var(--muted)}.cd-number em{font-style:normal;color:var(--accent);font-weight:800}.cd-today{font-size:10px;height:15px;color:var(--accent);font-weight:800}.cd-evidence{height:0;overflow:hidden;transition:height .23s ease;width:100%}.with-data .cd-evidence{height:117px}.cd-status-slot{height:68px;display:grid;place-items:center}.cd-evidence-inner{min-height:0;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:10px;animation:cd-appear .22s ease}.with-data .cd-evidence-inner{padding-top:17px;padding-bottom:6px}.cd-evidence small{font-size:10px;white-space:nowrap;line-height:16px;color:var(--muted)}.cd-dot{display:inline-block;width:25px;height:25px;border-radius:48% 52% 46% 54%;position:relative;background:var(--soft);flex-shrink:0}.cd-dot.done:after{content:'';position:absolute;inset:6px;border-radius:47% 53% 50% 48%;background:var(--accent)}.cd-dot.planned{border:1.5px dashed var(--accent);background:transparent}.cd-dot.missing{background:rgb(var(--rose-100));border:1px solid rgb(var(--rose-300))}.cd-dot.off{width:17px;height:2px;background:rgb(var(--sky-300));margin:11.5px 4px}.cd-bar-field{height:68px;width:100%;position:relative;display:flex;align-items:flex-end;justify-content:center}.cd-bar-field>i{width:24px;max-height:100%;background:var(--accent);border-radius:6px 5px 2px 3px;transition:height .22s}.cd-target{position:absolute;left:10%;right:10%;border-top:1px dashed var(--accent);opacity:.7}.cd-plan{border-top:1px solid rgb(var(--sky-300)/.45);padding-top:22px}.cd-plan>header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:22px}.cd-plan h2{font-size:19px;margin:0;font-weight:800}.cd-plan>header>span{font-size:14px;color:var(--muted)}.cd-group+.cd-group{margin-top:22px}.cd-group h3{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin:0 0 9px 10px;font-weight:800}.cd-row{display:flex;align-items:center;gap:15px;border-radius:16px 19px 17px 20px;padding:8px 14px 8px 10px;min-height:77px;transition:background .2s;position:relative;margin:4px 0}.cd-row.selected{background:var(--field)}.cd-row.selected:before{content:'';position:absolute;left:0;top:20px;bottom:20px;width:3px;background:var(--accent);border-radius:4px}.cd-select{display:flex;align-items:center;gap:13px;text-align:left;flex:1;padding:0;min-width:0}.cd-select>span:nth-child(2){display:grid;gap:5px}.cd-select strong{font-size:16px;font-weight:750}.cd-select small{font-size:11px;color:var(--muted)}.cd-task-icon{display:grid;place-items:center;width:40px;height:42px;border-radius:13px 16px 12px 15px;background:var(--soft);flex-shrink:0}.cd-link-icon{margin-left:auto}.cd-complete{padding:8px!important;display:grid;place-items:center}.cd-complete .cd-dot{width:36px;height:36px;border:0;background:var(--soft)}.cd-complete .cd-dot.done:after{inset:8px}.cd-input{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}.cd-input input{width:52px;height:40px;text-align:center;border:0;border-radius:13px;background:var(--soft);font-size:16px;font-weight:800;appearance:textfield;-moz-appearance:textfield}.cd-input input::-webkit-inner-spin-button{appearance:none}.cd-outside{font-size:12px;color:var(--muted)}.cd-footnote{text-align:center;color:var(--muted);font-size:11px;margin-top:22px}.cd-navigation{gap:14px;margin-bottom:24px}.cd-period{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.cd-period>span{font-size:12px;color:var(--muted)}.cd-filter{margin-left:auto}.cd-filter select{font:inherit;font-size:12px;color:var(--ink);border:0;border-radius:12px;padding:9px;background:var(--field);max-width:155px}.cd-filter button{font-size:12px;display:flex;gap:6px;align-items:center;white-space:nowrap}.cd-filter select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.cd-week{margin-bottom:14px}.cd-stack{width:27px;background:var(--soft);border-radius:7px 6px 3px 4px;position:relative;overflow:hidden;transition:height .32s ease,background .32s ease}.cd-stack.overdue{background:rgb(var(--rose-200));background-image:repeating-linear-gradient(135deg,transparent,transparent 5px,rgb(var(--rose-300)/.45) 5px,rgb(var(--rose-300)/.45) 6px)}.cd-stack>i{position:absolute;bottom:0;left:0;right:0;background:var(--accent);border-radius:5px 5px 2px 2px;transition:height .32s ease}.cd-readout{opacity:0;transition:opacity .15s;font-size:9px!important;white-space:normal!important;max-width:100%}.cd-day:hover .cd-readout,.cd-day:focus-visible .cd-readout{opacity:1}.cd-bar-field:has(>.cd-dot){align-items:center}.cd-target{z-index:1}.cd-dot.missing{background:rgb(var(--rose-200));border-color:rgb(var(--rose-300))}
@keyframes cd-appear{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important;animation:none!important}}
</style>
