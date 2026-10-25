import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Scenario from '~lab/scenarios/PlanningAssistantScenario.vue'

let wrapper: VueWrapper | undefined
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
})
async function render(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: Scenario, meta: { standalone: true } }],
  })
  await router.push(`/${query}`)
  await router.isReady()
  wrapper = mount(Scenario, { global: { plugins: [router], stubs: { AppIcon: true } } })
  await flushPromises()
  return wrapper
}
async function click(text: string) {
  const button = wrapper!.findAll('button').find(button => button.text() === text)
  expect(button, `button ${text}`).toBeTruthy()
  await button!.trigger('click')
  await flushPromises()
}
describe('planning assistant prototype flow', () => {
  it('adds only selected objects directly from the editable draft', async () => {
    const view = await render('?stage=draft')
    expect(view.findAll('.pa-object')).toHaveLength(2)
    expect(view.find('.pa-paper__head').text()).not.toContain('1 z 2')
    await click('Dodaj wybrane')
    expect(view.findAll('.pa-object')).toHaveLength(1)
    expect(view.text()).toContain('26 paź')
    expect(view.text()).toContain('W przykładzie')
    expect(view.text()).not.toContain('Koncentracja po czytaniu')
  })
  it('preserves a manual edit after the example conversation proposes a correction', async () => {
    const view = await render('?stage=draft')
    await view.get('button[aria-label="Edytuj: Czytanie przez 20 minut"]').trigger('click')
    await view.get('input[aria-label="Wartość targetu"]').setValue('4')
    await view.get('textarea[aria-label="Wiadomość do pomocnika"]').setValue('Zmień na 2 dni')
    await view.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(1000)
    expect(view.get('input[aria-label="Wartość targetu"]').element).toHaveProperty('value', '4')
    expect(view.text()).toContain('Twoje poprawki zostają')
  })
  it('restores a cancelled message and blocks the stale completion', async () => {
    const view = await render()
    const field = view.get('textarea[aria-label="Wiadomość do pomocnika"]')
    await field.setValue('Chcę czytać')
    await view.get('form').trigger('submit')
    await click('Przerwij')
    await vi.advanceTimersByTimeAsync(2000)
    expect(field.element).toHaveProperty('value', 'Chcę czytać')
    expect(view.text()).not.toContain('W trzy różne dni')
    expect(view.findAll('.pa-object')).toHaveLength(0)
  })
  it('retains editable objects on a save error and retries directly', async () => {
    const view = await render('?stage=draft&sample=portfolio')
    await click('Sprawdź błąd zapisu')
    await click('Dodaj wybrane')
    expect(view.text()).toContain('Szkic jest tutaj')
    expect(view.findAll('.pa-object')).toHaveLength(3)
    expect(view.findAll('input[type="checkbox"]')).toHaveLength(3)
    await click('Spróbuj ponownie')
    expect(view.text()).toContain('W przykładzie')
    expect(view.findAll('.pa-object')).toHaveLength(3)
  })
  it('keeps an invalid draft editable rather than completing the direct add', async () => {
    const view = await render('?stage=draft')
    await view.get('button[aria-label="Edytuj: Czytanie przez 20 minut"]').trigger('click')
    await view.get('input[aria-label="Wartość targetu"]').setValue('8')
    await click('Dodaj wybrane')
    expect(view.text()).toContain('Tydzień ma najwyżej 7 dni')
    expect(view.text()).not.toContain('W przykładzie')
    expect(view.get('input[aria-label="Wartość targetu"]').element).toHaveProperty('value', '8')
  })
})
