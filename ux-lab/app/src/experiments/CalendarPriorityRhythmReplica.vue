<template>
  <div class="cp">
    <div class="cp__paper">
      <!-- nagłówek: jedna linia daty i skala; granulacja wykresów to lupa w wierszu serii -->
      <header class="cp__head">
        <div class="cp__date">
          <button type="button" class="cp__arrow" aria-label="Poprzedni okres" @click="st.shift(-1)"><AppIcon name="chevron_left" /></button>
          <h2>{{ title }}</h2>
          <button type="button" class="cp__arrow" aria-label="Następny okres" @click="st.shift(1)"><AppIcon name="chevron_right" /></button>
          <button v-if="!st.isTodayFocused.value" type="button" class="cp-btn cp-btn--quiet" @click="st.goToday()">Dziś</button>
        </div>
        <div class="cp__scales" role="group" aria-label="Skala">
          <button v-for="s in SCALES" :key="s.id" type="button" :class="{ on: st.scale.value === s.id }" :aria-pressed="st.scale.value === s.id" @click="st.setScale(s.id)">{{ s.label }}</button>
        </div>
      </header>

      <PeriodSummary
        :scenario="st.scenario" :scale="st.scale.value" :period-ref="st.focusRef.value" :units="st.units.value"
        :open="st.summaryOpen.value" :view="st.view.value" :state="st.focusState.value"
        @toggle="st.toggleSummary" @focus="st.setView" @ritual="openRitual"
      />
      <RhythmBoard
        :rows="rows" :units="st.units.value" :scale="st.scale.value"
        :objects="st.scenario.objects" :fine="st.fineKeys.value" :view="st.view.value" :options="viewOptions"
        @set-view="st.setView" @toggle-more="onToggleMore" @toggle-fine="st.toggleFine" @open-unit="st.openUnit"
      />
    </div>

    <!-- warstwa Labu: etykieta scenariusza i podwarianty (nie należy do produktu) -->
    <div class="cp__lab">
      <span>{{ scenarioLabel(st.scenario) }}</span>
      <label>Podwariant
        <select :value="st.sample.value" @change="switchSample(($event.target as HTMLSelectElement).value)">
          <option v-for="id in SAMPLE_IDS" :key="id" :value="id">{{ id }}</option>
        </select>
      </label>
      <span v-if="st.actionNote.value" class="cp__lab-note">{{ st.actionNote.value }}</span>
    </div>

    <div v-if="st.toast.value" class="cp__toast" role="status"><span>{{ st.toast.value }}</span></div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { routerKey, routeLocationKey } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import RhythmBoard from '~lab/components/calendar-priority/RhythmBoard.vue'
import PeriodSummary, { type RitualKind } from '~lab/components/calendar-priority/PeriodSummary.vue'
import { SCALES, periodTitle } from '~lab/lab/calendarPriorityData'
import { buildRows, viewOptions as viewOptionsFor } from '~lab/lab/calendarPriorityRows'
import { SAMPLE_IDS, scenarioLabel } from '~lab/lab/calendarPriorityScenario'
import { useCalendarPriorityState } from '~lab/lab/useCalendarPriorityState'

const props = defineProps<{ presetId: string; variantId?: string }>()
const st = useCalendarPriorityState(props.presetId)
const router = inject(routerKey, null)
const route = inject(routeLocationKey, null)

const title = computed(() => periodTitle(st.scale.value, st.focusRef.value))

const viewOptions = computed(() => viewOptionsFor(st.scenario, st.scale.value, st.focusRef.value, st.units.value))
const rows = computed(() => buildRows(st.scenario, st.scale.value, st.focusRef.value, st.units.value, st.view.value, { moreSeries: st.moreSeries.value }))

function onToggleMore(id: string) {
  const parent = id.replace(/:more$/, '')
  st.moreSeries.value = st.moreSeries.value === parent ? null : parent
}

/**
 * Rytuały okresu (w produkcie: pełny wizard z okresem ustawionym z góry — plan otwiera się od kroku przypisań,
 * refleksja od pytań). W Labie tylko symulacja.
 */
function openRitual(kind: RitualKind) {
  const ref = st.focusRef.value
  if (st.scale.value === 'month' && router && route) {
    void router.push({ path: `/preview/ritual-month/quiet-v2/${kind === 'plan' ? 'plan' : 'reflect'}`, query: { month: ref, step: kind === 'plan' ? 2 : undefined, returnTo: route.fullPath } })
    return
  }
  if (kind === 'plan') st.note(st.scale.value === 'year' ? `→ Plan roku · ${ref}` : `→ Planowanie · ${ref} (krok przypisań)`)
  else st.note(`→ Refleksja · ${ref}`)
}

function switchSample(id: string) {
  if (!router || !route) return
  void router.replace({ query: { ...route.query, sample: id, ref: undefined, scale: undefined, view: undefined, open: undefined, summary: undefined, grain: undefined, fine: undefined } }).then(() => window.location.reload())
}

defineExpose({ st })
</script>

<style>
/* wspólne przyciski eksperymentu (bez scope, żeby dzieci mogły ich używać) — ten sam język co chipy fokusu */
.cp .cp-btn { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 14px; border: 1px solid var(--cp-line); border-radius: 17px 14px 18px 15px; background: var(--cp-inner); color: rgb(var(--sky-800)); font: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; box-shadow: var(--cp-shadow-card); }
.cp .cp-btn:hover { background: white; }
.cp .cp-btn .material-symbols-outlined { font-size: 18px; color: rgb(var(--sky-700)); }
.cp .cp-btn--quiet { border-color: transparent; background: transparent; box-shadow: none; color: rgb(var(--sky-700)); }
.cp .cp-btn--quiet:hover { background: var(--cp-field); }
.cp .cp-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>

<style scoped>
.cp { box-sizing: border-box; min-height: 100vh; padding: 20px 24px 40px; color: rgb(var(--color-on-surface)); background: rgb(var(--color-background)); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.cp *, .cp *::before, .cp *::after { box-sizing: border-box; }
.cp__paper { display: grid; gap: 18px; align-content: start; max-width: 1180px; margin: 0 auto; padding: 22px 26px 24px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 30px; background: rgb(var(--color-background)); }

.cp__head { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.cp__date { display: flex; align-items: center; gap: 8px; }
.cp__date h2 { margin: 0 8px; font-size: 22px; font-weight: 800; }
.cp__arrow { display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: transparent; color: rgb(var(--color-on-surface-variant)); cursor: pointer; }
.cp__arrow:hover { background: var(--cp-field); }
.cp__scales { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; }
.cp__scales button { min-height: 30px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; color: rgb(var(--color-on-surface-variant)); font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.cp__scales button:hover { color: rgb(var(--sky-800)); }
.cp__scales button.on { color: rgb(var(--sky-800)); }

.cp__lab { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; max-width: 1180px; margin: 14px auto 0; padding: 8px 14px; border: 1px dashed rgb(var(--neo-border) / .5); border-radius: 12px; color: rgb(var(--neo-muted)); font-size: 11.5px; font-weight: 700; }
.cp__lab label { display: inline-flex; align-items: center; gap: 6px; }
.cp__lab select { font: inherit; font-size: 11.5px; border-radius: 8px; border: 1px solid rgb(var(--neo-border) / .35); background: rgb(var(--color-background)); padding: 2px 6px; }
.cp__lab-note { color: rgb(var(--sky-700)); }

.cp__toast { position: fixed; left: 50%; bottom: 22px; z-index: 20; display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 16px 13px 17px 14px; background: rgb(var(--sky-800)); color: white; font-size: 13px; font-weight: 700; transform: translateX(-50%); box-shadow: 0 10px 26px rgb(var(--neo-shadow-dark) / .35); }
</style>

<style src="~lab/components/calendar-priority/sketch.css"></style>
