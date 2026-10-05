<template>
  <QuietRitualShell
    scale="week"
    eyebrow="Refleksja tygodnia"
    :period-title="periodTitle"
    :steps="steps"
    :current="current"
    :wide="currentStepId === 'review' || currentStepId === 'journal'"
    :saving="isSaving"
    :finished="saved"
    :closing-period-start="getPeriodBounds(weekRef).start"
    :closing-period-end="getPeriodBounds(weekRef).end"
    finish-label="Zapisz refleksję"
    finished-label="Zapisano"
    alternate-label="Zapisz i zaplanuj kolejny tydzień"
    @close="emit('close')"
    @go="go"
    @finish="finish"
    @alternate="finishAndPlanNext"
  >
    <!-- 1 · Przegląd — what actually happened, day by day -->
    <section v-if="currentStepId === 'review'" class="qr-evidence">
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
          <span>{{ t(areaTitleKey(activeArea.key)) }}</span>
        </header>
        <LoadStateRibbon :points="tailPoints" :label="t(areaTitleKey(activeArea.key))" :height="60" show-axis />
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
        >
          <QuietTagField
            :model-value="axisTags(activeArea.key, 'load')"
            :suggestions="axisTagSuggestions(activeArea.key, 'load')"
            :label="`${t(areaTitleKey(activeArea.key))} · ${t('planning.reflection.weekly.groups.load.title')}`"
            @update:model-value="writeAxisTags(activeArea.key, 'load', $event)"
          />
        </QuietRatingBar>
        <QuietRatingBar
          :model-value="ratingValue(activeArea.fields.state)"
          :label="t('planning.reflection.weekly.groups.state.title')"
          :hint="tg(cellQuestionKey(activeArea.key, 'state'))"
          :high-label="t(cellAnchorKey(activeArea.key, 'state', 'high'))"
          :low-label="t(cellAnchorKey(activeArea.key, 'state', 'low'))"
          :fill-color="currentPairRated ? pairColor(currentPair.load, currentPair.state) : null"
          @update:model-value="setRating(activeArea.fields.state, $event)"
        >
          <QuietTagField
            :model-value="axisTags(activeArea.key, 'state')"
            :suggestions="axisTagSuggestions(activeArea.key, 'state')"
            :label="`${t(areaTitleKey(activeArea.key))} · ${t('planning.reflection.weekly.groups.state.title')}`"
            @update:model-value="writeAxisTags(activeArea.key, 'state', $event)"
          />
        </QuietRatingBar>
      </div>
      <!-- Tags written before the load/state split stay visible with the week they belong to. -->
      <p v-if="legacyTags(activeArea.key).length" class="qr-legacy-tags">
        <AppIcon name="sell" />{{ legacyTags(activeArea.key).join(', ') }}
      </p>
    </section>

    <!-- Ścieżka — one block per program with a weekly reflection (plan §5) -->
    <section v-else-if="currentStepId === 'path'" class="qr-path-step">
      <article v-for="block in pathBlocks" :key="block.enrollment.id" class="qr-path-block">
        <header class="qr-path-block__head">
          <AppIcon :name="block.program.icon" />
          <strong>{{ t(`${block.program.i18nKey}.title`) }}</strong>
          <span v-if="block.phase">· {{ t(`${block.program.i18nKey}.phases.${block.phase.key}.title`) }}</span>
        </header>

        <div class="qr-path-block__task">
          <template v-if="block.intention">
            <span class="qr-path-block__task-title">{{ block.intention.title }}</span>
            <span class="qr-path-block__task-count">
              {{
                t('programs.week.doneOf', {
                  done: block.doneCount,
                  target: block.intention.target.value ?? 1,
                })
              }}
            </span>
          </template>
          <span v-else-if="block.entry" class="qr-path-block__task-muted">{{ t('programs.week.declinedThisWeek') }}</span>
          <span v-else class="qr-path-block__task-muted">{{ t('programs.week.noTaskThisWeek') }}</span>
        </div>

        <!-- Shame path: this week next to the previous one (who took the wheel), then the
             moments you did not log — the estimate the glance draws as an outline (plan v3 §P2). -->
        <template v-if="block.program.momentKind === 'shame'">
          <PathMomentsGlance :stats="glanceStats(block)" :first-week="glanceFirstWeek(block)" compact />
          <div class="qr-path-pattern">
            <button
              type="button"
              class="qr-path-block__toggle"
              :disabled="patternLoading[block.enrollment.id]"
              data-testid="path-week-pattern"
              @click="requestPattern(block)"
            >
              <AppIcon name="auto_awesome" />
              {{ patternLoading[block.enrollment.id] ? t('programs.pattern.loading') : t('programs.pattern.cta') }}
            </button>
            <p v-if="patterns[block.enrollment.id]" class="qr-path-pattern__text">
              <small>{{ t('programs.pattern.label') }}</small>
              {{ patterns[block.enrollment.id] }}
            </p>
            <p v-else-if="patternErrors[block.enrollment.id]" class="qr-path-pattern__text qr-path-pattern__text--error">{{ patternErrors[block.enrollment.id] }}</p>
          </div>
          <div class="qr-path-block__unlogged">
            <span>{{ tg('programs.week.unloggedQuestion') }}</span>
            <div class="qr-path-chips" role="group" :aria-label="tg('programs.week.unloggedQuestion')">
              <button
                v-for="option in UNLOGGED_OPTIONS"
                :key="option"
                type="button"
                :aria-pressed="unloggedValue(block) === option"
                @click="setUnlogged(block, option)"
              >
                {{ t(`programs.week.unloggedOptions.${option}`) }}
              </button>
            </div>
          </div>
        </template>

        <!-- The week's moments of this path's kind: context for the phase question (plan v2 §6). -->
        <div v-if="weekMoments(block).length" class="qr-path-moments">
          <button type="button" class="qr-path-block__toggle" :aria-controls="`path-moments-${block.enrollment.id}`" :aria-expanded="momentsOpen[block.enrollment.id] ?? false" @click="toggleMoments(block)">
            {{
              momentsOpen[block.enrollment.id]
                ? t('programs.week.hideMoments')
                : t('programs.week.momentsThisWeek', { n: weekMoments(block).length })
            }}
            <AppIcon :name="momentsOpen[block.enrollment.id] ? 'expand_less' : 'expand_more'" />
          </button>
          <ul v-if="momentsOpen[block.enrollment.id]" :id="`path-moments-${block.enrollment.id}`" class="qr-path-moments__list">
            <li v-for="moment in weekMoments(block).slice(0, 5)" :key="moment.id">
              <span class="qr-path-moments__day">{{ momentDayLabel(moment) }}</span>
              <span class="qr-path-moments__text">{{ momentLine(moment) }}</span>
              <small v-if="momentTags(moment)" class="qr-path-moments__tags">{{ momentTags(moment) }}</small>
            </li>
          </ul>
        </div>

        <label v-if="block.entry" class="qr-path-block__field">
          <span>{{ tg('programs.week.outcomeQuestion') }}</span>
          <textarea
            :value="promptResponses[pathKeys(block).outcome] ?? ''"
            rows="3"
            @input="setPathAnswer(pathKeys(block).outcome, $event)"
          />
        </label>

        <QuietRatingBar
          layout="row"
          :model-value="severityValue(block)"
          :label="t(`${block.program.i18nKey}.reflection.severity`)"
          :hint="severityHint(block)"
          :high-label="t('programs.week.severityHigh')"
          :low-label="t('programs.week.severityLow')"
          :previous="previousSeverity(block)"
          :previous-label="t('programs.week.previousWeek')"
          @update:model-value="setSeverity(block, $event)"
        />

        <label v-if="block.phase" class="qr-path-block__field">
          <span>{{ tg(`${block.program.i18nKey}.phases.${block.phase.key}.question`) }}</span>
          <textarea
            :value="promptResponses[pathKeys(block).phase] ?? ''"
            rows="3"
            @input="setPathAnswer(pathKeys(block).phase, $event)"
          />
        </label>

        <div v-if="block.entry && block.task" class="qr-path-block__stay">
          <button
            type="button"
            role="switch"
            class="mg-v2-switch"
            :aria-checked="Boolean(block.entry.stayNextWeek)"
            :aria-labelledby="`stay-${block.enrollment.id}`"
            @click="toggleStay(block, !block.entry.stayNextWeek)"
          />
          <span :id="`stay-${block.enrollment.id}`">{{ t('programs.week.stayNextWeek') }}</span>
        </div>
      </article>
    </section>

    <!-- 6 · Kotwice -->
    <section v-else-if="currentStepId === 'anchors'" class="qr-anchors">
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
    <section
      v-else
      class="qr-journal"
      :class="{ 'qr-journal--with-context': contextOpen || aiOpen }"
    >
      <div class="qr-journal-main">
        <textarea v-model="freeformReflection" aria-label="Dziennik tygodnia" rows="9" placeholder="Ten tydzień…" />
        <div class="qr-journal-tools">
          <span>{{ wordCount }} {{ plural(wordCount, 'słowo', 'słowa', 'słów') }}</span>
          <button
            type="button"
            class="qr-quiet"
            :aria-expanded="contextOpen"
            @click="toggleSidePanel('context')"
          >
            <AppIcon name="notes" />Kontekst
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
        <details v-if="aiSummary" class="qr-help">
          <summary>Wcześniejsze podsumowanie AI</summary>
          <p>{{ aiSummary }}</p>
          <button type="button" class="qr-quiet" @click="insertIntoJournal(aiSummary)">
            Dodaj podsumowanie do wpisu
          </button>
        </details>
      </div>
      <ReflectionCompanionPanel
        v-if="aiOpen"
        :key="weekRef"
        :period-ref="weekRef"
        :draft="freeformReflection"
        :ritual-context="companionRitualContext"
        @insert="insertIntoJournal"
      />

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
              <span v-if="axisTags(area.key, 'load').length" class="qr-ctx-tags qr-ctx-tags--load" :title="t('planning.reflection.weekly.groups.load.title')">{{ axisTags(area.key, 'load').join(', ') }}</span>
              <span v-if="axisTags(area.key, 'state').length" class="qr-ctx-tags" :title="t('planning.reflection.weekly.groups.state.title')">{{ axisTags(area.key, 'state').join(', ') }}</span>
              <span v-if="legacyTags(area.key).length" class="qr-ctx-tags">{{ legacyTags(area.key).join(', ') }}</span>
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
    <template #top><ProfileProposalNotice :conversation-id="`weekly-reflection:${weekRef}`" /></template>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRef } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { Quadrant } from '@/domain/emotion'
import type { WeeklyRatingKey } from '@/domain/reflection'
import type { LifeAreaKey } from '@/domain/reflectionMatrix'
import {
  REFLECTION_MATRIX_AREAS,
  areaTitleKey,
  cellAnchorKey,
  cellQuestionKey,
} from '@/domain/reflectionMatrix'
import AppIcon from '@/components/shared/AppIcon.vue'
import LoadStateBars from '@/components/shared/charts/LoadStateBars.vue'
import LoadStateRibbon from '@/components/shared/charts/LoadStateRibbon.vue'
import { pairColor, toRating } from '@/domain/loadState'
import {
  buildAreaSeries,
  trailingWeekRefs,
  weekPointLabel,
  type AreaSeries,
  type WeekPoint,
} from '@/domain/loadStateSeries'
import { useT } from '@/composables/useT'
import { useWeeklyReflectionWizard } from '@/composables/useWeeklyReflectionWizard'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import {
  loadReflectionPathBlocks,
  programReflectionKeys,
  setStayNextWeek,
  severitySeries,
  type ReflectionPathBlock,
} from '@/services/programWeekService'
import type { WeeklyReflection } from '@/domain/reflection'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import { hadMoment, momentDayRef, momentsInWeek } from '@/domain/moments'
import { momentsProgress, UNLOGGED_BUCKETS, weekRefsEndingAt } from '@/domain/momentsProgress'
import PathMomentsGlance from '@/features/program-path/PathMomentsGlance.vue'
import { getPreviousPeriod } from '@/utils/periods'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import QuietEmotionStack from './QuietEmotionStack.vue'
import ProfileProposalNotice from '@/features/ai-profile/ProfileProposalNotice.vue'
import ReflectionCompanionPanel from '@/features/ai-companion/ReflectionCompanionPanel.vue'
import QuietRatingBar from './QuietRatingBar.vue'
import QuietTagField from './QuietTagField.vue'
import QuietRitualShell, { type QuietRitualStep } from './QuietRitualShell.vue'
import {
  RATING_AXES,
  areaTagKey,
  buildQuietEvidenceRows,
  formatQuietNumber,
  parseTags,
  plural,
  quietWeekDays,
  serializeTags,
  weekRangeTitle,
  type QuietEvidenceCell,
  type QuietEvidenceRow,
  type RatingAxis,
} from './quietRitualModel'

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ close: []; updated: []; 'plan-next-week': [] }>()

const { t, tg, locale } = useT()
const {
  dataBundle,
  objectComments,
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
const aiOpen = ref(true)
function toggleSidePanel(panel: 'context' | 'ai') {
  if (panel === 'context') {
    contextOpen.value = !contextOpen.value
    if (contextOpen.value) aiOpen.value = false
  } else {
    aiOpen.value = !aiOpen.value
    if (aiOpen.value) contextOpen.value = false
  }
}
const saved = ref(false)
/** Load/state history of the preceding weeks (the ribbon's tail); the current week is appended live. */
const TAIL_WEEKS = 10
const tailHistory = ref<AreaSeries | null>(null)
/** The user's own earlier tags per axis (newest first) — the re-use pool; '' = the legacy undivided list. */
const recentTags = ref<Record<RatingAxis | '', string[]>>({ load: [], state: [], '': [] })
const pathBlocks = ref<ReflectionPathBlock[]>([])
const pastReflections = ref<WeeklyReflection[]>([])

const steps = computed<QuietRitualStep[]>(() => [
  { id: 'review', label: 'Przegląd', question: 'Co wydarzyło się naprawdę?' },
  ...AREAS.map(area => ({
    id: `area-${area.key}`,
    label: t(areaTitleKey(area.key)),
    question: tg(cellQuestionKey(area.key, 'state')),
  })),
  // Present only while a program with a weekly reflection runs (plan §5).
  ...(pathBlocks.value.length
    ? [
        {
          id: 'path',
          label: t('programs.week.stepLabel'),
          question: t('programs.week.stepQuestion'),
        },
      ]
    : []),
  { id: 'anchors', label: 'Kotwice', question: 'Co warto zapamiętać?' },
  { id: 'journal', label: 'Dziennik', question: 'Zamknij tydzień własnymi słowami' },
])

// Steps are addressed by id — the optional "path" step shifts the positions.
const currentStepId = computed(() => steps.value[current.value]?.id ?? 'review')
const activeArea = computed(() =>
  currentStepId.value.startsWith('area-')
    ? (AREAS.find(area => `area-${area.key}` === currentStepId.value) ?? null)
    : null
)
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
    getPeriodBounds(props.weekRef).end as DayRef
  )
})

const journalCount = computed(() => dataBundle.value?.weeklySummary.totalJournalEntries ?? 0)
const emotionCount = computed(() => dataBundle.value?.weeklySummary.totalEmotionLogs ?? 0)
const journalEntries = computed(() =>
  (dataBundle.value?.dailyBreakdown ?? []).flatMap((day, index) =>
    day.journal.items.map(item => ({
      key: item.id,
      day: `${days.value[index]?.shortLabel} ${days.value[index]?.dayNumber}`,
      title: item.title,
    }))
  )
)
const exerciseTitles = computed(() => {
  const titles = (dataBundle.value?.dailyBreakdown ?? []).flatMap(day => day.exercises.types)
  return [...new Set(titles)]
})
const topEmotions = computed(() => {
  const counts = new Map<string, { name: string; quadrant: Quadrant; count: number }>()
  for (const day of dataBundle.value?.dailyBreakdown ?? []) {
    for (const emotion of day.emotions.items) {
      const entry = counts.get(emotion.name) ?? {
        name: emotion.name,
        quadrant: emotion.quadrant,
        count: 0,
      }
      entry.count += 1
      counts.set(emotion.name, entry)
    }
  }
  return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, 4)
})
const commentedRows = computed(() => evidenceRows.value.filter(row => (objectComments.value[row.key] ?? '').trim()))
const filledAnchors = computed(() =>
  ANCHORS.map(anchor => ({
    ...anchor,
    text: (promptResponses.value[anchor.key] ?? '').trim(),
  })).filter(anchor => anchor.text)
)
const wordCount = computed(() => freeformReflection.value.trim().split(/\s+/).filter(Boolean).length)

const currentPair = computed(() => {
  const area = activeArea.value
  if (!area) return { load: null, state: null }
  return {
    load: toRating(ratingValue(area.fields.demands)),
    state: toRating(ratingValue(area.fields.state)),
  }
})
const currentPairRated = computed(() => currentPair.value.load != null && currentPair.value.state != null)
const tailPoints = computed<WeekPoint[]>(() => {
  const area = activeArea.value
  if (!area) return []
  const history = tailHistory.value?.[area.key] ?? []
  return [
    ...history,
    { weekRef: props.weekRef, label: weekPointLabel(props.weekRef), ...currentPair.value },
  ]
})

const companionRitualContext = computed(() =>
  JSON.stringify({
    ratings: Object.fromEntries(
      Object.entries(ratingRefsByKey).map(([key, value]) => [key, value.value])
    ),
    answers: promptResponses.value,
    comments: objectComments.value,
  })
)

onMounted(async () => {
  // The ribbon's tail: the preceding weeks; the current week is appended live from the bars.
  const previousRefs = trailingWeekRefs(props.weekRef, TAIL_WEEKS).slice(0, -1)
  tailHistory.value = buildAreaSeries(await structuredReflectionDexieRepository.listWeeklyByRefs(previousRefs), previousRefs)
  // Tag suggestions come from the user's own recent weekly reflections; there is
  // no shared vocabulary for area tags.
  const all = await structuredReflectionDexieRepository.listWeekly()
  pastReflections.value = all.filter(item => item.weekRef !== props.weekRef)
  pathBlocks.value = await loadReflectionPathBlocks(props.weekRef).catch(err => {
    console.error('Failed to load program blocks for the weekly reflection:', err)
    return []
  })
  if (pathBlocks.value.some(block => block.program.momentKind)) {
    void microEntryStore.loadEntries()
  }
  const pools: Record<RatingAxis | '', string[]> = { load: [], state: [], '': [] }
  for (const reflection of pastReflections.value.slice(-8).reverse()) {
    for (const area of AREAS) {
      for (const axis of [...RATING_AXES, '' as const]) {
        const pool = pools[axis]
        for (const tag of parseTags(reflection.promptResponses[areaTagKey(area.key, axis || undefined)])) {
          if (!pool.includes(tag)) pool.push(tag)
        }
      }
    }
  }
  recentTags.value = pools
})

function go(index: number) {
  current.value = Math.max(0, Math.min(steps.value.length - 1, index))
  saved.value = false
  if (currentStepId.value === 'review') goToStep('review')
  else if (activeArea.value) goToStep(activeArea.value.key)
  else if (currentStepId.value === 'anchors' || currentStepId.value === 'path') goToStep('anchors')
  else goToStep('journal')
}

function ratingValue(key: WeeklyRatingKey): number | null {
  return ratingRefsByKey[key].value
}
function setRating(key: WeeklyRatingKey, value: number | null) {
  ratingRefsByKey[key].value = value
  saved.value = false
}

function axisTags(areaKey: LifeAreaKey, axis: RatingAxis): string[] {
  return parseTags(promptResponses.value[areaTagKey(areaKey, axis)])
}
/** Tags saved before the load/state split (`tags:<area>`) — read-only here. */
function legacyTags(areaKey: LifeAreaKey): string[] {
  return parseTags(promptResponses.value[areaTagKey(areaKey)])
}
function writeAxisTags(areaKey: LifeAreaKey, axis: RatingAxis, tags: string[]) {
  promptResponses.value = { ...promptResponses.value, [areaTagKey(areaKey, axis)]: serializeTags(tags) }
  saved.value = false
  const pool = recentTags.value[axis]
  for (const tag of tags) if (!pool.includes(tag)) pool.unshift(tag)
}
/** Same axis first (this week's other areas, then earlier weeks), then the other axis, then legacy tags. */
function axisTagSuggestions(areaKey: LifeAreaKey, axis: RatingAxis): string[] {
  const seen: string[] = []
  const push = (tags: string[]) => {
    for (const tag of tags) if (!seen.includes(tag)) seen.push(tag)
  }
  for (const area of AREAS) if (area.key !== areaKey) push(axisTags(area.key, axis))
  push(recentTags.value[axis])
  for (const other of RATING_AXES) if (other !== axis) push(recentTags.value[other])
  push(recentTags.value[''])
  return seen
}

function pathKeys(block: ReflectionPathBlock) {
  return programReflectionKeys(block.enrollment.id)
}
function setPathAnswer(key: string, event: Event) {
  promptResponses.value = {
    ...promptResponses.value,
    [key]: (event.target as HTMLTextAreaElement).value,
  }
  saved.value = false
}
function severityValue(block: ReflectionPathBlock): number | null {
  const raw = Number(promptResponses.value[pathKeys(block).severity])
  return Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : null
}
function setSeverity(block: ReflectionPathBlock, value: number | null) {
  const key = pathKeys(block).severity
  const next = { ...promptResponses.value }
  if (value === null) delete next[key]
  else next[key] = String(value)
  promptResponses.value = next
  saved.value = false
}
/** Earlier answers of this enrollment, newest last (weeks without an answer are skipped). */
function severityHistory(block: ReflectionPathBlock): number[] {
  const startWeek = getPeriodRefsForDate(new Date(block.enrollment.startedAt)).week
  return severitySeries(block.enrollment.id, pastReflections.value, startWeek)
    .filter(point => point.weekRef < props.weekRef && point.value !== null)
    .map(point => point.value as number)
}
function previousSeverity(block: ReflectionPathBlock): number | null {
  return severityHistory(block).at(-1) ?? null
}
function severityHint(block: ReflectionPathBlock): string {
  const history = severityHistory(block).slice(-3)
  return history.length ? t('programs.week.severityHistory', { values: history.join(' · ') }) : ''
}
// ── Momenty of the week (per path kind) ──
const microEntryStore = useMicroExerciseEntryStore()
const momentsOpen = reactive<Record<string, boolean>>({})

function weekMoments(block: ReflectionPathBlock): MicroExerciseEntry[] {
  const kind = block.program.momentKind
  if (!kind) return []
  return momentsInWeek(microEntryStore.entries, kind, props.weekRef).filter(hadMoment)
}

function toggleMoments(block: ReflectionPathBlock): void {
  momentsOpen[block.enrollment.id] = !momentsOpen[block.enrollment.id]
}

// ── Week pattern (AI): one descriptive sentence, on demand, marked as a proposal ──
const patterns = reactive<Record<string, string>>({})
const patternErrors = reactive<Record<string, string>>({})
const patternLoading = reactive<Record<string, boolean>>({})

async function requestPattern(block: ReflectionPathBlock): Promise<void> {
  const id = block.enrollment.id
  patternLoading[id] = true
  patternErrors[id] = ''
  try {
    const { describeWeekPattern } = await import('@/services/pathLLMAssists')
    const stats = glanceStats(block)
    const week = stats[stats.length - 1]!
    const previous = stats.length > 1 ? stats[0] : undefined
    const kindVoices = weekMoments(block)
      .map(moment => moment.responses.kindVoice)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 3)
    patterns[id] = await describeWeekPattern({
      week,
      previous,
      partLabels: {
        withdraw: tg('exerciseWizards.micro.moments.compass.options.withdraw'),
        attackSelf: tg('exerciseWizards.micro.moments.compass.options.attackSelf'),
        attackOthers: tg('exerciseWizards.micro.moments.compass.options.attackOthers'),
        avoid: tg('exerciseWizards.micro.moments.compass.options.avoid'),
      },
      kindVoices,
      locale: locale.value,
    })
  } catch (err) {
    patternErrors[id] = err instanceof Error ? err.message : t('programs.pattern.error')
  } finally {
    patternLoading[id] = false
  }
}

// ── Shame path glance + "moments you did not log" ──
const UNLOGGED_OPTIONS = Object.keys(UNLOGGED_BUCKETS)

function unloggedValue(block: ReflectionPathBlock): string | null {
  const raw = promptResponses.value[pathKeys(block).unlogged]
  return typeof raw === 'string' && raw in UNLOGGED_BUCKETS ? raw : null
}
function setUnlogged(block: ReflectionPathBlock, option: string) {
  const key = pathKeys(block).unlogged
  const next = { ...promptResponses.value }
  if (unloggedValue(block) === option) delete next[key]
  else next[key] = option
  promptResponses.value = next
  saved.value = false
}
/** This week and the one before, but never a week before the path started. */
function glanceWeeks(block: ReflectionPathBlock): WeekRef[] {
  const startWeek = getPeriodRefsForDate(new Date(block.enrollment.startedAt)).week
  const previous = getPreviousPeriod(props.weekRef) as WeekRef
  return previous >= startWeek ? [previous, props.weekRef] : [props.weekRef]
}
function glanceFirstWeek(block: ReflectionPathBlock): number {
  const startWeek = getPeriodRefsForDate(new Date(block.enrollment.startedAt)).week
  const first = glanceWeeks(block)[0]!
  const trail = weekRefsEndingAt(first, 12)
  const index = trail.indexOf(startWeek)
  return index >= 0 ? trail.length - index : 1
}
function glanceStats(block: ReflectionPathBlock) {
  const bucket = unloggedValue(block)
  return momentsProgress(
    microEntryStore.entries,
    glanceWeeks(block),
    bucket ? { [props.weekRef]: UNLOGGED_BUCKETS[bucket] } : {}
  )
}

function momentDayLabel(moment: MicroExerciseEntry): string {
  return new Date(`${momentDayRef(moment)}T12:00:00`).toLocaleDateString(locale.value, {
    weekday: 'short',
  })
}

function momentLine(moment: MicroExerciseEntry): string {
  const situation = moment.responses.situation
  return typeof situation === 'string' ? situation : ''
}

/** "o czym" + responses used, as their labels (shame moments); empty otherwise. */
function momentTags(moment: MicroExerciseEntry): string {
  const label = (step: string, option: string) => tg(`exerciseWizards.micro.moments.${step}.options.${option}`)
  const tags: string[] = []
  const about = moment.responses.about
  if (typeof about === 'string' && about !== 'unsure') tags.push(label('about', about))
  const response = moment.responses.response
  if (Array.isArray(response)) {
    for (const option of response) if (typeof option === 'string' && option !== 'nothing') tags.push(label('response', option))
  }
  return tags.join(' · ')
}

async function toggleStay(block: ReflectionPathBlock, stay: boolean) {
  const updated = await setStayNextWeek(block.enrollment.id, props.weekRef, stay)
  pathBlocks.value = pathBlocks.value.map(candidate =>
    candidate.enrollment.id === block.enrollment.id
      ? {
          ...candidate,
          enrollment: updated,
          entry: updated.weekLog?.find(entry => entry.weekRef === props.weekRef),
        }
      : candidate
  )
}

function setAnchor(key: string, event: Event) {
  promptResponses.value = {
    ...promptResponses.value,
    [key]: (event.target as HTMLTextAreaElement).value,
  }
  saved.value = false
}
function setComment(key: string, event: Event) {
  objectComments.value = {
    ...objectComments.value,
    [key]: (event.target as HTMLTextAreaElement).value,
  }
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

<style scoped>
/* The calendar canvas has a desktop minimum width; the reflection is a fluid form. */
:global(.planning-next:has(.quiet-ritual--week-review)) {
  min-width: 0;
  height: auto;
}
:global(main:has(> .planning-next .quiet-ritual--week-review)) {
  min-width: 0;
}
.qr-card,
.qr-journal {
  min-width: 0;
}
.quiet-ritual--week-review {
  min-width: 0;
}
@media (max-width: 600px) {
  :global(.planning-next:has(.quiet-ritual--week-review)) {
    padding: 0;
  }
}
@media (max-width: 900px) {
  .qr-footer {
    flex-wrap: wrap;
  }
  .qr-footer nav {
    min-width: 0;
    flex: 1;
  }
  .qr-progress {
    flex-wrap: wrap;
    justify-content: center;
  }
  .qr-finish {
    flex-basis: 100%;
    align-items: stretch;
  }
  .qr-heading h1 {
    overflow-wrap: anywhere;
  }
}
/* Momenty under the path's task: a quiet disclosure, rows one tone deeper. */
.qr-path-moments {
  display: grid;
  gap: var(--mg-space-1);
}

.qr-path-moments__list {
  display: grid;
  gap: var(--mg-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.qr-path-moments__list li {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 0 var(--mg-space-2);
  padding: var(--mg-space-1) var(--mg-space-2);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  font-size: var(--mg-font-size-sm);
}

.qr-path-moments__day {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  text-transform: lowercase;
  padding-top: 0.15em;
}

.qr-path-moments__text {
  color: var(--mg-color-ink);
}

.qr-path-moments__tags {
  grid-column: 2;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
</style>
