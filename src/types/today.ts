export type TodayMode = 'morning' | 'midday' | 'evening'

export type TodayModeOverride = 'auto' | TodayMode

export type TodayModuleDensity = 'comfortable' | 'compact'

export type TodayRecommendationTone = 'activation' | 'regulation' | 'reflection'

export type TodayRecommendationFeedbackType = 'more' | 'less' | 'not-now'

export interface TodayRecommendation {
  id: string
  title: string
  description: string
  route: string
  modality: 'ifs' | 'cbt' | 'logotherapy' | 'self-discovery'
  tone: TodayRecommendationTone
  whyNow: string
  score: number
}

export interface TodayRecommendationFeedback {
  id: string
  boost: number
  lessCount: number
  moreCount: number
  notNowCount: number
  suppressUntil?: string
  updatedAt: string
}

export interface TodayCompassState {
  yearTheme?: string
  monthIntention?: string
  weekFocusSentence?: string
  topPriorities: string[]
  yearLabel?: string
  monthLabel?: string
  weekLabel?: string
}

export interface TodayExecutionState {
  commitmentDone: number
  commitmentTotal: number
  unfinishedCommitmentIds: string[]
  hasWeeklyPlan: boolean
}
