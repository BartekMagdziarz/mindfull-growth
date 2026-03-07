/**
 * Planning Prompt Utilities
 *
 * This module provides smart prompt generation for TodayView based on the user's
 * current planning state. Prompts are prioritized to guide users through their
 * planning workflow in a logical order.
 *
 * Priority Order (highest to lowest):
 * 1. No weekly plan for current week
 * 2. No monthly plan for current month
 * 3. No yearly plan for current year
 * 4. All commitments done (celebration prompt)
 * 5–8. IFS-aware prompts (only when user has IFS parts)
 */

import type { YearlyPlan, MonthlyPlan, WeeklyPlan, Commitment } from '@/domain/planning'

// ============================================================================
// Types
// ============================================================================

/**
 * Visual tone for prompt styling
 * - urgent: Primary action needed (e.g., weekly reflection due)
 * - info: Helpful suggestion (e.g., create missing plan)
 * - celebration: Positive reinforcement (e.g., all done, plan ahead)
 */
export type PromptTone = 'urgent' | 'info' | 'celebration'

/**
 * SmartPrompt represents a contextual planning nudge shown on TodayView.
 * Prompts are prioritized and filtered based on user's planning state.
 */
export interface SmartPrompt {
  /** Unique identifier for keying/tracking */
  id: string
  /** Lower = higher priority (1 is highest) */
  priority: number
  /** Main heading displayed to user */
  title: string
  /** Supporting description text */
  description: string
  /** Button text */
  ctaLabel: string
  /** Vue router path for navigation */
  ctaRoute: string
  /** Heroicon component name (e.g., 'CalendarDaysIcon') */
  icon: string
  /** Visual treatment for the prompt */
  tone: PromptTone
}

/**
 * Input context for generating smart prompts.
 * All plan fields are optional since users may not have any plans yet.
 */
export interface PlanningContext {
  yearlyPlan: YearlyPlan | undefined
  monthlyPlan: MonthlyPlan | undefined
  currentWeekPlan: WeeklyPlan | undefined
  currentWeekCommitments: Commitment[]
  /** Day of week for weekly review (0 = Sunday, 6 = Saturday) */
  weeklyReviewDay: number
  /** Current date - exposed for testability */
  today: Date

  // IFS context (optional — absent for non-IFS users)
  /** Number of IFS parts the user has mapped */
  ifsPartCount?: number
  /** Most recent high-energy negative emotion logged in last 24h */
  recentActivatedEmotion?: { name: string } | null
  /** Number of emotion logs in last 48h */
  recentEmotionCount48h?: number
  /** ISO date of last trailhead entry, or null */
  lastTrailheadDate?: string | null
  /** Total self-energy check-ins */
  selfEnergyTotalCount?: number
  /** ISO date of last self-energy check-in, or null */
  lastSelfEnergyDate?: string | null
  /** Protector part at intensity 8+ for 3+ consecutive days */
  consecutiveHighProtector?: { partName: string; days: number } | null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if all commitments for the week are marked as done.
 * Returns false for empty arrays (no commitments ≠ "all done").
 *
 * @param commitments - Array of commitments to check
 * @returns true if all commitments have status 'done'
 */
export function areAllCommitmentsDone(commitments: Commitment[]): boolean {
  if (commitments.length === 0) {
    return false // Empty = not "done", just missing
  }
  return commitments.every((c) => c.status === 'done')
}

// ============================================================================
// Main Prompt Generation
// ============================================================================

/**
 * Generates an array of smart prompts based on the user's planning context.
 * Prompts are sorted by priority (ascending, so priority 1 comes first).
 *
 * @param context - The current planning state
 * @returns Array of SmartPrompt objects, sorted by priority
 */
export function generateSmartPrompts(context: PlanningContext): SmartPrompt[] {
  const prompts: SmartPrompt[] = []
  const {
    yearlyPlan,
    monthlyPlan,
    currentWeekPlan,
    currentWeekCommitments,
  } = context

  // Priority 1: No weekly plan for current week
  if (!currentWeekPlan) {
    prompts.push({
      id: 'no-weekly-plan',
      priority: 1,
      title: 'Plan your week',
      description: 'Set your focus and commitments for the week ahead',
      ctaLabel: 'Start Planning',
      ctaRoute: '/planning/week/new',
      icon: 'ClipboardDocumentListIcon',
      tone: 'info',
    })
  }

  // Priority 2: No monthly plan for current month
  if (!monthlyPlan) {
    prompts.push({
      id: 'no-monthly-plan',
      priority: 2,
      title: 'Set your monthly focus',
      description: 'Choose your primary focus area and define projects for this month',
      ctaLabel: 'Create Monthly Plan',
      ctaRoute: '/planning/month/new',
      icon: 'RocketLaunchIcon',
      tone: 'info',
    })
  }

  // Priority 3: No yearly plan for current year
  if (!yearlyPlan) {
    prompts.push({
      id: 'no-yearly-plan',
      priority: 3,
      title: 'Define your year',
      description: 'Set your theme and focus areas for the year',
      ctaLabel: 'Create Yearly Plan',
      ctaRoute: '/planning/year/new',
      icon: 'SparklesIcon',
      tone: 'info',
    })
  }

  // Priority 4: All commitments done (celebration)
  // Only show if user has a current week plan (they're using the planning system)
  if (currentWeekPlan && areAllCommitmentsDone(currentWeekCommitments)) {
    prompts.push({
      id: 'all-commitments-done',
      priority: 4,
      title: 'Great progress!',
      description: 'You\'ve completed all your commitments for this week',
      ctaLabel: 'View Planning Hub',
      ctaRoute: '/planning',
      icon: 'CheckCircleIcon',
      tone: 'celebration',
    })
  }

  // ---- IFS-Aware Prompts (Priority 5–8) ----
  const ifsPartCount = context.ifsPartCount ?? 0

  // Priority 5: Emotion-triggered Unblending
  if (context.recentActivatedEmotion && ifsPartCount >= 1) {
    prompts.push({
      id: 'ifs-unblending-emotion',
      priority: 5,
      title: 'Try an Unblending practice',
      description: `You logged ${context.recentActivatedEmotion.name} recently. Would you like to create some space?`,
      ctaLabel: 'Start Unblending',
      ctaRoute: '/exercises/unblending',
      icon: 'ArrowsPointingInIcon',
      tone: 'info',
    })
  }

  // Priority 6: Trailhead Suggestion
  if (
    (context.recentEmotionCount48h ?? 0) >= 3 &&
    ifsPartCount >= 1 &&
    isOlderThanDays(context.lastTrailheadDate, 3, context.today)
  ) {
    prompts.push({
      id: 'ifs-trailhead-suggestion',
      priority: 6,
      title: 'Capture a Trailhead',
      description: 'You\'ve been emotionally active lately. Explore which parts are at work?',
      ctaLabel: 'Open Trailhead',
      ctaRoute: '/exercises/trailhead',
      icon: 'MapPinIcon',
      tone: 'info',
    })
  }

  // Priority 7: Self-Energy Reminder
  if (
    (context.selfEnergyTotalCount ?? 0) >= 3 &&
    isOlderThanDays(context.lastSelfEnergyDate, 2, context.today)
  ) {
    prompts.push({
      id: 'ifs-self-energy-reminder',
      priority: 7,
      title: 'Self-Energy check-in',
      description: 'It\'s been a few days since your last 8 C\'s check-in. How\'s your Self-energy today?',
      ctaLabel: 'Check In',
      ctaRoute: '/exercises/self-energy',
      icon: 'SunIcon',
      tone: 'info',
    })
  }

  // Priority 8: Protector Overwork Alert
  if (context.consecutiveHighProtector && context.consecutiveHighProtector.days >= 3) {
    prompts.push({
      id: 'ifs-protector-overwork',
      priority: 8,
      title: 'Protector working overtime',
      description: `Your ${context.consecutiveHighProtector.partName} has been very active. Consider a Protector Appreciation exercise.`,
      ctaLabel: 'Appreciate Protector',
      ctaRoute: '/exercises/protector-appreciation',
      icon: 'ShieldCheckIcon',
      tone: 'info',
    })
  }

  // Sort by priority (ascending - lower number = higher priority)
  return prompts.sort((a, b) => a.priority - b.priority)
}

/**
 * Returns true if the given ISO date is older than `days` days from `today`,
 * or if the date is null/undefined (meaning no entry exists).
 */
function isOlderThanDays(
  isoDate: string | null | undefined,
  days: number,
  today: Date,
): boolean {
  if (!isoDate) return true
  const date = new Date(isoDate)
  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() - days)
  return date < threshold
}
