import type { WeeklyPlan } from '@/domain/planning'
import type { WeeklyReflection } from '@/domain/reflection'
import { formatPeriodDateRangeNoYear } from '@/utils/periodUtils'

export type WeeklyBatteryKey = 'body' | 'mind' | 'emotion' | 'social'

export interface WeeklyBatteryTrendPoint {
  weeklyPlanId: string
  startDate: string
  endDate: string
  label: string
  demand: number | null
  state: number | null
}

export interface WeeklyBatteryTrendSeries {
  battery: WeeklyBatteryKey
  points: WeeklyBatteryTrendPoint[]
}

interface BuildWeeklyBatteryTrendInput {
  weeklyPlans: WeeklyPlan[]
  weeklyReflections: WeeklyReflection[]
  referenceStartDate: string
  lookbackWeeks?: number
}

const BATTERY_KEYS: WeeklyBatteryKey[] = ['body', 'mind', 'emotion', 'social']
const DEFAULT_LOOKBACK_WEEKS = 6

function sortPlansChronologically(plans: WeeklyPlan[]): WeeklyPlan[] {
  return [...plans].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

function pickLookbackPlans(
  plans: WeeklyPlan[],
  referenceStartDate: string,
  lookbackWeeks: number
): WeeklyPlan[] {
  const prior = plans.filter((plan) => plan.startDate < referenceStartDate)
  const sortedDesc = [...prior].sort((a, b) => b.startDate.localeCompare(a.startDate))
  return sortPlansChronologically(sortedDesc.slice(0, lookbackWeeks))
}

export function buildWeeklyBatteryTrend({
  weeklyPlans,
  weeklyReflections,
  referenceStartDate,
  lookbackWeeks = DEFAULT_LOOKBACK_WEEKS,
}: BuildWeeklyBatteryTrendInput): WeeklyBatteryTrendSeries[] {
  const plans = pickLookbackPlans(weeklyPlans, referenceStartDate, lookbackWeeks)
  const reflectionByPlanId = new Map(weeklyReflections.map((r) => [r.weeklyPlanId, r]))

  return BATTERY_KEYS.map((battery) => ({
    battery,
    points: plans.map((plan) => {
      const reflection = reflectionByPlanId.get(plan.id)
      const snapshot = reflection?.batterySnapshot?.[battery]
      return {
        weeklyPlanId: plan.id,
        startDate: plan.startDate,
        endDate: plan.endDate,
        label: formatPeriodDateRangeNoYear(plan.startDate, plan.endDate),
        demand: snapshot?.demand ?? null,
        state: snapshot?.state ?? null,
      }
    }),
  }))
}

