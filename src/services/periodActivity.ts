import type { DayRef } from '@/domain/period'
import type { Quadrant } from '@/domain/emotion'

export interface PeriodActivityDay {
  dayRef: DayRef
  weekdayIndex: number
  isToday: boolean
  isFuture: boolean
  journalWritten: boolean
  emotionCount: number
  quadrantCounts: Record<Quadrant, number>
  exerciseCount: number
}

export interface PeriodActivity {
  days: PeriodActivityDay[]
  totals: { emotionSessions: number; journalEntries: number; exercises: number }
}

export interface PeriodActivitySources {
  journalCreatedAts: string[]
  emotionLogs: Array<{ createdAt: string; quadrants: Quadrant[] }>
  exerciseDayRefs: DayRef[]
}

function emptyQuadrantCounts(): Record<Quadrant, number> {
  return {
    'high-energy-high-pleasantness': 0,
    'high-energy-low-pleasantness': 0,
    'low-energy-high-pleasantness': 0,
    'low-energy-low-pleasantness': 0,
  }
}

/** Scale-neutral activity rollup for an explicit list of canonical day refs. */
export function buildPeriodActivity(
  dayRefs: DayRef[],
  todayRef: DayRef,
  sources: PeriodActivitySources
): PeriodActivity {
  const days = dayRefs.map((dayRef): PeriodActivityDay => {
    const isFuture = dayRef > todayRef
    const dayStart = `${dayRef}T00:00:00.000Z`
    const dayEnd = `${dayRef}T23:59:59.999Z`
    const dayLogs = isFuture
      ? []
      : sources.emotionLogs.filter((log) => log.createdAt >= dayStart && log.createdAt <= dayEnd)
    const quadrantCounts = emptyQuadrantCounts()
    for (const log of dayLogs) {
      for (const quadrant of log.quadrants) quadrantCounts[quadrant]++
    }

    const date = new Date(`${dayRef}T12:00:00.000Z`)
    return {
      dayRef,
      weekdayIndex: (date.getUTCDay() + 6) % 7,
      isToday: dayRef === todayRef,
      isFuture,
      journalWritten:
        !isFuture &&
        sources.journalCreatedAts.some((createdAt) => createdAt >= dayStart && createdAt <= dayEnd),
      emotionCount: dayLogs.length,
      quadrantCounts,
      exerciseCount: isFuture
        ? 0
        : sources.exerciseDayRefs.filter((ref) => ref === dayRef).length,
    }
  })

  return {
    days,
    totals: {
      emotionSessions: days.reduce((sum, day) => sum + day.emotionCount, 0),
      journalEntries: days.filter((day) => day.journalWritten).length,
      exercises: days.reduce((sum, day) => sum + day.exerciseCount, 0),
    },
  }
}
