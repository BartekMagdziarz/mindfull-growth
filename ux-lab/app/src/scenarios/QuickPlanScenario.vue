<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActionFocusDayReplica from '~lab/experiments/ActionFocusDayReplica.vue'
import WeeklyCalendarPlan from '~lab/experiments/WeeklyCalendarPlan.vue'
import QuickPlanPanel from '~lab/experiments/QuickPlanPanel.vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { useLabStore } from '~lab/stores/lab.store'
const route = useRoute()
const router = useRouter()
const lab = useLabStore()
const variants = [
  { id: 'calendar', title: '04 · Kalendarz → plan tygodnia', text: 'Kalendarz jest częścią Dzisiaj. Mała ikona edycji rozwija go w miejscu do planszy tygodnia, a powrót przywraca listę dnia i Kompas.' },
  { id: 'inline', title: '01 · Pod kalendarzem', text: 'Najkrótszy rzut oka na jutro. Plan rozwija się w prawej kolumnie; przy dłuższej edycji robi się ciasno.' },
  { id: 'drawer', title: '02 · Boczna szuflada', text: 'Rekomendacja. Wygodny podgląd i poprawki, a Dzisiaj pozostaje w tle. Jedno miejsce dla dnia, tygodnia i miesiąca.' },
  { id: 'board', title: '03 · Plansza planu', text: 'Do większego przemeblowania. Siedem dni obok siebie ułatwia porównanie, ale mocniej odrywa od Dzisiaj.' },
]
const variant = computed(() => variants.find(v => v.id === route.query.variant) ?? variants[0])
const opened = ref(false)
const calendarExpanded = ref(false)
const revision = ref(0)
const trigger = ref<HTMLButtonElement>()
const dialog = ref<HTMLDialogElement>()
const notes = ref(false)
function close() { opened.value = false; dialog.value?.close(); void nextTick(() => trigger.value?.focus()) }
async function open() { opened.value = true; await nextTick(); if (variant.value.id !== 'inline') dialog.value?.showModal() }
async function choose(id: string) { close(); calendarExpanded.value = false; await router.replace({ query: { ...route.query, variant: id } }) }
watch(() => lab.experimentRevision, () => { close(); revision.value++; calendarExpanded.value = false })
</script>

<template>
  <div class="quick-concept mg-design-v2">
    <header class="qc-header"><div><small>DZISIAJ / KONCEPT UX</small><h1>{{ variant.id === 'calendar' ? 'Kalendarz, który daje miejsce na plan.' : 'Sprawdź. Popraw. Wróć do dnia.' }}</h1></div><button @click="close(); calendarExpanded = false; revision++">Reset szkicu</button></header>
    <nav class="qc-variants" aria-label="Wariant szybkiego planu"><button v-for="v in variants" :key="v.id" :aria-pressed="v.id === variant.id" @click="choose(v.id)">{{ v.title }}</button><button class="qc-notes" :aria-expanded="notes" @click="notes = !notes">Notatki UX</button></nav>
    <p class="qc-description">{{ variant.text }}</p>
    <aside v-if="notes" class="qc-notebox"><strong>Proponowana ścieżka</strong><p v-if="variant.id === 'calendar'">Klik daty w karcie zmienia dzień po lewej. Mała ikona edycji rozwija kalendarz na szerokość miejsca pracy, chwilowo chowając listę dnia i pozostałe pola. Siedem dni pozostaje widocznych; edycja odbywa się pod planszą. Cofnij, Escape i powrót zachowują zapisany szkic panelu.</p><p v-else>Szybki plan → dzień / tydzień / miesiąc → przypisanie → zmiana terminu, celu lub usunięcie → Zapisz zmianę → Cofnij.</p><p v-if="variant.id !== 'calendar'">W miesiącu klik tygodnia odsłania dni. „Bez konkretnej daty” pozostaje przypisaniem do okresu. Edycja dotyczy jednego przypisania, nie definicji obiektu ani całej serii. Dodawanie korzysta z aktywnych obiektów.</p><p>Prototyp desktopowy: przykładowe przypisania do obiektów rich-v1, przechowywane w pamięci panelu. Lista Dzisiaj jest osobną repliką. Odświeżenie i reset usuwają szkic; wariant jest zapisany w adresie.</p></aside>
    <div class="qc-canvas" :class="{ 'qc-canvas--calendar': variant.id === 'calendar', 'qc-canvas--expanded': variant.id === 'calendar' && calendarExpanded }">
      <ActionFocusDayReplica :key="revision" preset-id="current" variant="stage-inline">
        <template v-if="variant.id === 'calendar'" #calendar="{ dayRef, navigate, targeting, pick, cancelTargeting }">
          <WeeklyCalendarPlan :day-ref="dayRef" :targeting="targeting" @navigate="navigate" @pick="pick" @cancel-targeting="cancelTargeting" @expand="calendarExpanded = $event" />
        </template>
        <template v-else #quick-plan>
          <button ref="trigger" class="qc-trigger" :aria-expanded="opened" @click="opened ? close() : open()"><AppIcon name="edit_calendar" /><span>Szybki plan</span><AppIcon :name="opened ? 'expand_less' : 'chevron_right'" /></button>
          <QuickPlanPanel v-if="variant.id === 'inline'" v-show="opened" :key="`inline-${revision}`" @close="close" />
        </template>
      </ActionFocusDayReplica>
    </div>
    <dialog v-if="variant.id !== 'calendar'" ref="dialog" class="qc-dialog" :class="`qc-dialog--${variant.id}`" aria-label="Szybki plan" @cancel.prevent="close" @click="($event.target === dialog) && close()">
      <QuickPlanPanel v-if="variant.id !== 'inline'" :key="`${variant.id}-${revision}`" :wide="variant.id === 'board'" @close="close" />
    </dialog>
    <p class="qc-disclaimer">Szkic w UX Labie · przykładowy plan · zmiany tylko w tej sesji</p>
  </div>
</template>

<style scoped>
.quick-concept{min-width:0;width:100%;padding:24px;max-width:1500px;margin:auto;font-family:'Nunito',sans-serif;color:var(--mg-color-ink)}.qc-header{display:flex;justify-content:space-between;align-items:center;gap:20px}.qc-header small{font-size:10px;letter-spacing:.16em;color:var(--mg-color-muted)}.qc-header h1{font-size:27px;margin:6px 0 20px;font-weight:800}.quick-concept button{font:inherit;cursor:pointer;border:0;border-radius:14px 17px 13px 16px;background:var(--mg-color-surface);color:inherit;padding:10px 15px}.quick-concept button:focus-visible{outline:2px solid rgb(var(--color-primary-strong));outline-offset:3px}.qc-variants{display:flex;gap:10px;align-items:center}.qc-variants button[aria-pressed=true]{background:var(--mg-color-paper);box-shadow:inset 2px 2px 5px rgb(var(--neo-shadow-dark)/.2),inset -2px -2px 5px rgb(var(--neo-shadow-light)/.7);font-weight:800}.qc-notes{margin-left:auto}.qc-description{font-size:13px;margin:18px 0 22px;max-width:880px;color:var(--mg-color-muted)}.qc-canvas{border-radius:26px;overflow:hidden;container-type:inline-size}.qc-canvas :deep(.af-sheet){max-width:none}.qc-canvas :deep(.af-columns){grid-template-columns:minmax(330px,1fr) minmax(440px,.9fr)}.qc-trigger{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:var(--mg-color-mist)!important;font-size:13px!important}.qc-trigger span:nth-child(2){flex:1}.qc-trigger .material-symbols-outlined{font-size:19px;color:rgb(var(--color-primary-strong))}.qc-dialog{padding:0;border:0;background:transparent;color:inherit;max-height:92vh;max-width:calc(100vw - 48px);width:600px;border-radius:28px;overflow:auto}.qc-dialog--drawer{margin:24px 24px 24px auto;height:calc(100vh - 48px)}.qc-dialog--drawer :deep(.quick-plan){min-height:100%}.qc-dialog--board{width:1120px;margin:auto}.qc-dialog::backdrop{background:rgb(var(--sky-800)/.16)}.qc-disclaimer{font-size:11px;color:var(--mg-color-muted);text-align:right;margin-top:14px}.qc-notebox{font-size:13px;background:var(--mg-color-paper);padding:16px 22px;border-radius:18px;margin-bottom:20px}.qc-notebox p{margin-top:8px;max-width:1000px}

.qc-variants{flex-wrap:wrap;gap:7px}.qc-variants button{font-size:12px;padding:9px 12px}
.qc-canvas--calendar :deep(.af-columns){grid-template-columns:minmax(300px,1fr) minmax(360px,.9fr)}
.qc-canvas--expanded :deep(.af-columns){grid-template-columns:minmax(0,1fr)}
.qc-canvas--expanded :deep(.af-left){display:none}
.qc-canvas--expanded :deep(.af-rail>section:not(:first-child)){display:none}
.qc-canvas--expanded :deep(.af-rail__card){padding:16px 20px}
.qc-canvas--expanded :deep(.af-sheet){min-height:0}
.qc-canvas--expanded :deep(.act-focus){padding:12px}
.qc-canvas--expanded :deep(.sp-head h2){text-transform:none;letter-spacing:normal;color:var(--mg-color-ink)}
@media(prefers-reduced-motion:no-preference){.qc-canvas--expanded :deep(.af-rail){animation:calendar-unfold .2s ease-out}@keyframes calendar-unfold{from{opacity:.6;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}}

@container(max-width:740px){
  .qc-canvas--calendar :deep(.af-columns){display:flex;flex-direction:column-reverse}
  .qc-canvas--calendar :deep(.af-rail),.qc-canvas--calendar :deep(.af-left){width:100%}
  .qc-canvas--expanded :deep(.af-left){display:none}
  .qc-canvas--calendar :deep(.sp-board){grid-template-columns:repeat(7,minmax(110px,1fr));overflow-x:auto;padding-bottom:10px}
}
</style>
