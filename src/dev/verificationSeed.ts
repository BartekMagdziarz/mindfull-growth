/**
 * Verification-environment seed (dev-only).
 *
 * Creates the fixed verification account (see ./verificationAccount) and fills its
 * per-user database with a deterministic dataset relative to the real "today":
 *   - 4 life areas, 4 active priorities, 2 goals + 4 KRs, 3 habits, 2 trackers
 *   - 8 fully closed weeks (plans, day assignments, entries, reflections)
 *     + the current week planning-only
 *   - 2 fully closed months (top-3, priority assessments, monthly reflection)
 *     + the current month planning-only
 *   - journal entries + emotion logs over the last ~5 weeks
 *
 * Idempotency: `runVerificationSeed` ALWAYS resets first (delete DB → reconnect →
 * seed), so re-runs never duplicate data. `bootstrapVerificationEnvironment` skips
 * seeding on reloads via a versioned localStorage marker; bump SEED_VERSION after
 * changing the dataset to force a re-seed on next boot.
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
  getPeriodBounds,
  getPeriodRefsForDate,
  getPreviousPeriod,
  getWeekOverlappingMonths,
} from '@/utils/periods'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { hashPassword } from '@/services/crypto.service'
import { setMonthTopPriorities, setMonthlyPriorityAssessment } from '@/services/monthlyPriorityService'
import {
  linkGoalToMonth,
  linkMeasurementPeriod,
  toggleMeasurementDayAssignment,
} from '@/services/planningMutations'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { connectUserDatabase, disconnectUserDatabase } from '@/services/userDatabase.service'
import { createWeeklyIntention, setWeekTopPriorities } from '@/services/weeklyIntentionService'
import {
  VERIFY_DB_NAME,
  VERIFY_DISPLAY_NAME,
  VERIFY_PASSWORD,
  VERIFY_USERNAME,
  VERIFY_USER_ID,
} from './verificationAccount'

/** Bump after changing the dataset — forces a reset+re-seed on next verification boot. */
export const SEED_VERSION = 7
const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

const WEEKS_BACK = 8

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
  window.localStorage.setItem(SEED_MARKER_KEY, String(SEED_VERSION))
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

  if (window.localStorage.getItem(SEED_MARKER_KEY) !== String(SEED_VERSION)) {
    await runVerificationSeed({ reload: false })
  }

  installVerificationHelpers()
}

/** Expose the re-seed hook for DevTools / Playwright (`await window.__verifySeed()`). */
export function installVerificationHelpers(): void {
  Object.assign(window, { __verifySeed: runVerificationSeed })
  console.log('[verificationSeed] Helper installed: window.__verifySeed()')
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
  value: number | null,
): Promise<void> {
  await Promise.all(
    days.map(dayRef =>
      planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType,
        subjectId,
        dayRef,
        value,
      }),
    ),
  )
}

async function addMultiEntries(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  days: DayRef[],
  checkedItemIds: string[],
): Promise<void> {
  await Promise.all(
    days.map(dayRef =>
      planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType,
        subjectId,
        dayRef,
        value: null,
        checkedItemIds,
      }),
    ),
  )
}

function clampRating(value: number): number {
  return Math.max(1, Math.min(5, value))
}

// ─── Dataset ─────────────────────────────────────────────────────────────────

export async function seedVerificationData(): Promise<void> {
  const today = new Date()
  const refs = getPeriodRefsForDate(today)
  const todayRef = refs.day
  const currentMonth = refs.month
  const monthM1 = getPreviousPeriod(currentMonth) as MonthRef
  const monthM2 = getPreviousPeriod(monthM1) as MonthRef
  const closedMonths = [monthM2, monthM1]

  const currentWeek = refs.week
  const pastWeeks: WeekRef[] = []
  let cursor: WeekRef = currentWeek
  for (let i = 0; i < WEEKS_BACK; i++) {
    cursor = getPreviousPeriod(cursor) as WeekRef
    pastWeeks.unshift(cursor)
  }
  const allWeeks = [...pastWeeks, currentWeek]

  /** Only days that already happened — the current week must stay believable. */
  const upToToday = (days: DayRef[]): DayRef[] => days.filter(day => day <= todayRef)

  console.log(
    `[verificationSeed] Seeding: months ${monthM2}…${currentMonth}, weeks ${pastWeeks[0]}…${currentWeek}`,
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
      }),
    ),
  )

  // ── 2. Priorities (4 active — stays under the 5-active limit) ─────────────

  const p1 = await priorityDexieRepository.create({
    title: 'Regularny ruch i kondycja',
    years: [refs.year],
    status: 'active',
    lifeAreaIds: [areaHealth.id],
    whyNow: 'Po zimie czuję wyraźny spadek formy, a energia przekłada się na wszystko inne.',
    desiredDirection: 'Ruch 4–5 razy w tygodniu jako oczywisty element dnia.',
    progressSignals: ['Biegam bez zadyszki', 'Lepszy sen'],
    riskSignals: ['Odpuszczanie po intensywnym dniu pracy'],
  })
  const p2 = await priorityDexieRepository.create({
    title: 'Dowieźć projekt Strumień',
    years: [refs.year],
    status: 'active',
    lifeAreaIds: [areaWork.id],
    whyNow: 'Najbliższe miesiące decydują o tym, czy projekt wejdzie do użycia.',
    desiredDirection: 'Stabilne, cotygodniowe przyrosty zamiast zrywów.',
    progressSignals: ['Regularne wydania funkcji'],
    riskSignals: ['Rozpraszanie się pobocznymi pomysłami'],
  })
  const p3 = await priorityDexieRepository.create({
    title: 'Obecność dla bliskich',
    years: [refs.year],
    status: 'active',
    lifeAreaIds: [areaRelations.id],
    whyNow: 'Praca łatwo zjada wieczory — chcę to odwrócić, zanim stanie się normą.',
    desiredDirection: 'Wspólne wieczory i weekendy bez ekranów.',
    progressSignals: ['Wspólne kolacje kilka razy w tygodniu'],
    riskSignals: ['Telefon przy stole'],
  })
  const p4 = await priorityDexieRepository.create({
    title: 'Codzienna nauka',
    years: [refs.year],
    status: 'active',
    lifeAreaIds: [areaGrowth.id],
    whyNow: 'Mała, codzienna dawka nauki daje mi poczucie kierunku.',
    desiredDirection: 'Czytanie i kursy jako stały poranny rytuał.',
    progressSignals: ['Skończone książki i rozdziały kursów'],
    riskSignals: ['Scrollowanie zamiast czytania'],
  })
  const priorities = [p1, p2, p3, p4]

  // ── 3. Goals ───────────────────────────────────────────────────────────────

  const g1 = await goalDexieRepository.create({
    title: 'Przebiec 10 km bez zatrzymania',
    isActive: true,
    status: 'open',
    priorityIds: [p1.id],
    lifeAreaIds: [areaHealth.id],
    successDefinition: 'Ciągły bieg 10 km w spokojnym tempie, bez marszobiegu.',
    whyMatters: 'Konkretny, mierzalny dowód, że kondycja wróciła.',
  })
  const g2 = await goalDexieRepository.create({
    title: 'Wydać MVP aplikacji',
    isActive: true,
    status: 'open',
    priorityIds: [p2.id],
    lifeAreaIds: [areaWork.id],
    successDefinition: 'Działająca wersja z kluczowymi przepływami u pierwszych użytkowników.',
    whyMatters: 'Bez wydania nie ma informacji zwrotnej.',
  })

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

  const kr1 = await keyResultDexieRepository.create({
    title: 'Biegi 3 razy w tygodniu',
    isActive: true,
    status: 'open',
    goalId: g1.id,
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
  })
  const kr2 = await keyResultDexieRepository.create({
    title: '15 km tygodniowo',
    isActive: true,
    status: 'open',
    goalId: g1.id,
    cadence: 'weekly',
    entryMode: 'value',
    target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 15 },
  })
  const kr3 = await keyResultDexieRepository.create({
    title: 'Dwie funkcje miesięcznie',
    isActive: true,
    status: 'open',
    goalId: g2.id,
    cadence: 'monthly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 2 },
  })
  const kr4 = await keyResultDexieRepository.create({
    title: 'Cztery sesje deep work w tygodniu',
    isActive: true,
    status: 'open',
    goalId: g2.id,
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 4 },
  })

  const h1 = await habitDexieRepository.create({
    title: 'Poranne rozciąganie',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 5 },
    priorityIds: [p1.id],
    lifeAreaIds: [areaHealth.id],
  })
  const h2 = await habitDexieRepository.create({
    title: 'Wspólna kolacja',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    priorityIds: [p3.id],
    lifeAreaIds: [areaRelations.id],
  })
  const h3 = await habitDexieRepository.create({
    title: 'Czytanie 20 minut',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 4 },
    priorityIds: [p4.id],
    lifeAreaIds: [areaGrowth.id],
  })
  // entryDays min: "średnia ≥ 3 I loguj ≥ 5 dni" — missed weeks log a single
  // good rating, so the primary metric is met while presence fails.
  const h4 = await habitDexieRepository.create({
    title: 'Poranna rutyna',
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
    priorityIds: [p1.id],
    lifeAreaIds: [areaHealth.id],
  })
  // entryDays max: track satisfaction but play at most 3 days — missed weeks
  // log 4 days, so the metric holds while the limit is exceeded.
  const h5 = await habitDexieRepository.create({
    title: 'Granie wieczorem',
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
    priorityIds: [p4.id],
    lifeAreaIds: [areaGrowth.id],
  })

  // Multi-completion: 3 weighted items, explicit threshold 3 of 4 pts — the
  // stack chart shows full (met), partial and empty days side by side.
  const h6 = await habitDexieRepository.create({
    title: 'Poranna checklista',
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
    priorityIds: [p1.id],
    lifeAreaIds: [areaHealth.id],
  })

  const t1 = await trackerDexieRepository.create({
    title: 'Jakość snu',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'rating',
    priorityIds: [p1.id],
    lifeAreaIds: [areaHealth.id],
  })
  const t2 = await trackerDexieRepository.create({
    title: 'Kawy w ciągu dnia',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'counter',
    priorityIds: [],
    lifeAreaIds: [areaWork.id],
  })
  // Multi-completion tracker (no target): default threshold = all active items.
  const t3 = await trackerDexieRepository.create({
    title: 'Wieczorne wyciszenie',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'multi-completion',
    multiItems: [
      { id: 'no-screens', label: 'Bez ekranów po 22', icon: 'mobile_off', weight: 1 },
      { id: 'journal', label: 'Wieczorny dziennik', icon: 'edit_note', weight: 1 },
    ],
    priorityIds: [p1.id],
    lifeAreaIds: [areaHealth.id],
  })

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
  const dayAssignments: Array<{ subjectType: MeasurementSubjectType; id: string; offsets: number[] }> = [
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
      null,
    )
    await addEntries(
      'keyResult',
      kr2.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 1) ? [1, 3, 5] : [1, 3])),
      isMet(weekIdx, 1) ? 6 : 4,
    )
    await addEntries(
      'keyResult',
      kr4.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 2) ? [0, 1, 2, 3] : [0, 1])),
      null,
    )
    await addEntries(
      'habit',
      h1.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 1) ? [0, 1, 2, 3, 4] : [0, 2])),
      null,
    )
    await addEntries(
      'habit',
      h2.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 2) ? [4, 5, 6] : [5])),
      null,
    )
    await addEntries(
      'habit',
      h3.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 0) ? [0, 1, 2, 3] : [0, 3])),
      null,
    )
    // h4 (entryDays min 5): met weeks log 5 days of "4"; missed weeks a single "3"
    // → primaryMet ∧ ¬presenceMet.
    await addEntries(
      'habit',
      h4.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 0) ? [0, 1, 2, 3, 4] : [2])),
      isMet(weekIdx, 0) ? 4 : 3,
    )
    // h5 (entryDays max 3): met weeks stay within the 3-day limit; missed weeks
    // log 4 days of good ratings → primaryMet ∧ ¬presenceMet (limit exceeded).
    await addEntries(
      'habit',
      h5.id,
      upToToday(weekDays(weekRef, isMet(weekIdx, 1) ? [1, 3] : [1, 2, 4, 5])),
      4,
    )
    // h6 (multi, threshold 3/4 pts): met weeks = 4 full days + 1 partial
    // (2 pts, amber); missed weeks = 2 low-point partials + 1 met day.
    if (isMet(weekIdx, 2)) {
      await addMultiEntries(
        'habit',
        h6.id,
        upToToday(weekDays(weekRef, [0, 1, 2, 3])),
        ['wake', 'meditate', 'train'],
      )
      await addMultiEntries('habit', h6.id, upToToday(weekDays(weekRef, [4])), ['wake', 'meditate'])
    } else {
      await addMultiEntries('habit', h6.id, upToToday(weekDays(weekRef, [1, 3])), ['wake'])
      await addMultiEntries('habit', h6.id, upToToday(weekDays(weekRef, [5])), ['wake', 'train'])
    }
    // t3 (multi tracker, all-items threshold): alternating full and partial days.
    await addMultiEntries(
      'tracker',
      t3.id,
      upToToday(weekDays(weekRef, [0, 2])),
      ['no-screens', 'journal'],
    )
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
  await addEntries(
    'keyResult',
    kr3.id,
    [addDaysToDayRef(monthStart(monthM2), 4), addDaysToDayRef(monthStart(monthM2), 14)],
    1,
  )
  await addEntries('keyResult', kr3.id, [addDaysToDayRef(monthStart(monthM1), 9)], 1)
  await addEntries('keyResult', kr3.id, upToToday([monthStart(currentMonth)]), 1)

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

  for (const [weekIdx, weekRef] of pastWeeks.entries()) {
    const rating = (dim: number): number => clampRating(2 + ((weekIdx + dim) % 4))
    await structuredReflectionDexieRepository.upsertWeekly({
      weekRef,
      physicalIntensityRating: rating(0),
      emotionalIntensityRating: rating(1),
      taskLoadRating: rating(2),
      closeOnesNeedsRating: rating(3),
      physicalCareRating: rating(4),
      emotionalProcessingRating: rating(5),
      productivityRating: rating(6),
      closeOnesSupportRating: rating(7),
      moodRating: rating(8),
      energyRating: rating(9),
      calmRating: rating(10),
      connectionRating: rating(11),
      promptResponses: {},
      freeformReflection: WEEK_FREEFORM_TEXTS[weekIdx % WEEK_FREEFORM_TEXTS.length],
      aiSummary: '',
    })
  }

  // ── 11. Month plans, priority assessments, monthly reflections ────────────

  for (const monthRef of [...closedMonths, currentMonth]) {
    await setMonthTopPriorities(monthRef, [p1.id, p2.id, p3.id])
  }

  await setMonthlyPriorityAssessment(monthM2, p1.id, {
    effort: 3,
    verdict: 'continue',
    note: 'Rozkręcanie się po zimie — kierunek dobry.',
  })
  await setMonthlyPriorityAssessment(monthM2, p2.id, {
    effort: 4,
    verdict: 'continue',
    note: 'Solidne tempo, regularne wydania.',
  })
  await setMonthlyPriorityAssessment(monthM2, p3.id, {
    effort: 3,
    verdict: 'adjust',
    note: 'Wieczory zbyt często zjadane przez pracę.',
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

  for (const [monthIdx, monthRef] of closedMonths.entries()) {
    const rating = (dim: number): number => clampRating(3 + ((monthIdx + dim) % 3))
    await structuredReflectionDexieRepository.upsertMonthly({
      monthRef,
      balanceRating: rating(0),
      purposeRating: rating(1),
      growthRating: rating(2),
      coherenceRating: rating(3),
      agencyRating: rating(4),
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
    `[verificationSeed] Created ${journalIdx + 1} journal entries and ${emotionIdx + 1} emotion logs`,
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
}
