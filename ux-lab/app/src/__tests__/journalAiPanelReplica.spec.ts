import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import Replica from '~lab/components/journal-ai/JournalAiPanelReplica.vue'
import type { PanelState, PanelVariant } from '~lab/lab/journalAiPanel'

let wrapper: VueWrapper | undefined
afterEach(() => wrapper?.unmount())
function render(props: { variant: PanelVariant; state: PanelState; archivedCount?: number }) {
  wrapper = mount(Replica, { props: { ...props, replyDelay: 0 }, global: { stubs: { AppIcon: true } }, attachTo: document.body })
  return wrapper
}
const button = (text: string) => wrapper!.findAll('button').find(b => b.text().trim() === text)

describe('journal AI panel replica', () => {
  it('B: chips live under the disc, a lens sends a message and closes the row', async () => {
    render({ variant: 'b', state: 'conversation' })
    await flushPromises()
    expect(wrapper!.find('.cp__starters').exists()).toBe(false)
    const disc = wrapper!.find('button[aria-label="Propozycje tematów"]')
    expect(disc.attributes('aria-expanded')).toBe('false')
    await disc.trigger('click')
    expect(wrapper!.findAll('.cp__starters .cp__chip')).toHaveLength(6)
    await button('Pułapki myślenia')!.trigger('click')
    expect(wrapper!.find('.cp__starters').exists()).toBe(false)
    expect(wrapper!.findAll('.cp__msg--user').at(-1)!.text()).toContain('pułapki myślenia')
    expect(wrapper!.find('.cp__activity').exists()).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 5))
    await flushPromises()
    expect(wrapper!.find('.cp__activity').exists()).toBe(false)
    expect(wrapper!.findAll('.cp__msg--assistant').at(-1)!.text()).toContain('pułapkę')
  })

  it('B2: a separate tray under the composer, no disc; folds to its header; a used topic leaves it', async () => {
    render({ variant: 'b2', state: 'conversation' })
    await flushPromises()
    expect(wrapper!.find('button[aria-label="Propozycje tematów"]').exists()).toBe(false)
    const tray = wrapper!.find('.cp__tray')
    expect(tray.exists()).toBe(true)
    expect(tray.element.previousElementSibling!.className).toContain('cp__form')
    expect(tray.find('.cp__tray-count').text()).toBe('6')
    expect(tray.findAll('.cp__chip')).toHaveLength(6)
    await tray.find('.cp__tray-head').trigger('click')
    expect(wrapper!.find('.cp__tray .cp__starters').exists()).toBe(false)
    expect(wrapper!.find('.cp__tray-head').attributes('aria-expanded')).toBe('false')
    await wrapper!.find('.cp__tray-head').trigger('click')
    await button('Rozmowa z Niną o projekcie')!.trigger('click')
    expect(wrapper!.find('.cp__tray').exists()).toBe(true)
    expect(wrapper!.findAll('.cp__tray .cp__chip')).toHaveLength(5)
    expect(wrapper!.findAll('.cp__msg--assistant').at(-1)!.find('h3').text()).toBe('Rozmowa z Niną o projekcie')
  })

  it('B3: two text lines under the composer; a lens link sends, a topic link starts the topic', async () => {
    render({ variant: 'b3', state: 'conversation' })
    await flushPromises()
    expect(wrapper!.find('.cp__tray-head').exists()).toBe(false)
    const lines = wrapper!.findAll('.cp__tray--lines .cp__line')
    expect(lines).toHaveLength(2)
    expect(lines[0]!.text()).toContain('Tematy')
    expect(lines[1]!.text()).toContain('Soczewki')
    expect(wrapper!.findAll('.cp__line-link')).toHaveLength(6)
    await button('Konkretne kroki')!.trigger('click')
    expect(wrapper!.findAll('.cp__msg--user').at(-1)!.text()).toContain('konkretne kroki')
    await button('Co dał spacer bez telefonu')!.trigger('click')
    expect(wrapper!.findAll('.cp__line-link')).toHaveLength(5)
    expect(wrapper!.findAll('.cp__tray--lines .cp__line')).toHaveLength(2)
  })

  it('A: picking a topic chip starts the topic and removes it from the row', async () => {
    render({ variant: 'a', state: 'conversation' })
    await flushPromises()
    await wrapper!.find('button[aria-label="Propozycje tematów"]').trigger('click')
    expect(wrapper!.findAll('.cp__starters .cp__chip')).toHaveLength(3)
    await button('Rozmowa z Niną o projekcie')!.trigger('click')
    expect(wrapper!.find('.cp__starters').exists()).toBe(false)
    expect(wrapper!.findAll('.cp__msg--assistant').at(-1)!.find('h3').text()).toBe('Rozmowa z Niną o projekcie')
    await wrapper!.find('button[aria-label="Propozycje tematów"]').trigger('click')
    expect(wrapper!.findAll('.cp__starters .cp__chip').map(c => c.text())).toEqual(['Sen i wieczorne przewijanie', 'Co dał spacer bez telefonu'])
  })

  it('A/B/C: the earlier conversation folds on top with the right plural; current keeps it below', async () => {
    render({ variant: 'b', state: 'reset', archivedCount: 1 })
    await flushPromises()
    const scroll = wrapper!.find('.cp__scroll')
    expect(scroll.element.firstElementChild!.className).toContain('cp__archive-top')
    expect(wrapper!.find('.cp__fold').text()).toContain('Wcześniejsza rozmowa · 1 wiadomość')
    expect(wrapper!.find('.cp__archive').exists()).toBe(false)
    wrapper!.unmount()
    render({ variant: 'current', state: 'reset', archivedCount: 1 })
    await flushPromises()
    expect(wrapper!.find('.cp__archive-top').exists()).toBe(false)
    expect(wrapper!.find('.cp__archive summary').text()).toContain('1 wiadomości')
    expect(wrapper!.find('.cp__toggle').text()).toBe('Propozycje tematów')
  })

  it('options → „Rozpocznij od aktualnych danych” moves the conversation into the fold (B)', async () => {
    render({ variant: 'b', state: 'conversation' })
    await flushPromises()
    await wrapper!.find('button[aria-label="Opcje rozmowy"]').trigger('click')
    await button('Rozpocznij od aktualnych danych')!.trigger('click')
    expect(wrapper!.findAll('.cp__messages:not(.cp__messages--dim) .cp__msg')).toHaveLength(0)
    expect(wrapper!.find('.cp__fold').text()).toContain('3 wiadomości')
    expect(wrapper!.findAll('.cp__topic')).toHaveLength(4)
  })

  it('C: topics are a card in the log; „Zaproponuj tematy” appends another', async () => {
    render({ variant: 'c', state: 'conversation' })
    await flushPromises()
    const log = wrapper!.find('[aria-label="Wiadomości rozmowy"]')
    expect(log.element.firstElementChild!.className).toContain('cp__msg--topics')
    await wrapper!.find('button[aria-label="Opcje rozmowy"]').trigger('click')
    await button('Zaproponuj tematy')!.trigger('click')
    const cards = wrapper!.findAll('.cp__msg--topics')
    expect(cards).toHaveLength(2)
    expect(wrapper!.findAll('.cp__msg').at(-1)!.classes()).toContain('cp__msg--topics')
  })

  it('D: nothing but messages between the header and the form; topics and archive in the options', async () => {
    render({ variant: 'd', state: 'reset', archivedCount: 3 })
    await flushPromises()
    for (const cls of ['.cp__starters', '.cp__fold', '.cp__toggle', '.cp__archive', '.cp__chat-entry']) expect(wrapper!.find(cls).exists()).toBe(false)
    await wrapper!.find('button[aria-label="Opcje rozmowy"]').trigger('click')
    expect(wrapper!.findAll('.cp__options .cp__topic')).toHaveLength(3)
    expect(wrapper!.find('.cp__options').text()).toContain('Wcześniejsza rozmowa')
    expect(wrapper!.find('.cp').classes()).toContain('cp--conversation')
  })
})
