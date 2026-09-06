import type { DayMarker } from '@/services/dayUpcomingQueries'
import type { TodayItem } from '@/services/todayViewQueries'
import { formatMonthTitle } from '@/utils/periodLabels'

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
  if (marker.ritual === 'week') return t('planning.today.upcoming.planWeek', { n: Number(marker.weekRef.slice(-2)) })
  return t('planning.today.upcoming.planMonth', { month: formatMonthTitle(marker.monthRef, locale).replace(/\s+\d{4}$/, '').toLocaleLowerCase(locale) })
}

export function markerIcon(marker: DayMarker): string {
  if (marker.kind === 'deadline') return marker.goal.icon || 'outlined_flag'
  return marker.ritual === 'week' ? 'edit_calendar' : 'date_range'
}
