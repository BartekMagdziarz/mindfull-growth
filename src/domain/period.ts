type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand }

export type YearRef = Brand<string, 'YearRef'>
export type MonthRef = Brand<string, 'MonthRef'>
export type WeekRef = Brand<string, 'WeekRef'>
export type DayRef = Brand<string, 'DayRef'>

export type PeriodRef = YearRef | MonthRef | WeekRef | DayRef
export type PeriodType = 'year' | 'month' | 'week' | 'day'

export type PeriodAssignment =
  | { periodType: 'day'; periodRef: DayRef }
  | { periodType: 'week'; periodRef: WeekRef }
  | { periodType: 'month'; periodRef: MonthRef }

export interface PeriodBounds {
  start: DayRef
  end: DayRef
}

export interface PeriodRefsForDate {
  year: YearRef
  month: MonthRef
  week: WeekRef
  day: DayRef
}

export interface PeriodGroup<T> {
  periodRef: PeriodRef
  items: T[]
}

export interface PeriodCount {
  periodRef: PeriodRef
  count: number
}
