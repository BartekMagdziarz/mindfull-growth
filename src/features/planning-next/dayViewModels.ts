import type { DayRef, WeekRef } from '@/domain/period'
import { bucketMarker, type DayMarker } from '@/services/dayUpcomingQueries'
import type { TodayItem } from '@/services/todayViewQueries'
import { formatMonthTitle } from '@/utils/periodLabels'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

/** Compass keys: `priority:<id>` for a month direction, `object:<itemKey>` for a week focus. */
export type CompassKey = `priority:${string}` | `object:${string}`

export function priorityCompassKey(priorityId: string): CompassKey {
  return `priority:${priorityId}`
}

export function objectCompassKey(itemKey: string): CompassKey {
  return `object:${itemKey}`
}

/** Whether a day row is related to the hovered / pinned compass tile. */
export function isRelatedToCompass(item: TodayItem, key: string | null): boolean {
  if (!key) return false
  if (key.startsWith('priority:')) {
    return item.kind === 'measurement' && item.priorityIds.includes(key.slice('priority:'.length))
  }
  if (key.startsWith('object:')) return item.key === key.slice('object:'.length)
  return false
}

const PANEL_TYPE_ICONS: Record<string, string> = {
  habit: 'loop',
  tracker: 'monitoring',
  keyResult: 'flag',
  weeklyIntention: 'target',
  initiative: 'rocket_launch',
}

/** Same icon resolution the day row uses: own icon → parent goal icon → family icon. */
export function dayItemIcon(item: TodayItem): string {
  if (item.kind === 'initiative') return item.initiative.icon || PANEL_TYPE_ICONS.initiative
  if (item.panelType === 'keyResult' && item.goalIcon) return item.goalIcon
  const subject = item.subject as { icon?: string }
  return subject.icon || PANEL_TYPE_ICONS[item.panelType] || 'circle'
}

export function dayItemTitle(item: TodayItem): string {
  return item.kind === 'initiative' ? item.initiative.title : item.subject.title
}

/** Priority tone by position in the month focus — Today palette: blue, lavender, rose. */
export function priorityTone(index: number): 'blue' | 'lavender' | 'rose' {
  return index === 1 ? 'lavender' : index === 2 ? 'rose' : 'blue'
}

export function priorityFallbackIcon(index: number): string {
  return index === 0 ? 'directions_run' : index === 1 ? 'rocket_launch' : 'favorite'
}

type Translate = (key: string, params?: Record<string, string | number>) => string

/** Human title for a calendar/upcoming marker — resolved here so services stay i18n-free. */
export function markerTitle(marker: DayMarker, t: Translate, locale: string): string {
  if (marker.kind === 'deadline') return marker.goal.title
  if (marker.ritual === 'week') {
    return t(marker.action === 'plan' ? 'planning.today.upcoming.planWeek' : 'planning.today.upcoming.reflectWeek', { n: Number(marker.weekRef.slice(-2)) })
  }
  const month = formatMonthTitle(marker.monthRef, locale).replace(/\s+\d{4}$/, '').toLocaleLowerCase(locale)
  return t(marker.action === 'plan' ? 'planning.today.upcoming.planMonth' : 'planning.today.upcoming.reflectMonth', { month })
}

/** Done markers trade their own icon for a check so the state is visible without colour. */
export function markerIcon(marker: DayMarker): string {
  if (marker.state === 'done') return 'check'
  if (marker.kind === 'deadline') return marker.goal.icon || 'outlined_flag'
  if (marker.action === 'reflect') return 'rate_review'
  return marker.ritual === 'week' ? 'edit_calendar' : 'date_range'
}

/** "dziś" / "pt 18", prefixed with "po terminie ·" for overdue markers. */
export function markerDateLabel(marker: DayMarker, todayRef: DayRef, t: Translate, locale: string): string {
  const day = marker.dayRef === todayRef
    ? t('planning.today.upcoming.today')
    : `${new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(`${marker.dayRef}T12:00:00`)).replace('.', '')} ${Number(marker.dayRef.slice(-2))}`
  return bucketMarker(marker, todayRef) === 'overdue' ? `${t('planning.today.upcoming.overdue')} · ${day}` : day
}

/** Week a row must stay in when moved: weekly intentions are bound to their week; others roam. */
export function rescheduleWeekLock(item: TodayItem): WeekRef | null {
  if (item.kind !== 'measurement' || item.panelType !== 'weeklyIntention') return null
  return (item.subject as { weekRef: WeekRef }).weekRef
}

/** Scheduled rows move their assignment; week/month measurement rows are re-homed (hidden here, shown there). */
export function canRescheduleItem(item: TodayItem): boolean {
  return item.isScheduledToday || (item.kind === 'measurement' && item.canHide)
}

/** "Jutro" is offered only when tomorrow is a legal target for this row. */
export function canMoveToTomorrow(item: TodayItem, dayRef: DayRef): boolean {
  if (!canRescheduleItem(item)) return false
  const lock = rescheduleWeekLock(item)
  if (!lock) return true
  return getPeriodRefsForDate(new Date(`${addDaysToDayRef(dayRef, 1)}T12:00:00`)).week === lock
}
