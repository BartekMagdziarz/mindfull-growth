/**
 * Verification-environment seed (dev-only).
 *
 * Creates the fixed verification account (see ./verificationAccount) and fills its
 * per-user database with a deterministic dataset relative to the real "today":
 *   - 4 life areas, 4 active priorities, 3 goals + 7 KRs, 10 habits, 3 trackers
 *   - 16 fully closed weeks (plans, day assignments, entries, reflections)
 *     + the current week planning-only
 *   - 6 fully closed months (top-3, priority assessments, monthly reflection)
 *     + the current month planning-only
 *   - journal entries + emotion logs over the last ~5 weeks
 *
 * Idempotency: `runVerificationSeed` ALWAYS resets first (delete DB → reconnect →
 * seed), so re-runs never duplicate data. `bootstrapVerificationEnvironment` skips
 * seeding on reloads via a profile/version/day localStorage marker. Bump the
 * rich scenario version after changing the dataset to force a re-seed.
 *
 * Reachability: imported ONLY via the dynamic, DEV-guarded import in main.ts
 * (verification mode) — never statically from prod-reachable code.
 *
 * Manual re-seed from DevTools on the verification origin:
 *   await window.__verifySeed()
 */

import Dexie from 'dexie'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import type { User } from '@/domain/user'
import emotionsMeta from '@/data/emotions-meta.json'
import {
  addDaysToDayRef,
  getChildPeriods,
  getPeriodBounds,
  getPeriodRefsForDate,
  getWeekOverlappingMonths,
} from '@/utils/periods'
import { assessmentsDexieRepository } from '@/repositories/assessmentsDexieRepository'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import {
  gradedExposureHierarchyDexieRepository,
  ifsPartDexieRepository,
} from '@/repositories/exercisesDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { createPayloadForReaction } from '@/services/shamePartsService'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { priorityLinkDexieRepository } from '@/repositories/priorityLinkDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { getAssessmentRegistryEntry } from '@/services/assessments/registry'
import { hashPassword } from '@/services/cryptoService'
import { saveDraftToDB } from '@/services/draftStorage'
import {
  setMonthTopPriorities,
  setMonthlyPriorityAssessment,
} from '@/services/monthlyPriorityService'
import { createActiveLink } from '@/services/priorityLinkService'
import { PRIORITY_CREATOR_DRAFT_KEY } from '@/composables/usePriorityCreatorRitual'
import {
  linkGoalToMonth,
  linkMeasurementPeriod,
  toggleMeasurementDayAssignment,
  updateMeasurementTargetOverride,
  updateMeasurementWeekTargetOverride,
} from '@/services/planningMutations'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { connectUserDatabase, disconnectUserDatabase } from '@/services/userDatabaseService'
import { createWeeklyIntention, setWeekTopPriorities } from '@/services/weeklyIntentionService'
import {
  VERIFY_DB_NAME,
  VERIFY_DISPLAY_NAME,
  VERIFY_PASSWORD,
  VERIFY_USERNAME,
  VERIFY_USER_ID,
} from './verificationAccount'
import {
  buildRichVerificationScenario,
  fixtureMarkerValue,
  type VerifyBridgeResponse,
} from './richVerificationScenario'
import {
  UX_LAB_ORIGIN,
  answerVerifyBridgeRequest,
  isAllowedUxLabOrigin,
  parseVerifyBridgeRequest,
} from './verificationBridge'
import { createVerificationScenarioIdRegistry } from './verificationScenarioAdapter'

const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

// ─── Account ─────────────────────────────────────────────────────────────────

/** Create the fixed verification user in the auth DB if it does not exist yet. */
export async function ensureVerificationUser(): Promise<void> {
  const existing = await authDexieRepository.getUserById(VERIFY_USER_ID)
  if (existing) return

  const now = new Date().toISOString()
  const user: User = {
    id: VERIFY_USER_ID,
    username: VERIFY_USERNAME,
    passwordHash: await hashPassword(VERIFY_PASSWORD),
    createdAt: now,
    lastLoginAt: now,
    displayName: VERIFY_DISPLAY_NAME,
  }

  try {
    await authDexieRepository.createUser(user)
  } catch (error) {
    // Two tabs can race here; the fixed id already existing is the success case.
    if (!(await authDexieRepository.getUserById(VERIFY_USER_ID))) throw error
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface RunVerificationSeedOptions {
  /** Reload after seeding so Pinia stores drop stale state (default true). */
  reload?: boolean
}

/** Reset-then-seed: always deletes the verification DB first, so re-runs never duplicate. */
export async function runVerificationSeed(options: RunVerificationSeedOptions = {}): Promise<void> {
  console.log('[verificationSeed] Resetting verification database…')
  await ensureVerificationUser()
  await disconnectUserDatabase()
  await Dexie.delete(VERIFY_DB_NAME)
  await connectUserDatabase(VERIFY_USER_ID)

  await seedVerificationData()

  invalidatePlanningQueryCache()
  window.localStorage.setItem(
    SEED_MARKER_KEY,
    fixtureMarkerValue(buildRichVerificationScenario().meta)
  )
  console.log('[verificationSeed] ✅ Seed complete.')

  if (options.reload !== false) {
    window.location.reload()
  }
}

/**
 * Called from main.ts (verification mode only) BEFORE `app.use(router)`:
 * the router's initial navigation runs the one-shot auth-store initialize(),
 * so the verification user must already exist for the dev auto-login bypass.
 */
export async function bootstrapVerificationEnvironment(): Promise<void> {
  await ensureVerificationUser()
  await connectUserDatabase(VERIFY_USER_ID)

  const expectedMarker = fixtureMarkerValue(buildRichVerificationScenario().meta)
  if (window.localStorage.getItem(SEED_MARKER_KEY) !== expectedMarker) {
    await runVerificationSeed({ reload: false })
  }

  installVerificationHelpers()
  installVerificationBridge()
}

/** Expose the re-seed hook for DevTools / Playwright (`await window.__verifySeed()`). */
export function installVerificationHelpers(): void {
  Object.assign(window, { __verifySeed: runVerificationSeed })
  console.log('[verificationSeed] Helper installed: window.__verifySeed()')
}

/**
 * Narrow, verification-only bridge used by UX Lab. It exposes seed status and
 * an explicit reset command; it never exposes repositories, records or an
 * arbitrary command channel. Cross-origin messages are accepted only from the
 * fixed local Lab origin.
 */
export function installVerificationBridge(): void {
  const respond = (source: MessageEventSource | null, response: VerifyBridgeResponse) => {
    if (!source || !('postMessage' in source)) return
    source.postMessage(response, { targetOrigin: UX_LAB_ORIGIN })
  }

  window.addEventListener('message', event => {
    if (!isAllowedUxLabOrigin(event.origin)) return
    const request = parseVerifyBridgeRequest(event.data)
    if (!request) return

    void answerVerifyBridgeRequest(request, {
      getMeta: () => buildRichVerificationScenario().meta,
      reset: () => runVerificationSeed({ reload: false }),
    }).then(response => {
      respond(event.source, response)
      if (response.type === 'mindful-growth:verify:reset-result' && response.ok) {
        window.setTimeout(() => window.location.reload(), 80)
      }
    })
  })
}

// ─── Deterministic content (Polish, mirrors real usage) ─────────────────────

const JOURNAL_TEXTS: Array<{ title: string; body: string }> = [
  {
    title: 'Poranny bieg nad rzeką',
    body: 'Pobiegłem rano wzdłuż rzeki i cały dzień miałem więcej energii. Regularność naprawdę robi różnicę — im mniej się zastanawiam, tym łatwiej wyjść.',
  },
  {
    title: 'Trudna rozmowa w pracy',
    body: 'Rozmowa o priorytetach projektu była trudniejsza, niż się spodziewałem. Zauważyłem napięcie w ramionach i płytki oddech. Pomogło nazwanie tego na głos.',
  },
  {
    title: 'Wieczór z rodziną',
    body: 'Wspólna kolacja bez telefonów. Dużo śmiechu przy grze planszowej. Chcę częściej pilnować takich wieczorów — dają mi więcej niż godzina odpoczynku osobno.',
  },
  {
    title: 'Refleksja o nauce',
    body: 'Dwadzieścia minut czytania dziennie wydaje się mało, ale po kilku tygodniach widzę realny postęp. Małe kroki wygrywają z zrywami.',
  },
  {
    title: 'Zmęczenie i granice',
    body: 'Za dużo spotkań, za mało przerw. Pod koniec dnia byłem rozdrażniony bez wyraźnego powodu. Jutro planuję dwa bloki deep work z wyłączonymi powiadomieniami.',
  },
  {
    title: 'Mały sukces',
    body: 'Domknąłem funkcję, nad którą siedziałem od tygodnia. Satysfakcja większa niż zwykle — chyba dlatego, że po drodze było sporo zwątpienia.',
  },
  {
    title: 'Spacer bez celu',
    body: 'Godzinny spacer bez słuchawek. Myśli same się poukładały. Zapisuję, żeby pamiętać: nuda bywa najlepszym narzędziem.',
  },
  {
    title: 'Planowanie tygodnia',
    body: 'Usiadłem do planu tygodnia i wybrałem trzy rzeczy, które naprawdę mają znaczenie. Reszta poczeka. Mniej znaczy więcej.',
  },
]

const EMOTION_NOTES = [
  'Po porannym treningu.',
  'Przed ważnym spotkaniem.',
  'Wieczorne wyciszenie.',
  'Rozmowa z bliską osobą.',
  'Kolejne zadanie z listy zamknięte.',
  'Zmęczenie po długim dniu.',
]

const INTENTION_TITLES = [
  'Zaplanować budżet miesiąca',
  'Umówić przegląd auta',
  'Zadzwonić do rodziców',
  'Uporządkować biurko i notatki',
  'Przygotować prezentację na przegląd',
  'Wyjść na spacer bez telefonu',
  'Zarezerwować weekendowy wypad',
  'Dokończyć zaległy rozdział kursu',
  'Posadzić zioła na balkonie',
  'Napisać do starego znajomego',
]

const WEEK_REVIEW_NOTES = [
  'Szło zaskakująco gładko — rytm poranny się broni.',
  'Środek tygodnia rozjechał się przez nadgodziny.',
  'Dobre tempo, ale kosztem snu — do korekty.',
  'Stabilnie, bez fajerwerków. Wystarczająco dobrze.',
]

const WEEK_FREEFORM_TEXTS = [
  'Tydzień o dwóch prędkościach: mocny początek, zmęczona końcówka. Najbardziej pomogło trzymanie się porannego planu.',
  'Dużo wymagań z zewnątrz, mało przestrzeni na swoje. Mimo to udało się obronić dwa bloki deep work.',
  'Spokojniejszy tydzień. Więcej czasu z bliskimi wyraźnie podniosło nastrój i energię.',
  'Tydzień pod znakiem dowożenia. Ciało wysyłało sygnały zmęczenia — w przyszłym tygodniu więcej regeneracji.',
]

const MONTH_FREEFORM_TEXTS = [
  'Miesiąc konsekwencji: ruch i nauka weszły w rytm, praca wymagała korekt. Najważniejsza lekcja — planować mniej, ale konkretniej.',
  'Miesiąc budowania fundamentów. Nie wszystko domknięte, ale kierunek jest właściwy i chcę go utrzymać.',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface EmotionMetaEntry {
  id: string
  pleasantness: number
  energy: number
}

/** Real emotion ids from the catalog, grouped by quadrant (max 6 each), deterministic order. */
function buildEmotionPools(): string[][] {
  const catalog = (emotionsMeta as EmotionMetaEntry[])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
  const pools: string[][] = [[], [], [], []]
  for (const emotion of catalog) {
    const quadrant = (emotion.energy > 6 ? 0 : 2) + (emotion.pleasantness > 6 ? 0 : 1)
    if (pools[quadrant].length < 6) pools[quadrant].push(emotion.id)
  }
  return pools
}

/** DayRefs at the given Monday-offsets (0=Mon … 6=Sun) within a week. */
function weekDays(weekRef: WeekRef, offsets: number[]): DayRef[] {
  const monday = getPeriodBounds(weekRef).start
  return offsets.map(offset => addDaysToDayRef(monday, offset))
}

/** Every 3rd week (staggered by `phase`) is a miss, the rest are met. */
function isMet(weekIdx: number, phase: number): boolean {
  return (weekIdx + phase) % 3 !== 2
}

async function addEntries(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  days: DayRef[],
  value: number | null
): Promise<void> {
  await Promise.all(
    days.map(dayRef =>
      planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType,
        subjectId,
        dayRef,
        value,
      })
    )
  )
}

async function addMultiEntries(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  days: DayRef[],
  checkedItemIds: string[]
): Promise<void> {
  await Promise.all(
    days.map(dayRef =>
      planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType,
        subjectId,
        dayRef,
        value: null,
        checkedItemIds,
      })
    )
  )
}

const WEEK_ANCHOR_TEXTS = {
  wentWell: [
    'Trzy biegi mimo deszczu; wieczory bez ekranu weszły w krew.',
    'Rozmowa z M. o planach na jesień — spokojnie i do końca.',
    'Domknięty raport przed terminem, bez nocnej dogrywki.',
  ],
  challenges: [
    'Krótkie noce od środy; czwartek przespany w pracy.',
    'Za dużo spraw naraz — zadania czekały, a ja krążyłem wokół nich.',
    'Napięcie w domu po niedzielnym spotkaniu.',
  ],
  lessons: [
    'Sen przed 23 daje więcej niż dodatkowy trening.',
    'Jedna decyzja rano oszczędza wieczór wahania.',
    'Powiedzieć wcześniej „nie” jest tańsze niż odkręcać potem.',
  ],
} as const

function clampRating(value: number): number {
  return Math.max(1, Math.min(5, value))
}

// ─── Dataset ─────────────────────────────────────────────────────────────────

export async function seedVerificationData(): Promise<void> {
  const today = new Date()
  const scenario = buildRichVerificationScenario(today)
  const semanticIds = createVerificationScenarioIdRegistry(scenario)
  const refs = getPeriodRefsForDate(today)
  const todayRef = refs.day
  const currentMonth = refs.month
  const closedMonths = scenario.months
    .filter(month => month.monthRef !== currentMonth)
    .map(month => month.monthRef)
  const monthM1 = closedMonths.at(-1)!
  const monthM2 = closedMonths.at(-2)!

  const currentWeek = refs.week
  const pastWeeks = scenario.weeks
    .filter(week => week.weekRef !== currentWeek)
    .map(week => week.weekRef)
  const allWeeks = [...pastWeeks, currentWeek]

  /** Only days that already happened — the current week must stay believable. */
  const upToToday = (days: DayRef[]): DayRef[] => days.filter(day => day <= todayRef)

  console.log(
    `[verificationSeed] Seeding ${scenario.meta.profileId}: months ${closedMonths[0]}…${currentMonth}, weeks ${pastWeeks[0]}…${currentWeek}`
  )

  // ── 1. Life areas ──────────────────────────────────────────────────────────

  const [areaHealth, areaWork, areaRelations, areaGrowth] = await Promise.all(
    [
      { name: 'Zdrowie', signals: ['Jak sypiam?', 'Czy mam energię w ciągu dnia?'] },
      { name: 'Praca', signals: ['Czy robię rzeczy ważne, nie tylko pilne?'] },
      { name: 'Relacje', signals: ['Kiedy ostatnio miałem czas tylko dla bliskich?'] },
      { name: 'Rozwój', signals: ['Czego nauczyłem się w tym tygodniu?'] },
    ].map((area, index) =>
      lifeAreaDexieRepository.create({
        name: area.name,
        reflectionSignals: area.signals,
        isActive: true,
        sortOrder: index + 1,
      })
    )
  )

  // ── 2. Priorities (4 active — stays under the 5-active limit) ─────────────

  const lifeAreaIdByPriorityKey = new Map([
    ['movement', areaHealth.id],
    ['stream', areaWork.id],
    ['relationships', areaRelations.id],
    ['learning', areaGrowth.id],
  ])
  const createdPriorities = await Promise.all(
    scenario.priorities.map(async priority => ({
      key: priority.key,
      record: await priorityDexieRepository.create({
        title: priority.title,
        years: [refs.year],
        status: 'active',
        lifeAreaIds: [lifeAreaIdByPriorityKey.get(priority.key)!],
        whyNow: priority.whyNow,
        desiredDirection: priority.desiredDirection,
        progressSignals: priority.progressSignals,
        riskSignals: priority.riskSignals,
      }),
    }))
  )
  const priorityByKey = new Map(
    createdPriorities.map(priority => {
      semanticIds.registerPriority(priority.key, priority.record.id)
      return [priority.key, priority.record]
    })
  )
  const p1 = priorityByKey.get('movement')!
  const p2 = priorityByKey.get('stream')!
  const p3 = priorityByKey.get('relationships')!
  const p4 = priorityByKey.get('learning')!
  const priorities = [p1, p2, p3, p4]

  const fixtureObject = (key: string) => {
    const object = scenario.objects.find(candidate => candidate.key === key)
    if (!object) throw new Error(`Missing rich-v1 object: ${key}`)
    return object
  }
  const priorityIdsFor = (key: string) => semanticIds.priorityIdsForObject(key)
  const rememberObject = <T extends { id: string }>(key: string, record: T): T => {
    semanticIds.registerObject(key, record.id)
    return record
  }

  // ── 3. Goals ───────────────────────────────────────────────────────────────

  const g1 = rememberObject(
    'goal-10k',
    await goalDexieRepository.create({
      title: fixtureObject('goal-10k').title,
      isActive: true,
      status: 'open',
      priorityIds: priorityIdsFor('goal-10k'),
      lifeAreaIds: [areaHealth.id],
      // Deadlines feed the day's calendar markers and the „Najbliżej” list.
      targetDate: addDaysToDayRef(todayRef, 12),
      successDefinition: 'Ciągły bieg 10 km w spokojnym tempie, bez marszobiegu.',
      whyMatters: 'Konkretny, mierzalny dowód, że kondycja wróciła.',
    })
  )
  const g2 = rememberObject(
    'goal-mvp',
    await goalDexieRepository.create({
      title: fixtureObject('goal-mvp').title,
      isActive: true,
      status: 'open',
      priorityIds: priorityIdsFor('goal-mvp'),
      lifeAreaIds: [areaWork.id],
      targetDate: addDaysToDayRef(todayRef, 4),
      successDefinition: 'Działająca wersja z kluczowymi przepływami u pierwszych użytkowników.',
      whyMatters: 'Bez wydania nie ma informacji zwrotnej.',
    })
  )

  // ── 4. Activate goals in every month touched by the seeded periods ────────
  // (KR month states require an active GoalMonthState; weekly linking below
  // creates month states for all overlapping months, including edge spillover.)

  const monthSet = new Set<MonthRef>([...closedMonths, currentMonth])
  for (const weekRef of allWeeks) {
    for (const monthRef of getWeekOverlappingMonths(weekRef)) monthSet.add(monthRef)
  }
  for (const monthRef of monthSet) {
    await linkGoalToMonth(g1.id, monthRef)
    await linkGoalToMonth(g2.id, monthRef)
  }

  // ── 5. Key results, habits, trackers ──────────────────────────────────────

  const kr1 = rememberObject(
    'kr-runs',
    await keyResultDexieRepository.create({
      title: fixtureObject('kr-runs').title,
      isActive: true,
      status: 'open',
      goalId: g1.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
    })
  )
  const kr2 = rememberObject(
    'kr-distance',
    await keyResultDexieRepository.create({
      title: fixtureObject('kr-distance').title,
      isActive: true,
      status: 'open',
      goalId: g1.id,
      cadence: 'weekly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 15 },
    })
  )
  const kr3 = rememberObject(
    'kr-functions',
    await keyResultDexieRepository.create({
      title: fixtureObject('kr-functions').title,
      isActive: true,
      status: 'open',
      goalId: g2.id,
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 2 },
    })
  )
  const kr4 = rememberObject(
    'kr-deep-work',
    await keyResultDexieRepository.create({
      title: fixtureObject('kr-deep-work').title,
      isActive: true,
      status: 'open',
      goalId: g2.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 4 },
    })
  )

  const h1 = rememberObject(
    'habit-stretch',
    await habitDexieRepository.create({
      title: fixtureObject('habit-stretch').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 5 },
      priorityIds: priorityIdsFor('habit-stretch'),
      lifeAreaIds: [areaHealth.id],
    })
  )
  const h2 = rememberObject(
    'habit-dinner',
    await habitDexieRepository.create({
      title: fixtureObject('habit-dinner').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
      priorityIds: priorityIdsFor('habit-dinner'),
      lifeAreaIds: [areaRelations.id],
    })
  )
  const h3 = rememberObject(
    'habit-reading',
    await habitDexieRepository.create({
      title: fixtureObject('habit-reading').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 4 },
      priorityIds: priorityIdsFor('habit-reading'),
      lifeAreaIds: [areaGrowth.id],
    })
  )
  // entryDays min: "średnia ≥ 3 I loguj ≥ 5 dni" — missed weeks log a single
  // good rating, so the primary metric is met while presence fails.
  const h4 = rememberObject(
    'habit-routine',
    await habitDexieRepository.create({
      title: fixtureObject('habit-routine').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'rating',
      target: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'min', value: 5 },
      },
      ratingScaleMin: 1,
      ratingScale: 5,
      priorityIds: priorityIdsFor('habit-routine'),
      lifeAreaIds: [areaHealth.id],
    })
  )
  // entryDays max: track satisfaction but play at most 3 days — missed weeks
  // log 4 days, so the metric holds while the limit is exceeded.
  const h5 = rememberObject(
    'habit-gaming',
    await habitDexieRepository.create({
      title: fixtureObject('habit-gaming').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'rating',
      target: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'max', value: 3 },
      },
      ratingScaleMin: 1,
      ratingScale: 5,
      priorityIds: priorityIdsFor('habit-gaming'),
      lifeAreaIds: [areaGrowth.id],
    })
  )

  // Multi-completion: 3 weighted items, explicit threshold 3 of 4 pts — the
  // stack chart shows full (met), partial and empty days side by side.
  const h6 = rememberObject(
    'habit-checklist',
    await habitDexieRepository.create({
      title: fixtureObject('habit-checklist').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'multi-completion',
      target: { kind: 'count', operator: 'min', value: 4 },
      multiItems: [
        { id: 'wake', label: 'Pobudka 6:00', icon: 'alarm', weight: 1 },
        { id: 'meditate', label: 'Medytacja', icon: 'self_improvement', weight: 1 },
        { id: 'train', label: 'Trening', icon: 'fitness_center', weight: 2 },
      ],
      multiDailyThreshold: 3,
      priorityIds: priorityIdsFor('habit-checklist'),
      lifeAreaIds: [areaHealth.id],
    })
  )

  const t1 = rememberObject(
    'tracker-sleep',
    await trackerDexieRepository.create({
      title: fixtureObject('tracker-sleep').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'rating',
      priorityIds: priorityIdsFor('tracker-sleep'),
      lifeAreaIds: [areaHealth.id],
    })
  )
  const t2 = rememberObject(
    'tracker-coffee',
    await trackerDexieRepository.create({
      title: fixtureObject('tracker-coffee').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'counter',
      priorityIds: priorityIdsFor('tracker-coffee'),
      lifeAreaIds: [areaWork.id],
    })
  )
  // Multi-completion tracker (no target): default threshold = all active items.
  const t3 = rememberObject(
    'tracker-evening',
    await trackerDexieRepository.create({
      title: fixtureObject('tracker-evening').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'multi-completion',
      multiItems: [
        { id: 'no-screens', label: 'Bez ekranów po 22', icon: 'mobile_off', weight: 1 },
        { id: 'journal', label: 'Wieczorny dziennik', icon: 'edit_note', weight: 1 },
      ],
      priorityIds: priorityIdsFor('tracker-evening'),
      lifeAreaIds: [areaHealth.id],
    })
  )

  console.log('[verificationSeed] Created planning objects')

  // ── 6. Weekly scheduling, day assignments, entries ─────────────────────────

  const weeklySubjects: Array<{ subjectType: MeasurementSubjectType; id: string }> = [
    { subjectType: 'keyResult', id: kr1.id },
    { subjectType: 'keyResult', id: kr2.id },
    { subjectType: 'keyResult', id: kr4.id },
    { subjectType: 'habit', id: h1.id },
    { subjectType: 'habit', id: h2.id },
    { subjectType: 'habit', id: h3.id },
    { subjectType: 'habit', id: h4.id },
    { subjectType: 'habit', id: h5.id },
    { subjectType: 'habit', id: h6.id },
    { subjectType: 'tracker', id: t1.id },
    { subjectType: 'tracker', id: t2.id },
    { subjectType: 'tracker', id: t3.id },
  ]

  // Fixed weekday placement per subject (0=Mon … 6=Sun) — feeds the ritual's
  // "days" step and the stream week view. toggleMeasurementDayAssignment is a
  // TOGGLE: safe only because the seed always starts from a fresh database.
  const dayAssignments: Array<{
    subjectType: MeasurementSubjectType
    id: string
    offsets: number[]
  }> = [
    { subjectType: 'habit', id: h1.id, offsets: [0, 2, 4] },
    { subjectType: 'habit', id: h2.id, offsets: [4, 5, 6] },
    { subjectType: 'habit', id: h3.id, offsets: [0, 1, 2, 3] },
    { subjectType: 'keyResult', id: kr1.id, offsets: [1, 3, 5] },
    { subjectType: 'keyResult', id: kr4.id, offsets: [0, 1, 2, 3] },
  ]

  for (const [weekIdx, weekRef] of allWeeks.entries()) {
    for (const subject of weeklySubjects) {
      await linkMeasurementPeriod({
        subjectType: subject.subjectType,
        subjectId: subject.id,
        cadence: 'weekly',
        periodRef: weekRef,
      })
    }

    for (const assignment of dayAssignments) {
      for (const dayRef of weekDays(weekRef, assignment.offsets)) {
        await toggleMeasurementDayAssignment({
          subjectType: assignment.subjectType,
          subjectId: assignment.id,
          cadence: 'weekly',
          dayRef,
        })
      }
    }

    // Entries: staggered met/miss so rings and charts vary week to week.
    // Current week gets only days up to today (an in-progress week).
    await addEntries(
      'keyResult',
      kr1.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 0) ? [1, 3, 5] : [1])),
      null
    )
    await addEntries(
      'keyResult',
      kr2.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 1) ? [1, 3, 5] : [1, 3])),
      isMet(weekIdx, 1) ? 6 : 4
    )
    await addEntries(
      'keyResult',
      kr4.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 2) ? [0, 1, 2, 3] : [0, 1])),
      null
    )
    await addEntries(
      'habit',
      h1.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 1) ? [0, 1, 2, 3, 4] : [0, 2])),
      null
    )
    await addEntries(
      'habit',
      h2.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 2) ? [4, 5, 6] : [5])),
      null
    )
    await addEntries(
      'habit',
      h3.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 0) ? [0, 1, 2, 3] : [0, 3])),
      null
    )
    // h4 (entryDays min 5): met weeks log 5 days of "4"; missed weeks a single "3"
    // → primaryMet ∧ ¬presenceMet.
    await addEntries(
      'habit',
      h4.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 0) ? [0, 1, 2, 3, 4] : [2])),
      isMet(weekIdx, 0) ? 4 : 3
    )
    // h5 (entryDays max 3): met weeks stay within the 3-day limit; missed weeks
    // log 4 days of good ratings → primaryMet ∧ ¬presenceMet (limit exceeded).
    await addEntries(
      'habit',
      h5.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 1) ? [1, 3] : [1, 2, 4, 5])),
      4
    )
    // h6 (multi, threshold 3/4 pts): met weeks = 4 full days + 1 partial
    // (2 pts, amber); missed weeks = 2 low-point partials + 1 met day.
    if (isMet(weekIdx, 2)) {
      await addMultiEntries('habit', h6.id, upToToday(weekDays(weekRef, [0, 1, 2, 3])), [
        'wake',
        'meditate',
        'train',
      ])
      await addMultiEntries('habit', h6.id, upToToday(weekDays(weekRef, [4])), ['wake', 'meditate'])
    } else {
      await addMultiEntries('habit', h6.id, upToToday(weekDays(weekRef, [1, 3])), ['wake'])
      await addMultiEntries('habit', h6.id, upToToday(weekDays(weekRef, [5])), ['wake', 'train'])
    }
    // t3 (multi tracker, all-items threshold): alternating full and partial days.
    await addMultiEntries('tracker', t3.id, upToToday(weekDays(weekRef, [0, 2])), [
      'no-screens',
      'journal',
    ])
    await addMultiEntries('tracker', t3.id, upToToday(weekDays(weekRef, [4])), ['journal'])
    for (const [dayIdx, dayRef] of upToToday(weekDays(weekRef, [0, 2, 4, 6])).entries()) {
      await addEntries('tracker', t1.id, [dayRef], 2 + ((weekIdx + dayIdx) % 4))
    }
    for (const [dayIdx, dayRef] of upToToday(weekDays(weekRef, [0, 1, 2, 3, 4])).entries()) {
      await addEntries('tracker', t2.id, [dayRef], 1 + ((weekIdx + dayIdx) % 3))
    }
  }

  console.log(`[verificationSeed] Scheduled ${allWeeks.length} weeks`)

  // ── 7. Monthly KR (schedule + entries: met, missed, in-progress) ──────────

  for (const monthRef of [...closedMonths, currentMonth]) {
    await linkMeasurementPeriod({
      subjectType: 'keyResult',
      subjectId: kr3.id,
      cadence: 'monthly',
      periodRef: monthRef,
    })
  }
  const monthStart = (monthRef: MonthRef): DayRef => getPeriodBounds(monthRef).start
  for (const [monthIndex, monthRef] of closedMonths.entries()) {
    const cycle = monthIndex % 4
    if (cycle === 3) continue
    const offsets = cycle === 2 ? [9] : [4, 14]
    await addEntries(
      'keyResult',
      kr3.id,
      offsets.map(offset => addDaysToDayRef(monthStart(monthRef), offset)),
      1
    )
  }
  await addEntries('keyResult', kr3.id, upToToday([monthStart(currentMonth)]), 1)

  // ── 7b. Month V2 coverage objects ──────────────────────────────────────────
  // Cases the base dataset lacked: value average/last aggregations, lte/max
  // primary operators, a completion target > 7, monthly cadence in more entry
  // modes (incl. multi + specific-days on a boundary week), an orphan KR, a
  // retired historical habit with a long name, and month/week target overrides.

  const currentMonthWeeks = getChildPeriods(currentMonth) as WeekRef[]

  // Weekly value/average with gte — line chart, average aggregation.
  const kr5 = rememberObject(
    'kr-sleep',
    await keyResultDexieRepository.create({
      title: fixtureObject('kr-sleep').title,
      isActive: true,
      status: 'open',
      goalId: g1.id,
      cadence: 'weekly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
  )
  // Weekly value/last with lte + deliberately long title (layout stress).
  const kr6 = rememberObject(
    'kr-weight',
    await keyResultDexieRepository.create({
      title: fixtureObject('kr-weight').title,
      isActive: true,
      status: 'open',
      goalId: g1.id,
      cadence: 'weekly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'last', operator: 'lte', value: 80 },
    })
  )
  // Orphan KR: the data layer requires an active GoalMonthState before a KR
  // can be linked, so the orphan is produced the only way it can happen for
  // real — the goal gets archived AFTER its KR was planned. Month bundles then
  // drop the goal (isActive filter) while the KR stays → "Pozostałe rezultaty".
  const g3 = rememberObject(
    'goal-orphan',
    await goalDexieRepository.create({
      title: fixtureObject('goal-orphan').title,
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [areaGrowth.id],
      status: 'open',
    })
  )
  for (const monthRef of monthSet) {
    await linkGoalToMonth(g3.id, monthRef)
  }
  const kr7 = rememberObject(
    'kr-orphan',
    await keyResultDexieRepository.create({
      title: fixtureObject('kr-orphan').title,
      isActive: true,
      status: 'open',
      goalId: g3.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 2 },
    })
  )
  // Weekly counter with a MAX primary target (limit, not floor).
  const h7 = rememberObject(
    'habit-coffee-max',
    await habitDexieRepository.create({
      title: fixtureObject('habit-coffee-max').title,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'max', value: 10 },
      priorityIds: priorityIdsFor('habit-coffee-max'),
      lifeAreaIds: [areaHealth.id],
    })
  )
  // Monthly multi-completion (default all-items threshold) with entries in the
  // month's boundary week — the out-of-month day must not leak into July.
  const h8 = rememberObject(
    'habit-deep-clean',
    await habitDexieRepository.create({
      title: fixtureObject('habit-deep-clean').title,
      isActive: true,
      status: 'open',
      cadence: 'monthly',
      entryMode: 'multi-completion',
      target: { kind: 'count', operator: 'min', value: 4 },
      multiItems: [
        { id: 'plan', label: 'Plan strefy', icon: 'checklist', weight: 1 },
        { id: 'do', label: 'Sprzątnięta strefa', icon: 'cleaning_services', weight: 1 },
      ],
      priorityIds: priorityIdsFor('habit-deep-clean'),
      lifeAreaIds: [areaRelations.id],
    })
  )
  // Monthly completion with target > 7 and specific-days placement that starts
  // in the month's boundary week.
  const h9 = rememberObject(
    'habit-monthly-move',
    await habitDexieRepository.create({
      title: fixtureObject('habit-monthly-move').title,
      isActive: true,
      status: 'open',
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 12 },
      priorityIds: priorityIdsFor('habit-monthly-move'),
      lifeAreaIds: [areaHealth.id],
    })
  )
  // Retired historical habit: placed and logged only in past weeks — stays
  // visible in history, is not editable in planners.
  const h10 = rememberObject(
    'habit-retired',
    await habitDexieRepository.create({
      title: fixtureObject('habit-retired').title,
      isActive: true,
      status: 'retired',
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 2 },
      priorityIds: [],
      lifeAreaIds: [areaGrowth.id],
    })
  )

  for (const [weekIdx, weekRef] of allWeeks.entries()) {
    for (const id of [kr5.id, kr6.id, kr7.id]) {
      await linkMeasurementPeriod({
        subjectType: 'keyResult',
        subjectId: id,
        cadence: 'weekly',
        periodRef: weekRef,
      })
    }
    await linkMeasurementPeriod({
      subjectType: 'habit',
      subjectId: h7.id,
      cadence: 'weekly',
      periodRef: weekRef,
    })

    // kr5: sleep hours on 4 days — met weeks average 7.5, missed 6.5.
    for (const [dayIdx, dayRef] of upToToday(weekDays(weekRef, [0, 2, 4, 6])).entries()) {
      await addEntries('keyResult', kr5.id, [dayRef], (isMet(weekIdx, 0) ? 7 : 6) + (dayIdx % 2))
    }
    // kr6: two weigh-ins; the LAST one decides (79.4 ≤ 80 met, 81.2 missed).
    await addEntries('keyResult', kr6.id, upToToday(weekDays(weekRef, [1])), 80.5)
    await addEntries(
      'keyResult',
      kr6.id,
      upToToday(weekDays(weekRef, [4])),
      isMet(weekIdx, 1) ? 79.4 : 81.2
    )
    // kr7: orphan KR logs twice on met weeks.
    await addEntries(
      'keyResult',
      kr7.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 2) ? [2, 5] : [2])),
      null
    )
    // h7: coffee counter — met weeks total 8 (within limit), missed 12 (over).
    for (const dayRef of upToToday(weekDays(weekRef, [0, 2, 4]))) {
      await addEntries('habit', h7.id, [dayRef], isMet(weekIdx, 2) ? 3 : 4)
    }
  }

  // Archive g3 now that its KR is planned — from here on it is the orphan case.
  await goalDexieRepository.update(g3.id, { isActive: false })

  // ── Goals past their deadline (closing ritual) ─────────────────────────────
  // Spec: ideas/html-plans/2026-10-04-goal-closing-ritual.html. g4 is a full
  // SMART goal that ended four days ago with KRs in different states (4-step
  // ritual); g5 was created bare and is overdue since last month (3 steps).
  const windowMonths = [...monthSet].sort()
  const g4 = await goalDexieRepository.create({
    title: 'Blok treningowy',
    isActive: true,
    status: 'open',
    priorityIds: [p1.id],
    lifeAreaIds: [areaHealth.id],
    icon: 'fitness_center',
    startDate: monthStart(windowMonths[0]),
    targetDate: addDaysToDayRef(todayRef, -4),
    successDefinition:
      'Trzy treningi tygodniowo bez przerw dłuższych niż tydzień, przysiad 100 kg na koniec.',
    whyMatters: 'Siła jest fundamentem pod bieganie i pod plecy, które ostatnio dają znać.',
    confidenceRating: 8,
    achievabilityRationale: 'Mam już nawyk z zeszłego roku, trzeba tylko dołożyć ciężary.',
    obstacles: 'Sezon urlopowy, kontuzja kolana z zimy.',
    resources: 'Siłownia obok pracy, znajomy trener.',
  })
  for (const monthRef of windowMonths) {
    await linkGoalToMonth(g4.id, monthRef)
  }
  const kr8 = await keyResultDexieRepository.create({
    title: '3 treningi w tygodniu',
    isActive: true,
    status: 'open',
    goalId: g4.id,
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
  })
  const kr9 = await keyResultDexieRepository.create({
    title: 'Rozciąganie co wieczór',
    isActive: true,
    status: 'open',
    goalId: g4.id,
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 6 },
  })
  for (const [weekIdx, weekRef] of pastWeeks.entries()) {
    for (const id of [kr8.id, kr9.id]) {
      await linkMeasurementPeriod({
        subjectType: 'keyResult',
        subjectId: id,
        cadence: 'weekly',
        periodRef: weekRef,
      })
    }
    // Sessions: Mon/Wed/Fri, every fourth week only two → three of four weeks met.
    await addEntries(
      'keyResult',
      kr8.id,
      weekDays(weekRef, weekIdx % 4 === 3 ? [0, 4] : [0, 2, 4]),
      null
    )
    // Stretching: logged in the first two weeks only → missed, then no data.
    if (weekIdx < 2) {
      await addEntries('keyResult', kr9.id, weekDays(weekRef, [0, 1, 2]), null)
    }
  }
  const g5 = await goalDexieRepository.create({
    title: 'Porządek w finansach',
    isActive: true,
    status: 'open',
    priorityIds: [p2.id],
    lifeAreaIds: [areaWork.id],
    targetDate: addDaysToDayRef(todayRef, -19),
  })
  await linkGoalToMonth(g5.id, monthM1)
  await linkGoalToMonth(g5.id, currentMonth)

  // h10: only the older half of past weeks (retired since).
  for (const weekRef of pastWeeks.slice(0, Math.ceil(pastWeeks.length / 2))) {
    await linkMeasurementPeriod({
      subjectType: 'habit',
      subjectId: h10.id,
      cadence: 'weekly',
      periodRef: weekRef,
    })
    await addEntries('habit', h10.id, weekDays(weekRef, [1, 3]), null)
  }

  // Monthly-cadence coverage: h8 (multi) and h9 (specific-days, target > 7).
  for (const monthRef of [monthM1, currentMonth]) {
    await linkMeasurementPeriod({
      subjectType: 'habit',
      subjectId: h8.id,
      cadence: 'monthly',
      periodRef: monthRef,
    })
    await linkMeasurementPeriod({
      subjectType: 'habit',
      subjectId: h9.id,
      cadence: 'monthly',
      periodRef: monthRef,
    })
  }
  // h8 entries: boundary-week days of the current month (in-month only) + one
  // partial mid-month; previous month gets two full days.
  const currentMonthStart = monthStart(currentMonth)
  await addMultiEntries('habit', h8.id, upToToday([currentMonthStart]), ['plan', 'do'])
  await addMultiEntries('habit', h8.id, upToToday([addDaysToDayRef(currentMonthStart, 1)]), [
    'plan',
  ])
  await addMultiEntries(
    'habit',
    h8.id,
    [addDaysToDayRef(monthStart(monthM1), 5), addDaysToDayRef(monthStart(monthM1), 12)],
    ['plan', 'do']
  )
  // h9: specific days across the current month (starting in the boundary week),
  // roughly half of them logged.
  const h9Days = [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25].map(offset =>
    addDaysToDayRef(currentMonthStart, offset)
  )
  for (const dayRef of h9Days) {
    await toggleMeasurementDayAssignment({
      subjectType: 'habit',
      subjectId: h9.id,
      cadence: 'monthly',
      dayRef,
      monthRef: currentMonth,
    })
  }
  await addEntries('habit', h9.id, upToToday(h9Days.filter((_, i) => i % 2 === 0)), null)

  // Target overrides: a month override + a weekly per-week override on kr2, and
  // monthly week sub-targets (the planner's "Rozłóż"/Σ machinery) on kr3.
  await updateMeasurementTargetOverride({
    monthRef: currentMonth,
    subjectType: 'keyResult',
    subjectId: kr2.id,
    targetOverride: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 20 },
  })
  if (currentMonthWeeks[1]) {
    await updateMeasurementWeekTargetOverride({
      weekRef: currentMonthWeeks[1],
      subjectType: 'keyResult',
      subjectId: kr2.id,
      cadence: 'weekly',
      targetOverride: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 8 },
    })
  }
  for (const weekRef of currentMonthWeeks.slice(0, 2)) {
    await updateMeasurementWeekTargetOverride({
      weekRef,
      subjectType: 'keyResult',
      subjectId: kr3.id,
      cadence: 'monthly',
      monthRef: currentMonth,
      targetOverride: { kind: 'count', operator: 'min', value: 1 },
    })
  }

  console.log('[verificationSeed] Added Month V2 coverage objects and overrides')

  // ── 8. Weekly intentions (all weeks incl. current) ─────────────────────────

  const firstIntentionByWeek = new Map<WeekRef, string>()
  for (const [weekIdx, weekRef] of allWeeks.entries()) {
    const first = await createWeeklyIntention({
      weekRef,
      title: INTENTION_TITLES[weekIdx % INTENTION_TITLES.length],
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 1 },
      priorityIds: [priorities[weekIdx % priorities.length].id],
    })
    firstIntentionByWeek.set(weekRef, first.id)

    if (weekIdx % 2 === 0) {
      await createWeeklyIntention({
        weekRef,
        title: INTENTION_TITLES[(weekIdx + 5) % INTENTION_TITLES.length],
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 1 },
        priorityIds: [priorities[(weekIdx + 1) % priorities.length].id],
      })
    }

    // Past weeks: mark most first-intentions done so the review shows a mix.
    if (weekRef !== currentWeek && isMet(weekIdx, 1)) {
      await addEntries('weeklyIntention', first.id, weekDays(weekRef, [2]), null)
    }
  }

  // Closed intentions in the most recent past week — gives the objects-library
  // "show closed and archived" filter something to reveal.
  const closedIntentionWeek = pastWeeks[pastWeeks.length - 1]
  const retiredIntention = await createWeeklyIntention({
    weekRef: closedIntentionWeek,
    title: 'Wieczór bez ekranów po 21:00',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 1 },
  })
  await weeklyIntentionDexieRepository.update(retiredIntention.id, { status: 'retired' })
  const droppedIntention = await createWeeklyIntention({
    weekRef: closedIntentionWeek,
    title: 'Zimny prysznic codziennie rano',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 1 },
  })
  await weeklyIntentionDexieRepository.update(droppedIntention.id, { status: 'dropped' })

  // ── 9. Week plans (top-3) + review notes for closed weeks ─────────────────

  for (const [weekIdx, weekRef] of allWeeks.entries()) {
    const topPriorities: WeekTopPriorityRef[] = [
      { subjectType: 'habit', subjectId: h1.id },
      { subjectType: 'keyResult', subjectId: kr4.id },
      { subjectType: 'weeklyIntention', subjectId: firstIntentionByWeek.get(weekRef)! },
    ]
    await setWeekTopPriorities(weekRef, topPriorities)

    if (weekRef === currentWeek) continue

    await reflectionDexieRepository.upsertPeriodObjectReflection({
      periodType: 'week',
      periodRef: weekRef,
      subjectType: 'habit',
      subjectId: h1.id,
      note: WEEK_REVIEW_NOTES[weekIdx % WEEK_REVIEW_NOTES.length],
    })
    if (weekIdx % 2 === 1) {
      await reflectionDexieRepository.upsertPeriodObjectReflection({
        periodType: 'week',
        periodRef: weekRef,
        subjectType: 'keyResult',
        subjectId: kr4.id,
        note: WEEK_REVIEW_NOTES[(weekIdx + 2) % WEEK_REVIEW_NOTES.length],
      })
    }
  }

  // ── 10. Weekly reflections (closed weeks only — current stays planning-only) ─

  // Load (matrix demands fields) and state per area follow a small "story" so the
  // load/state ribbons visit every quadrant: heavy·good → heavy·bad → light·bad →
  // light·good → midpoint. One closed week is left without a reflection on purpose:
  // the ribbon has to show a gap there, not a 3·3.
  const LOAD_STORY = [5, 4, 5, 2, 1, 2, 3, 4] as const
  const STATE_STORY = [4, 5, 2, 1, 2, 4, 3, 4] as const
  const GAP_WEEK_INDEX = pastWeeks.length > 3 ? pastWeeks.length - 3 : -1
  for (const [weekIdx, weekRef] of pastWeeks.entries()) {
    if (weekIdx === GAP_WEEK_INDEX) continue
    const load = (area: number): number =>
      clampRating(LOAD_STORY[(weekIdx + area) % LOAD_STORY.length])
    const state = (area: number): number =>
      clampRating(STATE_STORY[(weekIdx + area) % STATE_STORY.length])
    // The actions column is history only (D10): still written so the classic wizard reads a full record.
    const action = (dim: number): number => clampRating(2 + ((weekIdx + dim) % 4))
    await structuredReflectionDexieRepository.upsertWeekly({
      weekRef,
      physicalIntensityRating: load(0),
      emotionalIntensityRating: load(1),
      taskLoadRating: load(2),
      closeOnesNeedsRating: load(3),
      physicalCareRating: action(4),
      emotionalProcessingRating: action(5),
      productivityRating: action(6),
      closeOnesSupportRating: action(7),
      energyRating: state(0),
      moodRating: state(1),
      calmRating: state(2),
      connectionRating: state(3),
      promptResponses: {
        wentWell: WEEK_ANCHOR_TEXTS.wentWell[weekIdx % WEEK_ANCHOR_TEXTS.wentWell.length],
        challenges: WEEK_ANCHOR_TEXTS.challenges[weekIdx % WEEK_ANCHOR_TEXTS.challenges.length],
        lessons: WEEK_ANCHOR_TEXTS.lessons[weekIdx % WEEK_ANCHOR_TEXTS.lessons.length],
      },
      freeformReflection: WEEK_FREEFORM_TEXTS[weekIdx % WEEK_FREEFORM_TEXTS.length],
      aiSummary: '',
    })
  }

  // ── 10b. Priority links + an unfinished creator-ritual draft ──────────────
  // Showcases the object↔priority relations (P0–P2): a couple of active links
  // (one still needing enrichment, mimicking a legacy backfill), two proposed
  // links on `stream` so its card shows the "Do dokończenia" checklist, and a
  // half-finished ritual draft so the resume banner appears.

  await createActiveLink(
    p1.id,
    { subjectType: 'goal', subjectId: g1.id },
    {
      contribution: 'Bieganie to najprostszy dowód, że kondycja wraca.',
      expectedSignal: 'Ciągły bieg 10 km bez marszobiegu',
    }
  )
  await createActiveLink(
    p1.id,
    { subjectType: 'habit', subjectId: h1.id },
    {
      contribution: 'Rozciąganie chroni przed kontuzją przy większym kilometrażu.',
      expectedSignal: 'Brak przeciążeń mimo częstszych biegów',
    }
  )
  // Legacy-style link: linked but never described (needsEnrichment).
  await priorityLinkDexieRepository.create({
    priorityId: p3.id,
    status: 'active',
    subjectRef: { subjectType: 'habit', subjectId: h2.id },
    contribution: '',
    expectedSignal: '',
    validFrom: h2.createdAt,
    needsEnrichment: true,
  })
  // Proposed links: objects the ritual suggested but the user has not created yet.
  await priorityLinkDexieRepository.create({
    priorityId: p2.id,
    status: 'proposed',
    proposal: { objectType: 'habit', title: 'Codzienny blok deep work' },
    contribution: 'Chronione bloki bez spotkań utrzymują cotygodniowe przyrosty.',
    expectedSignal: 'Co najmniej 3 bloki deep work w tygodniu',
    validFrom: p2.createdAt,
  })
  await priorityLinkDexieRepository.create({
    priorityId: p2.id,
    status: 'proposed',
    proposal: { objectType: 'tracker', title: 'Rozproszenia w ciągu dnia' },
    contribution: 'Świadomość rozproszeń pomaga wracać do jednego wątku.',
    expectedSignal: 'Spadek liczby przełączeń kontekstu',
    validFrom: p2.createdAt,
  })

  await saveDraftToDB(
    PRIORITY_CREATOR_DRAFT_KEY,
    JSON.stringify({
      stepIndex: 1,
      form: {
        title: 'Więcej spokoju finansowego',
        whyNow: 'Chcę przestać odkładać decyzje o budżecie na później.',
        direction: 'Świadome wydatki i poduszka bezpieczeństwa bez presji.',
        influence: 'Regularny przegląd wydatków, rozmowy, automatyczne odkładanie.',
        notControlled: 'Inflacja i nieprzewidziane wydatki.',
        tradeoffs: '',
        endingType: 'open',
        endingDescription: '',
      },
      progressSignals: ['Miesiąc domknięty na plusie'],
      riskSignals: [],
      proposals: [],
      savedAt: `${refs.day}T09:00:00.000Z`,
    })
  )

  // ── 11. Month plans, priority assessments, monthly reflections ────────────

  for (const monthRef of [...closedMonths, currentMonth]) {
    await setMonthTopPriorities(monthRef, [p1.id, p2.id, p3.id])
  }

  await setMonthlyPriorityAssessment(monthM2, p1.id, {
    effort: 3,
    verdict: 'continue',
    note: 'Rozkręcanie się po zimie — kierunek dobry.',
    // Signals defined on the priority, checked as "noticed this month".
    observedProgressSignals: ['Lepszy sen'],
  })
  await setMonthlyPriorityAssessment(monthM2, p2.id, {
    effort: 4,
    verdict: 'continue',
    note: 'Solidne tempo, regularne wydania.',
    observedProgressSignals: ['Regularne wydania funkcji'],
  })
  await setMonthlyPriorityAssessment(monthM2, p3.id, {
    effort: 3,
    verdict: 'adjust',
    note: 'Wieczory zbyt często zjadane przez pracę.',
    observedRiskSignals: ['Telefon przy stole'],
  })
  await setMonthlyPriorityAssessment(monthM1, p1.id, {
    effort: 4,
    verdict: 'continue',
    note: 'Dobra passa biegowa, utrzymuję kierunek.',
  })
  await setMonthlyPriorityAssessment(monthM1, p2.id, {
    effort: 3,
    verdict: 'adjust',
    note: 'Za mało deep work — przestawiam plan dnia.',
  })
  await setMonthlyPriorityAssessment(monthM1, p3.id, {
    effort: 2,
    verdict: 'pause',
    note: 'Miesiąc zdominowany przez pracę; wracam do tego za miesiąc.',
  })

  for (const [monthIndex, monthRef] of closedMonths.slice(0, -2).entries()) {
    await setMonthlyPriorityAssessment(monthRef, p1.id, {
      effort: 2 + (monthIndex % 3),
      verdict: monthIndex % 3 === 2 ? 'adjust' : 'continue',
      note:
        monthIndex % 2 === 0
          ? 'Rytm stopniowo się stabilizował.'
          : 'Potrzebna była lżejsza wersja planu.',
    })
    await setMonthlyPriorityAssessment(monthRef, p2.id, {
      effort: 3 + (monthIndex % 2),
      verdict: monthIndex % 4 === 3 ? 'pause' : 'continue',
      note: 'Najwięcej wnosiły chronione bloki pracy bez spotkań.',
    })
    await setMonthlyPriorityAssessment(monthRef, p3.id, {
      effort: 2 + ((monthIndex + 1) % 3),
      verdict: monthIndex % 2 === 0 ? 'adjust' : 'continue',
      note: 'Wspólne wieczory działały, gdy były zaplanowane z wyprzedzeniem.',
    })
  }

  for (const [monthIdx, monthRef] of closedMonths.entries()) {
    const rating = (dim: number): number => clampRating(3 + ((monthIdx + dim) % 3))
    // The most recent closed month is deliberately PARTIAL (two axes unrated) —
    // compass renderers must show dots without a polygon and never coerce to 0.
    const partial = monthRef === monthM1
    await structuredReflectionDexieRepository.upsertMonthly({
      monthRef,
      balanceRating: rating(0),
      purposeRating: rating(1),
      growthRating: rating(2),
      coherenceRating: partial ? null : rating(3),
      agencyRating: partial ? null : rating(4),
      promptResponses: {},
      freeformReflection: MONTH_FREEFORM_TEXTS[monthIdx % MONTH_FREEFORM_TEXTS.length],
      aiSummary: '',
    })
  }

  // ── 12. Journal entries + emotion logs (last ~5 weeks, midday-UTC stamps) ──
  // Stream day cards match `createdAt` against a UTC day window, so timestamps
  // are seeded at fixed UTC hours inside the target day.

  const emotionPools = buildEmotionPools()
  const pickEmotion = (index: number): string => {
    const pool = emotionPools[index % emotionPools.length]
    return pool[Math.floor(index / emotionPools.length) % pool.length]
  }

  const journalWeeks = pastWeeks.slice(-5)
  let journalIdx = 0
  let emotionIdx = 0

  for (const weekRef of journalWeeks) {
    for (const dayRef of weekDays(weekRef, [0, 2, 4])) {
      const text = JOURNAL_TEXTS[journalIdx % JOURNAL_TEXTS.length]
      await journalDexieRepository.create({
        title: text.title,
        body: text.body,
        emotionIds: [pickEmotion(journalIdx)],
        createdAt: `${dayRef}T12:00:00.000Z`,
      })
      journalIdx++
    }
    for (const dayRef of weekDays(weekRef, [0, 1, 3, 4, 6])) {
      await emotionLogDexieRepository.create({
        emotionIds: [pickEmotion(emotionIdx), pickEmotion(emotionIdx + 7)],
        note: EMOTION_NOTES[emotionIdx % EMOTION_NOTES.length],
        createdAt: `${dayRef}T13:00:00.000Z`,
      })
      emotionIdx++
    }
  }

  // Today gets one of each so the current day card is alive.
  const todayText = JOURNAL_TEXTS[journalIdx % JOURNAL_TEXTS.length]
  await journalDexieRepository.create({
    title: todayText.title,
    body: todayText.body,
    emotionIds: [pickEmotion(journalIdx)],
    createdAt: `${todayRef}T08:00:00.000Z`,
  })
  await emotionLogDexieRepository.create({
    emotionIds: [pickEmotion(emotionIdx)],
    note: EMOTION_NOTES[emotionIdx % EMOTION_NOTES.length],
    createdAt: `${todayRef}T09:00:00.000Z`,
  })

  console.log(
    `[verificationSeed] Created ${journalIdx + 1} journal entries and ${emotionIdx + 1} emotion logs`
  )

  // ── 13. Exercise completions + micro entries ────────────────────────────────
  // Fresh seed DBs are created at the latest schema version, so the v23
  // completion backfill never runs here — completions are written explicitly.
  // dayRef must equal the local day of completedAt; midday-UTC stamps keep
  // that true for the PL timezone (same convention as §12). TODAY is left
  // without completions so the Today card demonstrates the suggestion state;
  // gratitude-list/worry-tree at −4/−5 days sit just outside the 3-day
  // exclusion window of the suggestion service.
  const completionSeeds: Array<[slug: string, daysAgo: number]> = [
    ['vlq', 20],
    ['worry-tree', 16],
    ['gratitude-list', 12],
    ['box-breathing', 9],
    ['daily-ifs-checkin', 6],
    ['worry-tree', 5],
    ['gratitude-list', 4],
  ]

  const gratitudeEntry = await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'gratitude-list',
    responses: {
      items: ['zdrowie', 'spokojny poranek', 'rozmowa z przyjaciółką'],
      why: 'Spokojny poranek nadał ton całemu dniu.',
    },
    createdAt: `${addDaysToDayRef(todayRef, -4)}T12:00:00.000Z`,
  })

  for (const [slug, daysAgo] of completionSeeds) {
    const dayRef = addDaysToDayRef(todayRef, -daysAgo)
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      dayRef,
      completedAt: `${dayRef}T12:00:00.000Z`,
      recordId: slug === 'gratitude-list' && daysAgo === 4 ? gratitudeEntry.id : undefined,
      source: 'standalone',
    })
  }

  console.log(`[verificationSeed] Created ${completionSeeds.length} exercise completions`)

  // ── 14. Exercise plan items (Phase 2 repeats) ───────────────────────────────
  // Explicit dayRefs, NOT derived from suggestedRepeatDays — the tile needs
  // one due and one overdue plan today regardless of the completion history
  // above. Both stay 'pending': seeds write via the repo, so recordCompletion's
  // auto-complete never runs. Completing either exercise in-app demonstrates
  // the auto-tick end to end; a micro slug keeps that a 2-minute affair.
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'box-breathing',
    dayRef: todayRef,
    source: 'repeat',
  })
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'gratitude-list',
    dayRef: addDaysToDayRef(todayRef, -3),
    source: 'repeat',
  })

  console.log('[verificationSeed] Created 2 exercise plan items (1 due, 1 overdue)')

  // ── 15. Program enrollment (Phase 3 ścieżki) ────────────────────────────────
  // "Poznaj swoje części" mid-path: steps 0–1 done (−9/−4 days), step 2
  // (trailhead, minGapDays 4) pending and due exactly TODAY — consistent
  // with eligibleDayForStep, so the Today-load scheduler idempotently
  // no-ops over this seed. Matching §13-style completions keep the
  // history coherent (midday-UTC stamps, same convention).
  const enrollmentStart = addDaysToDayRef(todayRef, -9)
  const ifsEnrollment = await programEnrollmentDexieRepository.create({
    programSlug: 'ifs-parts',
    startedAt: `${enrollmentStart}T12:00:00.000Z`,
  })
  await programEnrollmentDexieRepository.update(ifsEnrollment.id, {
    currentStepIndex: 2,
    completedSteps: [
      { stepIndex: 0, completedAt: `${enrollmentStart}T12:00:00.000Z` },
      { stepIndex: 1, completedAt: `${addDaysToDayRef(todayRef, -4)}T12:00:00.000Z` },
    ],
  })
  for (const [slug, daysAgo] of [
    ['parts-mapping', 9],
    ['unblending', 4],
  ] as const) {
    const dayRef = addDaysToDayRef(todayRef, -daysAgo)
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      dayRef,
      completedAt: `${dayRef}T12:00:00.000Z`,
      source: 'plan',
    })
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'trailhead',
    dayRef: todayRef,
    source: 'program',
    sourceRef: ifsEnrollment.id,
  })

  console.log('[verificationSeed] Created 1 active program enrollment (ifs-parts, step 3/7)')

  // ── 15b. Problem path mid-way: "Lęk: podejść zamiast unikać" ────────────────
  // Steps 0–5 done (GAD-7 −16 … thought-record −4); step 6 (behavioral-
  // experiment, minGapDays 4) is due TODAY. Practices: worry postponement
  // daily with a history of ten evenings (the "still matters" slider falls)
  // and yesterday's occurrence still pending (overdue by one day); paced
  // breathing done today, next one in two days. Two closed weeks carry an
  // accepted real-world task (weekly intention with programLink) and a
  // weekly-reflection "Ścieżka" answer (severity 4 → 3); the current week
  // has no decision, so the weekly plan shows a fresh proposal.
  const anxietyStart = addDaysToDayRef(todayRef, -16)
  const anxietyEnrollment = await programEnrollmentDexieRepository.create({
    programSlug: 'anxiety-approach',
    startedAt: `${anxietyStart}T12:00:00.000Z`,
    contentVersion: 2,
  })
  // v2 (2026-10-18): seven steps done (week 1 with "Mój znak", week 2, the thought record of week 3), the experiment due today.
  const anxietyStepDays = [16, 16, 15, 14, 13, 10, 4] as const
  const anxietyStepSlugs = [
    'gad-7',
    'ius-12',
    'anxiety-map',
    'my-sign',
    'worry-tree',
    'cognitive-distortions',
    'thought-record',
  ] as const
  for (const [index, slug] of anxietyStepSlugs.entries()) {
    const dayRef = addDaysToDayRef(todayRef, -anxietyStepDays[index]!)
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      dayRef,
      completedAt: `${dayRef}T12:00:00.000Z`,
      source: 'plan',
    })
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'behavioral-experiment',
    dayRef: todayRef,
    source: 'program',
    sourceRef: anxietyEnrollment.id,
    programRole: 'step',
    programStepIndex: 7,
  })
  // The map (with the v2 reaction families) and "Mój znak" written for this path.
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'anxiety-map',
    createdAt: `${addDaysToDayRef(todayRef, -15)}T12:00:00.000Z`,
    responses: {
      situations: ['Telefon do urzędu', 'Spotkanie z nowym zespołem'],
      bodySigns: ['kołatanie serca', 'ścisk w żołądku'],
      reactionKinds: ['postpone', 'check'],
      avoidance: [
        'Odkładam telefony do urzędów',
        'Omijam spotkania, na których trzeba się przedstawić',
      ],
      safetyBehaviors: [
        'Sprawdzam maila kilka razy przed wysłaniem',
        'Pytam żonę, czy na pewno dobrze napisałem',
      ],
      cost: 'Sprawy leżą tygodniami, a ja i tak o nich myślę.',
      withoutFear: 'Załatwiać sprawy od razu i poznawać ludzi bez przygotowywania każdego zdania.',
    },
  })
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'my-sign',
    createdAt: `${addDaysToDayRef(todayRef, -14)}T12:00:00.000Z`,
    responses: {
      kind: 'anxiety',
      anxietyTarget: 'postpone',
      sign: 'Zadzwonię do urzędu tego samego dnia, w którym o tym pomyślę.',
      safePerson: 'Żona.',
    },
  })
  // Anxiety Moments v2: the quick five (reaction · noticed · moves · strength), prose optional.
  const anxietyMoments = [
    {
      daysAgo: 13,
      anxietyReaction: 'postpone',
      noticed: 'hours',
      anxietyResponse: ['nothing'],
      anxietyStrength: 4,
      situation: 'Miałem zadzwonić do urzędu, przełożyłem na jutro.',
      thought: 'Na pewno zapytają o coś, czego nie będę wiedział.',
    },
    {
      daysAgo: 11,
      anxietyReaction: 'check',
      noticed: 'soon',
      anxietyResponse: ['named'],
      anxietyStrength: 3,
      situation: 'Trzy razy sprawdziłem maila do szefa przed wysłaniem.',
      thought: 'Jeśli będzie błąd, uzna mnie za niechluja.',
    },
    {
      daysAgo: 9,
      anxietyReaction: 'worry',
      noticed: 'hours',
      anxietyResponse: ['postponed', 'breath'],
      anxietyStrength: 4,
      situation: 'Wieczorem łańcuch „a co jeśli” o wynikach badań.',
    },
    {
      daysAgo: 7,
      anxietyReaction: 'approach',
      noticed: 'during',
      anxietyResponse: ['prediction', 'anyway'],
      anxietyStrength: 3,
      situation: 'Przedstawiłem się na spotkaniu nowego zespołu.',
      thought: 'Zatnę się i wszyscy to zobaczą.',
      outcome: 'Zaciąłem się raz. Nikt nie zareagował.',
    },
    {
      daysAgo: 5,
      anxietyReaction: 'check',
      noticed: 'during',
      anxietyResponse: ['noCheck'],
      anxietyStrength: 2,
      situation: 'Wysłałem wiadomość po jednym sprawdzeniu.',
    },
    {
      daysAgo: 3,
      anxietyReaction: 'postpone',
      noticed: 'soon',
      anxietyResponse: ['named', 'step'],
      anxietyStrength: 3,
      situation: 'Znów odłożyłem telefon, ale zapisałem go na jutro rano.',
    },
    {
      daysAgo: 1,
      anxietyReaction: 'approach',
      noticed: 'during',
      anxietyResponse: ['breath', 'prediction', 'anyway'],
      anxietyStrength: 3,
      situation: 'Zadzwoniłem do urzędu.',
      thought: 'Będą niemili i odłożą słuchawkę.',
      outcome: 'Pani była znudzona, ale wszystko wyjaśniła.',
    },
  ] as const
  for (const moment of anxietyMoments) {
    const dayRef = addDaysToDayRef(todayRef, -moment.daysAgo)
    const occurrence = await exercisePlanDexieRepository.create({
      exerciseSlug: 'moment-anxiety',
      dayRef,
      source: 'program',
      sourceRef: anxietyEnrollment.id,
      programRole: 'practice',
    })
    const entry = await microExerciseEntryDexieRepository.create({
      exerciseSlug: 'moments',
      createdAt: `${dayRef}T19:00:00.000Z`,
      responses: {
        kind: 'anxiety',
        hadMoment: 'yes',
        anxietyReaction: moment.anxietyReaction,
        noticed: moment.noticed,
        anxietyResponse: [...moment.anxietyResponse],
        anxietyStrength: moment.anxietyStrength,
        situation: moment.situation,
        ...('thought' in moment ? { thought: moment.thought } : {}),
        ...('outcome' in moment ? { outcome: moment.outcome } : {}),
      },
    })
    await exercisePlanDexieRepository.update(occurrence.id, { status: 'done', recordId: entry.id })
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: 'moment-anxiety',
      dayRef,
      completedAt: `${dayRef}T19:00:00.000Z`,
      recordId: entry.id,
      source: 'plan',
    })
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'moment-anxiety',
    dayRef: addDaysToDayRef(todayRef, 1),
    source: 'program',
    sourceRef: anxietyEnrollment.id,
    programRole: 'practice',
  })

  // Worry postponement: ten handled evenings (skips on −9 and −5), yesterday pending.
  const worryEvenings = [14, 13, 12, 11, 10, 8, 7, 6, 4, 2]
  const stillMatters = [80, 80, 70, 70, 60, 60, 50, 50, 40, 40]
  for (const [index, daysAgo] of worryEvenings.entries()) {
    const dayRef = addDaysToDayRef(todayRef, -daysAgo)
    const occurrence = await exercisePlanDexieRepository.create({
      exerciseSlug: 'worry-postponement',
      dayRef,
      source: 'program',
      sourceRef: anxietyEnrollment.id,
      programRole: 'practice',
    })
    const entry = await microExerciseEntryDexieRepository.create({
      exerciseSlug: 'worry-postponement',
      createdAt: `${dayRef}T19:30:00.000Z`,
      responses: {
        worries: ['Czy zdążę z raportem', 'Rozmowa z szefem w czwartek', 'Wyniki badań'].slice(
          0,
          1 + (index % 3)
        ),
        stillMatters: stillMatters[index]!,
      },
    })
    await exercisePlanDexieRepository.update(occurrence.id, { status: 'done', recordId: entry.id })
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: 'worry-postponement',
      dayRef,
      completedAt: `${dayRef}T19:30:00.000Z`,
      recordId: entry.id,
      source: 'plan',
    })
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'worry-postponement',
    dayRef: addDaysToDayRef(todayRef, -1),
    source: 'program',
    sourceRef: anxietyEnrollment.id,
    programRole: 'practice',
  })
  const breathingToday = await exercisePlanDexieRepository.create({
    exerciseSlug: 'paced-breathing',
    dayRef: todayRef,
    source: 'program',
    sourceRef: anxietyEnrollment.id,
    programRole: 'practice',
  })
  await exercisePlanDexieRepository.update(breathingToday.id, { status: 'done' })
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'paced-breathing',
    dayRef: addDaysToDayRef(todayRef, 2),
    source: 'program',
    sourceRef: anxietyEnrollment.id,
    programRole: 'practice',
  })

  // Baseline GAD-7 (13/21, moderate), linked to step 1 below so the path view shows it under "Mapa lęku".
  const gadEntry = getAssessmentRegistryEntry('gad-7')
  const gadAttempt = await assessmentsDexieRepository.startAttempt({
    assessmentId: 'gad-7',
    instrumentVersion: gadEntry.definition.instrumentVersion,
    language: 'pl',
    scoringKeyVersion: gadEntry.definition.scoringKeyVersion,
    missingDataPolicyVersion: gadEntry.definition.missingDataPolicy.id,
    totalItems: gadEntry.definition.items.length,
  })
  const gadAnswers = [2, 2, 3, 2, 1, 2, 1]
  const gadResponses = await assessmentsDexieRepository.bulkSaveResponses(
    gadEntry.definition.items.map((item, index) => ({
      attemptId: gadAttempt.id,
      assessmentId: 'gad-7' as const,
      itemId: item.id,
      responseValue: gadAnswers[index]!,
      reverseFlagAtTime: item.reverse,
      scoringKeyVersion: gadEntry.definition.scoringKeyVersion,
    }))
  )
  await assessmentsDexieRepository.completeAttempt(
    gadAttempt.id,
    gadEntry.scorer.score({ definition: gadEntry.definition, responses: gadResponses })
  )

  await programEnrollmentDexieRepository.update(anxietyEnrollment.id, {
    currentStepIndex: 7,
    // The baseline attempt is the first step's record, so the path view's measure finds it.
    completedSteps: anxietyStepSlugs.map((_, index) => ({
      stepIndex: index,
      completedAt: `${addDaysToDayRef(todayRef, -anxietyStepDays[index]!)}T12:00:00.000Z`,
      ...(index === 0 ? { recordId: gadAttempt.id } : {}),
    })),
  })

  // Two closed weeks with an accepted real-world task + reflection answers.
  const pathWeeks = [
    {
      daysAgo: 14,
      taskKey: 'noticeAvoidance',
      title: 'Zauważ sytuacje, w których coś omijasz albo się zabezpieczasz',
      times: 3,
      done: [13, 11],
      severity: '4',
    },
    {
      daysAgo: 7,
      taskKey: 'predictionCheck',
      title: 'Zapisz przewidywanie przed trudną sytuacją i sprawdź je po niej',
      times: 2,
      done: [6, 4],
      severity: '3',
    },
  ] as const
  const weekLog = []
  for (const week of pathWeeks) {
    const weekRef = getPeriodRefsForDate(
      new Date(`${addDaysToDayRef(todayRef, -week.daysAgo)}T12:00:00`)
    ).week
    if (weekRef === refs.week) continue
    const intention = await createWeeklyIntention({
      weekRef,
      title: week.title,
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: week.times },
      programLink: { enrollmentId: anxietyEnrollment.id, taskKey: week.taskKey },
    })
    for (const daysAgo of week.done) {
      const dayRef = addDaysToDayRef(todayRef, -daysAgo)
      if (getPeriodRefsForDate(new Date(`${dayRef}T12:00:00`)).week !== weekRef) continue
      await planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'weeklyIntention',
        subjectId: intention.id,
        dayRef,
        value: null,
      })
    }
    weekLog.push({
      weekRef,
      taskKey: week.taskKey,
      decision: 'accepted' as const,
      intentionId: intention.id,
    })
    const reflection = await structuredReflectionDexieRepository.getWeekly(weekRef)
    if (reflection) {
      await structuredReflectionDexieRepository.upsertWeekly({
        weekRef,
        promptResponses: {
          ...reflection.promptResponses,
          [`program.${anxietyEnrollment.id}.severity`]: week.severity,
          [`program.${anxietyEnrollment.id}.outcome`]:
            week.taskKey === 'noticeAvoidance'
              ? 'Zauważyłem, że odkładam telefony i sprawdzam maile po kilka razy.'
              : 'Przewidywałem katastrofę na spotkaniu. Było trudno, ale nikt nie zauważył mojego stresu.',
          [`program.${anxietyEnrollment.id}.phase`]:
            week.taskKey === 'noticeAvoidance'
              ? 'Najczęściej unikam telefonów do urzędów.'
              : 'Sprawdziły się może w jednej trzeciej.',
        },
      })
    }
  }
  await programEnrollmentDexieRepository.update(anxietyEnrollment.id, { weekLog })

  // An earlier fear ladder with a few attempts, so the attempt log and the
  // "continue the ladder" mode (/exercises/graded-exposure?continue=latest)
  // have something to show before the path reaches its exposure steps.
  const attempt = (daysAgo: number, before: number, peak: number, after: number) => ({
    id: crypto.randomUUID(),
    date: addDaysToDayRef(todayRef, -daysAgo),
    anxietyBefore: before,
    anxietyPeak: peak,
    anxietyAfter: after,
    duration: 15,
  })
  await gradedExposureHierarchyDexieRepository.create({
    fearTarget: 'Telefony do urzędów i obcych osób',
    ultimateGoal: 'Załatwiać sprawy telefonicznie bez odkładania',
    safetyBehaviors: [
      'Scenariusz rozmowy na kartce',
      'Sprawdzanie godzin kilka razy',
      'Proszenie kogoś, żeby zadzwonił',
    ],
    items: [
      {
        id: crypto.randomUUID(),
        situation: 'Zadzwonić do apteki z pytaniem o lek',
        sudsRating: 30,
        completed: true,
        attempts: [attempt(20, 35, 40, 15), attempt(18, 25, 30, 10)],
      },
      {
        id: crypto.randomUUID(),
        situation: 'Umówić wizytę u lekarza przez telefon',
        sudsRating: 50,
        completed: false,
        attempts: [attempt(12, 55, 65, 35)],
      },
      {
        id: crypto.randomUUID(),
        situation: 'Zadzwonić do urzędu w sprawie wniosku',
        sudsRating: 75,
        completed: false,
        attempts: [],
      },
    ],
  })

  console.log(
    '[verificationSeed] Created 1 problem-path enrollment (anxiety-approach v2, step 8/22, 2 practices, 7 moments)'
  )

  // ── 16b. Anger path v2 (ideas/html-plans/2026-10-18-anger-anxiety-paths-v2.html) ──
  // Enrolled 18 days ago, six steps done (barometer, map, sign, pause plan,
  // distortions, thought record); the seventh — the barometer halfway, week
  // 3 — due today. Eight anger Moments with the v2 quick taps (reaction ·
  // noticed · moves · strength), the breath and Momenty pending, and an
  // accepted task for the current week (altThought, one day via a Moment).
  const angerStart = addDaysToDayRef(todayRef, -18)
  const angerEnrollment = await programEnrollmentDexieRepository.create({
    programSlug: 'anger-signal',
    startedAt: `${angerStart}T12:00:00.000Z`,
    contentVersion: 2,
  })
  const seedAttempt = async (assessmentId: 'anger-barometer', answers: readonly number[]) => {
    const registry = getAssessmentRegistryEntry(assessmentId)
    const attempt = await assessmentsDexieRepository.startAttempt({
      assessmentId,
      instrumentVersion: registry.definition.instrumentVersion,
      language: 'pl',
      scoringKeyVersion: registry.definition.scoringKeyVersion,
      missingDataPolicyVersion: registry.definition.missingDataPolicy.id,
      totalItems: registry.definition.items.length,
    })
    const responses = await assessmentsDexieRepository.bulkSaveResponses(
      registry.definition.items.map((item, index) => ({
        attemptId: attempt.id,
        assessmentId,
        itemId: item.id,
        responseValue: answers[index] ?? answers[answers.length - 1] ?? 2,
        reverseFlagAtTime: item.reverse,
        scoringKeyVersion: registry.definition.scoringKeyVersion,
      }))
    )
    await assessmentsDexieRepository.completeAttempt(
      attempt.id,
      registry.scorer.score({ definition: registry.definition, responses })
    )
    return attempt
  }
  const angerBaseline = await seedAttempt('anger-barometer', [3, 3, 2, 3, 2])
  const angerStepDays = [18, 17, 16, 14, 11, 8] as const
  const angerStepSlugs = [
    'anger-barometer',
    'anger-map',
    'my-sign',
    'pause-plan',
    'cognitive-distortions',
    'thought-record',
  ] as const
  for (const [index, slug] of angerStepSlugs.entries()) {
    const dayRef = addDaysToDayRef(todayRef, -angerStepDays[index]!)
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      dayRef,
      completedAt: `${dayRef}T12:00:00.000Z`,
      source: 'plan',
    })
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'anger-barometer',
    dayRef: todayRef,
    source: 'program',
    sourceRef: angerEnrollment.id,
    programRole: 'step',
    programStepIndex: 6,
  })
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'anger-map',
    createdAt: `${addDaysToDayRef(todayRef, -17)}T12:00:00.000Z`,
    responses: {
      triggers: ['Gdy ktoś mi przerywa', 'Bałagan po dzieciach wieczorem'],
      bodySigns: ['napięte ramiona', 'szybsza mowa'],
      reactionKinds: ['sharp', 'outburst'],
      reaction: 'Najpierw sarkazm, potem podniesiony głos. Czasem trzaskam drzwiami.',
      cost: 'Dzieci cichną, żona wychodzi z pokoju, a mnie zostaje wstyd.',
      protects: 'Chyba poczucia, że mnie nie słuchają.',
    },
  })
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'my-sign',
    createdAt: `${addDaysToDayRef(todayRef, -16)}T12:00:00.000Z`,
    responses: {
      kind: 'anger',
      angerTarget: 'outburst',
      sign: 'Nie krzyknę na dzieci przy kolacji. Powiem, że potrzebuję minuty, i wrócę.',
      safePerson: 'Brat.',
    },
  })
  const pausePlanEntry = await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'pause-plan',
    createdAt: `${addDaysToDayRef(todayRef, -14)}T12:00:00.000Z`,
    responses: {
      earlySigns: ['napięte ramiona', 'szybsza mowa'],
      ifThen: 'Jeśli zauważę, że mówię szybciej, to powiem „potrzebuję minuty” i wyjdę do kuchni.',
      returnPromise: 'Powiem: „Wracam za pięć minut i dokończymy”.',
      confidence: 70,
    },
  })
  const angerMoments = [
    {
      daysAgo: 16,
      angerReaction: 'outburst',
      noticed: 'later',
      angerResponse: ['nothing'],
      angerStrength: 5,
      situation: 'Krzyknąłem na syna za rozlane mleko.',
      thought: 'Nigdy nie uważa.',
    },
    {
      daysAgo: 13,
      angerReaction: 'sharp',
      noticed: 'hours',
      angerResponse: ['named'],
      angerStrength: 3,
      situation: 'Sarkazm, gdy żona zapytała o rachunki.',
      thought: 'Znowu ja mam wszystko pamiętać.',
    },
    {
      daysAgo: 11,
      angerReaction: 'silence',
      noticed: 'hours',
      angerResponse: ['breath'],
      angerStrength: 3,
      situation: 'Przemilczałem uwagę kolegi na stand-upie i gotowałem się do wieczora.',
    },
    {
      daysAgo: 9,
      angerReaction: 'pause',
      noticed: 'during',
      angerResponse: ['named', 'pause', 'announce'],
      angerStrength: 4,
      situation: 'Przerwano mi w połowie zdania; powiedziałem, że potrzebuję minuty.',
      thought: 'Nie szanują mojego czasu.',
      need: ['respect'],
    },
    {
      daysAgo: 7,
      angerReaction: 'sharp',
      noticed: 'soon',
      angerResponse: ['breath', 'altThought'],
      angerStrength: 3,
      situation: 'Ostry ton do kuriera, który spóźnił się godzinę.',
      thought: 'Robi to specjalnie.',
    },
    {
      daysAgo: 5,
      angerReaction: 'selfBlame',
      noticed: 'hours',
      angerResponse: ['named'],
      angerStrength: 3,
      situation: 'Po kłótni cały wieczór obwiniałem siebie.',
    },
    {
      daysAgo: 3,
      angerReaction: 'pause',
      noticed: 'during',
      angerResponse: ['pause', 'returned', 'request'],
      angerStrength: 3,
      situation: 'Bałagan w salonie; wyszedłem na minutę i poprosiłem o sprzątnięcie przed bajką.',
      need: ['order', 'cooperation'],
    },
    {
      daysAgo: 1,
      angerReaction: 'sharp',
      noticed: 'soon',
      angerResponse: ['named', 'altThought'],
      angerStrength: 2,
      situation: 'Przytyk do żony o spóźnienie; po chwili pomyślałem, że korki nie są jej winą.',
      thought: 'Zawsze się spóźnia.',
    },
  ] as const
  const angerMomentIds: string[] = []
  for (const moment of angerMoments) {
    const dayRef = addDaysToDayRef(todayRef, -moment.daysAgo)
    const occurrence = await exercisePlanDexieRepository.create({
      exerciseSlug: 'moment-anger',
      dayRef,
      source: 'program',
      sourceRef: angerEnrollment.id,
      programRole: 'practice',
    })
    const entry = await microExerciseEntryDexieRepository.create({
      exerciseSlug: 'moments',
      createdAt: `${dayRef}T19:00:00.000Z`,
      responses: {
        kind: 'anger',
        hadMoment: 'yes',
        angerReaction: moment.angerReaction,
        noticed: moment.noticed,
        angerResponse: [...moment.angerResponse],
        angerStrength: moment.angerStrength,
        situation: moment.situation,
        ...('thought' in moment ? { thought: moment.thought } : {}),
        ...('need' in moment ? { need: [...moment.need] } : {}),
      },
    })
    angerMomentIds.push(entry.id)
    await exercisePlanDexieRepository.update(occurrence.id, { status: 'done', recordId: entry.id })
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: 'moment-anger',
      dayRef,
      completedAt: `${dayRef}T19:00:00.000Z`,
      recordId: entry.id,
      source: 'plan',
    })
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'moment-anger',
    dayRef: addDaysToDayRef(todayRef, 1),
    source: 'program',
    sourceRef: angerEnrollment.id,
    programRole: 'practice',
  })
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'paced-breathing',
    dayRef: todayRef,
    source: 'program',
    sourceRef: angerEnrollment.id,
    programRole: 'practice',
  })
  await programEnrollmentDexieRepository.update(angerEnrollment.id, {
    currentStepIndex: 6,
    completedSteps: angerStepSlugs.map((_, index) => ({
      stepIndex: index,
      completedAt: `${addDaysToDayRef(todayRef, -angerStepDays[index]!)}T12:00:00.000Z`,
      ...(index === 0 ? { recordId: angerBaseline.id } : {}),
      ...(index === 3 ? { recordId: pausePlanEntry.id } : {}),
    })),
  })
  // This week's accepted task: "recall another thought" 2×; yesterday's Moment (altThought) counts as its first day.
  const angerIntention = await createWeeklyIntention({
    weekRef: refs.week,
    title: 'Przypomnij sobie inną myśl',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 2 },
    programLink: { enrollmentId: angerEnrollment.id, taskKey: 'altThought' },
  })
  const angerYesterday = addDaysToDayRef(todayRef, -1)
  if (getPeriodRefsForDate(new Date(`${angerYesterday}T12:00:00`)).week === refs.week) {
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'weeklyIntention',
      subjectId: angerIntention.id,
      dayRef: angerYesterday,
      value: null,
    })
  }
  await programEnrollmentDexieRepository.update(angerEnrollment.id, {
    weekLog: [
      {
        weekRef: refs.week,
        taskKey: 'altThought',
        decision: 'accepted',
        intentionId: angerIntention.id,
      },
    ],
  })
  console.log(
    `[verificationSeed] Created 1 problem-path enrollment (anger-signal v2, step 7/19, ${angerMomentIds.length} moments)`
  )

  // ── 17. Shame path v3 (ideas/html-plans/2026-10-04-shame-path-v3.html) ──
  // Enrolled 24 days ago, nine steps done (two measures, map, sign, safe
  // place, image, compassionate self, response, "O czym jest ten wstyd?"),
  // the tenth (thought record, week 4) due today. Two tagged compass parts
  // from the map, eight moments with the v3 quick taps (part · noticed ·
  // response · strength), one calm-day note, the self-compassion break due
  // today and Momenty tomorrow, and an accepted task for the current week
  // (useResponse, 1 of 3 days done via a moment) so the task↔exercise
  // bridge and the choice card have data.
  const shameStart = addDaysToDayRef(todayRef, -24)
  const shameEnrollment = await programEnrollmentDexieRepository.create({
    programSlug: 'shame-compassion',
    startedAt: `${shameStart}T12:00:00.000Z`,
    contentVersion: 3,
  })
  const shameStepDays = [24, 24, 23, 22, 19, 17, 15, 12, 4] as const
  const shameStepSlugs = [
    'scs-sf',
    'fscrs',
    'shame-map',
    'my-sign',
    'safe-place',
    'compassionate-image',
    'compassionate-self',
    'shame-response',
    'shame-or-guilt',
  ] as const
  for (const [index, slug] of shameStepSlugs.entries()) {
    const dayRef = addDaysToDayRef(todayRef, -shameStepDays[index]!)
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      dayRef,
      completedAt: `${dayRef}T12:00:00.000Z`,
      source: 'plan',
    })
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'thought-record',
    dayRef: todayRef,
    source: 'program',
    sourceRef: shameEnrollment.id,
    programRole: 'step',
    programStepIndex: 9,
  })
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'shame-map',
    createdAt: `${addDaysToDayRef(todayRef, -23)}T12:00:00.000Z`,
    responses: {
      areas: ['work', 'competence', 'belonging'],
      bodySigns: ['gorąco na twarzy', 'spuszczony wzrok'],
      compass: ['withdraw', 'attackSelf'],
      audience: 'both',
      standard: 'Powinienem zawsze wiedzieć, o co chodzi, zanim zapytam.',
      friendTest: 'no',
      origin: 'Ze szkoły, z pytań „jak można tego nie wiedzieć”.',
    },
  })
  // The map's reactions as tagged IFS parts (what shamePartsService creates on save).
  for (const reaction of ['withdraw', 'attackSelf'] as const) {
    await ifsPartDexieRepository.create(createPayloadForReaction(reaction))
  }
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'my-sign',
    createdAt: `${addDaysToDayRef(todayRef, -22)}T12:00:00.000Z`,
    responses: {
      mainTarget: 'withdraw',
      sign: 'Gdy zrobię błąd przy ludziach, zostanę w rozmowie zamiast zniknąć.',
      safePerson: 'Siostra.',
    },
  })
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'safe-place',
    createdAt: `${addDaysToDayRef(todayRef, -19)}T12:00:00.000Z`,
    responses: {
      place: 'Pomost nad jeziorem o świcie, ciepłe deski, cisza i zapach wody.',
      anchor: ['ciepło na dłoniach', 'słowo „pomost”'],
      resistance: ['lazy', 'unfamiliar'],
      resistanceReply:
        'Ludzie, którzy są dla siebie dobrzy, nie przestają się starać. Przestają się bać.',
      helpful: 4,
    },
  })
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'compassionate-image',
    createdAt: `${addDaysToDayRef(todayRef, -17)}T12:00:00.000Z`,
    responses: {
      toOther: 'Mój pies, gdy się boi burzy. Robi mi się ciepło w klatce piersiowej.',
      wisdom: 'Wie, że nikt nie wybrał swojej historii.',
      strength: 'Jest spokojna, nawet gdy ja nie jestem.',
      warmth: 'Niski, ciepły głos. Patrzy prosto, bez pośpiechu.',
      nonJudgement: 'Przy niej nie muszę niczego udawać.',
      message: 'Jesteś człowiekiem i to boli. Jestem z tobą.',
      helpful: 4,
    },
  })
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'compassionate-self',
    createdAt: `${addDaysToDayRef(todayRef, -15)}T12:00:00.000Z`,
    responses: {
      posture: 'Stoi prosto, oddycha spokojnie, mówi powoli i nie odwraca wzroku.',
      qualities: ['calm', 'curiosity', 'connectedness'],
      toPart: 'Widzę cię. Nie musisz tego teraz naprawiać.',
      helpful: 3,
    },
  })
  const shameResponseEntry = await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'shame-response',
    createdAt: `${addDaysToDayRef(todayRef, -12)}T12:00:00.000Z`,
    responses: {
      signals: ['gorąco na twarzy', 'chęć zniknięcia'],
      breath: { completedSeconds: 60, phaseSeconds: [4, 0, 6, 0], totalSeconds: 60 },
      name: 'To jest wstyd. To mój krytyk, nie fakt.',
      unblend: 'withdraw',
      unblendSentence: 'To mój Ukrywający chce zniknąć, nie ja. Mogę zostać.',
      sentence: 'Widzę cię. Nie musisz tego teraz naprawiać.',
      move: ['stay', 'ask'],
      anchor: 'coffee',
    },
  })
  const shameMoments = [
    {
      daysAgo: 20,
      situation: 'Nie znałem skrótu na spotkaniu zespołu i udawałem, że wiem.',
      compass: 'withdraw',
      noticed: 'later',
      response: ['nothing'],
      strength: 4,
      about: 'demand',
      criticSaid: 'Wszyscy to wiedzą, tylko nie ty.',
      kindVoice: 'Nikt nie zna wszystkich skrótów. Mogłeś zapytać.',
    },
    {
      daysAgo: 17,
      situation: 'Zapomniałem oddzwonić do mamy, choć obiecałem.',
      compass: 'attackSelf',
      noticed: 'hours',
      response: ['repair', 'named'],
      strength: 3,
      about: 'act',
      criticSaid: 'Zawsze zawodzisz bliskich.',
      kindVoice: 'Zapomniałeś raz. Zadzwoń dziś.',
    },
    {
      daysAgo: 14,
      situation: 'Nie dostałem projektu, o który prosiłem.',
      compass: 'withdraw',
      noticed: 'hours',
      response: ['breath'],
      strength: 4,
      about: 'event',
      criticSaid: 'Widocznie nie jesteś dość dobry.',
      kindVoice: 'To boli. Nie musisz tego zamieniać w wyrok.',
    },
    {
      daysAgo: 11,
      situation: 'Rozpłakałem się przy koledze po trudnej rozmowie.',
      compass: 'avoid',
      noticed: 'soon',
      response: ['named', 'question', 'sentence'],
      strength: 5,
      about: 'demand',
      criticSaid: 'Faceci nie płaczą w pracy.',
      kindVoice: 'Płakałeś, bo było ciężko. Kolega został.',
    },
    {
      daysAgo: 8,
      situation: 'Poprosiłem o pomoc przy konfiguracji, którą „powinienem umieć”.',
      compass: 'attackSelf',
      noticed: 'soon',
      response: ['unblend', 'question', 'contact', 'test'],
      strength: 3,
      about: 'demand',
      criticSaid: 'Po tylu latach nie umiesz tego sam?',
      kindVoice: 'Poprosiłeś i dostałeś pomoc. Tak to działa.',
    },
    {
      daysAgo: 6,
      situation: 'Przemilczałem błąd w raporcie, zamiast powiedzieć od razu.',
      compass: 'withdraw',
      noticed: 'hours',
      response: ['breath', 'repair'],
      strength: 3,
      about: 'act',
      criticSaid: 'Tchórz.',
      kindVoice: 'Powiedziałeś następnego dnia. To się liczy.',
    },
    {
      daysAgo: 3,
      situation: 'Kolega zażartował z mojej prezentacji; odgryzłem się ostro.',
      compass: 'attackOthers',
      noticed: 'soon',
      response: ['named', 'breath'],
      strength: 4,
      about: 'demand',
      criticSaid: 'Nie dasz sobie wejść na głowę, bo zobaczą, że jesteś słaby.',
      kindVoice: 'Zabolało. Możesz to powiedzieć zamiast gryźć.',
    },
    {
      daysAgo: 1,
      situation: 'Zadałem „głupie” pytanie na spotkaniu i zostałem w rozmowie.',
      compass: 'none',
      noticed: 'during',
      response: ['breath', 'unblend', 'sentence', 'contact'],
      strength: 2,
      about: 'demand',
      criticSaid: 'Teraz wszyscy wiedzą, że nie nadążasz.',
      kindVoice: 'Zapytałeś i nikt nie mrugnął. Zostałeś.',
      nextTime: 'Zapytać wcześniej, zanim urośnie.',
    },
  ] as const
  const shameMomentIds: string[] = []
  for (const moment of shameMoments) {
    const dayRef = addDaysToDayRef(todayRef, -moment.daysAgo)
    const occurrence = await exercisePlanDexieRepository.create({
      exerciseSlug: 'moment-shame',
      dayRef,
      source: 'program',
      sourceRef: shameEnrollment.id,
      programRole: 'practice',
    })
    const entry = await microExerciseEntryDexieRepository.create({
      exerciseSlug: 'moments',
      createdAt: `${dayRef}T19:00:00.000Z`,
      responses: {
        kind: 'shame',
        hadMoment: 'yes',
        compass: moment.compass,
        noticed: moment.noticed,
        response: [...moment.response],
        strength: moment.strength,
        situation: moment.situation,
        about: moment.about,
        criticSaid: moment.criticSaid,
        kindVoice: moment.kindVoice,
        ...('nextTime' in moment ? { nextTime: moment.nextTime } : {}),
      },
    })
    shameMomentIds.push(entry.id)
    await exercisePlanDexieRepository.update(occurrence.id, { status: 'done', recordId: entry.id })
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: 'moment-shame',
      dayRef,
      completedAt: `${dayRef}T19:00:00.000Z`,
      recordId: entry.id,
      source: 'plan',
    })
  }
  // A calm-day note, then the next occurrence pending tomorrow.
  await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'moments',
    createdAt: `${addDaysToDayRef(todayRef, -5)}T19:00:00.000Z`,
    responses: {
      kind: 'shame',
      hadMoment: 'none',
      quietDay: 'Rozmowa z siostrą, przy której nie muszę niczego udawać.',
    },
  })
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'moment-shame',
    dayRef: addDaysToDayRef(todayRef, 1),
    source: 'program',
    sourceRef: shameEnrollment.id,
    programRole: 'practice',
  })
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'self-compassion-break',
    dayRef: todayRef,
    source: 'program',
    sourceRef: shameEnrollment.id,
    programRole: 'practice',
  })
  await programEnrollmentDexieRepository.update(shameEnrollment.id, {
    currentStepIndex: 9,
    completedSteps: shameStepSlugs.map((_, index) => ({
      stepIndex: index,
      completedAt: `${addDaysToDayRef(todayRef, -shameStepDays[index]!)}T12:00:00.000Z`,
      ...(index === 7 ? { recordId: shameResponseEntry.id } : {}),
    })),
  })
  // This week's accepted task: "use your shame response" 3×; the moment
  // from yesterday counts as its first day.
  const shameIntention = await createWeeklyIntention({
    weekRef: refs.week,
    title: 'Użyj swojej odpowiedzi na wstyd, gdy się pojawi',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    programLink: { enrollmentId: shameEnrollment.id, taskKey: 'useResponse' },
  })
  const yesterday = addDaysToDayRef(todayRef, -1)
  if (getPeriodRefsForDate(new Date(`${yesterday}T12:00:00`)).week === refs.week) {
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'weeklyIntention',
      subjectId: shameIntention.id,
      dayRef: yesterday,
      value: null,
    })
  }
  await programEnrollmentDexieRepository.update(shameEnrollment.id, {
    weekLog: [
      {
        weekRef: refs.week,
        taskKey: 'useResponse',
        decision: 'accepted',
        intentionId: shameIntention.id,
      },
    ],
  })
  console.log(
    `[verificationSeed] Created 1 problem-path enrollment (shame-compassion v3, step 10/27, ${shameMomentIds.length} moments)`
  )

  // ── 18. A CLOSED shame path (the earlier run, "Zacznij od nowa" afterwards) ──
  // Closed 50 days ago on the maintenance plan, so Powrót (56 days) is six days
  // ahead; the letter to a future self was written the day before the close
  // with "za 4 tygodnie", so it has been waiting in "Najbliżej" for 23 days.
  const closedShameStart = addDaysToDayRef(todayRef, -110)
  const closedShameEnd = addDaysToDayRef(todayRef, -50)
  const closedShame = await programEnrollmentDexieRepository.create({
    programSlug: 'shame-compassion',
    startedAt: `${closedShameStart}T12:00:00.000Z`,
    contentVersion: 3,
  })
  const letterEntry = await microExerciseEntryDexieRepository.create({
    exerciseSlug: 'letter-to-future-self',
    createdAt: `${addDaysToDayRef(todayRef, -51)}T12:00:00.000Z`,
    responses: {
      letter:
        'Jeśli to czytasz w gorszy dzień: pamiętasz pomost nad jeziorem? Wstyd minie, jak mijał już wiele razy. Zostań w rozmowie, połóż dłoń na sercu i daj sobie minutę dłużej.',
      returnIn: 'w4',
    },
  })
  await programEnrollmentDexieRepository.update(closedShame.id, {
    status: 'completed',
    currentStepIndex: 24,
    completedAt: `${closedShameEnd}T12:00:00.000Z`,
    completedSteps: Array.from({ length: 24 }, (_, stepIndex) => ({
      stepIndex,
      completedAt: `${addDaysToDayRef(closedShameStart, Math.min(60, Math.round((stepIndex * 60) / 23)))}T12:00:00.000Z`,
      ...(stepIndex === 22 ? { recordId: letterEntry.id } : {}),
    })),
    futureLetter: { entryId: letterEntry.id, showAt: addDaysToDayRef(todayRef, -23) },
  })
  console.log(
    '[verificationSeed] Created 1 closed problem-path enrollment (shame-compassion v3, letter waiting, Powrót in 6 days)'
  )
}
