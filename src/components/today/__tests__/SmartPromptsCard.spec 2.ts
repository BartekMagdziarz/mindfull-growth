import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import SmartPromptsCard from '../SmartPromptsCard.vue'
import type { SmartPrompt } from '@/utils/planningPromptUtils'

// Create a mock router for tests
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/planning/week/new', component: { template: '<div />' } },
    { path: '/planning/month/new', component: { template: '<div />' } },
    { path: '/planning/year/new', component: { template: '<div />' } },
    { path: '/planning/week/:planId/reflect', component: { template: '<div />' } },
  ],
})

// Mock prompts for testing
const mockPrompts: SmartPrompt[] = [
  {
    id: 'weekly-reflection-due',
    priority: 1,
    title: 'Time for your weekly reflection',
    description: 'Review Jan 13 - Jan 19, 2026 and capture what you learned',
    ctaLabel: 'Start Reflection',
    ctaRoute: '/planning/week/2026-01-13/reflect',
    icon: 'CalendarDaysIcon',
    tone: 'urgent',
  },
  {
    id: 'no-weekly-plan',
    priority: 2,
    title: 'Plan your week',
    description: 'Set your focus and commitments for the week ahead',
    ctaLabel: 'Start Planning',
    ctaRoute: '/planning/week/new',
    icon: 'ClipboardDocumentListIcon',
    tone: 'info',
  },
  {
    id: 'ready-for-next-week',
    priority: 5,
    title: 'Ready to plan next week?',
    description: 'Great progress! Get ahead by setting up next week now',
    ctaLabel: 'Plan Next Week',
    ctaRoute: '/planning/week/new',
    icon: 'ArrowRightIcon',
    tone: 'celebration',
  },
]

describe('SmartPromptsCard', () => {
  const globalConfig = {
    plugins: [router],
  }

  describe('rendering', () => {
    it('renders nothing when prompts array is empty', () => {
      const { container } = render(SmartPromptsCard, {
        props: { prompts: [] },
        global: globalConfig,
      })
      expect(container.textContent).toBe('')
    })

    it('renders the card when prompts exist', () => {
      render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })
      expect(screen.getByText('Time for your weekly reflection')).toBeInTheDocument()
    })

    it('renders prompt title and description', () => {
      render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })
      expect(screen.getByText('Time for your weekly reflection')).toBeInTheDocument()
      expect(
        screen.getByText('Review Jan 13 - Jan 19, 2026 and capture what you learned')
      ).toBeInTheDocument()
    })

    it('renders CTA button with correct label', () => {
      render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })
      expect(screen.getByRole('button', { name: 'Start Reflection' })).toBeInTheDocument()
    })
  })

  describe('maxPrompts limiting', () => {
    it('respects maxPrompts default of 2', () => {
      render(SmartPromptsCard, {
        props: { prompts: mockPrompts },
        global: globalConfig,
      })

      // Should show first 2 prompts only
      expect(screen.getByText('Time for your weekly reflection')).toBeInTheDocument()
      expect(screen.getByText('Plan your week')).toBeInTheDocument()
      expect(screen.queryByText('Ready to plan next week?')).not.toBeInTheDocument()
    })

    it('respects custom maxPrompts value', () => {
      render(SmartPromptsCard, {
        props: { prompts: mockPrompts, maxPrompts: 1 },
        global: globalConfig,
      })

      expect(screen.getByText('Time for your weekly reflection')).toBeInTheDocument()
      expect(screen.queryByText('Plan your week')).not.toBeInTheDocument()
    })

    it('shows all prompts when maxPrompts is higher than prompt count', () => {
      render(SmartPromptsCard, {
        props: { prompts: mockPrompts, maxPrompts: 10 },
        global: globalConfig,
      })

      expect(screen.getByText('Time for your weekly reflection')).toBeInTheDocument()
      expect(screen.getByText('Plan your week')).toBeInTheDocument()
      expect(screen.getByText('Ready to plan next week?')).toBeInTheDocument()
    })
  })

  describe('tone styling', () => {
    it('applies urgent styling for urgent tone prompts', () => {
      const { container } = render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })

      const promptRow = container.querySelector('.bg-primary-soft')
      expect(promptRow).toBeInTheDocument()
    })

    it('applies info styling for info tone prompts', () => {
      const { container } = render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[1]] },
        global: globalConfig,
      })

      const promptRow = container.querySelector('.bg-section')
      expect(promptRow).toBeInTheDocument()
    })

    it('applies celebration styling for celebration tone prompts', () => {
      const { container } = render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[2]] },
        global: globalConfig,
      })

      const promptRow = container.querySelector('.bg-success\\/10')
      expect(promptRow).toBeInTheDocument()
    })

    it('uses filled button variant for urgent prompts', () => {
      render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })

      // AppButton with variant="filled" has bg-primary class
      const button = screen.getByRole('button', { name: 'Start Reflection' })
      expect(button).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('navigates to correct route when CTA clicked', async () => {
      const pushSpy = vi.spyOn(router, 'push')

      render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })

      await fireEvent.click(screen.getByRole('button', { name: 'Start Reflection' }))

      expect(pushSpy).toHaveBeenCalledWith('/planning/week/2026-01-13/reflect')
    })

    it('navigates to weekly planning route', async () => {
      const pushSpy = vi.spyOn(router, 'push')

      render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[1]] },
        global: globalConfig,
      })

      await fireEvent.click(screen.getByRole('button', { name: 'Start Planning' }))

      expect(pushSpy).toHaveBeenCalledWith('/planning/week/new')
    })
  })

  describe('icons', () => {
    it('renders icon for each prompt', () => {
      const { container } = render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })

      // Check that an SVG icon is rendered
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-7', 'h-7')
    })

    it('applies correct icon color for urgent tone', () => {
      const { container } = render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[0]] },
        global: globalConfig,
      })

      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('text-primary')
    })

    it('applies correct icon color for celebration tone', () => {
      const { container } = render(SmartPromptsCard, {
        props: { prompts: [mockPrompts[2]] },
        global: globalConfig,
      })

      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('text-success')
    })
  })

  describe('multiple prompts', () => {
    it('renders multiple prompts in order', () => {
      render(SmartPromptsCard, {
        props: { prompts: mockPrompts, maxPrompts: 3 },
        global: globalConfig,
      })

      const titles = screen.getAllByRole('heading', { level: 4 })
      expect(titles[0]).toHaveTextContent('Time for your weekly reflection')
      expect(titles[1]).toHaveTextContent('Plan your week')
      expect(titles[2]).toHaveTextContent('Ready to plan next week?')
    })

    it('renders unique keys for each prompt', () => {
      render(SmartPromptsCard, {
        props: { prompts: mockPrompts.slice(0, 2) },
        global: globalConfig,
      })

      // Each prompt has its own heading
      const headings = screen.getAllByRole('heading', { level: 4 })
      expect(headings.length).toBe(2)
    })
  })
})
