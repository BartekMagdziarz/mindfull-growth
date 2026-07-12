/**
 * UI-facing aliases for the Month V2 experiment configuration.
 *
 * The canonical unions live next to the query resolver
 * (`src/router/calendarExperimentQuery.ts`) so the URL contract and the
 * component props can never drift apart.
 */
export type {
  CalendarMonthChartMode as MonthChartMode,
  CalendarMonthDensity as MonthDensity,
} from '@/router/calendarExperimentQuery'
