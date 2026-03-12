import type {
  DayRef,
  MonthRef,
  PeriodAssignment,
  PeriodBounds,
  PeriodCount,
  PeriodGroup,
  PeriodRef,
  PeriodRefsForDate,
  PeriodType,
  WeekRef,
  YearRef,
} from '@/domain/period'

const MS_PER_DAY = 86_400_000
const YEAR_REF_RE = /^(\d{4})$/
const MONTH_REF_RE = /^(\d{4})-(\d{2})$/
const WEEK_REF_RE = /^(\d{4})-W(\d{2})$/
const DAY_REF_RE = /^(\d{4})-(\d{2})-(\d{2})$/

interface LocalDateParts {
  year: number
  month: number
  day: number
}

interface WeekParts {
  year: number
  week: number
}

type ResolvedPeriod = PeriodRef | PeriodAssignment | null | undefined

export function parsePeriodRef(value: string): PeriodRef {
  assertPeriodRef(value)
  return value as PeriodRef
}

export function isPeriodRef(value: string): value is PeriodRef {
  if (DAY_REF_RE.test(value)) {
    return parseDayRefParts(value) !== null
  }

  if (WEEK_REF_RE.test(value)) {
    return parseWeekRefParts(value) !== null
  }

  if (MONTH_REF_RE.test(value)) {
    return parseMonthRefParts(value) !== null
  }

  if (YEAR_REF_RE.test(value)) {
    return parseYearRefNumber(value) !== null
  }

  return false
}

export function assertPeriodRef(value: string): asserts value is PeriodRef {
  if (!isPeriodRef(value)) {
    throw new Error(`Invalid period ref: ${value}`)
  }
}

export function serializePeriodRef(periodRef: PeriodRef): string {
  return periodRef
}

export function getPeriodType(periodRef: PeriodRef): PeriodType {
  if (DAY_REF_RE.test(periodRef)) return 'day'
  if (WEEK_REF_RE.test(periodRef)) return 'week'
  if (MONTH_REF_RE.test(periodRef)) return 'month'
  if (YEAR_REF_RE.test(periodRef)) return 'year'

  throw new Error(`Unknown period ref: ${periodRef}`)
}

export function getPeriodRefsForDate(dateInput: Date | string): PeriodRefsForDate {
  const parts = getLocalDatePartsFromInput(dateInput)
  const weekStart = startOfWeek(parts)
  const weekYear = weekStart.year
  const weekNumber = daysBetween(firstMondayOfYear(weekYear), weekStart) / 7 + 1

  return {
    year: formatYearRef(parts.year),
    month: formatMonthRef(parts.year, parts.month),
    week: formatWeekRef(weekYear, weekNumber),
    day: formatDayRef(parts),
  }
}

export function getPeriodBounds(periodRef: PeriodRef): PeriodBounds {
  switch (getPeriodType(periodRef)) {
    case 'year': {
      const year = parseYearRefNumber(periodRef)
      if (year === null) {
        throw new Error(`Invalid year ref: ${periodRef}`)
      }

      return {
        start: formatDayRef({ year, month: 1, day: 1 }),
        end: formatDayRef({ year, month: 12, day: 31 }),
      }
    }
    case 'month': {
      const parts = parseMonthRefParts(periodRef)
      if (!parts) {
        throw new Error(`Invalid month ref: ${periodRef}`)
      }

      return {
        start: formatDayRef({ year: parts.year, month: parts.month, day: 1 }),
        end: formatDayRef({
          year: parts.year,
          month: parts.month,
          day: getLastDayOfMonth(parts.year, parts.month),
        }),
      }
    }
    case 'week': {
      const parts = parseWeekRefParts(periodRef)
      if (!parts) {
        throw new Error(`Invalid week ref: ${periodRef}`)
      }

      const start = addDays(firstMondayOfYear(parts.year), (parts.week - 1) * 7)
      return {
        start: formatDayRef(start),
        end: formatDayRef(addDays(start, 6)),
      }
    }
    case 'day':
      return { start: periodRef as DayRef, end: periodRef as DayRef }
  }
}

export function getWeekOverlappingMonths(weekRef: WeekRef): MonthRef[] {
  const { start, end } = getPeriodBounds(weekRef)
  const startMonth = getPeriodRefsForDate(start).month
  const endMonth = getPeriodRefsForDate(end).month

  return startMonth === endMonth ? [startMonth] : [startMonth, endMonth]
}

export function comparePeriodRefs(left: PeriodRef, right: PeriodRef): number {
  const leftBounds = getPeriodBounds(left)
  const rightBounds = getPeriodBounds(right)
  const startDiff = compareDayRefs(leftBounds.start, rightBounds.start)

  if (startDiff !== 0) {
    return startDiff
  }

  const endDiff = compareDayRefs(rightBounds.end, leftBounds.end)
  if (endDiff !== 0) {
    return endDiff
  }

  return getPeriodTypeOrder(left) - getPeriodTypeOrder(right)
}

export function getPreviousPeriod(periodRef: PeriodRef): PeriodRef {
  switch (getPeriodType(periodRef)) {
    case 'year': {
      const year = parseYearRefNumber(periodRef)
      if (year === null) {
        throw new Error(`Invalid year ref: ${periodRef}`)
      }
      return formatYearRef(assertYearInRange(year - 1))
    }
    case 'month':
      return shiftMonthRef(periodRef as MonthRef, -1)
    case 'week':
      return getPeriodRefsForDate(addDaysToDayRef(getPeriodBounds(periodRef).start, -7)).week
    case 'day':
      return addDaysToDayRef(periodRef as DayRef, -1)
  }
}

export function getNextPeriod(periodRef: PeriodRef): PeriodRef {
  switch (getPeriodType(periodRef)) {
    case 'year': {
      const year = parseYearRefNumber(periodRef)
      if (year === null) {
        throw new Error(`Invalid year ref: ${periodRef}`)
      }
      return formatYearRef(assertYearInRange(year + 1))
    }
    case 'month':
      return shiftMonthRef(periodRef as MonthRef, 1)
    case 'week':
      return getPeriodRefsForDate(addDaysToDayRef(getPeriodBounds(periodRef).start, 7)).week
    case 'day':
      return addDaysToDayRef(periodRef as DayRef, 1)
  }
}

export function zoomPeriod(
  periodRef: PeriodRef,
  targetType: PeriodType,
  anchorDay?: DayRef,
): PeriodRef {
  if (getPeriodType(periodRef) === targetType) {
    return periodRef
  }

  const effectiveAnchor = anchorDay ?? getPeriodBounds(periodRef).start
  const refs = getPeriodRefsForDate(effectiveAnchor)

  switch (targetType) {
    case 'year':
      return refs.year
    case 'month':
      return refs.month
    case 'week':
      return refs.week
    case 'day':
      return refs.day
  }
}

export function getParentPeriod(periodRef: YearRef): null
export function getParentPeriod(periodRef: MonthRef): YearRef
export function getParentPeriod(periodRef: WeekRef): MonthRef
export function getParentPeriod(periodRef: DayRef): WeekRef
export function getParentPeriod(periodRef: PeriodRef): PeriodRef | null {
  switch (getPeriodType(periodRef)) {
    case 'year':
      return null
    case 'month':
      return zoomPeriod(periodRef, 'year') as YearRef
    case 'week':
      return zoomPeriod(periodRef, 'month', getPeriodBounds(periodRef).start) as MonthRef
    case 'day':
      return zoomPeriod(periodRef, 'week') as WeekRef
  }
}

export function getChildPeriods(periodRef: YearRef): MonthRef[]
export function getChildPeriods(periodRef: MonthRef): WeekRef[]
export function getChildPeriods(periodRef: WeekRef): DayRef[]
export function getChildPeriods(periodRef: DayRef): []
export function getChildPeriods(periodRef: PeriodRef): PeriodRef[] {
  switch (getPeriodType(periodRef)) {
    case 'year': {
      const year = parseYearRefNumber(periodRef)
      if (year === null) {
        throw new Error(`Invalid year ref: ${periodRef}`)
      }

      return Array.from({ length: 12 }, (_, index) => formatMonthRef(year, index + 1))
    }
    case 'month': {
      const { start, end } = getPeriodBounds(periodRef)
      const weeks: WeekRef[] = []
      let currentWeek = zoomPeriod(start, 'week') as WeekRef
      const lastWeek = zoomPeriod(end, 'week') as WeekRef

      while (comparePeriodRefs(currentWeek, lastWeek) <= 0) {
        weeks.push(currentWeek)
        currentWeek = getNextPeriod(currentWeek) as WeekRef
      }

      return weeks
    }
    case 'week': {
      const { start } = getPeriodBounds(periodRef)
      return Array.from({ length: 7 }, (_, index) => addDaysToDayRef(start, index))
    }
    case 'day':
      return []
  }
}

export function containsDay(periodRef: PeriodRef, dayRef: DayRef): boolean {
  const bounds = getPeriodBounds(periodRef)

  return compareDayRefs(bounds.start, dayRef) <= 0 && compareDayRefs(dayRef, bounds.end) <= 0
}

export function periodIntersectsPeriod(left: PeriodRef, right: PeriodRef): boolean {
  const leftBounds = getPeriodBounds(left)
  const rightBounds = getPeriodBounds(right)

  return (
    compareDayRefs(leftBounds.start, rightBounds.end) <= 0 &&
    compareDayRefs(rightBounds.start, leftBounds.end) <= 0
  )
}

export function getAssignmentBounds(assignment: PeriodAssignment): PeriodBounds {
  return getPeriodBounds(assignment.periodRef)
}

export function isAssignmentRelevantToPeriod(
  assignment: PeriodAssignment,
  targetPeriod: PeriodRef,
): boolean {
  const assignmentBounds = getAssignmentBounds(assignment)
  const targetBounds = getPeriodBounds(targetPeriod)

  return (
    compareDayRefs(assignmentBounds.start, targetBounds.end) <= 0 &&
    compareDayRefs(targetBounds.start, assignmentBounds.end) <= 0
  )
}

export function filterItemsByPeriod<T>(
  items: T[],
  targetPeriod: PeriodRef,
  resolvePeriod: (item: T) => ResolvedPeriod,
): T[] {
  return items.filter((item) => {
    const resolved = resolvePeriod(item)
    if (!resolved) return false

    return isPeriodAssignment(resolved)
      ? isAssignmentRelevantToPeriod(resolved, targetPeriod)
      : periodIntersectsPeriod(resolved, targetPeriod)
  })
}

export function groupItemsByPeriod<T>(
  items: T[],
  resolvePeriod: (item: T) => ResolvedPeriod,
): PeriodGroup<T>[] {
  const groups = new Map<PeriodRef, T[]>()

  for (const item of items) {
    const resolved = resolvePeriod(item)
    if (!resolved) continue

    const periodRef = isPeriodAssignment(resolved) ? resolved.periodRef : resolved
    const existing = groups.get(periodRef) ?? []
    existing.push(item)
    groups.set(periodRef, existing)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => comparePeriodRefs(left, right))
    .map(([periodRef, groupedItems]) => ({ periodRef, items: groupedItems }))
}

export function countItemsByPeriod<T>(
  items: T[],
  resolvePeriod: (item: T) => ResolvedPeriod,
): PeriodCount[] {
  return groupItemsByPeriod(items, resolvePeriod).map(({ periodRef, items: groupedItems }) => ({
    periodRef,
    count: groupedItems.length,
  }))
}

function formatYearRef(year: number): YearRef {
  return String(year).padStart(4, '0') as YearRef
}

function formatMonthRef(year: number, month: number): MonthRef {
  return `${formatYearRef(year)}-${String(month).padStart(2, '0')}` as MonthRef
}

function formatWeekRef(year: number, week: number): WeekRef {
  return `${formatYearRef(year)}-W${String(week).padStart(2, '0')}` as WeekRef
}

function formatDayRef(parts: LocalDateParts): DayRef {
  return `${formatYearRef(parts.year)}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}` as DayRef
}

function parseYearRefNumber(value: string): number | null {
  const match = YEAR_REF_RE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  return isValidYear(year) ? year : null
}

function parseMonthRefParts(value: string): { year: number; month: number } | null {
  const match = MONTH_REF_RE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!isValidYear(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

function parseWeekRefParts(value: string): WeekParts | null {
  const match = WEEK_REF_RE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const week = Number(match[2])
  if (!isValidYear(year) || !Number.isInteger(week) || week < 1 || week > getWeeksInYear(year)) {
    return null
  }

  return { year, week }
}

function parseDayRefParts(value: string): LocalDateParts | null {
  const match = DAY_REF_RE.exec(value)
  if (!match) return null

  const parts: LocalDateParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }

  return isValidLocalDate(parts) ? parts : null
}

function getLocalDatePartsFromInput(input: Date | string): LocalDateParts {
  if (typeof input === 'string') {
    const dayParts = parseDayRefParts(input)
    if (dayParts) {
      return dayParts
    }

    if (YEAR_REF_RE.test(input) || MONTH_REF_RE.test(input) || WEEK_REF_RE.test(input)) {
      throw new Error(`Expected a timestamp or day ref, received period ref: ${input}`)
    }
  }

  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${String(input)}`)
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1 && year <= 9999
}

function assertYearInRange(year: number): number {
  if (!isValidYear(year)) {
    throw new Error(`Year out of supported range: ${year}`)
  }

  return year
}

function isValidLocalDate(parts: LocalDateParts): boolean {
  if (
    !isValidYear(parts.year) ||
    !Number.isInteger(parts.month) ||
    parts.month < 1 ||
    parts.month > 12 ||
    !Number.isInteger(parts.day) ||
    parts.day < 1
  ) {
    return false
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  return (
    date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() + 1 === parts.month &&
    date.getUTCDate() === parts.day
  )
}

function getWeeksInYear(year: number): number {
  return daysBetween(firstMondayOfYear(year), firstMondayOfYear(year + 1)) / 7
}

function firstMondayOfYear(year: number): LocalDateParts {
  const janFirst: LocalDateParts = { year, month: 1, day: 1 }
  const dayOfWeek = getDayOfWeek(janFirst)
  const offset = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  return addDays(janFirst, offset)
}

function startOfWeek(parts: LocalDateParts): LocalDateParts {
  const dayOfWeek = getDayOfWeek(parts)
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  return addDays(parts, offset)
}

function addDays(parts: LocalDateParts, amount: number): LocalDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  date.setUTCDate(date.getUTCDate() + amount)

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function addDaysToDayRef(dayRef: DayRef, amount: number): DayRef {
  const parts = parseDayRefParts(dayRef)
  if (!parts) {
    throw new Error(`Invalid day ref: ${dayRef}`)
  }

  return formatDayRef(addDays(parts, amount))
}

function shiftMonthRef(monthRef: MonthRef, amount: number): MonthRef {
  const parts = parseMonthRefParts(monthRef)
  if (!parts) {
    throw new Error(`Invalid month ref: ${monthRef}`)
  }

  const totalMonths = parts.year * 12 + (parts.month - 1) + amount
  const nextYear = Math.floor(totalMonths / 12)
  const nextMonth = ((totalMonths % 12) + 12) % 12 + 1

  return formatMonthRef(assertYearInRange(nextYear), nextMonth)
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function daysBetween(start: LocalDateParts, end: LocalDateParts): number {
  return toEpochDay(end) - toEpochDay(start)
}

function getDayOfWeek(parts: LocalDateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
}

function toEpochDay(parts: LocalDateParts): number {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY)
}

function compareDayRefs(left: DayRef, right: DayRef): number {
  return String(left).localeCompare(String(right))
}

function getPeriodTypeOrder(periodRef: PeriodRef): number {
  switch (getPeriodType(periodRef)) {
    case 'year':
      return 0
    case 'month':
      return 1
    case 'week':
      return 2
    case 'day':
      return 3
  }
}

function isPeriodAssignment(value: PeriodRef | PeriodAssignment): value is PeriodAssignment {
  return typeof value === 'object'
}
