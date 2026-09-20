<template>
  <QuietRitualShell
    scale="week"
    eyebrow="Refleksja tygodnia"
    :period-title="periodTitle"
    :steps="steps"
    :current="current"
    :wide="current === 0 || current === steps.length - 1"
    :saving="isSaving"
    :finished="saved"
    finish-label="Zapisz refleksję"
    finished-label="Zapisano"
    alternate-label="Zapisz i zaplanuj kolejny tydzień"
    @close="emit('close')"
    @go="go"
    @finish="finish"
    @alternate="finishAndPlanNext"
  >
    <!-- 1 · Przegląd — what actually happened, day by day -->
    <section v-if="current === 0" class="qr-evidence">
      <div class="qr-table-scroll">
        <div class="qr-table" :class="{ 'qr-table--day-selected': selectedDay !== null }">
          <div class="qr-table-head qr-table-head--review">
            <span aria-hidden="true"></span>
            <button
              v-for="day in days"
              :key="day.dayRef"
              type="button"
              class="qr-day-head"
              :class="{ selected: selectedDay === day.index }"
              :aria-pressed="selectedDay === day.index"
              :aria-label="`${day.fullLabel} ${day.dayNumber}`"
              @click="selectedDay = selectedDay === day.index ? null : day.index"
            >
              <span>{{ day.shortLabel }}</span><b>{{ day.dayNumber }}</b>
            </button>
            <span>Wynik</span>
          </div>

          <article v-for="row in evidenceRows" :key="row.key" class="qr-evidence-row">
            <div class="qr-table-row">
              <span class="qr-row-name"><AppIcon :name="row.icon" /><strong>{{ row.title }}</strong></span>
              <span
                v-for="(cell, index) in row.cells"
                :key="cell.dayRef"
                class="qr-evidence-cell"
                :class="{ 'qr-col-selected': selectedDay === index }"
                :title="cellTitle(cell, index)"
              >
                <span
                  v-if="row.entryMode === 'completion' || row.entryMode === 'multi-completion'"
                  class="qr-record-dot"
                  :class="{ recorded: cell.value !== null, planned: cell.planned }"
                >
                  <i v-if="cell.value !== null" /><span class="sr-only">{{ cell.value === null ? 'Brak zapisu' : 'Wykonane' }}</span>
                </span>
                <span
                  v-else-if="cell.value !== null"
                  class="qr-numeric"
                  :class="{ 'qr-numeric--rating': row.entryMode === 'rating' }"
                >
                  <i :style="{ height: `${Math.min(28, (cell.value / row.cellMax) * 28)}px` }" /><b>{{ formatQuietNumber(cell.value) }}</b>
                </span>
                <span v-else aria-label="Brak zapisu">—</span>
              </span>
              <span class="qr-result">{{ row.result }}</span>
            </div>
            <button
              type="button"
              class="qr-comment-toggle qr-quiet"
              :aria-label="`${objectComments[row.key] ? 'Edytuj komentarz' : 'Dodaj komentarz'}: ${row.title}`"
              :title="objectComments[row.key] ? 'Edytuj komentarz' : 'Dodaj komentarz'"
              :aria-expanded="commentOpen === row.key"
              @click="commentOpen = commentOpen === row.key ? null : row.key"
            >
              <AppIcon :name="objectComments[row.key] ? 'chat_bubble' : 'add_comment'" />
              <span class="sr-only">{{ objectComments[row.key] ? 'Komentarz' : 'Dodaj komentarz' }}</span>
            </button>
            <textarea
              v-if="commentOpen === row.key"
              :value="objectComments[row.key] ?? ''"
              :aria-label="`Komentarz: ${row.title}`"
              rows="2"
              @input="setComment(row.key, $event)"
            />
          </article>

          <article class="qr-evidence-row qr-evidence-row--meta qr-journal-row">
            <div class="qr-table-row">
              <span class="qr-row-name"><AppIcon name="menu_book" /><strong>Dziennik</strong></span>
              <span
                v-for="day in days"
                :key="day.dayRef"
                class="qr-evidence-cell qr-meta-cell"
                :class="{ 'qr-col-selected': selectedDay === day.index }"
                :title="`${day.shortLabel}: ${journalTitles(day.index).join(' · ') || 'Bez wpisu'}`"
              >
                <template v-if="journalTitles(day.index).length">
                  <AppIcon v-for="n in journalTitles(day.index).length" :key="n" class="qr-journal-mark" name="menu_book" />
                  <span class="sr-only">{{ journalTitles(day.index).join(', ') }}</span>
                </template>
                <span v-else aria-label="Bez wpisu">—</span>
              </span>
              <span class="qr-result">{{ journalCount }} {{ plural(journalCount, 'wpis', 'wpisy', 'wpisów') }}</span>
            </div>
          </article>

          <article class="qr-evidence-row qr-evidence-row--meta qr-emotion-row">
            <div class="qr-table-row">
              <span class="qr-row-name"><AppIcon name="mood" /><strong>Emocje</strong></span>
              <span
                v-for="day in days"
                :key="day.dayRef"
                class="qr-evidence-cell qr-meta-cell"
                :class="{ 'qr-col-selected': selectedDay === day.index }"
              >
                <QuietEmotionStack :emotions="dayEmotions(day.index)" :slot-label="day.shortLabel" :max-height="32" />
              </span>
              <span class="qr-result">{{ emotionCount }} {{ plural(emotionCount, 'zapis', 'zapisy', 'zapisów') }}</span>
            </div>
          </article>
        </div>
      </div>

      <div v-if="selectedDay !== null" class="qr-day-detail" role="status">
        <strong>{{ days[selectedDay].fullLabel }} {{ days[selectedDay].dayNumber }}</strong>
        <span v-if="!journalTitles(selectedDay).length && !dayEmotions(selectedDay).length">Bez wpisów dziennika i emocji</span>
        <span v-if="journalTitles(selectedDay).length"><AppIcon name="menu_book" />{{ journalTitles(selectedDay).join(' · ') }}</span>
        <span v-if="dayEmotions(selectedDay).length">
          <AppIcon name="mood" />{{ dayEmotions(selectedDay).map(emotion => emotion.name).join(', ') }}
        </span>
      </div>

      <details class="qr-help">
        <summary aria-label="Jak czytać wyniki?">?</summary>
        <p>
          Obrys oznacza plan, wypełnienie — zapis. Kreska lub puste miejsce to brak zapisu, nie potwierdzone
          niewykonanie. Kropki emocji mają kolor ćwiartki koła emocji.
        </p>
      </details>
    </section>

    <!-- 2–5 · Obszary życia — Obciążenie i Stan, jeden obszar naraz; ostatnie tygodnie jako wstęga nad słupkami -->
    <section v-else-if="activeArea" class="qr-ratings">
      <div class="qr-tail">
        <header>
          <AppIcon :name="activeArea.icon" />
          <span>{{ t(areaTitleKey(activeArea.key)) }} · ostatnie {{ TAIL_WEEKS }} tygodni</span>
          <small>{{ currentPairRated ? 'ten tydzień dorysowany na końcu' : 'ten tydzień jeszcze bez oceny' }}</small>
        </header>
        <LoadStateRibbon :points="tailPoints" :label="t(areaTitleKey(activeArea.key))" :height="84" show-axis />
      </div>
      <div class="qr-bars">
        <QuietRatingBar
          :model-value="ratingValue(activeArea.fields.demands)"
          :label="t('planning.reflection.weekly.groups.load.title')"
          :hint="tg(cellQuestionKey(activeArea.key, 'load'))"
          :high-label="t(cellAnchorKey(activeArea.key, 'load', 'high'))"
          :low-label="t(cellAnchorKey(activeArea.key, 'load', 'low'))"
          tone="load"
          @update:model-value="setRating(activeArea.fields.demands, $event)"
        />
        <QuietRatingBar
          :model-value="ratingValue(activeArea.fields.state)"
          :label="t('planning.reflection.weekly.groups.state.title')"
          :hint="tg(cellQuestionKey(activeArea.key, 'state'))"
          :high-label="t(cellAnchorKey(activeArea.key, 'state', 'high'))"
          :low-label="t(cellAnchorKey(activeArea.key, 'state', 'low'))"
          :fill-color="currentPairRated ? pairColor(currentPair.load, currentPair.state) : null"
          @update:model-value="setRating(activeArea.fields.state, $event)"
        />
      </div>

      <div class="qr-tags">
        <h2>
          <AppIcon name="sell" />Tagi<span v-if="areaTags.length"> · {{ areaTags.length }}</span>
        </h2>
        <ul v-if="areaTags.length" class="qr-tag-list" :aria-label="`Tagi: ${t(areaTitleKey(activeArea.key))}`">
          <li v-for="tag in areaTags" :key="tag">
            <span>{{ tag }}</span>
            <button type="button" :aria-label="`Usuń tag: ${tag}`" @click="removeTag(tag)"><AppIcon name="close" /></button>
          </li>
        </ul>
        <form class="qr-tag-form" @submit.prevent="commitTag(tagInput[activeArea.key] ?? '')">
          <input
            v-model="tagInput[activeArea.key]"
            type="text"
            maxlength="32"
            :aria-label="`Nowy tag: ${t(areaTitleKey(activeArea.key))}`"
            placeholder="Dodaj tag…"
          />
          <button type="submit" class="qr-quiet" :disabled="!(tagInput[activeArea.key] ?? '').trim()">Dodaj</button>
        </form>
        <div v-if="tagSuggestions.length" class="qr-tag-suggestions" aria-label="Ostatnio użyte">
          <button v-for="tag in tagSuggestions" :key="tag" type="button" class="qr-quiet" @click="commitTag(tag)">
            <AppIcon name="add" />{{ tag }}
          </button>
        </div>
      </div>
    </section>

    <!-- 6 · Kotwice -->
    <section v-else-if="current === 5" class="qr-anchors">
      <article v-for="(anchor, index) in ANCHORS" :key="anchor.key">
        <button type="button" :aria-expanded="anchorOpen === index" @click="anchorOpen = anchorOpen === index ? null : index">
          <AppIcon :name="anchor.icon" /><span>{{ anchor.label }}</span>
          <AppIcon :name="anchorOpen === index ? 'expand_less' : promptResponses[anchor.key] ? 'edit_note' : 'add'" />
        </button>
        <textarea
          v-if="anchorOpen === index"
          :value="promptResponses[anchor.key] ?? ''"
          :aria-label="anchor.label"
          rows="4"
          @input="setAnchor(anchor.key, $event)"
        />
        <p v-else-if="promptResponses[anchor.key]">{{ promptResponses[anchor.key] }}</p>
      </article>
    </section>

    <!-- 7 · Dziennik -->
    <section v-else class="qr-journal" :class="{ 'qr-journal--with-context': contextOpen }">
      <div class="qr-journal-main">
        <textarea v-model="freeformReflection" aria-label="Dziennik tygodnia" rows="9" placeholder="Ten tydzień…" />
        <div class="qr-journal-tools">
          <span>{{ wordCount }} {{ plural(wordCount, 'słowo', 'słowa', 'słów') }}</span>
          <button type="button" class="qr-quiet" :aria-expanded="contextOpen" @click="contextOpen = !contextOpen">
            <AppIcon name="notes" />Kontekst
          </button>
          <button type="button" class="qr-quiet" :aria-expanded="aiOpen" @click="aiOpen = !aiOpen">
            <AppIcon name="auto_awesome" />AI
          </button>
        </div>
        <QuietJournalAi
          v-if="aiOpen"
          :summary-context="summaryContext"
          :ai-summary="aiSummary"
          @update:ai-summary="aiSummary = $event"
          @insert="insertIntoJournal"
        />
      </div>

      <aside v-if="contextOpen" class="qr-context-col" aria-label="Kontekst tygodnia">
        <section class="qr-ctx">
          <h3>Oceny</h3>
          <ul class="qr-ctx-ratings">
            <li v-for="(area, index) in AREAS" :key="area.key">
              <span class="qr-ctx-pair" aria-hidden="true">
                <LoadStateBars :load="toRating(ratingValue(area.fields.demands))" :state="toRating(ratingValue(area.fields.state))" />
              </span>
              <button type="button" class="qr-ctx-area" @click="go(index + 1)">
                <span>{{ t(areaTitleKey(area.key)) }}</span>
                <small>{{ ratingValue(area.fields.demands) ?? '—' }} · {{ ratingValue(area.fields.state) ?? '—' }}</small>
              </button>
              <span v-if="tagsFor(area.key).length" class="qr-ctx-tags">{{ tagsFor(area.key).join(', ') }}</span>
            </li>
          </ul>
        </section>

        <section v-if="emotionCount" class="qr-ctx">
          <h3>Emocje <small>{{ emotionCount }}</small></h3>
          <ul class="qr-ctx-chips">
            <li
              v-for="emotion in topEmotions"
              :key="emotion.name"
              :style="{
                background: `var(--color-quadrant-${emotion.quadrant}-tint)`,
                color: `var(--color-quadrant-${emotion.quadrant}-text)`,
              }"
            >
              {{ emotion.name }} <b>×{{ emotion.count }}</b>
            </li>
          </ul>
          <ul class="qr-ctx-days" aria-label="Emocje w kolejnych dniach">
            <li v-for="day in days" :key="day.dayRef">
              <QuietEmotionStack :emotions="dayEmotions(day.index)" :slot-label="day.shortLabel" />
              <span>{{ day.shortLabel }}</span>
            </li>
          </ul>
        </section>

        <section v-if="journalEntries.length" class="qr-ctx">
          <h3>Dziennik <small>{{ journalEntries.length }}</small></h3>
          <ul class="qr-ctx-list">
            <li v-for="entry in journalEntries" :key="entry.key">
              <small>{{ entry.day }}</small><span>{{ entry.title }}</span>
            </li>
          </ul>
        </section>

        <section v-if="evidenceRows.length" class="qr-ctx">
          <h3>Działania</h3>
          <ul class="qr-ctx-chips qr-ctx-actions">
            <li
              v-for="row in evidenceRows"
              :key="row.key"
              :class="`qr-ctx-action qr-ctx-action--${toneFor(row.key)}`"
              :title="row.title"
            >
              <AppIcon :name="row.icon" /><span>{{ row.title }}</span><b>{{ row.result }}</b>
            </li>
          </ul>
          <ul v-if="commentedRows.length" class="qr-ctx-quotes">
            <li v-for="row in commentedRows" :key="row.key">
              <small>{{ row.title }}</small>
              <q>{{ objectComments[row.key] }}</q>
            </li>
          </ul>
        </section>

        <section v-if="filledAnchors.length" class="qr-ctx">
          <h3>Kotwice</h3>
          <ul class="qr-ctx-quotes">
            <li v-for="anchor in filledAnchors" :key="anchor.key">
              <button type="button" @click="go(5)"><AppIcon :name="anchor.icon" /><small>{{ anchor.label }}</small></button>
              <q>{{ anchor.text }}</q>
            </li>
          </ul>
        </section>

        <section v-if="exerciseTitles.length" class="qr-ctx">
          <h3>Ćwiczenia <small>{{ exerciseTitles.length }}</small></h3>
          <p class="qr-ctx-line">{{ exerciseTitles.join(' · ') }}</p>
        </section>
      </aside>
    </section>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRef } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { Quadrant } from '@/domain/emotion'
import type { WeeklyRatingKey } from '@/domain/reflection'
import type { LifeAreaKey } from '@/domain/reflectionMatrix'
import { REFLECTION_MATRIX_AREAS, areaTitleKey, cellAnchorKey, cellQuestionKey } from '@/domain/reflectionMatrix'
import AppIcon from '@/components/shared/AppIcon.vue'
import LoadStateBars from '@/components/shared/charts/LoadStateBars.vue'
import LoadStateRibbon from '@/components/shared/charts/LoadStateRibbon.vue'
import { pairColor, toRating } from '@/domain/loadState'
import { buildAreaSeries, trailingWeekRefs, weekPointLabel, type AreaSeries, type WeekPoint } from '@/domain/loadStateSeries'
import { useT } from '@/composables/useT'
import { useWeeklyReflectionWizard } from '@/composables/useWeeklyReflectionWizard'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import {
  emotionContextFromSummary,
  type ReflectionPriorityLine,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'
import { getPeriodBounds } from '@/utils/periods'
import QuietEmotionStack from './QuietEmotionStack.vue'
import QuietJournalAi from './QuietJournalAi.vue'
import QuietRatingBar from './QuietRatingBar.vue'
import QuietRitualShell, { type QuietRitualStep } from './QuietRitualShell.vue'
import {
  areaTagKey,
  addTag,
  buildQuietEvidenceRows,
  formatQuietNumber,
  parseTags,
  plural,
  quietWeekDays,
  serializeTags,
  weekRangeTitle,
  type QuietEvidenceCell,
  type QuietEvidenceRow,
} from './quietRitualModel'

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ close: []; updated: []; 'plan-next-week': [] }>()

const { t, tg } = useT()
const {
  dataBundle,
  objectComments,
  topPriorityKeys,
  ratingRefsByKey,
  promptResponses,
  freeformReflection,
  aiSummary,
  isSaving,
  save,
  goToStep,
} = useWeeklyReflectionWizard(toRef(props, 'weekRef'))

const AREAS = REFLECTION_MATRIX_AREAS
const ANCHORS = [
  { key: 'wentWell', label: 'Co poszło dobrze', icon: 'thumb_up' },
  { key: 'challenges', label: 'Co było trudne', icon: 'mountain_flag' },
  { key: 'lessons', label: 'Lekcje i spostrzeżenia', icon: 'lightbulb' },
]

const current = ref(0)
const selectedDay = ref<number | null>(null)
const commentOpen = ref<string | null>(null)
const anchorOpen = ref<number | null>(null)
const contextOpen = ref(false)
const aiOpen = ref(false)
const saved = ref(false)
const tagInput = reactive<Record<string, string>>({})
/** Load/state history of the preceding weeks (the ribbon's tail); the current week is appended live. */
const TAIL_WEEKS = 10
const tailHistory = ref<AreaSeries | null>(null)
const recentTags = ref<string[]>([])

const steps = computed<QuietRitualStep[]>(() => [
  { id: 'review', label: 'Przegląd', question: 'Co wydarzyło się naprawdę?' },
  ...AREAS.map(area => ({
    id: `area-${area.key}`,
    label: t(areaTitleKey(area.key)),
    question: tg(cellQuestionKey(area.key, 'state')),
  })),
  { id: 'anchors', label: 'Kotwice', question: 'Co warto zapamiętać?' },
  { id: 'journal', label: 'Dziennik', question: 'Zamknij tydzień własnymi słowami' },
])

// Reflection: step 0 = review, 1–4 = life areas, 5 = anchors, 6 = journal.
const activeArea = computed(() => (current.value >= 1 && current.value <= AREAS.length ? AREAS[current.value - 1] : null))
const periodTitle = computed(() => weekRangeTitle(props.weekRef))
const days = computed(() => quietWeekDays(props.weekRef, getPeriodBounds(props.weekRef).end as DayRef))

const evidenceRows = computed<QuietEvidenceRow[]>(() => {
  const bundle = dataBundle.value
  if (!bundle) return []
  return buildQuietEvidenceRows(
    bundle.weekObjectItems.map(item => ({
      key: item.key,
      subjectType: item.subjectType,
      subject: item.subject,
      icon: (item.subject as { icon?: string }).icon ?? item.parentGoalIcon,
      actualValue: item.measurement.actualValue,
      target: item.measurement.target,
    })),
    bundle.rawEntries,
    bundle.allDayAssignments,
    props.weekRef,
    getPeriodBounds(props.weekRef).end as DayRef,
  )
})

const journalCount = computed(() => dataBundle.value?.weeklySummary.totalJournalEntries ?? 0)
const emotionCount = computed(() => dataBundle.value?.weeklySummary.totalEmotionLogs ?? 0)
const journalEntries = computed(() =>
  (dataBundle.value?.dailyBreakdown ?? []).flatMap((day, index) =>
    day.journal.items.map(item => ({ key: item.id, day: `${days.value[index]?.shortLabel} ${days.value[index]?.dayNumber}`, title: item.title })),
  ),
)
const exerciseTitles = computed(() => {
  const titles = (dataBundle.value?.dailyBreakdown ?? []).flatMap(day => day.exercises.types)
  return [...new Set(titles)]
})
const topEmotions = computed(() => {
  const counts = new Map<string, { name: string; quadrant: Quadrant; count: number }>()
  for (const day of dataBundle.value?.dailyBreakdown ?? []) {
    for (const emotion of day.emotions.items) {
      const entry = counts.get(emotion.name) ?? { name: emotion.name, quadrant: emotion.quadrant, count: 0 }
      entry.count += 1
      counts.set(emotion.name, entry)
    }
  }
  return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, 4)
})
const commentedRows = computed(() => evidenceRows.value.filter(row => (objectComments.value[row.key] ?? '').trim()))
const filledAnchors = computed(() =>
  ANCHORS.map(anchor => ({ ...anchor, text: (promptResponses.value[anchor.key] ?? '').trim() })).filter(anchor => anchor.text),
)
const wordCount = computed(() => freeformReflection.value.trim().split(/\s+/).filter(Boolean).length)

const currentPair = computed(() => {
  const area = activeArea.value
  if (!area) return { load: null, state: null }
  return { load: toRating(ratingValue(area.fields.demands)), state: toRating(ratingValue(area.fields.state)) }
})
const currentPairRated = computed(() => currentPair.value.load != null && currentPair.value.state != null)
const tailPoints = computed<WeekPoint[]>(() => {
  const area = activeArea.value
  if (!area) return []
  const history = tailHistory.value?.[area.key] ?? []
  return [...history, { weekRef: props.weekRef, label: weekPointLabel(props.weekRef), ...currentPair.value }]
})

const areaTags = computed(() => (activeArea.value ? tagsFor(activeArea.value.key) : []))
const tagSuggestions = computed(() => recentTags.value.filter(tag => !areaTags.value.includes(tag)).slice(0, 8))

const summaryPriorities = computed<ReflectionPriorityLine[]>(() => {
  const bundle = dataBundle.value
  if (!bundle) return []
  const priorityKeys = new Set(topPriorityKeys.value)
  return bundle.weekObjectItems
    .filter(item => priorityKeys.has(item.key) || (objectComments.value[item.key] ?? '').trim().length > 0)
    .map(item => ({ title: item.subject.title, status: item.measurement.evaluationStatus, comment: objectComments.value[item.key] }))
})
const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'weekly',
    periodLabel: `${props.weekRef} · ${periodTitle.value}`,
    ratings: AREAS.flatMap(area => [
      { label: `${t(areaTitleKey(area.key))} · obciążenie`, value: ratingValue(area.fields.demands) },
      { label: `${t(areaTitleKey(area.key))} · stan`, value: ratingValue(area.fields.state) },
    ]),
    anchors: ANCHORS.map(anchor => ({ label: anchor.label, text: (promptResponses.value[anchor.key] ?? '').trim() })).filter(
      anchor => anchor.text.length > 0,
    ),
    freeform: freeformReflection.value,
    journalEntries: bundle?.journalEntries ?? [],
    emotionLogs: bundle?.emotionLogs ?? [],
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
    priorities: summaryPriorities.value,
  }
})

onMounted(async () => {
  // The ribbon's tail: the preceding weeks; the current week is appended live from the bars.
  const previousRefs = trailingWeekRefs(props.weekRef, TAIL_WEEKS).slice(0, -1)
  tailHistory.value = buildAreaSeries(await structuredReflectionDexieRepository.listWeeklyByRefs(previousRefs), previousRefs)
  // Tag suggestions come from the user's own recent weekly reflections; there is
  // no shared vocabulary for area tags.
  const all = await structuredReflectionDexieRepository.listWeekly()
  const seen: string[] = []
  for (const reflection of all.filter(item => item.weekRef !== props.weekRef).slice(-8).reverse()) {
    for (const area of AREAS) {
      for (const tag of parseTags(reflection.promptResponses[areaTagKey(area.key)])) {
        if (!seen.includes(tag)) seen.push(tag)
      }
    }
  }
  recentTags.value = seen.slice(0, 12)
})

function go(index: number) {
  current.value = Math.max(0, Math.min(steps.value.length - 1, index))
  saved.value = false
  if (current.value === 0) goToStep('review')
  else if (activeArea.value) goToStep(activeArea.value.key)
  else if (current.value === 5) goToStep('anchors')
  else goToStep('journal')
}

function ratingValue(key: WeeklyRatingKey): number | null {
  return ratingRefsByKey[key].value
}
function setRating(key: WeeklyRatingKey, value: number | null) {
  ratingRefsByKey[key].value = value
  saved.value = false
}

function tagsFor(areaKey: LifeAreaKey): string[] {
  return parseTags(promptResponses.value[areaTagKey(areaKey)])
}
function writeTags(areaKey: LifeAreaKey, tags: string[]) {
  promptResponses.value = { ...promptResponses.value, [areaTagKey(areaKey)]: serializeTags(tags) }
  saved.value = false
}
function commitTag(raw: string) {
  const area = activeArea.value
  if (!area) return
  const next = addTag(tagsFor(area.key), raw)
  writeTags(area.key, next)
  tagInput[area.key] = ''
  const tag = raw.trim().replace(/\s+/g, ' ')
  if (tag && !recentTags.value.includes(tag)) recentTags.value = [tag, ...recentTags.value].slice(0, 12)
}
function removeTag(tag: string) {
  const area = activeArea.value
  if (!area) return
  writeTags(
    area.key,
    tagsFor(area.key).filter(entry => entry !== tag),
  )
}

function setAnchor(key: string, event: Event) {
  promptResponses.value = { ...promptResponses.value, [key]: (event.target as HTMLTextAreaElement).value }
  saved.value = false
}
function setComment(key: string, event: Event) {
  objectComments.value = { ...objectComments.value, [key]: (event.target as HTMLTextAreaElement).value }
  saved.value = false
}

function journalTitles(dayIndex: number): string[] {
  return (dataBundle.value?.dailyBreakdown[dayIndex]?.journal.items ?? []).map(item => item.title)
}
function dayEmotions(dayIndex: number): Array<{ name: string; quadrant: Quadrant }> {
  return dataBundle.value?.dailyBreakdown[dayIndex]?.emotions.items ?? []
}
function cellTitle(cell: QuietEvidenceCell, index: number): string {
  const value = cell.value === null ? 'Brak zapisu' : formatQuietNumber(cell.value)
  return `${days.value[index]?.shortLabel}: ${value}${cell.planned ? ' · zaplanowane' : ''}`
}
function toneFor(key: string): 'met' | 'missed' | 'none' {
  const item = dataBundle.value?.weekObjectItems.find(entry => entry.key === key)
  const status = item?.measurement.evaluationStatus
  if (!status || status === 'no-data') return 'none'
  return status === 'met' ? 'met' : 'missed'
}
function insertIntoJournal(text: string) {
  freeformReflection.value = `${freeformReflection.value}${freeformReflection.value ? '\n\n' : ''}${text}\n`
}

async function finish() {
  await save()
  saved.value = true
  emit('updated')
}
async function finishAndPlanNext() {
  await save()
  saved.value = true
  emit('updated')
  emit('plan-next-week')
}
</script>
