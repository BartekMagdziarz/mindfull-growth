import type { LifeArea } from '@/domain/lifeArea'
import type { Priority, Project, Tracker } from '@/domain/planning'
import type { Habit } from '@/domain/habit'

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

export interface TodayFocusChain {
  id: string
  lifeArea?: LifeArea
  priority: Priority
  projects: Project[]
  commitmentDone: number
  commitmentTotal: number
  source: 'weekly-project' | 'monthly-project' | 'priority-only'
  relevanceScore: number
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

export interface TodayProjectSignal {
  id: string
  name: string
  icon?: string
  isDone: boolean
}

export interface TodayPriorityCompassItem {
  id: string
  priority: Priority
  lifeAreas: LifeArea[]
  projectSignals: TodayProjectSignal[]
}

export interface TodayProgressItem {
  id: string
  cadence: 'weekly' | 'monthly'
  tracker: Tracker
  parentKind: 'project' | 'habit'
  parentProject?: Project
  parentHabit?: Habit
  parentName: string
  parentIcon?: string
  projectIsDone: boolean
  startDate: string
  endDate: string
}

export interface TodayProgressLane {
  cadence: 'weekly' | 'monthly'
  periodLabel: string
  hasPlan: boolean
  items: TodayProgressItem[]
}

export interface TodayDailyIntention {
  tone: 'morning' | 'midday' | 'evening'
  description: string
}

export interface TodayReminder {
  kind: 'adaptive' | 'reflection' | 'recommendation'
  title?: string
  description: string
  route: string
  recommendationId?: string
  reflectionKeys?: TodayReflectionBadge['key'][]
}

export interface TodayReflectionBadge {
  key: 'weekly' | 'monthly' | 'yearly'
  isDue: boolean
}

export interface TodaySupportState {
  dailyIntention: TodayDailyIntention
  primaryReminder?: TodayReminder
  reflectionBadges: TodayReflectionBadge[]
  capture: {
    hasJournalToday: boolean
    journalCount: number
    emotionCount: number
    emotionTarget: number
  }
  ifs: {
    hasParts: boolean
    doneToday: boolean
    weeklyCheckInCount: number
  }
  recommendations: TodayRecommendation[]
}
