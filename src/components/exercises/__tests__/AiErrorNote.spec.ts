import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import AiErrorNote from '../AiErrorNote.vue'
import { LlmError, LlmNotConfiguredError } from '@/services/llmErrors'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import pl from '@/locales/pl/exerciseWizards.json'
import en from '@/locales/en/exerciseWizards.json'

function mount(error: unknown, locale: 'pl' | 'en' = 'pl') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useUserPreferencesStore().locale = locale
  return render(AiErrorNote, { props: { error }, global: { plugins: [pinia] } })
}

describe('AiErrorNote', () => {
  it('shows the missing provider as a quiet note in Polish with a link to the profile', () => {
    const { container } = mount(new LlmNotConfiguredError())
    const note = container.querySelector('[data-testid="ai-error-note"]')!
    expect(note.classList.contains('exercise-note')).toBe(true)
    expect(note.querySelector('.text-error')).toBeNull()
    expect(note.textContent).toContain(pl.shared.ai.notConfigured)
    expect(note.textContent).not.toContain('AI provider is not configured')
    const link = note.querySelector<HTMLAnchorElement>('[data-testid="ai-error-profile-link"]')!
    // The global test setup stubs router-link as <a to="…">.
    expect(link.getAttribute('to') ?? link.getAttribute('href')).toBe('/profile#ai-settings')
    expect(link.textContent?.trim()).toBe(pl.shared.ai.openProfile)
    expect(note.querySelector('[data-testid="ai-error-detail"]')).toBeNull()
  })

  it('speaks English when the locale is English', () => {
    const { container } = mount(new LlmNotConfiguredError(), 'en')
    expect(container.textContent).toContain(en.shared.ai.notConfigured)
    expect(container.textContent).toContain(en.shared.ai.openProfile)
  })

  it('shows a provider message as a detail line under the generic sentence, without a link', () => {
    const { container } = mount(new LlmError('api', 'model "gemma4" not found'))
    expect(container.textContent).toContain(pl.shared.ai.api)
    expect(container.querySelector('[data-testid="ai-error-detail"]')?.textContent?.trim()).toBe(
      'model "gemma4" not found'
    )
    expect(container.querySelector('[data-testid="ai-error-profile-link"]')).toBeNull()
  })

  it('keeps a wizard-translated string as the detail of the generic sentence', () => {
    const { container } = mount('Nie udało się zacząć rozmowy')
    expect(container.textContent).toContain(pl.shared.ai.failed)
    expect(container.textContent).toContain('Nie udało się zacząć rozmowy')
  })
})
