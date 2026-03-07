import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import type {
  TodayMode,
  TodayRecommendation,
  TodayRecommendationFeedback,
  TodayRecommendationFeedbackType,
} from '@/types/today'

export const TODAY_RECOMMENDATION_FEEDBACK_KEY = 'preferences.todayExerciseFeedback'

export interface TodayRecommendationContext {
  mode: TodayMode
  now: Date
  todayEmotionCount: number
  emotionTarget: number
  hasJournalToday: boolean
  unfinishedCommitmentCount: number
  recentActivatedEmotionName?: string | null
  ifsPartCount?: number
  feedbackMap?: Record<string, TodayRecommendationFeedback>
}

interface RecommendationCandidate {
  id: string
  title: string
  description: string
  route: string
  modality: TodayRecommendation['modality']
  tone: TodayRecommendation['tone']
  baseScore: number
  mode: TodayMode
  isRelevant: (context: TodayRecommendationContext) => boolean
  whyNow: (context: TodayRecommendationContext) => string
}

const CANDIDATES: RecommendationCandidate[] = [
  {
    id: 'ifs-daily-checkin',
    title: 'IFS Daily Check-In',
    description: 'Name the parts active right now and settle your system.',
    route: '/exercises/daily-checkin',
    modality: 'ifs',
    tone: 'regulation',
    baseScore: 0.8,
    mode: 'midday',
    isRelevant: (ctx) => (ctx.ifsPartCount ?? 0) > 0,
    whyNow: (ctx) =>
      ctx.recentActivatedEmotionName
        ? `You recently logged ${ctx.recentActivatedEmotionName}. A short parts check-in can help you re-center.`
        : 'A quick parts check-in helps you regain focus during the day.',
  },
  {
    id: 'cbt-thought-record',
    title: 'Thought Record',
    description: 'Untangle a stressful thought in a structured, practical way.',
    route: '/exercises/thought-record',
    modality: 'cbt',
    tone: 'regulation',
    baseScore: 0.75,
    mode: 'midday',
    isRelevant: () => true,
    whyNow: (ctx) =>
      ctx.recentActivatedEmotionName
        ? `High-energy emotions like ${ctx.recentActivatedEmotionName} often benefit from reframing.`
        : 'A quick cognitive reset can reduce mental friction before your next task.',
  },
  {
    id: 'logotherapy-dereflection',
    title: 'Dereflection',
    description: 'Shift attention from rumination toward meaningful action.',
    route: '/exercises/dereflection',
    modality: 'logotherapy',
    tone: 'activation',
    baseScore: 0.72,
    mode: 'midday',
    isRelevant: (ctx) => ctx.unfinishedCommitmentCount > 0,
    whyNow: () => 'You still have open commitments. This can help you move from overthinking to doing.',
  },
  {
    id: 'self-discovery-values',
    title: 'Values Discovery',
    description: 'Reconnect with what matters before the day accelerates.',
    route: '/exercises/values',
    modality: 'self-discovery',
    tone: 'activation',
    baseScore: 0.7,
    mode: 'morning',
    isRelevant: () => true,
    whyNow: () => 'A short values anchor can strengthen intention and follow-through this morning.',
  },
  {
    id: 'ifs-unblending',
    title: 'Unblending',
    description: 'Create a little space from intense feelings before acting.',
    route: '/exercises/unblending',
    modality: 'ifs',
    tone: 'regulation',
    baseScore: 0.78,
    mode: 'morning',
    isRelevant: (ctx) => (ctx.ifsPartCount ?? 0) > 0,
    whyNow: () => 'Starting with inner clarity often prevents reactive decisions later in the day.',
  },
  {
    id: 'logotherapy-three-pathways',
    title: 'Three Pathways to Meaning',
    description: 'Choose a meaningful orientation for today.',
    route: '/exercises/three-pathways',
    modality: 'logotherapy',
    tone: 'activation',
    baseScore: 0.68,
    mode: 'morning',
    isRelevant: () => true,
    whyNow: () => 'A brief meaning check can sharpen your daily focus and commitment quality.',
  },
  {
    id: 'cbt-compassionate-letter',
    title: 'Compassionate Letter',
    description: 'Close the day with a kinder and steadier inner voice.',
    route: '/exercises/compassionate-letter',
    modality: 'cbt',
    tone: 'reflection',
    baseScore: 0.76,
    mode: 'evening',
    isRelevant: () => true,
    whyNow: () => 'Evening is a good time to process difficulty without carrying it into tomorrow.',
  },
  {
    id: 'ifs-trailhead',
    title: 'Trailhead',
    description: 'Capture a trigger and map what parts were activated.',
    route: '/exercises/trailhead',
    modality: 'ifs',
    tone: 'reflection',
    baseScore: 0.74,
    mode: 'evening',
    isRelevant: (ctx) => (ctx.ifsPartCount ?? 0) > 0,
    whyNow: () => 'A short trailhead capture helps turn today’s friction into tomorrow’s insight.',
  },
  {
    id: 'self-discovery-wheel',
    title: 'Wheel of Life Snapshot',
    description: 'Take a quick macro check of life-balance trends.',
    route: '/exercises/wheel-of-life',
    modality: 'self-discovery',
    tone: 'reflection',
    baseScore: 0.66,
    mode: 'evening',
    isRelevant: () => true,
    whyNow: () => 'A light macro reflection can keep daily effort connected to long-term balance.',
  },
]

function scoreCandidate(
  candidate: RecommendationCandidate,
  context: TodayRecommendationContext,
  feedback: TodayRecommendationFeedback | undefined,
): number {
  let score = candidate.baseScore

  if (candidate.mode === context.mode) {
    score += 0.5
  }

  if (candidate.tone === 'regulation' && context.todayEmotionCount < context.emotionTarget) {
    score += 0.2
  }

  if (candidate.tone === 'activation' && context.unfinishedCommitmentCount > 0) {
    score += 0.18
  }

  if (candidate.tone === 'reflection' && !context.hasJournalToday) {
    score += 0.25
  }

  if (context.recentActivatedEmotionName && candidate.tone === 'regulation') {
    score += 0.2
  }

  if (feedback) {
    score += feedback.boost
    score -= feedback.lessCount * 0.08
    score -= feedback.notNowCount * 0.05
  }

  return score
}

function isSuppressed(feedback: TodayRecommendationFeedback | undefined, now: Date): boolean {
  if (!feedback?.suppressUntil) return false
  return feedback.suppressUntil > now.toISOString()
}

function parseFeedbackRecord(
  raw: string | undefined,
): Record<string, TodayRecommendationFeedback> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, TodayRecommendationFeedback>
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

export async function loadRecommendationFeedbackMap(): Promise<
  Record<string, TodayRecommendationFeedback>
> {
  const raw = await userSettingsDexieRepository.get(TODAY_RECOMMENDATION_FEEDBACK_KEY)
  return parseFeedbackRecord(raw)
}

export function generateTodayRecommendations(
  context: TodayRecommendationContext,
): TodayRecommendation[] {
  const feedbackMap = context.feedbackMap ?? {}

  const ranked = CANDIDATES
    .filter((candidate) => candidate.isRelevant(context))
    .map((candidate) => {
      const feedback = feedbackMap[candidate.id]
      return {
        candidate,
        feedback,
        score: scoreCandidate(candidate, context, feedback),
      }
    })
    .filter((item) => !isSuppressed(item.feedback, context.now))
    .sort((a, b) => b.score - a.score)

  const picked: TodayRecommendation[] = []
  const usedModalities = new Set<TodayRecommendation['modality']>()

  for (const item of ranked) {
    if (picked.length >= 2) break

    // Prefer modality diversity when possible
    if (picked.length === 1 && usedModalities.has(item.candidate.modality)) {
      const alternativeExists = ranked
        .slice(ranked.indexOf(item) + 1)
        .some((next) => !usedModalities.has(next.candidate.modality))
      if (alternativeExists) continue
    }

    const recommendation: TodayRecommendation = {
      id: item.candidate.id,
      title: item.candidate.title,
      description: item.candidate.description,
      route: item.candidate.route,
      modality: item.candidate.modality,
      tone: item.candidate.tone,
      whyNow: item.candidate.whyNow(context),
      score: item.score,
    }

    picked.push(recommendation)
    usedModalities.add(recommendation.modality)
  }

  return picked
}

function applyFeedback(
  current: TodayRecommendationFeedback | undefined,
  id: string,
  feedbackType: TodayRecommendationFeedbackType,
  now: Date,
): TodayRecommendationFeedback {
  const next: TodayRecommendationFeedback = current
    ? { ...current }
    : {
        id,
        boost: 0,
        lessCount: 0,
        moreCount: 0,
        notNowCount: 0,
        updatedAt: now.toISOString(),
      }

  if (feedbackType === 'more') {
    next.boost = Math.min(0.8, next.boost + 0.2)
    next.moreCount += 1
    next.suppressUntil = undefined
  }

  if (feedbackType === 'less') {
    next.boost = Math.max(-0.8, next.boost - 0.25)
    next.lessCount += 1
    next.suppressUntil = undefined
  }

  if (feedbackType === 'not-now') {
    const suppressUntil = new Date(now)
    suppressUntil.setHours(suppressUntil.getHours() + 8)
    next.notNowCount += 1
    next.suppressUntil = suppressUntil.toISOString()
  }

  next.updatedAt = now.toISOString()
  return next
}

export function applyRecommendationFeedback(
  feedbackMap: Record<string, TodayRecommendationFeedback>,
  recommendationId: string,
  feedbackType: TodayRecommendationFeedbackType,
  now: Date = new Date(),
): Record<string, TodayRecommendationFeedback> {
  const next = { ...feedbackMap }
  next[recommendationId] = applyFeedback(
    feedbackMap[recommendationId],
    recommendationId,
    feedbackType,
    now,
  )
  return next
}

export async function recordRecommendationFeedback(
  recommendationId: string,
  feedbackType: TodayRecommendationFeedbackType,
): Promise<Record<string, TodayRecommendationFeedback>> {
  const current = await loadRecommendationFeedbackMap()
  const next = applyRecommendationFeedback(current, recommendationId, feedbackType)
  await userSettingsDexieRepository.set(
    TODAY_RECOMMENDATION_FEEDBACK_KEY,
    JSON.stringify(next),
  )
  return next
}
