import { describe, expect, it } from 'vitest'
import {
  applyRecommendationFeedback,
  generateTodayRecommendations,
} from '@/services/todayRecommendation.service'
import type { TodayRecommendationFeedback } from '@/types/today'

describe('todayRecommendation.service', () => {
  it('returns at most two recommendations', () => {
    const recommendations = generateTodayRecommendations({
      now: new Date('2026-02-14T08:00:00.000Z'),
      todayEmotionCount: 0,
      emotionTarget: 3,
      hasJournalToday: false,
      unfinishedCommitmentCount: 2,
      recentActivatedEmotionName: null,
      ifsPartCount: 2,
      feedbackMap: {},
    })

    expect(recommendations.length).toBeLessThanOrEqual(2)
  })

  it('prioritizes regulation suggestions when a recent activated emotion exists', () => {
    const recommendations = generateTodayRecommendations({
      now: new Date('2026-02-14T13:00:00.000Z'),
      todayEmotionCount: 0,
      emotionTarget: 3,
      hasJournalToday: false,
      unfinishedCommitmentCount: 2,
      recentActivatedEmotionName: 'Anxious',
      ifsPartCount: 1,
      feedbackMap: {},
    })

    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0].tone).toBe('regulation')
  })

  it('suppresses recommendation when snoozed with not-now feedback', () => {
    const now = new Date('2026-02-14T13:00:00.000Z')
    const feedbackMap = applyRecommendationFeedback({}, 'ifs-daily-checkin', 'not-now', now)

    const recommendations = generateTodayRecommendations({
      now,
      todayEmotionCount: 0,
      emotionTarget: 3,
      hasJournalToday: false,
      unfinishedCommitmentCount: 2,
      recentActivatedEmotionName: 'Anxious',
      ifsPartCount: 1,
      feedbackMap,
    })

    expect(recommendations.find((item) => item.id === 'ifs-daily-checkin')).toBeUndefined()
  })

  it('applies feedback adjustments and keeps metadata', () => {
    const current: Record<string, TodayRecommendationFeedback> = {
      'cbt-thought-record': {
        id: 'cbt-thought-record',
        boost: 0,
        lessCount: 0,
        moreCount: 0,
        notNowCount: 0,
        updatedAt: '2026-02-14T10:00:00.000Z',
      },
    }

    const next = applyRecommendationFeedback(
      current,
      'cbt-thought-record',
      'more',
      new Date('2026-02-14T12:00:00.000Z'),
    )

    expect(next['cbt-thought-record'].boost).toBeGreaterThan(0)
    expect(next['cbt-thought-record'].moreCount).toBe(1)
    expect(next['cbt-thought-record'].updatedAt).toBe('2026-02-14T12:00:00.000Z')
  })
})
