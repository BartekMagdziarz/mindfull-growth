<template>
  <div class="product-replica act-focus" :class="`af--${variant}`">
    <div class="af-sheet">
      <main class="af-columns">
        <div class="af-left">
          <!-- wpisy dnia: wąska belka nad komponentem zadań -->
          <section class="af-entries af-surface" aria-label="Wpisy dnia">
            <button type="button" class="af-wpill" :class="{ done: journalDone }" :aria-label="journalDone ? 'Wpis zapisany' : 'Dziennik'" @click="journalDone = !journalDone">
              <span class="af-wpill__icon"><AppIcon :name="journalDone ? 'check' : 'history_edu'" /></span>
              <small>Dziennik</small>
            </button>
            <button type="button" class="af-wpill" :class="{ done: emotionLogs >= 3 }" :aria-label="`Emocje: ${emotionLogs}/3`" @click="emotionLogs = emotionLogs === 3 ? 0 : emotionLogs + 1">
              <span class="af-wpill__icon"><AppIcon name="cognition" /></span>
              <small>Emocje · {{ emotionLogs }}/3</small>
            </button>
            <button type="button" class="af-wpill" :class="{ done: exerciseDone }" :aria-label="exerciseDone ? 'Ćwiczenie wykonane' : 'Ćwiczenia'" @click="exerciseDone = !exerciseDone">
              <span class="af-wpill__icon"><AppIcon :name="exerciseDone ? 'check' : 'psychology'" /></span>
              <small>Ćwiczenia</small>
            </button>
          </section>

          <ActionNowStage
            v-if="variant === 'stage-top' && stageItem"
            :item="stageItem"
            :value="day.valueFor(stageItem)"
            orientation="strip"
            :targeting="movingKey === stageItem.key"
            @do="doStage"
            @tomorrow="day.moveToTomorrow(stageItem)"
            @pick-day="togglePick(stageItem.key)"
            @hide="day.hide(stageItem)"
          />

          <section class="af-list af-surface" aria-label="Plan dnia">
            <!-- postęp dnia: niemy włosek na górnej krawędzi, bez podpisów i liczników -->
            <span class="af-list__filament" role="img" :aria-label="`Wykonanie dnia: ${day.doneCount.value} z ${day.todayItems.value.length}`">
              <i :style="{ width: `${pulsePct}%` }" />
            </span>
            <header class="af-list__head">
              <h3>Plan dnia</h3>
              <div class="af-list__tools">
                <!-- jeden plus dla wszystkich typów: hover/fokus otwiera kaskadę typ → obiekt -->
                <div
                  v-if="variant === 'stage-inline'"
                  class="af-addwrap"
                  @mouseenter="menuHover = true"
                  @mouseleave="menuHover = false; menuGroup = null"
                  @keydown.esc.stop="closeMenu"
                  @focusout="onMenuFocusOut"
                >
                  <button type="button" class="af-add" aria-label="Dodaj do planu" title="Dodaj do planu" aria-haspopup="menu" :aria-expanded="menuOpen" @click="menuPinned = !menuPinned"><AppIcon name="add" /></button>
                  <div v-if="menuOpen" class="af-menu" role="menu" aria-label="Dodaj do planu">
                    <div class="af-menu__types">
                      <button
                        v-for="group in addGroups"
                        :key="group.key"
                        type="button"
                        role="menuitem"
                        aria-haspopup="menu"
                        :aria-expanded="menuGroup === group.key"
                        :class="{ active: menuGroup === group.key }"
                        @mouseenter="menuGroup = group.key"
                        @focus="menuGroup = group.key"
                        @click="menuGroup = group.key"
                      ><span>{{ group.label }}</span><AppIcon name="chevron_right" /></button>
                    </div>
                    <div v-if="menuGroup" class="af-menu__items" role="menu" :aria-label="`Dodaj: ${addGroups.find(group => group.key === menuGroup)?.label ?? ''}`">
                      <button v-for="candidate in addCandidates(menuGroup)" :key="candidate.key" type="button" role="menuitem" :title="candidate.title" @click="day.add(candidate); closeMenu()"><AppIcon :name="familyIcon[candidate.family]" /><span>{{ candidate.title }}</span></button>
                    </div>
                  </div>
                </div>
                <button v-if="variant === 'stage-inline'" class="af-fold" type="button" :aria-pressed="collapseDone" :title="collapseDone ? 'Pokaż wykonane' : 'Zwiń wykonane'" :aria-label="collapseDone ? 'Pokaż wykonane' : 'Zwiń wykonane'" @click="collapseDone = !collapseDone"><AppIcon :name="collapseDone ? 'unfold_more' : 'unfold_less'" /></button>
              </div>
            </header>

            <section v-for="group in visibleGroups" :key="group.key" class="af-group">
              <header class="af-group__head">
                <h3>{{ group.label }}</h3>
              </header>
              <ActionDayRow
                v-for="item in group.items"
                :key="item.key"
                :item="item"
                :done="day.isDone(item)"
                :value="day.valueFor(item)"
                :lit="isRelated(item, effectiveKey)"
                :dim="effectiveKey !== null && !isRelated(item, effectiveKey)"
                selectable
                :staged="variant === 'stage-inline' && stageItem?.key === item.key"
                @select="stageKey = item.key"
                @toggle="day.toggle(item)"
                @tomorrow="day.moveToTomorrow(item)"
                @pick-day="togglePick(item.key)"
                @hide="day.hide(item)"
                @open="() => {}"
              >
                <!-- rozszerzenie sceny: wykres w gramatyce produktu + czytelne akcje -->
                <template #expansion>
                  <div class="af-expansion">
                    <ActionObjectChart :item="item" :live="liveEntryFor(item)" />
                    <div class="af-expansion__actions" role="group" :aria-label="`Akcje: ${item.title}`">
                      <button type="button" @click.stop="day.moveToTomorrow(item)"><AppIcon name="east" /> Jutro</button>
                      <button type="button" :class="{ active: movingKey === item.key }" @click.stop="togglePick(item.key)"><AppIcon name="calendar_month" /> Dzień</button>
                      <button type="button" @click.stop="day.hide(item)"><AppIcon name="visibility_off" /> Ukryj</button>
                      <button type="button" @click.stop><AppIcon name="open_in_new" /> Otwórz</button>
                    </div>
                  </div>
                </template>
              </ActionDayRow>
            </section>
            <button v-if="variant === 'stage-inline' && collapseDone && completedCount" type="button" class="af-hidden" @click="collapseDone = false"><AppIcon name="expand_more" /> Wykonane ({{ completedCount }})</button>
            <button v-if="day.hiddenCount.value" type="button" class="af-hidden" @click="day.restoreHidden()">
              <AppIcon name="visibility" /> Ukryte ({{ day.hiddenCount.value }})
            </button>
          </section>
        </div>

        <aside class="af-rail">
          <!-- data + kalendarz w jednym: rozwijany na życzenie albo przy przenoszeniu -->
          <section class="af-surface af-rail__card" aria-label="Dziś i kalendarz">
            <slot name="calendar" :day-ref="day.todayRef.value" :navigate="navigateDay" :targeting="movingKey !== null" :pick="onPickDay" :cancel-targeting="() => movingKey = null">
              <ActionMiniCalendar with-date :start-expanded="false" :targeting="movingKey !== null" :selected-day="variant === 'stage-inline' ? day.todayRef.value : undefined" @pick="onPickDay" @navigate="navigateDay" />
            </slot>
            <slot name="quick-plan" />
            <span v-if="day.lastNote.value && variant !== 'stage-inline'" class="af-note">{{ day.lastNote.value }}</span>
          </section>

          <section v-if="variant === 'stage-rail' && stageItem" class="af-surface af-rail__card af-rail__card--stage">
            <ActionNowStage
              :item="stageItem"
              :value="day.valueFor(stageItem)"
              orientation="card"
              :targeting="movingKey === stageItem.key"
              @do="doStage"
              @tomorrow="day.moveToTomorrow(stageItem)"
              @pick-day="togglePick(stageItem.key)"
              @hide="day.hide(stageItem)"
            />
          </section>

          <section class="af-surface af-rail__card" aria-label="Kompas">
            <h3>Kompas</h3>
            <ActionCompassRow :tiles="tiles" vertical :interactive="variant === 'stage-inline'" :selected-key="selectedCompass" @hover="hoverKey = $event" @select="selectCompass" />
          </section>
          <section class="af-surface af-rail__card" aria-label="Najbliższe terminy">
            <ActionUpcomingList :limit="4" />
          </section>
        </aside>
      </main>
      <div v-if="variant === 'stage-inline' && day.undoState.value" class="af-toast" role="status"><span>{{ day.lastNote.value }}</span><button type="button" @click="day.undo()">Cofnij</button><button type="button" aria-label="Zamknij powiadomienie" @click="day.undoState.value = null"><AppIcon name="close" /></button></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import ActionCompassRow from '~lab/components/action/ActionCompassRow.vue'
import ActionDayRow from '~lab/components/action/ActionDayRow.vue'
import ActionMiniCalendar from '~lab/components/action/ActionMiniCalendar.vue'
import ActionNowStage from '~lab/components/action/ActionNowStage.vue'
import ActionObjectChart from '~lab/components/action/ActionObjectChart.vue'
import ActionUpcomingList from '~lab/components/action/ActionUpcomingList.vue'
import { activeObjects, compassTiles, familyIcon, groupDayItems, isRelated, plannableObjects, type LiveDayEntry } from '~lab/lab/actionConceptData'
import { useActionDayDraft } from '~lab/lab/useActionDayDraft'
import { useActionDayState } from '~lab/lab/useActionDayState'

export type FocusDayVariant = 'stage-top' | 'stage-rail' | 'stage-inline'

const props = defineProps<{ presetId: string; variant: FocusDayVariant }>()

const draftDay = useActionDayDraft()
const legacyDay = useActionDayState()
const day = props.variant === 'stage-inline' ? draftDay : { ...draftDay, ...legacyDay }
const hoverKey = ref<string | null>(null)
const movingKey = ref<string | null>(null)
const stageKey = ref<string | null>(null)
const journalDone = ref(false)
const emotionLogs = ref(1)
const exerciseDone = ref(false)

const selectedCompass = ref<string | null>(null)
const effectiveKey = computed(() => hoverKey.value ?? selectedCompass.value)
const collapseDone = ref(false)
const isCompleted = (item: LabFixtureObject) => item.entryMode === 'completion' && day.isDone(item)
const completedCount = computed(() => day.todayItems.value.filter(isCompleted).length)
// puste grupy (nic zaplanowane albo wszystko zwinięte) nie zostawiają samotnych nagłówków
const visibleGroups = computed(() => {
  if (props.variant !== 'stage-inline') return day.dayGroups.value
  return groupDayItems(day.todayItems.value.filter(item => !collapseDone.value || !isCompleted(item)))
})

// menu dodawania: otwarte z hovera albo przypięte klikiem/klawiaturą; typy tylko z kandydatami
const menuHover = ref(false)
const menuPinned = ref(false)
const menuGroup = ref<string | null>(null)
const menuOpen = computed(() => (menuHover.value || menuPinned.value) && addGroups.value.length > 0)
const addGroups = computed(() => groupDayItems(plannableObjects(day.fixture.value)).filter(group => addCandidates(group.key).length > 0))
function addCandidates(groupKey: string) {
  return (groupDayItems(plannableObjects(day.fixture.value)).find(group => group.key === groupKey)?.items ?? [])
    .filter(item => !day.todayItems.value.some(current => current.key === item.key))
}
function closeMenu() {
  menuPinned.value = false
  menuHover.value = false
  menuGroup.value = null
}
function onMenuFocusOut(event: FocusEvent) {
  const wrap = event.currentTarget as HTMLElement
  if (!(event.relatedTarget instanceof Node) || !wrap.contains(event.relatedTarget)) menuPinned.value = false
}
// wykres w rozszerzeniu ma zgadzać się z kontrolką wiersza — tylko dla dnia bazowego fixture,
// bo tylko jego tydzień jest narysowany
function liveEntryFor(item: LabFixtureObject): LiveDayEntry | undefined {
  if (day.todayRef.value !== day.fixture.value.refs.today) return undefined
  return { done: day.hasEntry(item), value: day.valueFor(item) }
}
// komunikat Cofnij wygasa sam; każda nowa operacja odnawia czas
let toastTimer: ReturnType<typeof setTimeout> | undefined
watch(() => day.undoState.value, state => {
  if (toastTimer) clearTimeout(toastTimer)
  if (!state) return
  toastTimer = setTimeout(() => { day.undoState.value = null }, 7000)
})
onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })
function selectCompass(key: string) {
  selectedCompass.value = selectedCompass.value === key ? null : key
  hoverKey.value = null
}
function navigateDay(date: string) {
  draftDay.todayRef.value = date
  movingKey.value = null
  stageKey.value = null
  closeMenu()
  hoverKey.value = null
}
const entryStates = ref<Record<string, { journal: boolean; emotions: number; exercise: boolean }>>({})
watch(day.todayRef, (date, previous) => {
  entryStates.value[previous] = { journal: journalDone.value, emotions: emotionLogs.value, exercise: exerciseDone.value }
  const saved = entryStates.value[date]
  journalDone.value = saved?.journal ?? false
  emotionLogs.value = saved?.emotions ?? (date === day.fixture.value.refs.today ? 1 : 0)
  exerciseDone.value = saved?.exercise ?? false
})

const tiles = computed(() => compassTiles(day.fixture.value))
const pulsePct = computed(() => (day.todayItems.value.length ? Math.round((day.doneCount.value / day.todayItems.value.length) * 100) : 0))

const openItems = computed(() => day.todayItems.value.filter(item => !day.hasEntry(item)))
const stageItem = computed<LabFixtureObject | null>(() => {
  const selected = day.todayItems.value.find(item => item.key === stageKey.value && (!collapseDone.value || !isCompleted(item)))
  if (selected) return selected
  return openItems.value[0] ?? null
})

function doStage() {
  if (!stageItem.value) return
  const item = stageItem.value
  day.toggle(item)
  // po domknięciu scena sama przechodzi do kolejnego otwartego zadania
  if (day.hasEntry(item)) stageKey.value = null
}
function togglePick(key: string) {
  movingKey.value = movingKey.value === key ? null : key
}
function onPickDay(dayRef: string) {
  if (!movingKey.value) { if (props.variant === 'stage-inline') navigateDay(dayRef); return }
  const item = day.todayItems.value.find(candidate => candidate.key === movingKey.value)
  if (item) {
    day.moveTo(item, dayRef)
    if (stageKey.value === item.key) stageKey.value = null
  }
  movingKey.value = null
}
</script>

<style scoped>
.act-focus {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--color-background));
  font-family: 'Nunito', 'Avenir Next', sans-serif;
}
.act-focus *, .act-focus *::before, .act-focus *::after { box-sizing: border-box; }
.act-focus h3 { margin: 0; color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }

.af-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: rgb(var(--neo-surface-base));
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.af-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.af-surface > * { position: relative; z-index: 1; }

.af-sheet {
  display: grid;
  min-height: calc(100vh - 40px);
  max-width: 980px;
  margin: 0 auto;
  padding: 14px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 34px 27px 32px 25px;
  background: rgb(var(--color-background));
  box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13);
}

.af-columns { display: grid; grid-template-columns: minmax(0, 500px) minmax(300px, 1fr); gap: 15px; align-items: start; min-height: 0; }
.af-left { display: grid; gap: 12px; align-content: start; min-width: 0; min-height: 0; }

/* wpisy dnia nad listą */
.af-entries { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 8px 10px; border-radius: 21px 25px 20px 24px; }
.af-wpill {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 3px 8px;
  border: 1px solid rgb(var(--neo-border) / .16);
  border-radius: 14px 17px 13px 16px;
  color: inherit;
  background: rgb(var(--color-surface-container) / .55);
  cursor: pointer;
  transition: box-shadow .22s ease, background .2s ease, transform .16s ease;
}
.af-wpill:hover { background: rgb(var(--sky-100) / .8); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .6), 3px 3px 7px rgb(var(--neo-shadow-dark) / .16); }
.af-wpill:active { transform: scale(.985); }
.af-wpill__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--sky-200) / .6);
}
.af-wpill.done .af-wpill__icon { background: rgb(var(--sky-300) / .9); }
.af-wpill__icon .material-symbols-outlined { font-size: 15px; }
.af-wpill small { font-size: 8.5px; font-weight: 800; letter-spacing: .02em; white-space: nowrap; }

.af-list { min-height: 0; padding: 12px 16px 13px; overflow: hidden auto; border-radius: 25px 30px 24px 28px; scrollbar-width: thin; }
.af-list__head { display: flex; align-items: baseline; padding: 0 2px 6px; }

/* postęp dnia: ledwie widoczny włosek na górnej krawędzi karty */
.af-list__filament {
  position: absolute;
  top: 0;
  right: 34px;
  left: 34px;
  z-index: 2;
  display: block;
  overflow: hidden;
  height: 2.5px;
  border-radius: 0 0 3px 3px;
  background: rgb(var(--neo-border) / .14);
}
.af-list__filament i { display: block; height: 100%; border-radius: inherit; background: rgb(var(--sky-400) / .75); transition: width .3s ease; }

.af-group + .af-group { margin-top: 8px; }

/* rozszerzenie: wykres po lewej, akcje po prawej */
.af-expansion { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.af-expansion__actions { display: grid; grid-template-columns: repeat(2, auto); gap: 4px; align-content: center; }
.af-expansion__actions button {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  justify-content: flex-start;
  padding: 4px 10px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 11px 13px 10px 12px;
  color: rgb(var(--neo-muted));
  background: rgb(var(--color-surface-container) / .5);
  font-size: 8.5px;
  font-weight: 800;
  cursor: pointer;
}
.af-expansion__actions button:hover, .af-expansion__actions button.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-100) / .9); }
.af-expansion__actions .material-symbols-outlined { font-size: 12px; }

.af-hidden {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-top: 10px;
  padding: 4px 10px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 11px 13px 10px 12px;
  color: rgb(var(--neo-muted));
  background: transparent;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
}
.af-hidden .material-symbols-outlined { font-size: 12px; }

.af-note { display: block; padding-top: 4px; color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; }

.af-rail { display: grid; gap: 14px; align-content: start; min-width: 0; }
.af-rail__card { display: grid; gap: 8px; padding: 12px 14px; border-radius: 25px 30px 24px 28px; }
.af-rail__card--stage { padding: 14px 14px 12px; }
.af-list__head { justify-content: space-between; align-items: center; }
.af-list > .af-list__head { z-index: 3; } /* menu dodawania ma leżeć nad wierszami */
.af-list__tools { display: flex; align-items: center; gap: 2px; }
.af-fold, .af-add { display: grid; place-items: center; width: 24px; height: 22px; border: 0; border-radius: 9px; padding: 0; background: transparent; color: rgb(var(--color-primary-strong)); cursor: pointer; }
.af-fold .material-symbols-outlined, .af-add .material-symbols-outlined { font-size: 16px; }
.af-fold[aria-pressed="true"], .af-fold:hover, .af-add:hover, .af-add[aria-expanded="true"] { background: rgb(var(--sky-200) / .5); }
.af--stage-inline .af-group__head { display: flex; align-items: center; min-height: 22px; }
/* plus cichy do czasu najechania na nagłówek listy / fokusu; otwarte menu trzyma go widocznym */
.af-add { opacity: 0; transition: opacity .16s ease; }
.af-list__head:hover .af-add, .af-list__head:focus-within .af-add, .af-add[aria-expanded="true"] { opacity: 1; }
.af-addwrap { position: relative; }
.af-menu {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  display: flex;
  align-items: stretch;
  border: 1px solid rgb(var(--neo-border) / .16);
  border-radius: 14px 17px 13px 16px;
  background: rgb(var(--neo-surface-base));
  box-shadow: -5px -5px 12px rgb(var(--neo-shadow-light) / .8), 6px 6px 14px rgb(var(--neo-shadow-dark) / .26);
}
.af-menu__types, .af-menu__items { display: grid; align-content: start; gap: 1px; padding: 6px; }
.af-menu__types { min-width: 150px; }
.af-menu__items { min-width: 210px; max-width: 260px; max-height: 220px; overflow: auto; border-left: 1px solid rgb(var(--neo-border) / .14); scrollbar-width: thin; }
.af-menu button {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.af-menu__items button { justify-content: flex-start; color: rgb(var(--color-on-surface)); font-weight: 650; }
.af-menu__items button span { overflow: hidden; text-overflow: ellipsis; }
.af-menu__types button { color: rgb(var(--color-primary-strong)); font-size: 8.5px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
.af-menu button:hover, .af-menu__types button.active { background: rgb(var(--sky-200) / .45); }
.af-menu .material-symbols-outlined { font-size: 14px; color: rgb(var(--color-primary-strong)); }
.af-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 20; display: flex; align-items: center; gap: 12px; max-width: min(600px, 90vw); padding: 10px 14px; border-radius: 16px; background: rgb(var(--neo-surface-base)); box-shadow: -4px -4px 12px rgb(var(--neo-shadow-light) / .8), 5px 5px 15px rgb(var(--neo-shadow-dark) / .3); font-size: 11px; }
.af-toast > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.af-toast button { border: 0; background: transparent; color: rgb(var(--color-primary-strong)); font: inherit; font-weight: 800; cursor: pointer; }
.af-toast .material-symbols-outlined { display: block; font-size: 15px; }
.af--stage-inline :deep(.ac-row.dim) { opacity: .52; }
.act-focus button:focus-visible, .act-focus input:focus-visible { outline: 2px solid rgb(var(--sky-600)); outline-offset: 2px; }
</style>
