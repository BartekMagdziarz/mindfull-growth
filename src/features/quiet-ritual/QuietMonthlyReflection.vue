<template>
  <QuietRitualShell
    scale="month"
    eyebrow="Refleksja miesiąca"
    :period-title="periodTitle"
    :steps="steps"
    :current="current"
    :wide="current === 3"
    :saving="isSaving"
    :finished="saved"
    :closing-period-start="getPeriodBounds(monthRef).start"
    :closing-period-end="getPeriodBounds(monthRef).end"
    finish-label="Zapisz refleksję"
    finished-label="Zapisano"
    alternate-label="Zapisz i zaplanuj kolejny miesiąc"
    @close="emit('close')"
    @go="go"
    @finish="finish"
    @alternate="finishAndPlanNext"
  >
    <!-- 1 · Priorytety — one direction open at a time -->
    <section v-if="current === 0" class="qm-priorities">
      <article v-for="priority in activePriorities" :key="priority.id" class="qm-priority">
        <button
          type="button"
          class="qm-priority-head"
          :aria-expanded="openPriority === priority.id"
          @click="openPriority = openPriority === priority.id ? '' : priority.id"
        >
          <AppIcon :name="priority.icon || 'explore'" /><strong>{{ priority.title }}</strong>
          <AppIcon v-if="selectedPriorityIds.includes(priority.id)" name="star" />
          <span v-if="assessmentFor(priority.id).effort != null"
            >{{ assessmentFor(priority.id).effort }}/5</span
          >
          <small v-if="assessmentFor(priority.id).verdict">{{
            VERDICT_LABEL[assessmentFor(priority.id).verdict ?? '']
          }}</small>
          <AppIcon name="expand_more" />
        </button>
        <div v-if="openPriority === priority.id" class="qm-priority-body">
          <QuietRatingBar
            :model-value="assessmentFor(priority.id).effort"
            label="Wysiłek"
            effort
            hint="Ile świadomej uwagi i energii poświęciłeś temu kierunkowi? To nie ocena rezultatu."
            @update:model-value="setEffort(priority.id, $event)"
          />
          <div class="qm-decisions">
            <div class="qm-verdicts" role="group" :aria-label="`Decyzja: ${priority.title}`">
              <button
                v-for="verdict in VERDICT_OPTIONS"
                :key="verdict"
                type="button"
                class="qr-quiet"
                :aria-pressed="assessmentFor(priority.id).verdict === verdict"
                @click="setVerdict(priority.id, verdict)"
              >
                {{ VERDICT_LABEL[verdict] }}
              </button>
            </div>
            <textarea
              class="qm-note"
              :value="assessmentFor(priority.id).note"
              rows="3"
              placeholder="Dlaczego taka decyzja?"
              :aria-label="`Uzasadnienie: ${priority.title}`"
              @input="setNote(priority.id, $event)"
            />
            <button
              type="button"
              class="qr-quiet qm-reveal"
              :aria-expanded="contextPriority === priority.id"
              @click="contextPriority = contextPriority === priority.id ? '' : priority.id"
            >
              <AppIcon name="expand_more" />Kontekst kierunku
            </button>
          </div>

          <div v-if="contextPriority === priority.id" class="qm-priority-context">
            <p v-if="priority.desiredDirection" class="qm-direction">
              {{ priority.desiredDirection }}
            </p>
            <ul class="qr-ctx-chips qr-ctx-actions" aria-label="Zapis miesiąca">
              <li
                class="qr-ctx-action"
                :class="focusWeekCount(priority.id) ? 'qr-ctx-action--met' : 'qr-ctx-action--none'"
              >
                <AppIcon name="calendar_view_week" /><span>Fokus tygodnia</span
                ><b>{{ focusWeekCount(priority.id) }}×</b>
              </li>
              <li
                v-for="entry in evidenceFor(priority.id)"
                :key="entry.key"
                :class="`qr-ctx-action qr-ctx-action--${entry.tone}`"
                :title="entry.title"
              >
                <AppIcon :name="entry.icon" /><span>{{ entry.title }}</span
                ><b>{{ entry.readout }}</b>
              </li>
            </ul>
            <template v-for="kind in SIGNAL_KINDS" :key="kind.key">
              <div v-if="signalChips(priority, kind.key).length" class="qm-signal-row">
                <span class="qm-signal-label">{{ kind.label }}</span>
                <div
                  class="qm-signals"
                  role="group"
                  :aria-label="`${kind.label}: ${priority.title}`"
                >
                  <button
                    v-for="chip in signalChips(priority, kind.key)"
                    :key="chip.label"
                    type="button"
                    class="qr-quiet"
                    :aria-pressed="chip.active"
                    @click="toggleObservedSignal(priority.id, kind.key, chip.label)"
                  >
                    {{ chip.label }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </article>
      <p v-if="!activePriorities.length" class="qr-empty">
        Brak kierunków. Możesz przejść do kompasu miesiąca.
      </p>
    </section>

    <!-- 2 · Kompas -->
    <section v-else-if="current === 1" class="qm-compass">
      <QuietRatingBar
        v-for="axis in COMPASS"
        :key="axis.key"
        :label="axis.label"
        :hint="axis.hint"
        compact
        :model-value="axis.ref.value"
        :previous="previousCompass[axis.key] ?? null"
        previous-label="Poprzedni miesiąc"
        @update:model-value="setCompass(axis, $event)"
      >
        <QuietTagField
          :model-value="axisTags(axis.key)"
          :suggestions="axisTagSuggestions(axis.key)"
          :label="axis.label"
          @update:model-value="writeAxisTags(axis.key, $event)"
        />
      </QuietRatingBar>
    </section>

    <!-- 3 · Kotwice -->
    <section v-else-if="current === 2" class="qm-anchors">
      <article v-for="(anchor, index) in ANCHORS" :key="anchor.key">
        <button
          type="button"
          class="qm-anchor-head"
          :aria-expanded="openAnchor === index"
          @click="openAnchor = openAnchor === index ? null : index"
        >
          <AppIcon :name="anchor.icon" /><strong>{{ anchor.label }}</strong
          ><AppIcon name="expand_more" />
        </button>
        <textarea
          v-if="openAnchor === index"
          :value="promptResponses[anchor.key] ?? ''"
          :aria-label="anchor.label"
          rows="4"
          placeholder="Zapisz własnymi słowami…"
          @input="setAnchor(anchor.key, $event)"
        />
        <p v-else-if="promptResponses[anchor.key]">{{ promptResponses[anchor.key] }}</p>
      </article>
    </section>

    <!-- 4 · Dziennik -->
    <section v-else class="qm-journal" :class="{ 'qm-journal--open': contextOpen || aiOpen }">
      <div>
        <textarea
          v-model="freeformReflection"
          aria-label="Refleksja miesiąca"
          rows="13"
          placeholder="Co chcesz zapamiętać z tego miesiąca?"
        />
        <div class="qm-journal-tools">
          <small>{{ wordCount }} {{ plural(wordCount, 'słowo', 'słowa', 'słów') }}</small>
          <button
            type="button"
            class="qr-quiet"
            :aria-expanded="contextOpen"
            @click="toggleSidePanel('context')"
          >
            <AppIcon name="view_sidebar" />Kontekst
          </button>
          <button
            type="button"
            class="qr-quiet"
            :aria-expanded="aiOpen"
            @click="toggleSidePanel('ai')"
          >
            <AppIcon name="auto_awesome" />AI
          </button>
        </div>
        <details v-if="aiSummary" class="qr-context">
          <summary>Wcześniejsze podsumowanie AI</summary>
          <p>{{ aiSummary }}</p>
          <button type="button" class="qr-quiet" @click="insertIntoJournal(aiSummary)">
            Dodaj podsumowanie do wpisu
          </button>
        </details>
      </div>

      <ReflectionCompanionPanel
        v-if="aiOpen"
        nested
        :key="monthRef"
        surface="monthly-reflection"
        :period-ref="monthRef"
        :draft="freeformReflection"
        :ritual-context="companionRitualContext"
        @insert="insertIntoJournal"
      />

      <aside v-if="contextOpen" class="qm-context qr-context-col" aria-label="Kontekst miesiąca">
        <section v-if="assessedPriorities.length" class="qr-ctx">
          <h3>Kierunki</h3>
          <ul class="qm-ctx-dirs">
            <li v-for="priority in assessedPriorities" :key="priority.id">
              <button
                type="button"
                class="qm-ctx-dir"
                :title="`Wróć do: ${priority.title}`"
                @click="editPriority(priority.id)"
              >
                <AppIcon :name="priority.icon || 'explore'" />
                <span class="qm-ctx-dir__title">{{ priority.title }}</span>
                <i
                  class="qm-ctx-effort"
                  role="img"
                  :aria-label="`Wysiłek: ${assessmentFor(priority.id).effort ?? 'bez oceny'}`"
                >
                  <b
                    v-for="n in 5"
                    :key="n"
                    :class="{ filled: (assessmentFor(priority.id).effort ?? 0) >= n }"
                  />
                </i>
                <small v-if="assessmentFor(priority.id).verdict">{{
                  VERDICT_LABEL[assessmentFor(priority.id).verdict ?? '']
                }}</small>
              </button>
              <q v-if="assessmentFor(priority.id).note.trim()">{{
                assessmentFor(priority.id).note.trim()
              }}</q>
              <ul
                v-if="
                  assessmentFor(priority.id).observedProgressSignals.length ||
                  assessmentFor(priority.id).observedRiskSignals.length
                "
                class="qr-ctx-chips qm-ctx-signals"
              >
                <li
                  v-for="signal in assessmentFor(priority.id).observedProgressSignals"
                  :key="`p:${signal}`"
                  class="qm-ctx-signal--progress"
                >
                  {{ signal }}
                </li>
                <li
                  v-for="signal in assessmentFor(priority.id).observedRiskSignals"
                  :key="`r:${signal}`"
                  class="qm-ctx-signal--risk"
                >
                  {{ signal }}
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <section v-if="COMPASS.some(axis => axis.ref.value != null)" class="qr-ctx">
          <h3>Kompas</h3>
          <div class="qm-ctx-compass" role="group" aria-label="Kompas miesiąca">
            <div v-for="axis in COMPASS" :key="axis.key" class="qm-ctx-axis">
              <button
                type="button"
                class="qm-ctx-axis__bar"
                :title="`Wróć do kompasu: ${axis.label}`"
                @click="go(1)"
              >
                <span class="qm-ctx-axis__col">
                  <b>{{ axis.ref.value ?? '' }}</b>
                  <i
                    :style="{ height: `${Math.max(4, (axis.ref.value ?? 0) * 11)}px` }"
                    :class="{ empty: axis.ref.value == null }"
                  />
                </span>
                <small>{{ axis.label }}</small>
              </button>
              <button
                v-if="axisTags(axis.key).length"
                type="button"
                class="qr-icon qm-ctx-axis__toggle"
                :aria-expanded="compassTagsAxis === axis.key"
                :aria-label="`Tagi: ${axis.label}`"
                @click="compassTagsAxis = compassTagsAxis === axis.key ? '' : axis.key"
              >
                <AppIcon name="expand_more" />
              </button>
            </div>
            <ul
              v-if="compassTagsAxis && axisTags(compassTagsAxis).length"
              class="qr-ctx-chips qm-ctx-tags"
              :aria-label="`Tagi: ${compassAxisLabel(compassTagsAxis)}`"
            >
              <li v-for="tag in axisTags(compassTagsAxis)" :key="tag">{{ tag }}</li>
            </ul>
          </div>
        </section>

        <section v-if="emotionTotal" class="qr-ctx">
          <h3>
            Emocje <small>{{ emotionTotal }}</small>
          </h3>
          <ul class="qm-emotion-weeks" aria-label="Emocje w tygodniach miesiąca">
            <li v-for="week in emotionWeeks" :key="week.weekRef">
              <QuietEmotionStack
                :emotions="week.emotions"
                :slot-label="week.range"
                :max-height="52"
              />
              <small>{{ week.dateLabel }}</small>
            </li>
          </ul>
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
        </section>

        <section v-if="filledAnchors.length" class="qr-ctx">
          <h3>Kotwice</h3>
          <ul class="qr-ctx-quotes">
            <li v-for="anchor in filledAnchors" :key="anchor.key">
              <button type="button" @click="editAnchor(anchor.key)">
                <AppIcon :name="anchor.icon" /><small>{{ anchor.label }}</small>
              </button>
              <q>{{ anchor.text }}</q>
            </li>
          </ul>
        </section>

        <section v-if="weeklyExcerpts.length || weekSeriesRated" class="qr-ctx">
          <h3>Z tygodni</h3>
          <div
            v-if="weekSeriesRated"
            class="qm-ctx-weeks"
            aria-label="Obciążenie i stan w tygodniach miesiąca"
          >
            <div v-for="area in AREAS" :key="area.key" class="qm-ctx-weeks__row">
              <span class="qm-ctx-weeks__area"
                ><b>{{ t(areaTitleKey(area.key)) }}</b
                ><AppIcon :name="area.icon"
              /></span>
              <LoadStateRibbon
                :points="weekSeries[area.key]"
                :label="t(areaTitleKey(area.key))"
                :height="56"
                quiet
                @select="weekRef => emit('open-week', weekRef)"
              />
            </div>
            <div class="qm-ctx-weeks__row qm-ctx-weeks__axis" aria-hidden="true">
              <span />
              <span class="qm-ctx-weeks__dates"
                ><span v-for="week in weekAxis" :key="week.weekRef">{{
                  week.dateLabel
                }}</span></span
              >
            </div>
          </div>
          <ul v-if="weeklyExcerpts.length" class="qr-ctx-quotes">
            <li v-for="excerpt in weeklyExcerpts" :key="excerpt.weekRef">
              <button
                type="button"
                :title="`Otwórz tydzień ${excerpt.label}`"
                @click="emit('open-week', excerpt.weekRef)"
              >
                <AppIcon name="calendar_view_week" /><small>{{ excerpt.label }}</small
                ><AppIcon name="arrow_forward" />
              </button>
              <q :class="{ 'qm-clamp': !expandedExcerpts.has(excerpt.weekRef) }">{{
                excerpt.text
              }}</q>
              <button
                v-if="excerpt.text.length > 220"
                type="button"
                class="qm-ctx-more"
                :aria-expanded="expandedExcerpts.has(excerpt.weekRef)"
                @click="toggleExcerpt(excerpt.weekRef)"
              >
                {{ expandedExcerpts.has(excerpt.weekRef) ? 'Mniej' : 'Więcej' }}
              </button>
            </li>
          </ul>
        </section>

        <section v-if="objectEvidence.length" class="qr-ctx">
          <h3>
            Obiekty <small>{{ objectEvidence.length }}</small>
          </h3>
          <ul class="qr-ctx-chips qr-ctx-actions">
            <li
              v-for="entry in objectEvidence"
              :key="entry.key"
              :class="`qr-ctx-action qr-ctx-action--${entry.tone}`"
              :title="entry.title"
            >
              <AppIcon :name="entry.icon" /><span>{{ entry.title }}</span
              ><b>{{ entry.readout }}</b>
            </li>
          </ul>
        </section>
      </aside>
    </section>
    <template #top
      ><ProfileProposalNotice :conversation-id="`monthly-reflection:${monthRef}`"
    /></template>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch, type Ref } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementEvaluationStatus } from '@/services/measurementProgress'
import type { WeekReadout } from '@/services/reflectionDataQueries'
import type { Quadrant } from '@/domain/emotion'
import type { Priority } from '@/domain/planning'
import type { PriorityVerdict } from '@/domain/planningState'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useMonthlyReflectionWizard } from '@/composables/useMonthlyReflectionWizard'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { type ReflectionPriorityLine } from '@/services/reflectionSummaryService'
import { getPeriodBounds, getPreviousPeriod } from '@/utils/periods'
import QuietEmotionStack from './QuietEmotionStack.vue'
import ProfileProposalNotice from '@/features/ai-profile/ProfileProposalNotice.vue'
import ReflectionCompanionPanel from '@/features/ai-companion/ReflectionCompanionPanel.vue'
import QuietRatingBar from './QuietRatingBar.vue'
import QuietTagField from './QuietTagField.vue'
import QuietRitualShell, { type QuietRitualStep } from './QuietRitualShell.vue'
import {
  allAreaTags,
  areaTagKey,
  formatDay,
  formatQuietNumber,
  monthTitle,
  parseTags,
  plural,
  quietMonthAreaSeries,
  quietMonthWeeks,
  serializeTags,
} from './quietRitualModel'
import LoadStateRibbon from '@/components/shared/charts/LoadStateRibbon.vue'
import { useT } from '@/composables/useT'
import { REFLECTION_MATRIX_AREAS, areaTitleKey } from '@/domain/reflectionMatrix'

const props = defineProps<{ monthRef: MonthRef }>()
const emit = defineEmits<{
  close: []
  updated: []
  'plan-next-month': []
  'open-week': [weekRef: WeekRef]
}>()

const {
  dataBundle,
  activePriorities,
  selectedPriorityIds,
  assessmentFor,
  updateAssessment,
  toggleObservedSignal,
  focusConfrontation,
  balanceRating,
  purposeRating,
  growthRating,
  coherenceRating,
  agencyRating,
  promptResponses,
  freeformReflection,
  aiSummary,
  isSaving,
  save,
  goToStep,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

interface CompassAxis {
  key: 'balance' | 'purpose' | 'growth' | 'coherence' | 'agency'
  label: string
  hint: string
  ref: Ref<number | null>
}

/**
 * Compass labels stay the product's own (Spójność / Sprawczość). The Lab
 * proposed renaming them to "Zasady / Wpływ"; the keys and the stored meaning
 * are unchanged either way, so the rename is a separate decision.
 */
const COMPASS: CompassAxis[] = [
  {
    key: 'balance',
    label: 'Balans',
    hint: 'Miejsce na działanie i odpoczynek.',
    ref: balanceRating,
  },
  { key: 'purpose', label: 'Sens', hint: 'Kontakt z tym, co naprawdę ważne.', ref: purposeRating },
  {
    key: 'growth',
    label: 'Rozwój',
    hint: 'Uczenie się i poszerzanie możliwości.',
    ref: growthRating,
  },
  {
    key: 'coherence',
    label: 'Spójność',
    hint: 'Zgodność działań z własnymi kierunkami i wartościami.',
    ref: coherenceRating,
  },
  {
    key: 'agency',
    label: 'Sprawczość',
    hint: 'Poczucie wyboru i możliwości działania.',
    ref: agencyRating,
  },
]

const ANCHORS = [
  { key: 'proudOf', label: 'Z czego jestem dumny', icon: 'workspace_premium' },
  { key: 'challenges', label: 'Największe wyzwania', icon: 'mountain_flag' },
  { key: 'growth', label: 'Jak się rozwinąłem', icon: 'trending_up' },
]
const VERDICT_OPTIONS: PriorityVerdict[] = ['continue', 'adjust', 'pause', 'drop']
const VERDICT_LABEL: Record<string, string> = {
  continue: 'Kontynuuj',
  adjust: 'Dostosuj',
  pause: 'Wstrzymaj',
  drop: 'Porzuć',
}
const SIGNAL_KINDS = [
  { key: 'progress' as const, label: 'Postęp' },
  { key: 'risk' as const, label: 'Ryzyko' },
]
type EvidenceTone = 'met' | 'missed' | 'none'
interface EvidenceEntry {
  key: string
  title: string
  readout: string
  icon: string
  tone: EvidenceTone
}

const steps: QuietRitualStep[] = [
  { id: 'priorities', label: 'Priorytety', question: 'Jaką uwagę poświęciłeś swoim kierunkom?' },
  { id: 'compass', label: 'Kompas', question: 'Jakiego miesiąca doświadczyłeś?' },
  { id: 'anchors', label: 'Kotwice', question: 'Co warto zapamiętać?' },
  { id: 'journal', label: 'Dziennik', question: 'Zamknij miesiąc własnymi słowami' },
]

const current = ref(0)
const openPriority = ref('')
/** Which direction has its "Kontekst kierunku" open (one at a time, like the directions themselves). */
const contextPriority = ref('')
/** Compass axis whose tags are unfolded in the journal context ('' = none). */
const compassTagsAxis = ref('')
/** Weekly excerpts unclamped by the user in the journal context. */
const expandedExcerpts = ref(new Set<WeekRef>())
/** Earlier compass tags, per axis (most recent month first) — the re-use pool. */
const pastAxisTags = ref<Record<string, string[]>>({})
/** Tags from the user's weekly area reflections — a secondary pool. */
const pastWeeklyTags = ref<string[]>([])
const openAnchor = ref<number | null>(0)
const contextOpen = ref(false)
const aiOpen = ref(false)
function toggleSidePanel(panel: 'context' | 'ai') {
  if (panel === 'ai') {
    aiOpen.value = !aiOpen.value
    contextOpen.value = false
  } else {
    contextOpen.value = !contextOpen.value
    aiOpen.value = false
  }
}
const saved = ref(false)
const previousCompass = ref<Partial<Record<CompassAxis['key'], number | null>>>({})
/** `subjectType:id` → linked priority ids (key results inherit their goal's). */
const priorityIdsBySubject = ref(new Map<string, string[]>())

const periodTitle = computed(() => monthTitle(props.monthRef))
const weeks = computed(() => quietMonthWeeks(props.monthRef))
const { t } = useT()
const AREAS = REFLECTION_MATRIX_AREAS
const weekSeries = computed(() =>
  quietMonthAreaSeries(weeks.value, dataBundle.value?.weeklyReflectionDetails ?? [])
)
const weekSeriesRated = computed(() =>
  AREAS.some(area =>
    weekSeries.value[area.key].some(point => point.load != null && point.state != null)
  )
)
const wordCount = computed(
  () => freeformReflection.value.trim().split(/\s+/).filter(Boolean).length
)
const filledAnchors = computed(() =>
  ANCHORS.map(anchor => ({
    ...anchor,
    text: (promptResponses.value[anchor.key] ?? '').trim(),
  })).filter(anchor => anchor.text)
)
const assessedPriorities = computed(() =>
  activePriorities.value.filter(priority => {
    const assessment = assessmentFor(priority.id)
    return (
      assessment.effort != null ||
      assessment.verdict != null ||
      assessment.note.trim().length > 0 ||
      assessment.observedProgressSignals.length > 0 ||
      assessment.observedRiskSignals.length > 0
    )
  })
)
const focusByPriority = computed(
  () => new Map((focusConfrontation.value?.perPriority ?? []).map(item => [item.priorityId, item]))
)

/** Object read-outs for the month, reused by the direction context and the journal panel. */
const objectEvidence = computed<EvidenceEntry[]>(() => {
  const bundle = dataBundle.value
  if (!bundle) return []
  return [
    ...bundle.goalSummaries.flatMap(goal =>
      goal.keyResults.map(result => ({
        key: `keyResult:${result.id}`,
        title: result.title,
        readout: result.weekReadout
          ? weekReadout(result.weekReadout)
          : readout(result.actualValue, result.target?.value),
        icon: goal.goal.icon ?? 'flag',
        tone: result.weekReadout ? weekTone(result.weekReadout) : toneFor(result.evaluationStatus),
      }))
    ),
    ...bundle.habitDetails.map(habit => ({
      key: `habit:${habit.id}`,
      title: habit.title,
      readout: habit.weekReadout
        ? weekReadout(habit.weekReadout)
        : readout(habit.actualValue, habit.target?.value),
      icon: habit.icon ?? 'repeat',
      tone: habit.weekReadout ? weekTone(habit.weekReadout) : toneFor(habit.evaluationStatus),
    })),
    ...bundle.trackerDetails.map(tracker => ({
      key: `tracker:${tracker.id}`,
      title: tracker.title,
      readout:
        tracker.latestValue == null
          ? 'Brak zapisów'
          : `ostatnio ${formatQuietNumber(tracker.latestValue)}`,
      icon: tracker.icon ?? 'monitoring',
      tone: 'none' as const,
    })),
  ].filter(entry => entry.readout !== 'Brak zapisów')
})

const weeklyExcerpts = computed(() =>
  (dataBundle.value?.weeklyReflectionDetails ?? [])
    .filter(detail => detail.freeformReflection.trim().length > 0)
    .map(detail => ({
      weekRef: detail.weekRef,
      label: weeks.value.find(week => week.weekRef === detail.weekRef)?.range ?? detail.weekRef,
      text: detail.freeformReflection,
    }))
)

const emotionTotal = computed(() => dataBundle.value?.emotionSummary.totalLogs ?? 0)
const topEmotions = computed(() => (dataBundle.value?.emotionSummary.topEmotions ?? []).slice(0, 5))
/** Week starts as short dates — „T37” says nothing about when the week was. */
const weekAxis = computed(() =>
  weeks.value.map(week => ({ ...week, dateLabel: formatDay(getPeriodBounds(week.weekRef).start) }))
)
/**
 * Each week of the month as a stack of its logged emotions coloured by wheel
 * quadrant (the bundle resolves a quadrant per logged emotion), so the month
 * reads as a rhythm of colours rather than a count.
 */
const emotionWeeks = computed(() => {
  const logs = dataBundle.value?.emotionLogs ?? []
  return weekAxis.value.map(week => {
    const bounds = getPeriodBounds(week.weekRef)
    const emotions = logs
      .filter(log => {
        const dayRef = log.createdAt.slice(0, 10)
        return dayRef >= bounds.start && dayRef <= bounds.end
      })
      .flatMap(log =>
        log.emotions.map((name, index) => ({ name, quadrant: log.quadrants?.[index] }))
      )
      .filter((entry): entry is { name: string; quadrant: Quadrant } => !!entry.quadrant)
    return { ...week, emotions }
  })
})

const summaryPriorities = computed<ReflectionPriorityLine[]>(() =>
  assessedPriorities.value.map(priority => {
    const assessment = assessmentFor(priority.id)
    return {
      title: priority.title,
      effort: assessment.effort,
      verdict: assessment.verdict,
      comment: assessment.note.trim() || undefined,
    }
  })
)
// Only the user's current answers enter directly. Historical excerpts and execution
// must go through access-controlled tools, never through an unfiltered UI bundle.
const companionRitualContext = computed(() =>
  JSON.stringify({
    ratings: COMPASS.map(axis => ({ label: axis.label, value: axis.ref.value })),
    priorities: summaryPriorities.value,
    anchors: filledAnchors.value.map(anchor => ({ label: anchor.label, text: anchor.text })),
  })
)

// Directions arrive asynchronously; open the first one as soon as they land.
watch(
  activePriorities,
  list => {
    if (!openPriority.value && list.length) openPriority.value = list[0].id
  },
  { immediate: true }
)

onMounted(async () => {
  const previous = await structuredReflectionDexieRepository.getMonthly(
    getPreviousPeriod(props.monthRef) as MonthRef
  )
  if (previous) {
    previousCompass.value = {
      balance: previous.balanceRating,
      purpose: previous.purposeRating,
      growth: previous.growthRating,
      coherence: previous.coherenceRating,
      agency: previous.agencyRating,
    }
  }
  await loadPriorityLinks()
  await loadPastTags()
})

/**
 * The re-use pool for compass tags: the user's own earlier months (same axis
 * first, newest first), then their weekly area tags. No shared vocabulary.
 */
async function loadPastTags() {
  const [months, weeksAll] = await Promise.all([
    structuredReflectionDexieRepository.listMonthly(),
    structuredReflectionDexieRepository.listWeekly(),
  ])
  const perAxis: Record<string, string[]> = {}
  for (const month of months
    .filter(item => item.monthRef !== props.monthRef)
    .sort((a, b) => (a.monthRef < b.monthRef ? 1 : -1))) {
    for (const axis of COMPASS) {
      const list = (perAxis[axis.key] ??= [])
      for (const tag of parseTags(month.promptResponses[areaTagKey(axis.key)]))
        if (!list.includes(tag)) list.push(tag)
    }
  }
  pastAxisTags.value = perAxis
  const weekly: string[] = []
  for (const week of weeksAll.slice(-12).reverse()) {
    for (const area of AREAS) {
      for (const tag of allAreaTags(week.promptResponses, area.key))
        if (!weekly.includes(tag)) weekly.push(tag)
    }
  }
  pastWeeklyTags.value = weekly
}

async function loadPriorityLinks() {
  const [goals, keyResults, habits, trackers] = await Promise.all([
    goalDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
  ])
  const byGoal = new Map(goals.map(goal => [goal.id, goal.priorityIds ?? []]))
  priorityIdsBySubject.value = new Map([
    ...keyResults.map(
      result => [`keyResult:${result.id}`, byGoal.get(result.goalId) ?? []] as const
    ),
    ...habits.map(habit => [`habit:${habit.id}`, habit.priorityIds ?? []] as const),
    ...trackers.map(tracker => [`tracker:${tracker.id}`, tracker.priorityIds ?? []] as const),
  ])
}

function go(index: number) {
  current.value = Math.max(0, Math.min(steps.length - 1, index))
  saved.value = false
  goToStep(
    current.value === 0
      ? 'priorities-review'
      : current.value === 1
        ? 'ratings'
        : current.value === 2
          ? 'anchors'
          : 'journal'
  )
}

function readout(actual: number | undefined, target: number | undefined): string {
  if (actual === undefined) return 'Brak zapisów'
  return target === undefined
    ? formatQuietNumber(actual)
    : `${formatQuietNumber(actual)} / ${formatQuietNumber(target)}`
}

/** Weekly-cadence objects read as weeks met / weeks planned („3 / 4 tyg.”). */
function weekReadout(value: WeekReadout): string {
  return `${value.met} / ${value.planned} tyg.`
}
function weekTone(value: WeekReadout): EvidenceTone {
  if (value.met === 0) return 'none'
  return value.met >= value.planned ? 'met' : 'missed'
}
function toneFor(status: MeasurementEvaluationStatus | undefined): EvidenceTone {
  if (!status || status === 'no-data') return 'none'
  return status === 'met' ? 'met' : 'missed'
}

function axisTags(axisKey: string): string[] {
  return parseTags(promptResponses.value[areaTagKey(axisKey)])
}
function writeAxisTags(axisKey: string, tags: string[]) {
  promptResponses.value = { ...promptResponses.value, [areaTagKey(axisKey)]: serializeTags(tags) }
  saved.value = false
}
/** Same axis in earlier months → other axes this month → other axes earlier → weekly area tags. */
function axisTagSuggestions(axisKey: string): string[] {
  const seen: string[] = []
  const push = (tags: string[]) => {
    for (const tag of tags) if (!seen.includes(tag)) seen.push(tag)
  }
  push(pastAxisTags.value[axisKey] ?? [])
  for (const axis of COMPASS) if (axis.key !== axisKey) push(axisTags(axis.key))
  for (const [key, tags] of Object.entries(pastAxisTags.value)) if (key !== axisKey) push(tags)
  push(pastWeeklyTags.value)
  return seen
}

function compassAxisLabel(axisKey: string): string {
  return COMPASS.find(axis => axis.key === axisKey)?.label ?? ''
}
function editPriority(priorityId: string) {
  openPriority.value = priorityId
  go(0)
}
function toggleExcerpt(weekRef: WeekRef) {
  const next = new Set(expandedExcerpts.value)
  if (next.has(weekRef)) next.delete(weekRef)
  else next.add(weekRef)
  expandedExcerpts.value = next
}

function focusWeekCount(priorityId: string): number {
  return focusByPriority.value.get(priorityId)?.focusWeekRefs.length ?? 0
}

function evidenceFor(priorityId: string): EvidenceEntry[] {
  const linked = objectEvidence.value.filter(entry =>
    (priorityIdsBySubject.value.get(entry.key) ?? []).includes(priorityId)
  )
  if (linked.length) return linked
  // Fall back to the weekly focus roll-up: objects the user actually picked for
  // this direction, even when the object itself carries no priority link.
  return (focusByPriority.value.get(priorityId)?.objects ?? []).map(object => ({
    key: `${object.subjectType}:${object.subjectId}`,
    title: object.title,
    readout: `${object.weekRefs.length} ${plural(object.weekRefs.length, 'tydzień', 'tygodnie', 'tygodni')}`,
    icon: 'star',
    tone: 'none' as const,
  }))
}

/**
 * Chips = the priority's currently-defined signals unioned with any already
 * checked, so a chip stays visible in history after the signal is removed.
 */
function signalChips(
  priority: Priority,
  kind: 'progress' | 'risk'
): Array<{ label: string; active: boolean }> {
  const defined = kind === 'progress' ? priority.progressSignals : priority.riskSignals
  const assessment = assessmentFor(priority.id)
  const observed =
    kind === 'progress' ? assessment.observedProgressSignals : assessment.observedRiskSignals
  return [...new Set([...(defined ?? []), ...observed])].map(label => ({
    label,
    active: observed.includes(label),
  }))
}

function setEffort(priorityId: string, value: number | null) {
  updateAssessment(priorityId, { effort: value })
  saved.value = false
}
function setVerdict(priorityId: string, verdict: PriorityVerdict) {
  updateAssessment(priorityId, {
    verdict: assessmentFor(priorityId).verdict === verdict ? null : verdict,
  })
  saved.value = false
}
function setNote(priorityId: string, event: Event) {
  updateAssessment(priorityId, { note: (event.target as HTMLTextAreaElement).value })
  saved.value = false
}
function setCompass(axis: CompassAxis, value: number | null) {
  axis.ref.value = value
  saved.value = false
}
function setAnchor(key: string, event: Event) {
  promptResponses.value = {
    ...promptResponses.value,
    [key]: (event.target as HTMLTextAreaElement).value,
  }
  saved.value = false
}
function editAnchor(key: string) {
  openAnchor.value = ANCHORS.findIndex(anchor => anchor.key === key)
  go(2)
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
  emit('plan-next-month')
}
</script>

<style scoped>
:global(.planning-next:has(.quiet-ritual.qm)) {
  min-width: 0;
  height: auto;
}
:global(main:has(.quiet-ritual.qm)) {
  min-width: 0;
}
.quiet-ritual.qm {
  min-width: 0;
  max-width: 100%;
}
.qm-journal > * {
  min-width: 0;
}
</style>
