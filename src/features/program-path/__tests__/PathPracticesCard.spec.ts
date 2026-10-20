import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getProgramDefinition } from '@/data/programCatalog'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import PathPracticesCard from '../PathPracticesCard.vue'

vi.mock('@/services/programWeekService', () => ({
  weekTaskState: vi.fn(async () => ({ intention: null, doneCount: 0 })),
  proposeWeeklyTaskOptions: vi.fn(() => null),
  acceptWeeklyTask: vi.fn(),
  declineWeeklyTask: vi.fn(),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  useUserPreferencesStore().$patch({ locale: 'pl' })
})

async function mountPlan(slug: string, exerciseSlug: string, responses: Record<string, string | string[]>) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/')
  const enrollment = {
    id: 'enr-1', programSlug: slug, status: 'active' as const, startedAt: '2026-10-01T10:00:00Z', currentStepIndex: 3, completedSteps: [],
    createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z',
  }
  return render(PathPracticesCard, {
    props: {
      program: getProgramDefinition(slug)!, enrollment, mode: 'active',
      responseEntry: { id: 'plan', exerciseSlug, createdAt: '2026-10-06T10:00:00Z', updatedAt: '2026-10-06T10:00:00Z', responses },
    },
    global: { plugins: [router], stubs: { 'router-link': false } },
  })
}

describe('the personal plan in Praktyki', () => {
  it('keeps the anger plan behind one control and shows its signals, pause and return', async () => {
    await mountPlan('anger-signal', 'pause-plan', { earlySigns: ['Szczęka', '', 'Szybszy głos'], ifThen: 'Robię przerwę.', returnPromise: 'Wróćmy za chwilę.' })
    expect(screen.queryByText('Robię przerwę.')).toBeNull()
    const button = screen.getByRole('button', { name: 'Mój plan' })
    await fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Szczęka · Szybszy głos')).toBeTruthy()
    expect(screen.getByText('Robię przerwę.')).toBeTruthy()
    expect(screen.getByText('Wróćmy za chwilę.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Zapisz jako moment' }).getAttribute('href')).toBe('/exercises/micro/moment-anger')
    await fireEvent.click(button)
    expect(screen.queryByText('Robię przerwę.')).toBeNull()
  })

  it('shows the anxiety map with its own label and omits unanswered fields', async () => {
    await mountPlan('anxiety-approach', 'anxiety-map', {
      withoutFear: 'Spotykać się z przyjaciółmi.', avoidance: ['Odkładam telefon.'], safetyBehaviors: [],
    })
    expect(screen.queryByText('Spotykać się z przyjaciółmi.')).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Moja mapa' }))
    expect(screen.getByText('Spotykać się z przyjaciółmi.')).toBeTruthy()
    expect(screen.getByText('Odkładam telefon.')).toBeTruthy()
    expect(screen.queryByText('Co robię dla pewności')).toBeNull()
    expect(screen.getByRole('link', { name: 'Zapisz jako moment' }).getAttribute('href')).toBe('/exercises/micro/moment-anxiety')
    expect(screen.queryByText('Moja pauza')).toBeNull()
  })

  it('preserves the shame response without anger labels', async () => {
    await mountPlan('shame-compassion', 'shame-response', { unblendSentence: 'To część mnie.', sentence: 'Mogę być po swojej stronie.' })
    await fireEvent.click(screen.getByRole('button', { name: 'Mój plan' }))
    expect(screen.getByText('„To część mnie.”')).toBeTruthy()
    expect(screen.getByText('„Mogę być po swojej stronie.”')).toBeTruthy()
    expect(screen.queryByText('Moja pauza')).toBeNull()
  })
})
