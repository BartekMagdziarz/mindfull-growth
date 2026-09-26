<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
const route = useRoute()
const router = useRouter()
const today = '2026-09-19'
const add = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pl-PL', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
const day = computed(() => { const value = String(route.query.day ?? today); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : today })
const relativeDate = computed(() => {
  const current = new Date(`${today}T12:00:00Z`)
  const viewed = new Date(`${day.value}T12:00:00Z`)
  const difference = Math.round((viewed.getTime() - current.getTime()) / 86400000)
  if (difference === 0) return 'Dzisiaj'
  if (difference === -1) return 'Wczoraj'
  if (difference === 1) return 'Jutro'
  const relative = new Intl.RelativeTimeFormat('pl', { numeric: 'auto' })
  const monday = (date: Date) => date.getTime() - ((date.getUTCDay() + 6) % 7) * 86400000
  const weeks = Math.round((monday(viewed) - monday(current)) / (7 * 86400000))
  if (!weeks) return relative.format(difference, 'day')
  if (Math.abs(weeks) <= 4) return relative.format(weeks, 'week')
  const months = (viewed.getUTCFullYear() - current.getUTCFullYear()) * 12 + viewed.getUTCMonth() - current.getUTCMonth()
  if (Math.abs(months) < 12) return relative.format(months, 'month')
  return relative.format(Math.trunc(months / 12), 'year')
})
const dateTitle = computed(() => fmt(day.value, { day: 'numeric', month: 'long', ...(day.value.slice(0,4) !== today.slice(0,4) ? {year:'numeric' as const} : {}) }))
const days = computed(() => Array.from({ length: 7 }, (_, i) => add(day.value, i - 6)))
const picker = ref(false)
const entry = ref('')
const saved = ref(false)
const drafts = reactive<Record<string, string>>({})
const entryKey = computed(() => `${day.value}:${entry.value}`)
const shortcuts = [ { id: 'journal', title: 'Dziennik', icon: 'menu_book' }, { id: 'emotions', title: 'Emocje', icon: 'favorite' }, { id: 'exercise', title: 'Ćwiczenia', icon: 'self_improvement' } ]
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
const maximum = (item: Item) => Math.max(item.target ?? 1, ...days.value.map(d => item.values[d] ?? 0))
function planned(item: Item, date: string) { return item.planned.includes((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) }
function state(item: Item, date: string) { return item.values[date] !== undefined ? 'done' : !planned(item, date) ? 'off' : date < today ? 'missing' : 'planned' }
function status(item: Item, date: string) { return item.values[date] !== undefined ? item.unit ? `${item.values[date]} ${item.unit}` : 'Wykonane' : ({off:'Bez planu',missing:'Brak wpisu',planned:'W planie',done:'Wykonane'})[state(item,date)] }
function query(values: Record<string, string | undefined>) { void router.replace({ query: {...route.query, ...values} }) }
function navigate(date: string) { if (!date || Number.isNaN(Date.parse(date))) return; picker.value = false; entry.value = ''; query({ day: date === today ? undefined : date, task: undefined }) }
function select(item: Item) { query({task:selected.value?.id === item.id ? undefined : item.id}) }
function toggle(item: Item) { if (item.values[day.value] !== undefined) delete item.values[day.value]; else item.values[day.value] = 1 }
function save(item: Item, event: Event) { const value = (event.target as HTMLInputElement).value; if (!value) delete item.values[day.value]; else if (Number.isFinite(Number(value)) && Number(value) >= 0 && (item.id !== 'energy' || Number(value) <= 5)) item.values[day.value] = Number(value) }
function openEntry(id: string) { entry.value = entry.value === id ? '' : id; saved.value = false }
function reset() { items.splice(0,items.length,...initial()); Object.keys(drafts).forEach(key => delete drafts[key]); entry.value=''; picker.value=false; query({day:undefined,task:undefined}) }
</script>

<template>
  <div class="compact-day connected-day">
    <header class="cd-intro"><div><span>UX LAB · DZISIAJ / 21</span><h1>Po prostu plan dnia</h1></div><button class="cd-reset" @click="reset"><AppIcon name="restart_alt" /> Reset</button></header>
    <div class="compact-toolbar">
      <div class="compact-date">
        <button aria-label="Poprzedni dzień" @click="navigate(add(day,-1))"><AppIcon name="chevron_left" /></button>
        <button class="compact-date-label" :aria-expanded="picker" aria-label="Wybierz datę" @click="picker=!picker"><strong>{{ dateTitle }}</strong><small>{{ relativeDate }}</small></button>
        <button aria-label="Następny dzień" @click="navigate(add(day,1))"><AppIcon name="chevron_right" /></button>
        <button v-if="day !== today" class="compact-today" @click="navigate(today)">Dziś</button>
        <div v-if="picker" class="compact-picker" @keydown.esc="picker=false"><label>Przejdź do dnia<input type="date" :value="day" aria-label="Data planu" @change="navigate(($event.target as HTMLInputElement).value)" /></label><button @click="picker=false">Zamknij</button></div>
      </div>
      <button v-for="shortcut in shortcuts" :key="shortcut.id" class="compact-shortcut" :class="{ active:entry === shortcut.id }" :aria-expanded="entry === shortcut.id" @click="openEntry(shortcut.id)"><span class="cd-task-icon"><AppIcon :name="shortcut.icon" /></span><strong>{{ shortcut.title }}</strong></button>
    </div>
    <section v-if="entry" class="compact-entry cd-paper" aria-label="Wpis wybranego dnia">
      <header><strong>{{ shortcuts.find(s=>s.id===entry)?.title }} · {{ fmt(day,{day:'numeric',month:'long'}) }}</strong><button aria-label="Zamknij wpis" @click="entry='' "><AppIcon name="close" /></button></header>
      <template v-if="entry==='journal'"><label>Co chcesz zachować z tego dnia?<textarea v-model="drafts[entryKey]" rows="3" @input="saved=false" /></label></template>
      <template v-else-if="entry==='emotions'"><label>Jak się czujesz?<select v-model="drafts[entryKey]" @change="saved=false"><option disabled value="">Wybierz emocję</option><option>Spokój</option><option>Radość</option><option>Smutek</option><option>Napięcie</option></select></label></template>
      <template v-else><label>Ćwiczenie na ten dzień<select v-model="drafts[entryKey]" @change="saved=false"><option disabled value="">Wybierz ćwiczenie</option><option>Chwila z oddechem</option><option>Skanowanie ciała</option><option>Trzy dobre rzeczy</option></select></label></template>
      <footer><small>{{ saved ? 'Zapisano w szkicu labu' : 'Uproszczony formularz demonstracyjny' }}</small><button :disabled="!drafts[entryKey]" @click="saved=true">Zapisz w szkicu</button></footer>
    </section>
    <main class="cd-paper">
      <section class="cd-plan" aria-label="Plan dnia">
        <header><h2>Plan dnia</h2></header>
        <div v-for="group in groups" :key="group" class="cd-group"><h3>{{ group }}</h3>
          <article v-for="item in rows.filter(row=>row.group===group)" :key="item.id" class="compact-task" :class="{ expanded:selected?.id===item.id }">
            <div class="cd-row">
              <button class="cd-select" :aria-expanded="selected?.id===item.id" :aria-controls="`detail-${item.id}`" @click="select(item)"><span class="cd-task-icon"><AppIcon :name="item.icon" /></span><span><strong>{{ item.title }}</strong><small v-if="item.unit">{{ item.target ? `Cel: ${item.target} ${item.unit} dziennie` : 'Zapis dzienny' }}</small></span><AppIcon :name="selected?.id===item.id ? 'expand_less' : 'expand_more'" class="cd-link-icon" /></button>
              <label v-if="item.unit" class="cd-input"><input type="number" min="0" :max="item.id==='energy'?5:undefined" :aria-label="`${item.title} — wartość`" :value="item.values[day]??''" placeholder="—" :disabled="day>today" @change="save(item,$event)" /><span>{{ item.unit }}</span></label>
              <button v-else class="cd-complete" :aria-label="`${item.values[day] ? 'Cofnij wykonanie' : 'Oznacz jako wykonane'}: ${item.title}`" :aria-pressed="!!item.values[day]" :disabled="day>today" @click="toggle(item)"><span class="cd-dot" :class="item.values[day]?'done':'planned'" /></button>
            </div>
            <div class="compact-disclosure" :class="{ open:selected?.id===item.id }" :inert="selected?.id!==item.id"><div>
              <section :id="`detail-${item.id}`" class="compact-detail" :aria-label="`Historia: ${item.title}`">
                <header><span>Ostatnie 7 dni</span><small>{{ fmt(days[0],{day:'numeric',month:'short'}) }} – {{ fmt(day,{day:'numeric',month:'short'}) }}</small></header>
                <div class="compact-chart">
                  <div v-for="date in days" :key="date" class="compact-point" :class="{ current:date===day }" :title="`${fmt(date,{day:'numeric',month:'long'})}: ${status(item,date)}`">
                    <span class="compact-day-label">{{ date===today?'dziś':fmt(date,{weekday:'short'}) }}</span>
                    <div class="cd-bar-field"><template v-if="item.unit"><span v-if="item.target" class="cd-target" :style="{ bottom:`${item.target/maximum(item)*100}%` }"/><div class="cd-stack" :class="{ overdue:date<today && item.target && (item.values[date]??0)<item.target }" :style="{ height:`${Math.max(item.target??0,item.values[date]??0)/maximum(item)*100}%` }"><i :style="{height:`${(item.values[date]??0)/Math.max(item.target??0,item.values[date]??0,1)*100}%`}" /></div></template><span v-else class="cd-dot" :class="state(item,date)" /></div>
                    <small>{{ item.unit ? status(item,date) : item.values[date] ? 'Wykonane' : state(item,date)==='off'?'—':status(item,date) }}</small>
                  </div>
                </div>
              </section>
            </div></div>
          </article>
        </div>
      </section>
    </main>
    <footer class="cd-footnote">Prototyp · przykładowy dzień 19 września 2026 · wpisy pozostają tylko w pamięci labu</footer>
  </div>
</template>
<style scoped>
.connected-day{--paper:rgb(var(--sky-100));--ink:rgb(var(--sky-800));--accent:rgb(var(--color-primary-strong));--field:color-mix(in srgb,var(--paper),white 46%);--soft:rgb(var(--sky-200));--muted:rgb(var(--sky-700));--depth:-5px -5px 14px rgb(var(--neo-shadow-light)/.65),5px 5px 14px rgb(var(--neo-shadow-dark)/.14);font-family:Nunito, sans-serif;color:var(--ink);padding:36px 40px 28px;max-width:1050px;margin:auto}
.connected-day button,.connected-day input{font:inherit;color:inherit}.connected-day button{cursor:pointer;border:0;background:transparent}.connected-day button:disabled{cursor:default;opacity:.4}.connected-day button:focus-visible,.connected-day input:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.connected-day .material-symbols-outlined{font-size:22px;color:var(--accent)}
.cd-intro{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}.cd-intro>div>span{font-size:10px;font-weight:800;letter-spacing:.16em;color:var(--muted)}.cd-intro h1{font-size:27px;margin:7px 0 4px;font-weight:800}.cd-intro p{margin:0;font-size:14px;color:var(--muted)}.cd-reset{display:flex;align-items:center;gap:7px;font-size:13px!important}.cd-paper{border-radius:30px 35px 29px 33px;background:var(--paper);box-shadow:var(--depth);padding:25px 28px 28px}.cd-navigation{display:flex;align-items:center;justify-content:space-between}.cd-navigation h2{font-size:18px;margin:0;font-weight:800}.cd-navigation nav{display:flex;align-items:center;gap:7px}.cd-navigation button{height:36px;min-width:36px;border-radius:13px}.cd-navigation button:hover:not(:disabled){background:var(--field)}
.cd-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.cd-day{display:flex;flex-direction:column;align-items:center;padding:13px 2px 9px!important;border-radius:19px 22px 18px 21px;transition:background .2s,box-shadow .2s}.cd-day.active{background:var(--field);box-shadow:inset -2px -2px 5px rgb(var(--neo-shadow-light)/.6),inset 2px 2px 5px rgb(var(--neo-shadow-dark)/.09)}.cd-day:hover{background:var(--field)}.cd-weekday{font-size:20px;font-weight:800}.cd-number{font-size:12px;line-height:1.4;margin-top:5px;color:var(--muted)}.cd-number em{font-style:normal;color:var(--accent);font-weight:800}.cd-today{font-size:10px;height:15px;color:var(--accent);font-weight:800}.cd-evidence{height:0;overflow:hidden;transition:height .23s ease;width:100%}.with-data .cd-evidence{height:117px}.cd-status-slot{height:68px;display:grid;place-items:center}.cd-evidence-inner{min-height:0;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:10px;animation:cd-appear .22s ease}.with-data .cd-evidence-inner{padding-top:17px;padding-bottom:6px}.cd-evidence small{font-size:10px;white-space:nowrap;line-height:16px;color:var(--muted)}.cd-dot{display:inline-block;width:25px;height:25px;border-radius:48% 52% 46% 54%;position:relative;background:var(--soft);flex-shrink:0}.cd-dot.done:after{content:'';position:absolute;inset:6px;border-radius:47% 53% 50% 48%;background:var(--accent)}.cd-dot.planned{border:1.5px dashed var(--accent);background:transparent}.cd-dot.missing{background:rgb(var(--rose-100));border:1px solid rgb(var(--rose-300))}.cd-dot.off{width:17px;height:2px;background:rgb(var(--sky-300));margin:11.5px 4px}.cd-bar-field{height:68px;width:100%;position:relative;display:flex;align-items:flex-end;justify-content:center}.cd-bar-field>i{width:24px;max-height:100%;background:var(--accent);border-radius:6px 5px 2px 3px;transition:height .22s}.cd-target{position:absolute;left:10%;right:10%;border-top:1px dashed var(--accent);opacity:.7}.cd-plan{border-top:1px solid rgb(var(--sky-300)/.45);padding-top:22px}.cd-plan>header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:22px}.cd-plan h2{font-size:19px;margin:0;font-weight:800}.cd-plan>header>span{font-size:14px;color:var(--muted)}.cd-group+.cd-group{margin-top:22px}.cd-group h3{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin:0 0 9px 10px;font-weight:800}.cd-row{display:flex;align-items:center;gap:15px;border-radius:16px 19px 17px 20px;padding:8px 14px 8px 10px;min-height:77px;transition:background .2s;position:relative;margin:4px 0}.cd-row.selected{background:var(--field)}.cd-row.selected:before{content:'';position:absolute;left:0;top:20px;bottom:20px;width:3px;background:var(--accent);border-radius:4px}.cd-select{display:flex;align-items:center;gap:13px;text-align:left;flex:1;padding:0;min-width:0}.cd-select>span:nth-child(2){display:grid;gap:5px}.cd-select strong{font-size:16px;font-weight:750}.cd-select small{font-size:11px;color:var(--muted)}.cd-task-icon{display:grid;place-items:center;width:40px;height:42px;border-radius:13px 16px 12px 15px;background:var(--soft);flex-shrink:0}.cd-link-icon{margin-left:auto}.cd-complete{padding:8px!important;display:grid;place-items:center}.cd-complete .cd-dot{width:36px;height:36px;border:0;background:var(--soft)}.cd-complete .cd-dot.done:after{inset:8px}.cd-input{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}.cd-input input{width:52px;height:40px;text-align:center;border:0;border-radius:13px;background:var(--soft);font-size:16px;font-weight:800;appearance:textfield;-moz-appearance:textfield}.cd-input input::-webkit-inner-spin-button{appearance:none}.cd-outside{font-size:12px;color:var(--muted)}.cd-footnote{text-align:center;color:var(--muted);font-size:11px;margin-top:22px}.cd-navigation{gap:14px;margin-bottom:24px}.cd-period{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.cd-period>span{font-size:12px;color:var(--muted)}.cd-filter{margin-left:auto}.cd-filter select{font:inherit;font-size:12px;color:var(--ink);border:0;border-radius:12px;padding:9px;background:var(--field);max-width:155px}.cd-filter button{font-size:12px;display:flex;gap:6px;align-items:center;white-space:nowrap}.cd-filter select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.cd-week{margin-bottom:14px}.cd-stack{width:27px;background:var(--soft);border-radius:7px 6px 3px 4px;position:relative;overflow:hidden;transition:height .32s ease,background .32s ease}.cd-stack.overdue{background:rgb(var(--rose-200));background-image:repeating-linear-gradient(135deg,transparent,transparent 5px,rgb(var(--rose-300)/.45) 5px,rgb(var(--rose-300)/.45) 6px)}.cd-stack>i{position:absolute;bottom:0;left:0;right:0;background:var(--accent);border-radius:5px 5px 2px 2px;transition:height .32s ease}.cd-readout{opacity:0;transition:opacity .15s;font-size:9px!important;white-space:normal!important;max-width:100%}.cd-day:hover .cd-readout,.cd-day:focus-visible .cd-readout{opacity:1}.cd-bar-field:has(>.cd-dot){align-items:center}.cd-target{z-index:1}.cd-dot.missing{background:rgb(var(--rose-200));border-color:rgb(var(--rose-300))}
@keyframes cd-appear{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important;animation:none!important}}

.compact-day{max-width:1100px;padding-top:28px}.compact-day .cd-intro{margin-bottom:23px}.compact-day .cd-intro h1{font-size:23px}.compact-toolbar{display:flex;align-items:stretch;gap:8px;background:var(--paper);box-shadow:var(--depth);border-radius:22px 26px 23px 25px;padding:12px 14px;margin-bottom:20px;min-height:86px}.compact-date{display:flex;align-items:center;position:relative;gap:4px;flex:1.4;border-right:1px solid rgb(var(--sky-300)/.45);padding-right:13px;margin-right:5px}.compact-date>button{padding:5px;display:grid;place-items:center}.compact-date-label{gap:7px;text-align:left;min-width:130px;justify-items:start!important}.compact-date-label strong{font-size:25px;line-height:1.2;white-space:nowrap;font-weight:800}.compact-date-label small{font-size:12px;color:var(--muted);white-space:nowrap}.compact-today{font-size:11px!important;color:var(--accent)!important}.compact-day .compact-shortcut{display:grid;flex:1;justify-items:center;align-content:center;gap:5px;border:1px solid rgb(var(--sky-300)/.25);border-radius:16px 18px 15px 17px;background:var(--paper);font-size:11px;padding:9px 12px;text-align:center;transition:background .2s,box-shadow .2s}.compact-day .compact-shortcut:hover{background:var(--field);box-shadow:var(--depth)}.compact-day .compact-shortcut.active{background:var(--soft);box-shadow:inset -2px -2px 5px rgb(var(--neo-shadow-light)/.6),inset 2px 2px 5px rgb(var(--neo-shadow-dark)/.13)}.compact-shortcut .cd-task-icon{width:34px;height:34px;background:var(--soft);border-radius:13px 16px 12px 15px}.compact-shortcut strong{font-size:11px;font-weight:800}.compact-shortcut .material-symbols-outlined{font-size:20px}.compact-picker{position:absolute;left:0;top:70px;z-index:4;padding:18px;background:var(--field);box-shadow:var(--depth);border-radius:16px;min-width:240px}.compact-picker label{display:grid;gap:10px;font-size:12px}.compact-picker input{padding:8px;border:1px solid var(--soft);border-radius:8px;background:var(--paper)}.compact-picker>button{margin-top:10px;font-size:12px}.compact-day .cd-plan{border:0;padding-top:0}.compact-day .cd-plan>header{margin-bottom:24px}.compact-day .cd-row{min-height:67px;margin:0}.compact-day .cd-group+.cd-group{margin-top:18px}.compact-task{border-radius:18px 20px 17px 23px;transition:background .2s;margin:4px 0}.compact-task.expanded{background:var(--field)}.compact-day .cd-link-icon{font-size:17px;opacity:.5}.compact-task.expanded .cd-link-icon{opacity:1}.compact-disclosure{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease;visibility:hidden}.compact-disclosure.open{grid-template-rows:1fr;visibility:visible}.compact-disclosure>div{overflow:hidden;min-height:0}.compact-detail{padding:5px 20px 18px 63px}.compact-detail>header{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:11px;margin:4px 0 13px}.compact-detail header small{font-size:10px}.compact-chart{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.compact-point{display:grid;justify-items:center;gap:8px;padding:9px 1px;border-radius:11px}.compact-point.current{background:var(--paper)}.compact-point .cd-bar-field{height:42px}.compact-point .cd-stack{width:17px}.compact-point small{font-size:9px;color:var(--muted);white-space:nowrap}.compact-day-label{font-size:11px;color:var(--muted)}.compact-point .cd-dot{width:20px;height:20px}.compact-point .cd-dot.off{height:2px}.compact-entry{margin-bottom:20px;font-size:13px}.compact-entry header,.compact-entry footer{display:flex;align-items:center;justify-content:space-between;gap:15px}.compact-entry label{display:grid;gap:9px;margin:16px 0}.compact-entry textarea,.compact-entry select{font:inherit;padding:12px;background:var(--field);border:1px solid var(--soft);border-radius:12px;color:var(--ink);width:100%}.compact-entry footer button{padding:9px 14px;background:var(--soft);border-radius:12px}.compact-entry footer small{color:var(--muted)}
</style>
