<template>
  <section
    class="mg-v2-surface mg-v2-surface--raised-sm pp-card"
    :aria-label="headLabel"
    data-testid="path-practices"
  >
    <header class="pp-card__head">
      <span
        >{{ headLabel }}
        <small v-if="mode === 'return'">{{ t('programs.ui.returnNote') }}</small></span
      >
      <span class="pp-card__links">
        <button
          v-if="responseEntry"
          type="button"
          class="pp-link"
          :class="{ 'is-active': responseOpen }"
          :aria-expanded="responseOpen"
          @click="responseOpen = !responseOpen"
        >
          {{ isAnxietyMap ? t('programs.anxiety-approach.mapLabel') : t('programs.ui.myPlan') }}
        </button>
        <button
          v-if="letter"
          type="button"
          class="pp-link"
          :class="{ 'is-active': letterOpen }"
          :aria-expanded="letterOpen"
          @click="letterOpen = !letterOpen"
        >
          {{ t('programs.ui.letterFromYou') }}
        </button>
      </span>
    </header>

    <div v-if="tiles.length" class="pp-tile-grid">
      <article
        v-for="tile in tiles"
        :key="tile.key"
        class="pp-tile pp-tile--mist"
        :data-testid="tile.testId"
      >
        <header class="pp-tile__head">
          <strong class="pp-tile__title">{{ tile.title }}</strong>
          <span
            v-if="tile.wells"
            class="pp-wells pp-tile__mark"
            :aria-label="
              t('programs.week.doneOf', { done: tile.wells.done, target: tile.wells.target })
            "
          >
            <i
              v-for="n in tile.wells.target"
              :key="n"
              class="mg-well pp-well pp-well--sm"
              :class="{ 'mg-well--done': n <= tile.wells.done }"
            />
          </span>
        </header>
        <p v-if="tile.what" class="pp-tile__what">{{ tile.what }}</p>
        <footer v-if="mode === 'active' && (tile.action || tile.change)" class="pp-tile__foot">
          <button
            v-if="tile.action"
            type="button"
            class="pp-chip"
            :disabled="busy || tile.disabled"
            @click="tile.action.run()"
          >
            {{ tile.action.label }}
          </button>
          <button
            v-if="tile.change"
            type="button"
            class="pp-link"
            :aria-expanded="worldOpen"
            @click="worldOpen = !worldOpen"
          >
            {{ worldOpen ? t('programs.ui.keep') : t('programs.ui.change') }}
          </button>
        </footer>
      </article>
    </div>

    <div
      v-if="worldOpen && options && enrollment.status === 'active'"
      class="pp-world"
      data-testid="path-world-choice"
    >
      <ProgramTaskChoice
        v-model="chosenKey"
        :program="program"
        :current="options.current"
        :earlier="options.earlier"
        :suggested-key="options.suggested.key"
        :repeat="options.repeat"
        :disabled="busy || worldBusy"
        :name="`program-task-path-${enrollment.id}`"
      />
      <div class="pp-chips">
        <button type="button" class="pp-chip" :disabled="busy || worldBusy" @click="accept">
          {{ t('programs.week.addThisWeek') }}
        </button>
        <button type="button" class="pp-chip" :disabled="busy || worldBusy" @click="decline">
          {{ t('programs.week.decline') }}
        </button>
      </div>
    </div>

    <div v-if="responseOpen && responseEntry" class="pp-quote" data-testid="path-response">
      <dl v-if="isPausePlan || isAnxietyMap" class="pp-plan">
        <template v-for="field in personalFields" :key="field.key">
          <dt>{{ t(`${personalLabels}.${field.key}`) }}</dt>
          <dd>{{ field.value }}</dd>
        </template>
      </dl>
      <p v-if="responseText('unblendSentence')">
        <em>„{{ responseText('unblendSentence') }}”</em>
      </p>
      <p v-if="responseText('sentence')">
        <em>„{{ responseText('sentence') }}”</em>
      </p>
      <p v-if="responseMoves">{{ responseMoves }}</p>
      <RouterLink v-if="momentRoute" :to="momentRoute" class="pp-chip">{{
        t('programs.ui.saveAsMoment')
      }}</RouterLink>
    </div>
    <div v-if="letterOpen && letter" class="pp-quote">
      <p>
        <em>„{{ letter }}”</em>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ProgramTaskChoice from '@/components/exercises/ProgramTaskChoice.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { DayRef, WeekRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { derivePracticeStates } from '@/services/programSchedulerService'
import {
  acceptWeeklyTask,
  declineWeeklyTask,
  proposeWeeklyTaskOptions,
  weekTaskState,
  type WeekTaskState,
} from '@/services/programWeekService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * "Praktyki" (Lab /concepts/path-view-v2, round 6d–6f): what repeats in
 * the active phase next to the steps, as tiles — the practices (micro
 * exercises on a rhythm), Momenty, and the week's real-world task — one
 * category for the user, however the item came to be. Every action is the
 * same quiet chip right after the content; no notes ("dziś", "2× w
 * tygodniu"), no done well. The task's wells are its state (head, right).
 * Paused: "Gdy wrócisz", the same tiles without actions. On the return:
 * no tiles, "List od Ciebie" and "Mój plan" as links in the head. The
 * personal plan / map disclosure moved here from the old "Teraz" card.
 */
export type PathPracticesMode = 'active' | 'paused' | 'return'

interface PracticeTile {
  key: string
  testId?: string
  title: string
  what: string
  action?: { label: string; run: () => void }
  disabled?: boolean
  change?: boolean
  wells?: { done: number; target: number }
}

const props = defineProps<{
  program: ProgramDefinition
  enrollment: ProgramEnrollment
  mode: PathPracticesMode
  busy?: boolean
  /** Latest personal response, pause plan or anxiety map for the disclosure. */
  responseEntry?: MicroExerciseEntry
  /** The letter to a future self, from its day on or once the path is closed. */
  letter?: string
  /** Open the letter's quote right away (arriving from "Najbliżej"). */
  letterOpen?: boolean
}>()

const emit = defineEmits<{ letterOpened: [] }>()

const router = useRouter()
const { t, tg } = useT()
const planStore = useExercisePlanStore()
const enrollmentStore = useProgramEnrollmentStore()
const responseOpen = ref(false)
const letterOpen = ref(Boolean(props.letterOpen && props.letter))
// Opening the quote is what "reading" means — once per visit is enough for the marker.
watch(
  () => letterOpen.value && Boolean(props.letter),
  open => {
    if (open) emit('letterOpened')
  },
  { immediate: true }
)
const worldOpen = ref(false)
const worldBusy = ref(false)

const headLabel = computed(() =>
  props.mode === 'paused'
    ? t('programs.ui.nowPaused')
    : props.mode === 'return'
      ? t('programs.ui.returnTitle')
      : t('programs.ui.practicesCard')
)

// ── Personal plan / map (from the old "Teraz" card) ──
const isPausePlan = computed(() => props.responseEntry?.exerciseSlug === 'pause-plan')
const isAnxietyMap = computed(() => props.responseEntry?.exerciseSlug === 'anxiety-map')
const personalLabels = computed(() =>
  isAnxietyMap.value ? 'programs.anxiety-approach.mapLabels' : 'programs.anger-signal.planLabels'
)
const personalFields = computed(() =>
  (isAnxietyMap.value
    ? ['withoutFear', 'avoidance', 'safetyBehaviors']
    : ['earlySigns', 'ifThen', 'returnPromise']
  )
    .map(key => {
      const response = props.responseEntry?.responses[key]
      const value = Array.isArray(response)
        ? response
            .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
            .join(' · ')
        : typeof response === 'string'
          ? response.trim()
          : ''
      return { key, value }
    })
    .filter(field => field.value)
)
function responseText(step: string): string {
  const value = props.responseEntry?.responses[step]
  return typeof value === 'string' ? value.trim() : ''
}
const responseMoves = computed(() => {
  const moves = props.responseEntry?.responses.move
  if (!Array.isArray(moves)) return ''
  return moves
    .filter((move): move is string => typeof move === 'string')
    .map(move => tg(`exerciseWizards.micro.shameResponse.move.options.${move}`))
    .filter(label => !label.startsWith('exerciseWizards.'))
    .join(' · ')
})
const momentRoute = computed(() =>
  props.program.momentKind ? `/exercises/micro/moment-${props.program.momentKind}` : null
)

// ── Tiles ──
const todayRef = computed<DayRef>(() => getPeriodRefsForDate(new Date()).day)
const practiceTiles = computed<PracticeTile[]>(() =>
  derivePracticeStates(props.program, props.enrollment, planStore.items)
    .filter(state => state.state === 'active')
    .map(({ practice, pendingItem }) => {
      const entry = getCatalogEntry(practice.exerciseSlug)
      const due = Boolean(pendingItem && pendingItem.dayRef <= todayRef.value)
      // Momenty on a rhythm: a moment can be logged any time, so its chip says "Zapisz" and never waits for its day.
      const isMoment = practice.exerciseSlug === momentSlug.value
      return {
        key: `practice-${practice.exerciseSlug}`,
        testId: isMoment ? 'path-moment-tile' : 'path-practice-tile',
        title: entry ? t(`exercises.cards.${entry.i18nKey}.title`) : practice.exerciseSlug,
        what: entry ? tg(`exercises.cards.${entry.i18nKey}.description`) : '',
        action: entry
          ? {
              label: isMoment ? t('programs.ui.logMomentShort') : t('programs.ui.open'),
              run: () => void router.push(entry.route),
            }
          : undefined,
        // Only a due occurrence: completing a future one early would not tick it.
        disabled: !isMoment && !due,
      }
    })
)
const momentSlug = computed(() =>
  props.program.momentKind ? `moment-${props.program.momentKind}` : null
)
/** Momenty as a tile of its own only when the path does not already run them as a practice. */
const momentTile = computed<PracticeTile | null>(() => {
  if (
    !momentSlug.value ||
    (props.program.practices ?? []).some(practice => practice.exerciseSlug === momentSlug.value)
  )
    return null
  const entry = getCatalogEntry(momentSlug.value)
  if (!entry) return null
  return {
    key: 'moments',
    testId: 'path-moment-tile',
    title: t(`exercises.cards.${entry.i18nKey}.title`),
    what: tg(`exercises.cards.${entry.i18nKey}.description`),
    action: { label: t('programs.ui.logMomentShort'), run: () => void router.push(entry.route) },
  }
})

// ── The week's real-world task ──
const thisWeek = computed<WeekRef>(() => getPeriodRefsForDate(new Date()).week)
const hasTasks = computed(() => Boolean(props.program.weeklyTasks?.length))
const options = computed(() =>
  hasTasks.value ? proposeWeeklyTaskOptions(props.program, props.enrollment, thisWeek.value) : null
)
const state = ref<WeekTaskState | null>(null)
const chosenKey = ref('')
watch(
  options,
  next => {
    const known =
      next && [...next.current, ...next.earlier].some(task => task.key === chosenKey.value)
    if (!known) chosenKey.value = next?.suggested.key ?? ''
  },
  { immediate: true }
)
const chosenTask = computed(() =>
  options.value
    ? ([...options.value.current, ...options.value.earlier].find(
        task => task.key === chosenKey.value
      ) ?? options.value.suggested)
    : null
)
async function load(): Promise<void> {
  if (!hasTasks.value) return
  state.value = await weekTaskState(props.program, props.enrollment, thisWeek.value)
}
onMounted(() => void load())
watch(
  () => [props.enrollment.id, props.enrollment.weekLog],
  () => void load(),
  { deep: true }
)

const taskTitle = (key: string) => tg(`${props.program.i18nKey}.tasks.${key}.title`)
const taskWhy = (key: string) => tg(`${props.program.i18nKey}.tasks.${key}.why`)
const worldTile = computed<PracticeTile | null>(() => {
  if (!hasTasks.value) return null
  const current = state.value
  if (current?.intention) {
    return {
      key: 'world',
      testId: 'path-world',
      title: current.intention.title,
      what: current.task ? taskWhy(current.task.key) : '',
      wells: {
        done: current.doneCount,
        target: current.intention.target.value ?? current.task?.times ?? 1,
      },
    }
  }
  if (current?.entry) return null
  const task = chosenTask.value
  if (!task) return null
  return {
    key: 'world',
    testId: 'path-world',
    title: taskTitle(task.key),
    what: taskWhy(task.key),
    action: { label: t('programs.week.addThisWeek'), run: () => void accept() },
    change: true,
  }
})
const tiles = computed<PracticeTile[]>(() => {
  if (props.mode === 'return') return []
  return [
    ...practiceTiles.value,
    ...(momentTile.value ? [momentTile.value] : []),
    ...(worldTile.value ? [worldTile.value] : []),
  ]
})

async function accept(): Promise<void> {
  const task = chosenTask.value
  if (!task) return
  worldBusy.value = true
  try {
    const { enrollment } = await acceptWeeklyTask({
      enrollmentId: props.enrollment.id,
      weekRef: thisWeek.value,
      taskKey: task.key,
      title: taskTitle(task.key),
      times: task.times,
    })
    enrollmentStore.applyUpdate(enrollment)
    worldOpen.value = false
  } finally {
    worldBusy.value = false
  }
}
async function decline(): Promise<void> {
  const task = chosenTask.value
  if (!task) return
  worldBusy.value = true
  try {
    enrollmentStore.applyUpdate(
      await declineWeeklyTask(props.enrollment.id, thisWeek.value, task.key)
    )
    worldOpen.value = false
  } finally {
    worldBusy.value = false
  }
}
</script>

<style scoped>
.pp-card__links {
  display: inline-flex;
  gap: var(--mg-space-3);
}
.pp-link.is-active {
  text-decoration: underline;
}
.pp-world {
  display: grid;
  gap: var(--mg-space-2);
  margin-top: var(--mg-space-3);
  padding: var(--mg-space-3);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}
.pp-world .pp-chips {
  margin-top: var(--mg-space-1);
}
.pp-plan {
  display: grid;
  gap: var(--mg-space-1);
  margin: 0;
  overflow-wrap: anywhere;
}
.pp-plan dt {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.pp-plan dt:not(:first-child) {
  margin-top: var(--mg-space-2);
}
.pp-plan dd {
  margin: 0;
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  white-space: pre-line;
}
</style>
