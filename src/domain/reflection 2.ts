/**
 * Domain models for Reflections (Epic 4)
 *
 * Reflections are separate entities from Plans, allowing users to reflect
 * on past periods independently. Each reflection type links to its corresponding
 * plan via a foreign key.
 *
 * - YearlyReflection: End-of-year reflection linked to YearlyPlan
 * - MonthlyReflection: End-of-month reflection linked to MonthlyPlan
 * - WeeklyReflection: End-of-week reflection linked to WeeklyPlan
 */

// ============================================================================
// Core Reflection Models
// ============================================================================

/**
 * YearlyReflection
 *
 * Captures reflection on a yearly planning period. Filled at the end of the year
 * (or after the year period ends) to capture learnings and carry-forward items.
 */
export interface YearlyReflection {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  yearlyPlanId: string // Reference to the YearlyPlan being reflected on
  completedAt?: string // ISO timestamp when reflection was marked complete

  // Reflection content
  yearInOnePhrase?: string // Summary phrase for the year
  biggestWins?: string[] // Key accomplishments
  biggestLessons?: string[] // Key learnings
  carryForward?: string // What to take into the next year

  // Wheel of Life reference
  wheelOfLifeSnapshotId?: string // Reference to the WoL snapshot taken during reflection

  // Successes by Life Area (Ex 6.1)
  successesByArea?: Array<{
    area: string // Life area name (from WoL or manual)
    whatWentWell: string[] // Wins in this area
    surprises?: string // What surprised you
    learnings?: string // What you learned
    moreOf?: string // Want more of this
    lessOf?: string // Want less of this
  }>

  // Challenges (after successes)
  challenges?: Array<{
    challenge: string
    whoOrWhatHelped: string
    whatYouLearned: string
  }>

  // Favorite Experiences (Ex 6.2)
  favoriteExperiences?: {
    books?: string[]
    learnings?: string[]
    movies?: string[]
    photosAndVideos?: string[]
    trips?: string[]
    events?: string[]
    moments?: string[]
  }

  // Gratitude (Ex 6.3)
  gratitude?: {
    people?: string[]
    experiences?: string[]
    opportunities?: string[]
  }

  // Health Reflection (Ex 6.4)
  healthReflection?: {
    whatImproved?: string
    howItHelped?: string
    whatHindered?: string
    habitsToKeep?: string
    oneChangeForNextYear?: string
  }

  // Forgiveness
  forgiveness?: string

  // Letting Go
  lettingGo?: string
}

/**
 * MonthlyReflection
 *
 * Captures reflection on a monthly planning period. Filled at the end of the month
 * to review projects, wins, challenges, and learnings.
 */
export interface MonthlyReflection {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  monthlyPlanId: string // Reference to the MonthlyPlan being reflected on
  completedAt?: string // ISO timestamp when reflection was marked complete

  // Direction ratings (1-5)
  directionRatings?: {
    projects: number
    priorities: number
    relationships: number
    meaning: number
    impact: number
    stuckness: number
  }

  // Focus area reflection
  focusAreaReview?: Array<{
    lifeAreaId: string
    progress: number // 1-5
    deteriorated: boolean
    note?: string
  }>

  // Project-level review
  projectReviews?: Array<{
    projectId: string
    progress: number // 1-5
    decision: 'continue' | 'rescope' | 'pause' | 'complete' | 'abandon'
    note?: string
  }>

  // Weekly-derived digest captured at reflection time
  weeklyDigest?: {
    weeklyPlanIds: string[]
    reflectedWeeks: number
    batteryAverages?: {
      body: { demand: number; state: number }
      mind: { demand: number; state: number }
      emotion: { demand: number; state: number }
      social: { demand: number; state: number }
    }
    commitmentCompletion?: {
      done: number
      skipped: number
      planned: number
    }
  }

  // Course-correction decisions
  courseCorrection?: {
    start: string[]
    stop: string[]
    continue: string[]
    ifThenPlan?: string
  }

  // Reflection content
  wins?: string[] // What went well
  challenges?: string[] // What was difficult
  learnings?: string[] // Key insights
  adjustments?: string // What to change going forward
}

/**
 * WeeklyReflection
 *
 * Captures reflection on a weekly planning period. Quick reflection (5-10 min)
 * at the end of the week to capture what helped, what got in the way, and learnings.
 */
export interface WeeklyReflection {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  weeklyPlanId: string // Reference to the WeeklyPlan being reflected on
  completedAt?: string // ISO timestamp when reflection was marked complete

  // Weekly battery snapshot (1-5 for each demand/state pair)
  batterySnapshot?: {
    body: { demand: number; state: number; note?: string }
    mind: { demand: number; state: number; note?: string }
    emotion: { demand: number; state: number; note?: string }
    social: { demand: number; state: number; note?: string }
  }

  // Reflection content
  whatHelped?: string // What supported progress this week
  whatGotInTheWay?: string // What hindered progress
  whatILearned?: string // Key insight from the week
  nextWeekSeed?: string // Handoff thought for next week
  batteryDrainers?: string // What drained batteries this week
  batteryRechargers?: string // What recharged batteries this week
  batteryBoundaryNextWeek?: string // Boundary/support for next week

  // IFS integration (Epic 7 Story 5)
  ifsReflectionNote?: string // Reflection on inner system this week
}

// ============================================================================
// Helper Types for Create/Update Operations
// ============================================================================

/**
 * Payload for creating a new YearlyReflection
 */
export type CreateYearlyReflectionPayload = Omit<
  YearlyReflection,
  'id' | 'createdAt' | 'updatedAt'
>

/**
 * Payload for updating a YearlyReflection
 */
export type UpdateYearlyReflectionPayload = Partial<
  Omit<YearlyReflection, 'id' | 'createdAt' | 'updatedAt'>
>

/**
 * Payload for creating a new MonthlyReflection
 */
export type CreateMonthlyReflectionPayload = Omit<
  MonthlyReflection,
  'id' | 'createdAt' | 'updatedAt'
>

/**
 * Payload for updating a MonthlyReflection
 */
export type UpdateMonthlyReflectionPayload = Partial<
  Omit<MonthlyReflection, 'id' | 'createdAt' | 'updatedAt'>
>

/**
 * Payload for creating a new WeeklyReflection
 */
export type CreateWeeklyReflectionPayload = Omit<
  WeeklyReflection,
  'id' | 'createdAt' | 'updatedAt'
>

/**
 * Payload for updating a WeeklyReflection
 */
export type UpdateWeeklyReflectionPayload = Partial<
  Omit<WeeklyReflection, 'id' | 'createdAt' | 'updatedAt'>
>
