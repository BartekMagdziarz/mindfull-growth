import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import WeekSummaryCard from '../WeekSummaryCard.vue'
import type { WeekSummary } from '@/utils/todayUtils'

// Mock emotion store
vi.mock('@/stores/emotion.store', () => ({
  useEmotionStore: () => ({
    getEmotionById: (id: string) => {
      const emotions: Record<string, { id: string; name: string; energy: number; pleasantness: number }> = {
        'e1': { id: 'e1', name: 'Happy', energy: 7, pleasantness: 8 },
        'e2': { id: 'e2', name: 'Calm', energy: 3, pleasantness: 7 },
      }
      return emotions[id]
    },
  }),
}))

describe('WeekSummaryCard', () => {
  const baseSummary: WeekSummary = {
    journalCount: 3,
    emotionLogCount: 5,
    streak: 4,
    topEmotionIds: ['e1', 'e2'],
  }

  describe('basic rendering', () => {
    it('renders "This week" title', () => {
      render(WeekSummaryCard, { props: { summary: baseSummary } })
      expect(screen.getByText('This week')).toBeInTheDocument()
    })

    it('renders journal count', () => {
      render(WeekSummaryCard, { props: { summary: baseSummary } })
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('journals')).toBeInTheDocument()
    })

    it('renders emotion log count', () => {
      render(WeekSummaryCard, { props: { summary: baseSummary } })
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('emotions')).toBeInTheDocument()
    })

    it('renders streak count', () => {
      render(WeekSummaryCard, { props: { summary: baseSummary } })
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('day streak')).toBeInTheDocument()
    })

    it('renders top emotions', () => {
      render(WeekSummaryCard, { props: { summary: baseSummary } })
      expect(screen.getByText('Happy')).toBeInTheDocument()
      expect(screen.getByText('Calm')).toBeInTheDocument()
    })
  })

  describe('singular/plural labels', () => {
    it('shows singular "journal" for count of 1', () => {
      render(WeekSummaryCard, {
        props: {
          summary: { ...baseSummary, journalCount: 1 },
        },
      })
      expect(screen.getByText('journal')).toBeInTheDocument()
    })

    it('shows singular "emotion" for count of 1', () => {
      render(WeekSummaryCard, {
        props: {
          summary: { ...baseSummary, emotionLogCount: 1 },
        },
      })
      expect(screen.getByText('emotion')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state message when no emotions logged', () => {
      render(WeekSummaryCard, {
        props: {
          summary: { ...baseSummary, topEmotionIds: [] },
        },
      })
      expect(screen.getByText('Log emotions to see your weekly patterns')).toBeInTheDocument()
    })
  })

  describe('motivational messages', () => {
    it('shows week-long streak message for 7+ day streak', () => {
      render(WeekSummaryCard, {
        props: {
          summary: { ...baseSummary, streak: 7 },
        },
      })
      expect(screen.getByText("Amazing! You've been consistent for a whole week!")).toBeInTheDocument()
    })

    it('shows streak message for 3+ day streak', () => {
      render(WeekSummaryCard, {
        props: {
          summary: { ...baseSummary, streak: 4 },
        },
      })
      expect(screen.getByText('Great streak! Keep the momentum going.')).toBeInTheDocument()
    })

    it('shows start message when no entries', () => {
      render(WeekSummaryCard, {
        props: {
          summary: { journalCount: 0, emotionLogCount: 0, streak: 0, topEmotionIds: [] },
        },
      })
      expect(screen.getByText('Start your week strong - every entry counts.')).toBeInTheDocument()
    })

    it('shows building habit message when has entries but low streak', () => {
      render(WeekSummaryCard, {
        props: {
          summary: { journalCount: 2, emotionLogCount: 3, streak: 1, topEmotionIds: ['e1'] },
        },
      })
      expect(screen.getByText("You're building a healthy reflection habit.")).toBeInTheDocument()
    })
  })
})
