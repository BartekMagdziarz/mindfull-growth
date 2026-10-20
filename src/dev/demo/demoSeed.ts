/**
 * Demo-account seed (dev-only) — `npm run dev:demo`, http://127.0.0.1:5205.
 *
 * Creates the fixed demo account „Julia” (./../demoAccount) and fills its
 * database with half a year of coherent history (story: ./demoStory):
 * planning objects, ~28 closed weeks with plans, entries and reflections,
 * six closed months with focus, assessments and reflections, a journal and
 * emotion check-ins across the whole horizon, exercises, foundation
 * instruments, a COMPLETED shame path (with measures, moments and weekly
 * tasks) and an IFS path in progress. Current week and month are planned
 * and partly logged, never reflected.
 *
 * Everything is placed relative to today, so the demo never goes stale; the
 * localStorage marker includes the day, so the first load of a new day
 * re-seeds (also wiping whatever was clicked during the previous demo).
 *
 * Writes go through repositories and services. The single exception is
 * `backdate()`: repositories stamp createdAt/completedAt with the wall clock,
 * so a narrow pass rewrites timestamps of rows this seed created — the same
 * approach as the AI companion demo (src/dev/ai-companion/demo.ts).
 *
 * Reachability: imported ONLY via the dynamic, DEV-guarded import in main.ts
 * (demo mode). Manual reset from DevTools on the demo origin:
 *   await window.__demoSeed()
 */

import Dexie from 'dexie'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import type { AssessmentId, AssessmentItemDefinition } from '@/domain/assessments'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import type { User } from '@/domain/user'
import {
  addDaysToDayRef,
  getPeriodBounds,
  getPeriodRefsForDate,
  getPreviousPeriod,
  getWeekOverlappingMonths,
} from '@/utils/periods'
import { assessmentsDexieRepository } from '@/repositories/assessmentsDexieRepository'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import {
  ifsPartDexieRepository,
  ifsPartsMapDexieRepository,
  transformativePurposeDexieRepository,
} from '@/repositories/exercisesDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { lifeAreaAssessmentDexieRepository } from '@/repositories/lifeAreaAssessmentDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { getAssessmentRegistryEntry } from '@/services/assessments/registry'
import { hashPassword } from '@/services/cryptoService'
import { closeGoal } from '@/services/goalClosingService'
import {
  setMonthTopPriorities,
  setMonthlyPriorityAssessment,
} from '@/services/monthlyPriorityService'
import { createActiveLink } from '@/services/priorityLinkService'
import { createPayloadForReaction } from '@/services/shamePartsService'
import {
  linkGoalToMonth,
  linkMeasurementPeriod,
  toggleMeasurementDayAssignment,
} from '@/services/planningMutations'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabaseService'
import { createWeeklyIntention, setWeekTopPriorities } from '@/services/weeklyIntentionService'
import {
  DEMO_DB_NAME,
  DEMO_DISPLAY_NAME,
  DEMO_PASSWORD,
  DEMO_USERNAME,
  DEMO_USER_ID,
} from '../demoAccount'
import {
  DEMO_CURRENT_MONTH_TOP3,
  DEMO_CURRENT_WEEK_INTENTIONS,
  DEMO_EMOTION_GROUPS,
  DEMO_EMOTION_NOTES,
  DEMO_JOURNAL,
  DEMO_MONTH_STORIES,
  DEMO_SELF_COMPASSION_TEXTS,
  DEMO_SHAME_MOMENTS,
  DEMO_SHAME_TASK_WEEKS,
  DEMO_WEEK_STORIES,
  type DemoPriorityKey,
  type DemoWeekStory,
} from './demoStory'

/** Bump after changing the dataset to force a re-seed on the next load. */
export const DEMO_SEED_VERSION = 2
export const DEMO_CLOSED_MONTHS = 6
const SEED_MARKER_KEY = 'mindfull_growth_demo_seed_version'

// ─── Account + bootstrap ─────────────────────────────────────────────────────

export async function ensureDemoUser(): Promise<void> {
  if (await authDexieRepository.getUserById(DEMO_USER_ID)) return
  const now = new Date().toISOString()
  const user: User = {
    id: DEMO_USER_ID,
    username: DEMO_USERNAME,
    passwordHash: await hashPassword(DEMO_PASSWORD),
    createdAt: now,
    lastLoginAt: now,
    displayName: DEMO_DISPLAY_NAME,
  }
  try {
    await authDexieRepository.createUser(user)
  } catch (error) {
    if (!(await authDexieRepository.getUserById(DEMO_USER_ID))) throw error
  }
}

function markerValue(today: DayRef): string {
  return `demo-v${DEMO_SEED_VERSION}:${today}`
}

/** Reset-then-seed: always deletes the demo DB first, so re-runs never duplicate. */
export async function runDemoSeed(options: { reload?: boolean } = {}): Promise<void> {
  console.log('[demoSeed] Resetting demo database…')
  await ensureDemoUser()
  await disconnectUserDatabase()
  await Dexie.delete(DEMO_DB_NAME)
  await connectUserDatabase(DEMO_USER_ID)

  await seedDemoData()

  invalidatePlanningQueryCache()
  window.localStorage.setItem(SEED_MARKER_KEY, markerValue(getPeriodRefsForDate(new Date()).day))
  console.log('[demoSeed] ✅ Demo ready.')
  if (options.reload !== false) window.location.reload()
}

/** main.ts (demo mode only), BEFORE `app.use(router)` — see verificationSeed for why. */
export async function bootstrapDemoEnvironment(): Promise<void> {
  await ensureDemoUser()
  await connectUserDatabase(DEMO_USER_ID)
  if (
    window.localStorage.getItem(SEED_MARKER_KEY) !==
    markerValue(getPeriodRefsForDate(new Date()).day)
  ) {
    await runDemoSeed({ reload: false })
  }
  Object.assign(window, { __demoSeed: runDemoSeed })
  console.log('[demoSeed] Helper installed: window.__demoSeed()')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random in [0, 1) from a few integers. */
export function demoRandom(...parts: number[]): number {
  let h = 2166136261
  for (const part of parts) {
    h ^= part + 0x9e3779b9
    h = Math.imul(h, 16777619)
    h ^= h >>> 13
  }
  return ((h >>> 0) % 10000) / 10000
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function weekDays(weekRef: WeekRef, offsets: number[]): DayRef[] {
  const monday = getPeriodBounds(weekRef).start
  return offsets.map(offset => addDaysToDayRef(monday, offset))
}

/** Closed months (oldest first) and every week from the first one's start to the current week. */
export function demoPeriods(today: Date): {
  closedMonths: MonthRef[]
  currentMonth: MonthRef
  closedWeeks: WeekRef[]
  currentWeek: WeekRef
} {
  const refs = getPeriodRefsForDate(today)
  const closedMonths: MonthRef[] = []
  let month = refs.month
  for (let i = 0; i < DEMO_CLOSED_MONTHS; i++) {
    month = getPreviousPeriod(month) as MonthRef
    closedMonths.unshift(month)
  }
  const horizonStart = getPeriodBounds(closedMonths[0]).start
  const closedWeeks: WeekRef[] = []
  let week = getPreviousPeriod(refs.week) as WeekRef
  while (getPeriodBounds(week).end >= horizonStart) {
    closedWeeks.unshift(week)
    week = getPreviousPeriod(week) as WeekRef
  }
  return { closedMonths, currentMonth: refs.month, closedWeeks, currentWeek: refs.week }
}

/** Story for closed week `index` of `count`: aligned from the end, clamped at the start. */
export function storyIndexForWeek(index: number, count: number): number {
  return Math.max(0, DEMO_WEEK_STORIES.length - count + index)
}

/** Rewrites timestamps of a row this seed created (see module doc). */
async function backdate(table: string, id: string, fields: Record<string, string>): Promise<void> {
  await getUserDatabase().table(table).update(id, fields)
}

const iso = (dayRef: DayRef, time = '12:00:00') => `${dayRef}T${time}.000Z`

// ─── Dataset ─────────────────────────────────────────────────────────────────

export async function seedDemoData(): Promise<void> {
  const now = new Date()
  const refs = getPeriodRefsForDate(now)
  const today = refs.day
  const ago = (days: number): DayRef => addDaysToDayRef(today, -days)
  const { closedMonths, currentMonth, closedWeeks, currentWeek } = demoPeriods(now)
  const allWeeks = [...closedWeeks, currentWeek]
  const allMonths = [...closedMonths, currentMonth]
  const horizonStart = getPeriodBounds(closedMonths[0]).start
  const lastStory = DEMO_WEEK_STORIES.length - 1

  /** Story index per week; the current week continues past the last story. */
  const storyIdx = new Map<WeekRef, number>()
  closedWeeks.forEach((weekRef, index) =>
    storyIdx.set(weekRef, storyIndexForWeek(index, closedWeeks.length))
  )
  storyIdx.set(currentWeek, lastStory + 1)
  const storyOf = (weekRef: WeekRef): DemoWeekStory =>
    DEMO_WEEK_STORIES[Math.min(lastStory, storyIdx.get(weekRef)!)]
  const weekOfDay = (dayRef: DayRef): WeekRef =>
    getPeriodRefsForDate(new Date(`${dayRef}T12:00:00`)).week
  /** Monday of the first week whose story index reaches `index`. */
  const weekStartingStory = (index: number): WeekRef =>
    allWeeks.find(weekRef => storyIdx.get(weekRef)! >= index) ?? currentWeek

  console.log(
    `[demoSeed] Seeding ${closedMonths[0]}…${currentMonth}, ${closedWeeks.length} closed weeks`
  )

  // ── Preferences: Julia writes in Polish, feminine forms ───────────────────
  await userSettingsDexieRepository.set('preferences.locale', 'pl')
  await userSettingsDexieRepository.set('preferences.grammaticalGender', 'feminine')

  // ── 1. Life areas ──────────────────────────────────────────────────────────
  const areaSpecs = [
    { key: 'health', name: 'Zdrowie', signals: ['Jak sypiam?', 'Czy mam energię po południu?'] },
    {
      key: 'work',
      name: 'Praca',
      signals: ['Czy kończę o 18:00?', 'Czy robię rzeczy ważne, nie tylko pilne?'],
    },
    { key: 'partner', name: 'Związek', signals: ['Kiedy ostatnio byliśmy z Kubą naprawdę razem?'] },
    {
      key: 'family',
      name: 'Rodzina i przyjaciele',
      signals: ['Z kim się widziałam w tym tygodniu?'],
    },
    { key: 'inner', name: 'Wnętrze', signals: ['Jak do siebie mówię, gdy coś nie wychodzi?'] },
    { key: 'growth', name: 'Rozwój i pasje', signals: ['Czy był czas na rysowanie?'] },
    { key: 'rest', name: 'Odpoczynek', signals: ['Czy odpoczywałam bez poczucia winy?'] },
  ] as const
  const areas = new Map<string, { id: string; name: string }>()
  for (const [index, spec] of areaSpecs.entries()) {
    const area = await lifeAreaDexieRepository.create({
      name: spec.name,
      reflectionSignals: [...spec.signals],
      isActive: true,
      sortOrder: index + 1,
    })
    areas.set(spec.key, { id: area.id, name: spec.name })
    await backdate('lifeAreas', area.id, { createdAt: iso(ago(206)), updatedAt: iso(ago(206)) })
  }
  const areaId = (key: string) => areas.get(key)!.id

  // ── 2. Priorities ──────────────────────────────────────────────────────────
  const years = [...new Set(allMonths.map(monthRef => monthRef.slice(0, 4)))] as YearRef[]
  const prioritySpecs: Record<
    DemoPriorityKey,
    Parameters<typeof priorityDexieRepository.create>[0]
  > = {
    energy: {
      title: 'Odzyskać energię',
      icon: 'battery_charging_full',
      years,
      status: 'active',
      lifeAreaIds: [areaId('health')],
      whyNow: 'Po zimie ledwo dowlekałam się do piątku. Lekarka powiedziała wprost: przemęczenie.',
      desiredDirection: 'Sen, ruch i jedzenie, które dają siłę, a nie są kolejnym obowiązkiem.',
      progressSignals: [
        'Budzę się bez budzika',
        'Mam siłę na coś po pracy',
        'Biegam dla przyjemności',
      ],
      riskSignals: ['Sen po północy', 'Kawa zamiast obiadu'],
    },
    work: {
      title: 'Praca w zrównoważonym tempie',
      icon: 'balance',
      years,
      status: 'active',
      lifeAreaIds: [areaId('work')],
      whyNow: 'Wieczory przy laptopie zabrały mi zdrowie i bliskość. Tak dalej się nie da.',
      desiredDirection: 'Dobra praca w godzinach pracy. Granice, które nie wymagają przeprosin.',
      influence: 'Mój kalendarz, moje „nie”, rozmowy z szefową.',
      notControlled: 'Terminy klientów i nagłe zmiany zakresu.',
      progressSignals: ['Kończę o 18:00', 'Mówię „sprawdzę i wrócę” zamiast „tak”'],
      riskSignals: ['Poprawki w weekend', 'Maile po 21'],
    },
    closeness: {
      title: 'Bliskość z Kubą i przyjaciółmi',
      icon: 'favorite',
      years,
      status: 'active',
      lifeAreaIds: [areaId('partner'), areaId('family')],
      whyNow: 'Kuba powiedział, że jestem „obecna nieobecna”. Chcę być naprawdę.',
      desiredDirection: 'Wieczory bez telefonów, regularne spotkania z Olą, telefony do mamy.',
      progressSignals: [
        'Wspólne wieczory bez ekranów',
        'Spotkanie z przyjaciółmi co tydzień lub dwa',
      ],
      riskSignals: ['Telefon przy stole', 'Odwoływanie spotkań przez pracę'],
    },
    kindness: {
      title: 'Łagodniej dla siebie',
      icon: 'self_improvement',
      years,
      status: 'active',
      lifeAreaIds: [areaId('inner')],
      whyNow:
        'Krytyk w głowie zamienia każdy błąd w wyrok. Wstyd mnie paraliżuje bardziej niż praca.',
      desiredDirection:
        'Mówić do siebie tak, jak mówię do Oli. Zostawać w trudnych chwilach zamiast znikać.',
      progressSignals: ['Pytam, gdy czegoś nie wiem', 'Krytyk cichnie szybciej'],
      riskSignals: ['Przepraszam za wszystko', 'Mielę błąd do nocy'],
    },
  }
  const priorities = new Map<DemoPriorityKey, { id: string }>()
  for (const key of ['energy', 'work', 'closeness', 'kindness'] as const) {
    const priority = await priorityDexieRepository.create(prioritySpecs[key])
    priorities.set(key, priority)
    await backdate('priorities', priority.id, {
      createdAt: iso(ago(204)),
      updatedAt: iso(ago(204)),
    })
  }
  const pid = (key: DemoPriorityKey) => priorities.get(key)!.id

  // ── 3. Goals + key results ────────────────────────────────────────────────
  const tenKStart = weekStartingStory(5)
  const tenKEnd = weekStartingStory(24)
  const boundaryStart = weekStartingStory(11)
  const halfStart = weekStartingStory(25)
  const weeksBetween = (from: WeekRef, to: WeekRef) =>
    allWeeks.filter(weekRef => weekRef >= from && weekRef <= to)
  const tenKWeeks = weeksBetween(tenKStart, tenKEnd)
  const boundaryWeeks = weeksBetween(boundaryStart, currentWeek)
  const halfWeeks = weeksBetween(halfStart, currentWeek)
  const monthsOf = (weeks: WeekRef[]) =>
    [...new Set(weeks.flatMap(weekRef => getWeekOverlappingMonths(weekRef)))].sort()

  const goal10k = await goalDexieRepository.create({
    title: 'Przebiec 10 km bez zatrzymania',
    icon: 'directions_run',
    isActive: true,
    status: 'open',
    priorityIds: [pid('energy')],
    lifeAreaIds: [areaId('health')],
    startDate: getPeriodBounds(tenKStart).start,
    targetDate: ago(42),
    successDefinition: 'Ciągły bieg 10 km w spokojnym tempie, bez marszu.',
    whyMatters: 'Dowód dla siebie, że ciało wraca. Pierwszy cel od dawna, który jest dla mnie.',
    confidenceRating: 6,
    achievabilityRationale:
      'Biegałam na studiach. Mam cztery miesiące i plan z aplikacji biegowej.',
    obstacles: 'Zmęczenie po pracy, kolano, upały latem.',
    resources: 'Park obok domu, Ola biega od lat, nowe buty.',
  })
  const goalBoundary = await goalDexieRepository.create({
    title: 'Kończę pracę o 18:00',
    icon: 'schedule',
    isActive: true,
    status: 'open',
    priorityIds: [pid('work')],
    lifeAreaIds: [areaId('work')],
    startDate: getPeriodBounds(boundaryStart).start,
    targetDate: addDaysToDayRef(today, 75),
    successDefinition:
      'Co najmniej cztery dni w tygodniu kończę pracę o 18:00, przez cały kwartał.',
    whyMatters:
      'Wieczory to czas dla Kuby, biegania i rysowania. Bez granicy praca zjada wszystko.',
    confidenceRating: 5,
    achievabilityRationale: 'Szefowa się zgodziła, zespół wie. Najtrudniej będzie ze mną samą.',
    obstacles: '„Tylko jeszcze jedna poprawka”, klienci piszący po godzinach.',
    resources: 'Blokada w kalendarzu, rozmowa z szefową, ścieżka o wstydzie.',
  })
  const goalHalf = await goalDexieRepository.create({
    title: 'Półmaraton wiosną',
    icon: 'sprint',
    isActive: true,
    status: 'open',
    priorityIds: [pid('energy')],
    lifeAreaIds: [areaId('health')],
    startDate: getPeriodBounds(halfStart).start,
    targetDate: addDaysToDayRef(today, 182),
    successDefinition: 'Ukończyć półmaraton w spokojnym tempie, bez kontuzji.',
    whyMatters: 'Tym razem budować wolniej i dłużej, z przyjemnością zamiast przymusu.',
    confidenceRating: 7,
    achievabilityRationale: '10 km już zrobione. Zimą spokojna baza, wiosną dłuższe biegi.',
    obstacles: 'Zima, kolano, sezon chorób.',
    resources: 'Fizjoterapeuta, plan treningowy, Ola jako partnerka do długich biegów.',
  })
  for (const monthRef of monthsOf(tenKWeeks)) await linkGoalToMonth(goal10k.id, monthRef)
  for (const monthRef of monthsOf(boundaryWeeks)) await linkGoalToMonth(goalBoundary.id, monthRef)
  for (const monthRef of monthsOf(halfWeeks)) await linkGoalToMonth(goalHalf.id, monthRef)

  const weeklyKr = async (
    goalId: string,
    title: string,
    entryMode: MeasurementEntryMode,
    target: MeasurementTarget
  ) =>
    keyResultDexieRepository.create({
      title,
      isActive: true,
      status: 'open',
      goalId,
      cadence: 'weekly',
      entryMode,
      target,
    })
  const krRuns = await weeklyKr(goal10k.id, 'Trzy biegi w tygodniu', 'completion', {
    kind: 'count',
    operator: 'min',
    value: 3,
  })
  const krKm = await weeklyKr(goal10k.id, 'Kilometry w tygodniu', 'value', {
    kind: 'value',
    aggregation: 'sum',
    operator: 'gte',
    value: 15,
  })
  const kr1800 = await weeklyKr(goalBoundary.id, 'Koniec pracy o 18:00', 'completion', {
    kind: 'count',
    operator: 'min',
    value: 4,
  })
  const krNoMeet = await weeklyKr(goalBoundary.id, 'Dzień skupienia bez spotkań', 'completion', {
    kind: 'count',
    operator: 'min',
    value: 1,
  })
  const krTrain = await weeklyKr(goalHalf.id, 'Trzy spokojne treningi', 'completion', {
    kind: 'count',
    operator: 'min',
    value: 3,
  })
  const krLong = await weeklyKr(goalHalf.id, 'Długi bieg w weekend (km)', 'value', {
    kind: 'value',
    aggregation: 'last',
    operator: 'gte',
    value: 10,
  })

  // ── 4. Habits + trackers ──────────────────────────────────────────────────
  const habit = async (
    title: string,
    icon: string,
    priority: DemoPriorityKey,
    area: string,
    entryMode: MeasurementEntryMode,
    target: MeasurementTarget,
    extra: Record<string, unknown> = {}
  ) =>
    habitDexieRepository.create({
      title,
      icon,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode,
      target,
      priorityIds: [pid(priority)],
      lifeAreaIds: [areaId(area)],
      ...extra,
    })
  const hSleep = await habit('Sen przed 23:00', 'bedtime', 'energy', 'health', 'completion', {
    kind: 'count',
    operator: 'min',
    value: 5,
  })
  const hWalk = await habit(
    'Spacer w ciągu dnia',
    'directions_walk',
    'energy',
    'health',
    'completion',
    { kind: 'count', operator: 'min', value: 3 }
  )
  const hEvening = await habit(
    'Wieczór z Kubą bez telefonów',
    'phonelink_off',
    'closeness',
    'partner',
    'completion',
    { kind: 'count', operator: 'min', value: 2 }
  )
  const hMom = await habit('Telefon do mamy', 'call', 'closeness', 'family', 'completion', {
    kind: 'count',
    operator: 'min',
    value: 1,
  })
  const hCheckIn = await habit(
    'Poranny check-in',
    'wb_sunny',
    'kindness',
    'inner',
    'multi-completion',
    { kind: 'count', operator: 'min', value: 5 },
    {
      multiItems: [
        { id: 'water', label: 'Szklanka wody', icon: 'water_drop', weight: 1 },
        { id: 'breath', label: '3 minuty oddechu', icon: 'air', weight: 1 },
        { id: 'intent', label: 'Intencja dnia', icon: 'edit_note', weight: 1 },
      ],
      multiDailyThreshold: 2,
    }
  )
  const hFriends = await habitDexieRepository.create({
    title: 'Spotkanie z przyjaciółmi',
    icon: 'groups',
    isActive: true,
    status: 'open',
    cadence: 'monthly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 2 },
    priorityIds: [pid('closeness')],
    lifeAreaIds: [areaId('family')],
  })
  const tEnergy = await trackerDexieRepository.create({
    title: 'Energia',
    icon: 'bolt',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'rating',
    ratingScaleMin: 1,
    ratingScale: 5,
    priorityIds: [pid('energy')],
    lifeAreaIds: [areaId('health')],
  })
  const tOvertime = await trackerDexieRepository.create({
    title: 'Nadgodziny (h)',
    icon: 'more_time',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'counter',
    priorityIds: [pid('work')],
    lifeAreaIds: [areaId('work')],
  })

  const createdAt = (dayRef: DayRef) => ({ createdAt: iso(dayRef), updatedAt: iso(dayRef) })
  for (const row of [hSleep, hWalk, hMom, hFriends])
    await backdate('habits', row.id, createdAt(ago(203)))
  await backdate('habits', hEvening.id, createdAt(getPeriodBounds(weekStartingStory(5)).start))
  await backdate('habits', hCheckIn.id, createdAt(getPeriodBounds(weekStartingStory(8)).start))
  for (const row of [tEnergy, tOvertime]) await backdate('trackers', row.id, createdAt(ago(203)))
  await backdate('goals', goal10k.id, { createdAt: iso(getPeriodBounds(tenKStart).start) })
  await backdate('goals', goalBoundary.id, { createdAt: iso(getPeriodBounds(boundaryStart).start) })
  await backdate('goals', goalHalf.id, { createdAt: iso(getPeriodBounds(halfStart).start) })

  // Priority links: what each object contributes (priority cards + hub).
  const link = (
    priority: DemoPriorityKey,
    subjectType: 'goal' | 'habit' | 'tracker',
    subjectId: string,
    contribution: string,
    expectedSignal: string
  ) => createActiveLink(pid(priority), { subjectType, subjectId }, { contribution, expectedSignal })
  await link(
    'energy',
    'goal',
    goal10k.id,
    'Konkretny cel, który ciągnie mnie na zewnątrz trzy razy w tygodniu.',
    '10 km bez marszu'
  )
  await link(
    'energy',
    'habit',
    hSleep.id,
    'Sen to fundament. Bez niego nie ma biegania ani cierpliwości.',
    'Budzę się bez budzika'
  )
  await link(
    'energy',
    'goal',
    goalHalf.id,
    'Spokojny, długi cel na zimę i wiosnę.',
    'Długie biegi bez bólu kolana'
  )
  await link(
    'work',
    'goal',
    goalBoundary.id,
    'Granica 18:00 chroni wieczory przed pracą.',
    'Cztery dni w tygodniu z końcem o 18:00'
  )
  await link(
    'work',
    'tracker',
    tOvertime.id,
    'Widzę, ile naprawdę kosztują „tylko jeszcze jedne poprawki”.',
    'Nadgodziny bliżej zera'
  )
  await link(
    'closeness',
    'habit',
    hEvening.id,
    'Wieczory bez telefonów to czas, w którym naprawdę jesteśmy razem.',
    'Kuba nie mówi już „obecna nieobecna”'
  )
  await link(
    'closeness',
    'habit',
    hFriends.id,
    'Przyjaciółki przypominają mi, kim jestem poza pracą.',
    'Spotkanie co dwa tygodnie'
  )
  await link(
    'kindness',
    'habit',
    hCheckIn.id,
    'Trzy minuty rano, żeby zacząć dzień od siebie, nie od maili.',
    'Spokojniejszy start dnia'
  )

  console.log('[demoSeed] Created planning objects')

  // ── 5. Weekly plans, assignments and entries ──────────────────────────────
  const entry = (
    subjectType: MeasurementSubjectType,
    subjectId: string,
    dayRef: DayRef,
    value: number | null,
    checkedItemIds?: string[]
  ) =>
    planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType,
      subjectId,
      dayRef,
      value,
      ...(checkedItemIds ? { checkedItemIds } : {}),
    })
  const assign = (subjectType: MeasurementSubjectType, subjectId: string, days: DayRef[]) =>
    Promise.all(
      days.map(dayRef =>
        toggleMeasurementDayAssignment({ subjectType, subjectId, cadence: 'weekly', dayRef })
      )
    )

  /** Success probability for a week: grows along the story, scaled by the week's pace. */
  const successRate = (weekRef: WeekRef): number => {
    const index = Math.min(lastStory, storyIdx.get(weekRef)!)
    const base = 0.42 + 0.5 * (index / lastStory)
    return clamp(base * (storyOf(weekRef).pace ?? 1), 0.15, 0.97)
  }
  /** Logged days: past days always decide by chance; TODAY stays open unless `today` is set. */
  const loggedDays = (
    days: DayRef[],
    weekRef: WeekRef,
    salt: number,
    bonus = 0,
    includeToday = false
  ) =>
    days.filter((dayRef, index) => {
      if (dayRef > today || (dayRef === today && !includeToday)) return false
      return (
        demoRandom(salt, index, Number(dayRef.replaceAll('-', ''))) < successRate(weekRef) + bonus
      )
    })

  for (const [weekIndex, weekRef] of allWeeks.entries()) {
    const story = storyOf(weekRef)
    const index = storyIdx.get(weekRef)!
    const isCurrent = weekRef === currentWeek
    const vacation = story.vacation === true
    const all7 = weekDays(weekRef, [0, 1, 2, 3, 4, 5, 6])
    const workdays = weekDays(weekRef, [0, 1, 2, 3, 4])

    const plan = async (subjectType: MeasurementSubjectType, subjectId: string, days: DayRef[]) => {
      await linkMeasurementPeriod({ subjectType, subjectId, cadence: 'weekly', periodRef: weekRef })
      if (days.length) await assign(subjectType, subjectId, days)
    }

    // Sleep, walks, mom: every week.
    await plan('habit', hSleep.id, all7)
    for (const dayRef of loggedDays(all7, weekRef, 11, 0.05))
      await entry('habit', hSleep.id, dayRef, null)
    const walkDays = weekDays(weekRef, [0, 1, 3, 4])
    await plan('habit', hWalk.id, walkDays)
    for (const dayRef of loggedDays(walkDays, weekRef, 12, vacation ? 0.4 : 0))
      await entry('habit', hWalk.id, dayRef, null)
    const momDay = weekDays(weekRef, [6])
    await plan('habit', hMom.id, momDay)
    for (const dayRef of loggedDays(momDay, weekRef, 13, 0.15))
      await entry('habit', hMom.id, dayRef, null)

    // Evenings with Kuba once the story names the problem.
    if (index >= 5) {
      const days = weekDays(weekRef, [2, 5])
      await plan('habit', hEvening.id, days)
      for (const dayRef of loggedDays(days, weekRef, 14, vacation ? 0.5 : 0.05))
        await entry('habit', hEvening.id, dayRef, null)
    }
    // Morning check-in from the start of the shame path.
    if (index >= 8) {
      await plan('habit', hCheckIn.id, workdays)
      for (const [dayIdx, dayRef] of workdays.entries()) {
        if (dayRef > today) continue
        const r = demoRandom(15, dayIdx, Number(dayRef.replaceAll('-', '')))
        const rate = successRate(weekRef)
        // Today's check-in is done: the Today view opens with one finished morning.
        if (dayRef === today || r < rate * 0.75)
          await entry('habit', hCheckIn.id, dayRef, null, ['water', 'breath', 'intent'])
        else if (r < rate + 0.1)
          await entry('habit', hCheckIn.id, dayRef, null, ['water', 'intent'])
        else if (r < rate + 0.25) await entry('habit', hCheckIn.id, dayRef, null, ['water'])
      }
    }

    // Trackers: energy follows the week's state, overtime falls after the boundary.
    await plan('tracker', tEnergy.id, [])
    for (const dayRef of weekDays(weekRef, [0, 2, 4, 6])) {
      if (dayRef > today) continue
      const jitter = demoRandom(16, Number(dayRef.replaceAll('-', ''))) < 0.5 ? 0 : -1
      await entry(
        'tracker',
        tEnergy.id,
        dayRef,
        clamp(story.state[0] + jitter + (isCurrent ? 1 : 0), 1, 5)
      )
    }
    if (!vacation) {
      await plan('tracker', tOvertime.id, [])
      for (const dayRef of workdays) {
        if (dayRef >= today) continue
        const r = demoRandom(17, Number(dayRef.replaceAll('-', '')))
        const hours = index < 11 ? Math.round(1 + r * 2.5) : r < 0.75 ? 0 : 1
        if (hours > 0 || index >= 11) await entry('tracker', tOvertime.id, dayRef, hours)
      }
    }

    // 10 km goal: runs Tue/Thu/Sat, kilometres on each run.
    if (tenKWeeks.includes(weekRef)) {
      const runDays = weekDays(weekRef, [1, 3, 5])
      await plan('keyResult', krRuns.id, runDays)
      await linkMeasurementPeriod({
        subjectType: 'keyResult',
        subjectId: krKm.id,
        cadence: 'weekly',
        periodRef: weekRef,
      })
      const progress = tenKWeeks.indexOf(weekRef) / Math.max(1, tenKWeeks.length - 1)
      const done = loggedDays(runDays, weekRef, 18, 0.1)
      for (const [runIdx, dayRef] of done.entries()) {
        await entry('keyResult', krRuns.id, dayRef, null)
        const finalRun = weekRef === tenKEnd && runIdx === done.length - 1
        const km = finalRun
          ? 10
          : Math.round((2.5 + 5.5 * progress + (runIdx === done.length - 1 ? 1.5 : 0)) * 2) / 2
        await entry('keyResult', krKm.id, dayRef, km)
      }
    }
    // Boundary goal: workdays ending at 18:00, a meeting-free Wednesday.
    if (boundaryWeeks.includes(weekRef) && !vacation) {
      await plan('keyResult', kr1800.id, workdays)
      for (const dayRef of loggedDays(workdays, weekRef, 19, 0.12))
        await entry('keyResult', kr1800.id, dayRef, null)
      if (index >= 13) {
        const wednesday = weekDays(weekRef, [2])
        await plan('keyResult', krNoMeet.id, wednesday)
        for (const dayRef of loggedDays(wednesday, weekRef, 20, 0.1))
          await entry('keyResult', krNoMeet.id, dayRef, null)
      }
    }
    // Half marathon: three easy runs, the long one on Saturday.
    if (halfWeeks.includes(weekRef)) {
      const runDays = weekDays(weekRef, [1, 3, 5])
      await plan('keyResult', krTrain.id, runDays)
      await plan('keyResult', krLong.id, weekDays(weekRef, [5]))
      for (const dayRef of loggedDays(runDays, weekRef, 21, 0.15))
        await entry('keyResult', krTrain.id, dayRef, null)
      const saturday = weekDays(weekRef, [5])[0]
      if (saturday < today)
        await entry(
          'keyResult',
          krLong.id,
          saturday,
          [8, 10, 11, 12, 12, 13][halfWeeks.indexOf(weekRef) % 6]
        )
    }

    // Weekly intentions (+ shame-path tasks below) and the week's top-3.
    const titles = isCurrent ? DEMO_CURRENT_WEEK_INTENTIONS : story.intentions
    const intentionIds: string[] = []
    for (const [titleIdx, title] of titles.entries()) {
      const intention = await createWeeklyIntention({
        weekRef,
        title,
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 1 },
        priorityIds: [pid(priorityForIntention(title))],
      })
      intentionIds.push(intention.id)
      const doneDay = weekDays(weekRef, [titleIdx === 0 ? 2 : 4])[0]
      if (
        !isCurrent &&
        demoRandom(22, weekIndex, titleIdx) < successRate(weekRef) + (titleIdx === 0 ? 0.25 : 0.05)
      ) {
        await entry('weeklyIntention', intention.id, doneDay, null)
      }
    }
    const top3: WeekTopPriorityRef[] = [
      { subjectType: 'habit', subjectId: hSleep.id },
      boundaryWeeks.includes(weekRef) && !vacation
        ? { subjectType: 'keyResult', subjectId: kr1800.id }
        : tenKWeeks.includes(weekRef)
          ? { subjectType: 'keyResult', subjectId: krRuns.id }
          : { subjectType: 'habit', subjectId: hWalk.id },
      { subjectType: 'weeklyIntention', subjectId: intentionIds[0] },
    ]
    await setWeekTopPriorities(weekRef, top3)
  }

  // Monthly habit: friends, two or three meetings in good months.
  for (const [monthIdx, monthRef] of allMonths.entries()) {
    await linkMeasurementPeriod({
      subjectType: 'habit',
      subjectId: hFriends.id,
      cadence: 'monthly',
      periodRef: monthRef,
    })
    const start = getPeriodBounds(monthRef).start
    const offsets = monthIdx < 2 ? [16] : monthIdx === 2 ? [9, 23] : [5, 15, 26]
    for (const offset of offsets) {
      const dayRef = addDaysToDayRef(start, offset)
      if (dayRef < today) await entry('habit', hFriends.id, dayRef, null)
    }
  }
  console.log(`[demoSeed] Scheduled ${allWeeks.length} weeks`)

  // ── 6. Shame path (completed) — created before the reflections that cite it ─
  const shame = await seedShamePath({ today, ago, weekOfDay, closedWeeks, storyIdx })

  // ── 7. Weekly reflections (closed weeks) ──────────────────────────────────
  const taskByStory = new Map(DEMO_SHAME_TASK_WEEKS.map(task => [task.storyIndex, task]))
  for (const weekRef of closedWeeks) {
    const story = storyOf(weekRef)
    const task = taskByStory.get(storyIdx.get(weekRef)!)
    const intentionId = shame.taskIntentionByWeek.get(weekRef)
    await structuredReflectionDexieRepository.upsertWeekly({
      weekRef,
      physicalIntensityRating: story.load[0],
      emotionalIntensityRating: story.load[1],
      taskLoadRating: story.load[2],
      closeOnesNeedsRating: story.load[3],
      physicalCareRating: clamp(story.state[0], 1, 5),
      emotionalProcessingRating: clamp(story.state[1], 1, 5),
      productivityRating: clamp(story.state[2] + 1, 1, 5),
      closeOnesSupportRating: clamp(story.state[3], 1, 5),
      energyRating: story.state[0],
      moodRating: story.state[1],
      calmRating: story.state[2],
      connectionRating: story.state[3],
      promptResponses: {
        wentWell: story.wentWell,
        challenges: story.challenges,
        lessons: story.lessons,
        ...(task && intentionId
          ? {
              [`program.${shame.enrollmentId}.severity`]: task.severity,
              [`program.${shame.enrollmentId}.outcome`]: task.outcome,
              [`program.${shame.enrollmentId}.phase`]: task.phase,
            }
          : {}),
      },
      freeformReflection: story.freeform,
      aiSummary: '',
    })
    const sunday = addDaysToDayRef(getPeriodBounds(weekRef).start, 6)
    const row = await structuredReflectionDexieRepository.getWeekly(weekRef)
    if (row)
      await backdate('weeklyReflections', row.id, {
        createdAt: iso(sunday, '19:00:00'),
        updatedAt: iso(sunday, '19:30:00'),
      })
  }

  // ── 8. Months: focus, priority assessments, reflections ───────────────────
  const monthStories = DEMO_MONTH_STORIES.slice(-closedMonths.length)
  for (const [monthIdx, monthRef] of closedMonths.entries()) {
    const story = monthStories[monthIdx]
    await setMonthTopPriorities(monthRef, story.top3.map(pid))
    for (const [key, assessment] of Object.entries(story.assessments)) {
      await setMonthlyPriorityAssessment(monthRef, pid(key as DemoPriorityKey), assessment!)
    }
    await structuredReflectionDexieRepository.upsertMonthly({
      monthRef,
      balanceRating: story.ratings.balance,
      purposeRating: story.ratings.purpose,
      growthRating: story.ratings.growth,
      coherenceRating: story.ratings.coherence,
      agencyRating: story.ratings.agency,
      promptResponses: {
        proudOf: story.proudOf,
        challenges: story.challenges,
        growth: story.growth,
      },
      freeformReflection: story.freeform,
      aiSummary: '',
    })
  }
  await setMonthTopPriorities(currentMonth, DEMO_CURRENT_MONTH_TOP3.map(pid))

  // ── 9. Close the 10 km goal with the ritual, follow up with the half marathon ─
  await closeGoal(goal10k.id, {
    outcome: 'achieved',
    successMet: 'yes',
    successNote: '10 km w 62 minuty, bez marszu, w deszczu. Ola na mecie.',
    confidenceInHindsight: 8,
    confidenceNote: 'Na starcie dawałam sobie 6/10. Ciało okazało się mądrzejsze niż krytyk.',
    obstaclesHit:
      'Tydzień oddawania projektu i kolano po urlopie. Dwa tygodnie w połowie były słabe.',
    workedWell:
      'Stałe dni biegania (wtorek, czwartek, sobota) i odpuszczanie bez wyrzutów, gdy byłam chora.',
    wasDifficult: 'Bieganie w tygodniach, w których praca zjadała sen.',
    learned:
      'Cel dla siebie smakuje inaczej niż cel dla kogoś. Następny może być wolniejszy i dłuższy.',
    followUp: { kind: 'new-goal', note: 'Półmaraton wiosną, spokojna baza zimą.' },
  })
  const closed = await goalDexieRepository.getById(goal10k.id)
  if (closed?.closingReflection) {
    await goalDexieRepository.update(goal10k.id, {
      closingReflection: { ...closed.closingReflection, closedAt: ago(40) },
    })
  }

  // ── 10. Journal + emotion check-ins across the horizon ────────────────────
  for (const item of DEMO_JOURNAL) {
    const dayRef = ago(item.daysAgo)
    if (dayRef < horizonStart) continue
    await journalDexieRepository.create({
      title: item.title,
      body: item.body,
      emotionIds: [],
      emotionFamilyIds: item.emotions.map(([slug]) => slug),
      emotions: item.emotions.map(([emotionId, intensity]) => ({ emotionId, intensity })),
      createdAt: iso(dayRef, '17:30:00'),
    })
  }
  let checkIns = 0
  for (let dayRef = horizonStart; dayRef <= today; dayRef = addDaysToDayRef(dayRef, 1)) {
    const key = Number(dayRef.replaceAll('-', ''))
    if (dayRef !== today && demoRandom(30, key) > 0.45) continue
    const weekRef = weekOfDay(dayRef)
    const story = storyIdx.has(weekRef) ? storyOf(weekRef) : DEMO_WEEK_STORIES[0]
    const pleasant = (story.state.reduce((sum, value) => sum + value, 0) / 4 - 1) / 4
    const tone: keyof typeof DEMO_EMOTION_GROUPS =
      dayRef === today
        ? 'calm'
        : demoRandom(31, key) < pleasant
          ? demoRandom(32, key) < 0.5
            ? 'calm'
            : 'bright'
          : demoRandom(32, key) < 0.5
            ? 'heavy'
            : 'tense'
    const groups = DEMO_EMOTION_GROUPS[tone]
    const first = groups[Math.floor(demoRandom(33, key) * groups.length)]
    const second = groups[Math.floor(demoRandom(34, key) * groups.length)]
    const picks = [...new Set([first, second])]
    const notes = DEMO_EMOTION_NOTES[tone]
    await emotionLogDexieRepository.create({
      emotionIds: [],
      emotionFamilyIds: picks,
      emotions: picks.map((emotionId, i) => ({
        emotionId,
        intensity: (2 + Math.floor(demoRandom(35, key, i) * 3)) as 2 | 3 | 4,
      })),
      note: notes[Math.floor(demoRandom(36, key) * notes.length)],
      createdAt: iso(dayRef, dayRef === today ? '07:30:00' : '11:00:00'),
    })
    checkIns++
  }
  console.log(
    `[demoSeed] Created ${DEMO_JOURNAL.length} journal entries and ${checkIns} emotion check-ins`
  )

  // ── 11. Standalone exercises ──────────────────────────────────────────────
  const complete = async (
    slug: string,
    dayRef: DayRef,
    recordId?: string,
    source: 'standalone' | 'plan' = 'standalone'
  ) =>
    exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      dayRef,
      completedAt: iso(dayRef, '18:00:00'),
      recordId,
      source,
    })
  const micro = async (slug: string, dayRef: DayRef, responses: Record<string, unknown>) =>
    microExerciseEntryDexieRepository.create({
      exerciseSlug: slug,
      createdAt: iso(dayRef, '18:00:00'),
      responses: responses as never,
    })

  for (const daysAgo of [201, 194, 186, 180, 134, 133]) {
    if (ago(daysAgo) >= horizonStart)
      await complete(daysAgo > 150 ? 'box-breathing' : 'grounding-54321', ago(daysAgo))
  }
  const wins = [
    {
      daysAgo: 171,
      win: 'Pierwszy trucht od dwóch lat.',
      meaning: 'Ciało jeszcze pamięta. Mogę zaczynać od małego.',
    },
    {
      daysAgo: 115,
      win: '5 km bez zatrzymania.',
      meaning: 'Regularność działa, nawet gdy tydzień jest ciężki.',
    },
    {
      daysAgo: 42,
      win: '10 km!',
      meaning: 'Pół roku temu nie dałabym rady wejść na trzecie piętro.',
    },
  ]
  for (const win of wins) {
    const record = await micro('one-small-win', ago(win.daysAgo), {
      win: win.win,
      meaning: win.meaning,
    })
    await complete('one-small-win', ago(win.daysAgo), record.id)
  }
  const savoring = [
    {
      daysAgo: 91,
      moment: 'Poranna kawa na tarasie w Bieszczadach, mgła nad doliną.',
      pleasantness: 92,
      senses: 'Zapach kawy, chłód poręczy, cisza.',
    },
    {
      daysAgo: 87,
      moment: 'Wschód słońca na Tarnicy z Kubą.',
      pleasantness: 97,
      senses: 'Wiatr, ciepła herbata z termosu, jego ramię.',
    },
    {
      daysAgo: 48,
      moment: 'Pierwszy szkic po latach.',
      pleasantness: 80,
      senses: 'Szorstki papier, zapach ołówka, muzyka w tle.',
    },
  ]
  for (const item of savoring) {
    const record = await micro('savoring-moment', ago(item.daysAgo), {
      moment: item.moment,
      pleasantness: item.pleasantness,
      senses: item.senses,
    })
    await complete('savoring-moment', ago(item.daysAgo), record.id)
  }
  const gratitude = [
    ['Kuba ugotował zupę', 'bieg w słońcu', 'telefon od Oli'],
    ['mama zdrowa', 'nowy szkicownik', 'spokojny wieczór'],
    ['koniec pracy o 18:00', 'długi spacer', 'dobra książka'],
    ['ciepła herbata po biegu', 'śmiech z Kubą', 'zamknięty projekt'],
    ['sobota bez planu', 'rozmowa z siostrą', 'kolano nie boli'],
    ['wyniki mamy', 'kawa z mentorką', 'jesienne liście w parku'],
  ]
  for (let i = 0; i < 8; i++) {
    const daysAgo = 54 - i * 7
    if (daysAgo < 4) break
    const items = gratitude[i % gratitude.length]
    const record = await micro('gratitude-list', ago(daysAgo), {
      items,
      why: `${items[0][0].toUpperCase()}${items[0].slice(1)} — to zrobiło mi dzień.`,
    })
    await complete('gratitude-list', ago(daysAgo), record.id)
  }
  // A repeat due today: the Today view shows a practice to do.
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'gratitude-list',
    dayRef: today,
    source: 'repeat',
  })

  // ── 12. Foundation: instruments, wheel of life, parts ─────────────────────
  await seedFoundation({ ago, horizonStart, areas: [...areas.values()] })

  // ── 13. IFS path in progress ──────────────────────────────────────────────
  await seedIfsPath({ today, ago })

  console.log('[demoSeed] Done')
}

// ─── Intentions → priority ──────────────────────────────────────────────────

export function priorityForIntention(title: string): DemoPriorityKey {
  const t = title.toLowerCase()
  if (/bieg|trucht|badani|żelaz|fizjo|buty|wędrówk|wentylator|tarnic|10 km|5 km/.test(t))
    return 'energy'
  if (
    /kub|ol[ią]|mam|babci|siostr|kolacj|planszów|kin|rodzic|świętow|ugotow|spacer z|weekend w górach/.test(
      t
    )
  )
    return 'closeness'
  if (/ścieżk|koło życia|odpocz|szkicown|ilustr|wstyd|plan podtrzymania/.test(t)) return 'kindness'
  return 'work'
}

// ─── Shame path ─────────────────────────────────────────────────────────────

/** daysAgo of each completed step (index = step index; null = skipped optional step). */
export const SHAME_STEP_DAYS: Array<number | null> = [
  150,
  150,
  148,
  146,
  142,
  139,
  135,
  131,
  127,
  122,
  117,
  117,
  111,
  106,
  null,
  101,
  82,
  78,
  74,
  70,
  64,
  64,
  56,
  53,
]
const SHAME_STEP_SLUGS = [
  'scs-sf',
  'fscrs',
  'shame-map',
  'my-sign',
  'safe-place',
  'compassionate-image',
  'compassionate-self',
  'shame-response',
  'shame-or-guilt',
  'thought-record',
  'scs-sf',
  'dose-check',
  'trailhead',
  'protector-appreciation',
  'direct-access',
  'compassionate-letter',
  'defender-voice',
  'core-beliefs',
  'behavioral-experiment',
  'exile-witnessing',
  'scs-sf',
  'fscrs',
  'letter-to-future-self',
  'maintenance-plan',
] as const

interface ShameContext {
  today: DayRef
  ago: (days: number) => DayRef
  weekOfDay: (dayRef: DayRef) => WeekRef
  closedWeeks: WeekRef[]
  storyIdx: Map<WeekRef, number>
}

async function seedShamePath(
  ctx: ShameContext
): Promise<{ enrollmentId: string; taskIntentionByWeek: Map<WeekRef, string> }> {
  const { ago, today } = ctx
  const enrollment = await programEnrollmentDexieRepository.create({
    programSlug: 'shame-compassion',
    startedAt: iso(ago(150)),
    contentVersion: 3,
  })
  const micro = async (slug: string, daysAgo: number, responses: Record<string, unknown>) =>
    microExerciseEntryDexieRepository.create({
      exerciseSlug: slug,
      createdAt: iso(ago(daysAgo), '18:00:00'),
      responses: responses as never,
    })
  const complete = (
    slug: string,
    dayRef: DayRef,
    recordId?: string,
    source: 'plan' | 'standalone' = 'plan'
  ) =>
    exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      dayRef,
      completedAt: iso(dayRef, '18:00:00'),
      recordId,
      source,
    })

  // Measures: self-compassion rises, self-criticism falls (SCS-SF ×3, FSCRS ×2).
  const scs = [1.9, 2.6, 3.4]
  const records = new Map<number, string>()
  records.set(0, await seedAssessment('scs-sf', 150, () => scs[0]))
  records.set(10, await seedAssessment('scs-sf', 117, () => scs[1]))
  records.set(20, await seedAssessment('scs-sf', 64, () => scs[2]))
  records.set(
    1,
    await seedAssessment(
      'fscrs',
      150,
      item => ({ inadequateSelf: 3, reassuredSelf: 1, hatedSelf: 2 })[item.scaleId ?? ''] ?? 2
    )
  )
  records.set(
    21,
    await seedAssessment(
      'fscrs',
      64,
      item => ({ inadequateSelf: 1.6, reassuredSelf: 2.8, hatedSelf: 0.6 })[item.scaleId ?? ''] ?? 2
    )
  )

  // Step records (micro exercises).
  records.set(
    2,
    (
      await micro('shame-map', 148, {
        areas: ['work', 'competence', 'body'],
        bodySigns: ['gorąco na twarzy', 'ściśnięty żołądek', 'spuszczony wzrok'],
        compass: ['withdraw', 'attackSelf'],
        audience: 'both',
        standard: 'Powinnam zawsze wiedzieć, o co chodzi, zanim zapytam.',
        friendTest: 'no',
        origin: 'Z domu i ze szkoły: „jak można tego nie wiedzieć”.',
      })
    ).id
  )
  records.set(
    3,
    (
      await micro('my-sign', 146, {
        mainTarget: 'withdraw',
        sign: 'Gdy czegoś nie wiem przy ludziach, zapytam zamiast udawać.',
        safePerson: 'Ola.',
      })
    ).id
  )
  records.set(
    4,
    (
      await micro('safe-place', 142, {
        place: 'Pomost nad jeziorem u dziadków, ciepłe deski, zapach wody i trzciny.',
        anchor: ['ciepło na dłoniach', 'słowo „pomost”'],
        resistance: ['lazy', 'unfamiliar'],
        resistanceReply:
          'Ludzie, którzy są dla siebie dobrzy, nie przestają się starać. Przestają się bać.',
        helpful: 4,
      })
    ).id
  )
  records.set(
    5,
    (
      await micro('compassionate-image', 139, {
        toOther: 'Moja siostrzenica, gdy płacze po upadku. Robi mi się ciepło w klatce piersiowej.',
        wisdom: 'Wie, że nikt nie wybrał swojej historii.',
        strength: 'Jest spokojna, nawet gdy ja nie jestem.',
        warmth: 'Ciepły głos babci. Patrzy prosto, bez pośpiechu.',
        nonJudgement: 'Przy niej nie muszę niczego udowadniać.',
        message: 'Jesteś człowiekiem i to boli. Jestem z tobą.',
        helpful: 4,
      })
    ).id
  )
  records.set(
    6,
    (
      await micro('compassionate-self', 135, {
        posture: 'Stoję prosto, oddycham wolno, mówię spokojnie i nie odwracam wzroku.',
        qualities: ['calm', 'curiosity', 'connectedness'],
        toPart: 'Widzę cię. Nie musisz tego teraz naprawiać.',
        helpful: 4,
      })
    ).id
  )
  records.set(
    7,
    (
      await micro('shame-response', 131, {
        signals: ['gorąco na twarzy', 'chęć zniknięcia'],
        breath: { completedSeconds: 60, phaseSeconds: [4, 0, 6, 0], totalSeconds: 60 },
        name: 'To jest wstyd. To mój krytyk, nie fakt.',
        unblend: 'withdraw',
        unblendSentence: 'To moja Ukrywająca chce zniknąć, nie ja. Mogę zostać.',
        sentence: 'Widzę cię. Nie musisz tego teraz naprawiać.',
        move: ['stay', 'ask'],
        anchor: 'coffee',
      })
    ).id
  )
  records.set(
    8,
    (
      await micro('shame-or-guilt', 127, {
        facts: 'Zły wymiar w makiecie trafił do klienta. Klient poprosił o poprawkę.',
        statement: 'Jestem nieprofesjonalna i wszyscy to widzą.',
        about: ['act', 'demand'],
        repair: 'Poprawiłam w godzinę i dodałam krok sprawdzenia przed wysyłką.',
        friendTest: 'Oli powiedziałabym: „zdarza się, dobrze, że szybko poprawiłaś”.',
        whoseDemand: 'Mamy i dawnej szefowej. Nie moje.',
        fairDemand: 'Sprawdzam ważne rzeczy raz, porządnie. Błędy poprawiam bez dramatu.',
        kindVoice: 'Jesteś człowiekiem i to boli. Jestem z tobą.',
      })
    ).id
  )
  records.set(
    11,
    (
      await micro('dose-check', 117, {
        load: 'right',
        helpsMost: ['self-compassion-break', 'moment-shame'],
        inTheWay: 'W tygodniach z terminem brakuje mi wieczorów.',
      })
    ).id
  )
  records.set(
    16,
    (
      await micro('defender-voice', 82, {
        attack: 'Może miał rację, bo ty się nie znasz.',
        friendDefends: 'Ola by powiedziała: „to był twój projekt i twoje decyzje miały sens”.',
        mySentence: 'Mam prawo bronić swojej pracy spokojnie i bez przeprosin.',
        posture: ['headUp', 'voice', 'noApology'],
        helpful: 5,
      })
    ).id
  )
  const letter = await micro('letter-to-future-self', 56, {
    letter:
      'Droga Julio, gdy to czytasz, minęło osiem tygodni od końca ścieżki. Może krytyk znowu jest głośniejszy, może przyszedł trudny projekt. ' +
      'Pamiętaj: wstyd to uczucie, nie fakt o tobie. Umiesz położyć rękę na sercu, nazwać to, co się dzieje, i zostać w rozmowie. ' +
      'Pamiętaj pomost, pamiętaj 10 km w deszczu. Nie musisz być bez zarzutu, żeby zasługiwać na odpoczynek i na ludzi, którzy cię kochają. Jestem z tobą.',
    returnIn: 'w8',
  })
  records.set(22, letter.id)
  records.set(
    23,
    (
      await micro('maintenance-plan', 53, {
        keep: ['self-compassion-break', 'response'],
        rhythm: 'every2',
        signal: 'Gdy znowu siedzę po 18 i przepraszam za wszystko, a wieczorem mielę jeden błąd.',
        support: 'Ola i Kuba. Mogę im powiedzieć wprost: „mam trudny tydzień z krytykiem”.',
      })
    ).id
  )

  // Completions for every done step; full exercises have no record here.
  for (const [index, daysAgo] of SHAME_STEP_DAYS.entries()) {
    if (daysAgo === null) continue
    await complete(SHAME_STEP_SLUGS[index], ago(daysAgo), records.get(index))
  }

  // Parts from the map, named the way Julia calls them.
  for (const reaction of ['withdraw', 'attackSelf'] as const) {
    const payload = createPayloadForReaction(reaction)
    const part = await ifsPartDexieRepository.create(
      reaction === 'withdraw' ? { ...payload, name: 'Ukrywająca się' } : payload
    )
    await backdate('ifsParts', part.id, { createdAt: iso(ago(148)), updatedAt: iso(ago(148)) })
  }

  // Practices: breathing → moments → self-compassion break → writing → positive data.
  const practice = async (slug: string, daysAgo: number, done: boolean, recordId?: string) => {
    const item = await exercisePlanDexieRepository.create({
      exerciseSlug: slug,
      dayRef: ago(daysAgo),
      source: 'program',
      sourceRef: enrollment.id,
      programRole: 'practice',
    })
    await exercisePlanDexieRepository.update(
      item.id,
      done ? { status: 'done', ...(recordId ? { recordId } : {}) } : { status: 'skipped' }
    )
    if (done) await complete(slug, ago(daysAgo), recordId)
  }
  for (let daysAgo = 150; daysAgo >= 136; daysAgo--)
    await practice('paced-breathing', daysAgo, demoRandom(40, daysAgo) < 0.8)

  const momentDays = new Set<number>()
  for (const moment of DEMO_SHAME_MOMENTS) {
    const entry = await micro('moments', moment.daysAgo, {
      kind: 'shame',
      hadMoment: 'yes',
      compass: moment.compass,
      noticed: moment.noticed,
      response: moment.response,
      strength: moment.strength,
      situation: moment.situation,
      about: moment.about,
      criticSaid: moment.criticSaid,
      kindVoice: moment.kindVoice,
      ...(moment.nextTime ? { nextTime: moment.nextTime } : {}),
    })
    momentDays.add(moment.daysAgo)
    if (moment.daysAgo >= 106) await practice('moment-shame', moment.daysAgo, true, entry.id)
    else await complete('moment-shame', ago(moment.daysAgo), entry.id, 'standalone')
  }
  // Quiet days count too, and a few skipped occurrences keep the rhythm honest.
  for (const [daysAgo, quietDay] of [
    [138, 'Spokojny dzień, rozmowa z Olą o niczym.'],
    [129, 'Nic trudnego. Wieczór z Kubą.'],
    [118, 'Dzień bez wstydu, za to z długim spacerem.'],
  ] as const) {
    const entry = await micro('moments', daysAgo, { kind: 'shame', hadMoment: 'none', quietDay })
    await practice('moment-shame', daysAgo, true, entry.id)
    momentDays.add(daysAgo)
  }
  for (const daysAgo of [142, 126, 110])
    if (!momentDays.has(daysAgo)) await practice('moment-shame', daysAgo, false)

  let breakIdx = 0
  for (let daysAgo = 133; daysAgo >= 55; daysAgo -= 2) {
    const vacation = daysAgo <= 97 && daysAgo >= 84
    const done = !vacation && demoRandom(41, daysAgo) < 0.78
    if (vacation && daysAgo % 4 !== 1) continue
    if (done) {
      const text = DEMO_SELF_COMPASSION_TEXTS[breakIdx++ % DEMO_SELF_COMPASSION_TEXTS.length]
      const entry = await micro('self-compassion-break', daysAgo, {
        ...text,
        helpful: 3 + (daysAgo < 90 ? 1 : 0),
      })
      await practice('self-compassion-break', daysAgo, true, entry.id)
    } else {
      await practice('self-compassion-break', daysAgo, false)
    }
  }
  for (const [daysAgo, facts] of [
    [100, 'Kolega przy wszystkich zapytał, czemu prosta rzecz zajęła mi tydzień.'],
    [98, 'Pochwała od klienta, której nie umiałam przyjąć.'],
  ] as const) {
    const entry = await micro('shame-writing', daysAgo, {
      facts,
      humanity:
        'Każdy, kto dba o jakość swojej pracy, czasem słyszy takie pytania. Wiele osób w moim zespole też ma dni, kiedy coś trwa dłużej, niż zakładali. Nie jestem w tym sama i nie jestem w tym gorsza.',
      kindness:
        'Widzę, jak bardzo się starasz i jak bardzo boisz się, że to nie wystarczy. Nie musisz zasługiwać na spokój. Możesz zrobić dobrze to, co możesz, i odpocząć wieczorem bez listy win.',
      perspective:
        'Za miesiąc nikt nie będzie pamiętał tego pytania. Ja zapamiętam, że potraktowałam się łagodnie.',
      helpful: 4,
    })
    await practice('shame-writing', daysAgo, true, entry.id)
  }
  for (let daysAgo = 78; daysAgo >= 55; daysAgo -= 3)
    await practice('positive-data-log', daysAgo, demoRandom(42, daysAgo) < 0.75)

  // Kept practices as repeats after the maintenance plan: every two days, up to tomorrow.
  for (let daysAgo = 51; daysAgo >= 1; daysAgo -= 2) {
    const item = await exercisePlanDexieRepository.create({
      exerciseSlug: 'self-compassion-break',
      dayRef: ago(daysAgo),
      source: 'repeat',
    })
    if (demoRandom(43, daysAgo) < 0.7) {
      const text = DEMO_SELF_COMPASSION_TEXTS[breakIdx++ % DEMO_SELF_COMPASSION_TEXTS.length]
      const entry = await micro('self-compassion-break', daysAgo, { ...text, helpful: 4 })
      await exercisePlanDexieRepository.update(item.id, { status: 'done', recordId: entry.id })
      await complete('self-compassion-break', ago(daysAgo), entry.id)
    } else {
      await exercisePlanDexieRepository.update(item.id, { status: 'skipped' })
    }
  }
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'self-compassion-break',
    dayRef: addDaysToDayRef(today, 1),
    source: 'repeat',
  })

  // Weekly real-world tasks, accepted in the planning ritual.
  const taskIntentionByWeek = new Map<WeekRef, string>()
  const weekLog = []
  for (const task of DEMO_SHAME_TASK_WEEKS) {
    const weekRef = ctx.closedWeeks.find(week => ctx.storyIdx.get(week) === task.storyIndex)
    if (!weekRef) continue
    const intention = await createWeeklyIntention({
      weekRef,
      title: task.title,
      entryMode: task.times > 1 ? 'counter' : 'completion',
      target: { kind: 'count', operator: 'min', value: task.times },
      programLink: { enrollmentId: enrollment.id, taskKey: task.taskKey },
    })
    for (const offset of [0, 2, 4].slice(0, task.done)) {
      const dayRef = addDaysToDayRef(getPeriodBounds(weekRef).start, offset)
      await planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'weeklyIntention',
        subjectId: intention.id,
        dayRef,
        value: task.times > 1 ? 1 : null,
      })
    }
    taskIntentionByWeek.set(weekRef, intention.id)
    weekLog.push({
      weekRef,
      taskKey: task.taskKey,
      decision: 'accepted' as const,
      intentionId: intention.id,
    })
  }

  // Closed path: the "Powrót" follow-up (SCS-SF retest) waits 56 days after the close.
  const completedAt = iso(ago(53), '18:00:00')
  await programEnrollmentDexieRepository.update(enrollment.id, {
    status: 'completed',
    currentStepIndex: 24,
    completedAt,
    completedSteps: SHAME_STEP_DAYS.flatMap((daysAgo, stepIndex) =>
      daysAgo === null
        ? []
        : [
            {
              stepIndex,
              completedAt: iso(ago(daysAgo), '18:00:00'),
              ...(records.has(stepIndex) ? { recordId: records.get(stepIndex) } : {}),
            },
          ]
    ),
    weekLog,
    futureLetter: { entryId: letter.id, showAt: addDaysToDayRef(ago(56), 56) },
  })
  await backdate('programEnrollments', enrollment.id, {
    createdAt: iso(ago(150)),
    updatedAt: completedAt,
  })
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'scs-sf',
    dayRef: addDaysToDayRef(ago(53), 56),
    source: 'program',
    sourceRef: enrollment.id,
    programRole: 'step',
    programStepIndex: 24,
  })
  console.log(
    `[demoSeed] Shame path completed (${DEMO_SHAME_MOMENTS.length} moments, ${weekLog.length} weekly tasks)`
  )
  return { enrollmentId: enrollment.id, taskIntentionByWeek }
}

// ─── IFS path ───────────────────────────────────────────────────────────────

async function seedIfsPath({
  today,
  ago,
}: {
  today: DayRef
  ago: (days: number) => DayRef
}): Promise<void> {
  const enrollment = await programEnrollmentDexieRepository.create({
    programSlug: 'ifs-parts',
    startedAt: iso(ago(20)),
  })
  const steps = [
    { slug: 'parts-mapping', daysAgo: 20 },
    { slug: 'unblending', daysAgo: 15 },
    { slug: 'trailhead', daysAgo: 8 },
  ]
  for (const step of steps) {
    await exerciseCompletionDexieRepository.create({
      exerciseSlug: step.slug,
      dayRef: ago(step.daysAgo),
      completedAt: iso(ago(step.daysAgo), '19:00:00'),
      source: 'plan',
    })
  }
  await programEnrollmentDexieRepository.update(enrollment.id, {
    currentStepIndex: 3,
    completedSteps: steps.map((step, stepIndex) => ({
      stepIndex,
      completedAt: iso(ago(step.daysAgo), '19:00:00'),
    })),
  })
  await backdate('programEnrollments', enrollment.id, { createdAt: iso(ago(20)) })
  // Step 4 (self-energy, minGapDays 2) is due today — the Today view offers it.
  await exercisePlanDexieRepository.create({
    exerciseSlug: 'self-energy',
    dayRef: today,
    source: 'program',
    sourceRef: enrollment.id,
    programRole: 'step',
    programStepIndex: 3,
  })
}

// ─── Foundation ─────────────────────────────────────────────────────────────

/**
 * Completes an attempt of `assessmentId` with answers derived from a target
 * level per item (in the instrument's response range, keyed direction), then
 * backdates it. Returns the attempt id.
 */
async function seedAssessment(
  assessmentId: AssessmentId,
  daysAgo: number,
  level: (item: AssessmentItemDefinition) => number
): Promise<string> {
  const entry = getAssessmentRegistryEntry(assessmentId)
  const { definition } = entry
  const attempt = await assessmentsDexieRepository.startAttempt({
    assessmentId,
    instrumentVersion: definition.instrumentVersion,
    language: 'pl',
    scoringKeyVersion: definition.scoringKeyVersion,
    missingDataPolicyVersion: definition.missingDataPolicy.id,
    totalItems: definition.items.length,
  })
  const responses = await assessmentsDexieRepository.bulkSaveResponses(
    definition.items.map((item, index) => {
      const keyed = level(item) + (index % 3 === 0 ? 0.4 : index % 3 === 1 ? -0.4 : 0)
      const raw = item.reverse ? item.responseMax + item.responseMin - keyed : keyed
      return {
        attemptId: attempt.id,
        assessmentId,
        itemId: item.id,
        responseValue: clamp(Math.round(raw), item.responseMin, item.responseMax),
        reverseFlagAtTime: item.reverse,
        scoringKeyVersion: definition.scoringKeyVersion,
      }
    })
  )
  await assessmentsDexieRepository.completeAttempt(
    attempt.id,
    entry.scorer.score({ definition, responses })
  )
  const day = addDaysToDayRef(getPeriodRefsForDate(new Date()).day, -daysAgo)
  await backdate('assessmentAttempts', attempt.id, {
    startedAt: iso(day, '17:40:00'),
    completedAt: iso(day, '17:55:00'),
    updatedAt: iso(day, '17:55:00'),
  })
  return attempt.id
}

async function seedFoundation({
  ago,
  horizonStart,
  areas,
}: {
  ago: (days: number) => DayRef
  horizonStart: DayRef
  areas: Array<{ id: string; name: string }>
}): Promise<void> {
  // Big Five: conscientious, agreeable, open; neuroticism high-ish.
  const bigFive: Record<string, number> = {
    extraversion: 2.8,
    agreeableness: 4.2,
    conscientiousness: 4.4,
    neuroticism: 3.8,
    openness: 4.1,
  }
  await seedAssessment('ipip-bfm-50', 172, item => bigFive[item.scaleId ?? ''] ?? 3)
  await seedAssessment('erq', 171, item => (item.scaleId === 'suppression' ? 5.2 : 3.4))
  await seedAssessment('ecr-rs', 171, item => (item.scaleId === 'anxiety' ? 4.6 : 2.6))
  // PVQ-40 stays older than 180 days on purpose: the foundation shows a „Warto odświeżyć” tile.
  const pvq: Record<string, number> = {
    benevolence: 5.4,
    selfDirection: 5.1,
    universalism: 4.8,
    achievement: 4.6,
    security: 4.4,
    conformity: 3.9,
    hedonism: 3.5,
    stimulation: 3.2,
    tradition: 2.6,
    power: 2.0,
  }
  await seedAssessment('pvq-40', 194, item => pvq[item.scaleId ?? ''] ?? 3.5)
  // Rumination falls between the two attempts, reflection rises.
  await seedAssessment('rrq', 170, item => (item.scaleId === 'rumination' ? 4.3 : 3.2))
  await seedAssessment('rrq', 12, item => (item.scaleId === 'rumination' ? 3.0 : 3.8))
  // Valued living: importance stays, consistency catches up.
  const importance: Record<string, number> = {
    family: 9,
    intimateRelationships: 9,
    parenting: 3,
    friendships: 8,
    work: 7,
    education: 6,
    recreation: 7,
    spirituality: 4,
    citizenship: 4,
    health: 9,
  }
  const before: Record<string, number> = {
    family: 5,
    intimateRelationships: 4,
    parenting: 2,
    friendships: 3,
    work: 8,
    education: 3,
    recreation: 2,
    spirituality: 3,
    citizenship: 2,
    health: 3,
  }
  const after: Record<string, number> = {
    family: 7,
    intimateRelationships: 8,
    parenting: 2,
    friendships: 7,
    work: 6,
    education: 5,
    recreation: 6,
    spirituality: 4,
    citizenship: 3,
    health: 8,
  }
  await seedAssessment(
    'vlq',
    172,
    item => (item.metric === 'importance' ? importance : before)[item.scaleId ?? ''] ?? 5
  )
  await seedAssessment(
    'vlq',
    14,
    item => (item.metric === 'importance' ? importance : after)[item.scaleId ?? ''] ?? 5
  )

  // Wheel of life: April vs now.
  const wheel = async (
    daysAgo: number,
    scores: number[],
    notes: string,
    influences: Array<[string, string]>
  ) => {
    const created = await lifeAreaAssessmentDexieRepository.create({
      scope: 'full',
      notes,
      lifeAreaIds: areas.map(area => area.id),
      items: areas.map((area, index) => ({
        lifeAreaId: area.id,
        lifeAreaNameSnapshot: area.name,
        score: scores[index],
        details: {
          positiveInfluences: influences[index][0],
          negativeInfluences: influences[index][1],
        },
      })),
    })
    await backdate('lifeAreaAssessments', created.id, {
      createdAt: iso(ago(daysAgo), '18:30:00'),
      updatedAt: iso(ago(daysAgo), '18:30:00'),
    })
  }
  if (ago(197) >= addDaysToDayRef(horizonStart, -14)) {
    await wheel(
      197,
      [3, 3, 4, 4, 2, 3, 2],
      'Pierwsze koło. Wszystko poniżej połowy poza relacjami, i te też słabną.',
      [
        ['Wyniki badań, wreszcie diagnoza', 'Sen po północy, zero ruchu'],
        ['Lubię zespół', 'Wieczory przy laptopie, strach przed oceną'],
        ['Kuba jest cierpliwy', 'Telefon przy stole, brak czasu'],
        ['Ola się odezwała', 'Odwołane spotkania'],
        ['Zauważam krytyka', 'Przepraszam za wszystko'],
        ['Chciałabym wrócić do rysowania', 'Brak sił'],
        ['Weekendy czasem wolne', 'Wyrzuty sumienia przy odpoczynku'],
      ]
    )
  }
  await wheel(
    13,
    [7, 5, 8, 7, 6, 6, 6],
    'Drugie koło po pół roku. Zdrowie i związek to największa zmiana. Praca dalej najsłabsza, ale już nie w czerwieni.',
    [
      ['10 km, sen przed 23', 'Kolano przy dłuższych biegach'],
      ['Granica 18:00, mniej poprawek', 'Nowy wymagający klient'],
      ['Wieczory bez telefonów, Bieszczady', 'Czasem zmęczenie po pracy'],
      ['Spotkania z Olą, telefony do mamy', 'Mama w szpitalu w tym miesiącu'],
      ['Ścieżka o wstydzie, przerwa na współczucie', 'Krytyk wraca przy nowych ludziach'],
      ['Szkicownik, kurs ilustracji w planach', 'Mało czasu w tygodniu'],
      ['Odpoczynek bez wyrzutów, urlop bez maili', 'Jeszcze uczę się nic nie robić'],
    ]
  )

  // Meaning: a transformative purpose written after the shame path.
  const purpose = await transformativePurposeDexieRepository.create({
    curiosities: [
      'dlaczego ludzie boją się pytać',
      'ilustracja',
      'bieganie i ciało',
      'jak projektować spokojne aplikacje',
      'psychologia wstydu',
    ],
    intersection: 'Jak sprawić, żeby ludzie czuli się bezpiecznie, gdy czegoś nie wiedzą.',
    problems: [
      'Interfejsy, które zawstydzają przy błędzie',
      'Kultura pracy, w której pytanie to słabość',
      'Wypalenie u osób, które „muszą być bez zarzutu”',
      'Brak czasu na tworzenie dla przyjemności',
      'Samotność w trudnych momentach',
    ],
    purposeStatement:
      'Projektuję rzeczy i relacje, w których można nie wiedzieć i dalej czuć się w porządku.',
  })
  await backdate('transformativePurposes', purpose.id, {
    createdAt: iso(ago(30), '19:00:00'),
    updatedAt: iso(ago(30), '19:00:00'),
  })

  // Parts map (the IFS path's first step, also a foundation item).
  const perfectionist = await ifsPartDexieRepository.create({
    name: 'Perfekcjonistka',
    role: 'manager',
    bodyLocations: ['shoulders'],
    emotionIds: [],
    lifeAreaIds: [],
    positiveIntention: 'Chce, żeby nikt nie mógł mi niczego zarzucić.',
    fears: 'Że jeden błąd pokaże, że się nie nadaję.',
    triggerContexts: ['oddawanie projektu', 'ocena'],
  })
  const artist = await ifsPartDexieRepository.create({
    name: 'Ta, która chce rysować',
    role: 'exile',
    bodyLocations: ['chest'],
    emotionIds: [],
    lifeAreaIds: [],
    needs: 'Czasu bez oceniania i bez celu.',
    burden: '„Rysowanie to strata czasu, zajmij się czymś poważnym.”',
    feltAge: 12,
  })
  const parts = await ifsPartDexieRepository.getAll()
  const critic = parts.find(part => part.tags?.includes('shame-compass:attackSelf'))
  const hider = parts.find(part => part.tags?.includes('shame-compass:withdraw'))
  const map = await ifsPartsMapDexieRepository.create({
    partIds: [critic?.id, hider?.id, perfectionist.id, artist.id].filter((id): id is string =>
      Boolean(id)
    ),
    relationships: [
      ...(critic
        ? [
            {
              fromPartId: critic.id,
              toPartId: artist.id,
              type: 'protects' as const,
              notes: 'Krytyk pilnuje, żeby nikt nie wyśmiał rysunków.',
            },
          ]
        : []),
      ...(hider
        ? [{ fromPartId: perfectionist.id, toPartId: hider.id, type: 'allied' as const }]
        : []),
    ],
    trailheadSituation: 'Nowy klient przerywa w pół zdania, a ja przestaję mówić.',
    reflection: 'Każda część czegoś pilnuje. Najbardziej chronią tę, która chce po prostu rysować.',
  })
  for (const [table, id] of [
    ['ifsParts', perfectionist.id],
    ['ifsParts', artist.id],
    ['ifsPartsMaps', map.id],
  ] as const) {
    await backdate(table, id, {
      createdAt: iso(ago(20), '19:00:00'),
      updatedAt: iso(ago(20), '19:00:00'),
    })
  }
}

/** Exported for the alignment spec (step slugs must match the catalog). */
export const DEMO_SHAME_STEP_SLUGS = SHAME_STEP_SLUGS
