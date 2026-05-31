import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ObjectsLibraryPriorityCard from '@/components/objects/ObjectsLibraryPriorityCard.vue'
import type { ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'

function makePriorityItem(overrides: Partial<ObjectsLibraryListItem> = {}): ObjectsLibraryListItem {
  return {
    id: 'pri-1',
    panelType: 'priority',
    title: 'Original title',
    status: 'active',
    order: 1,
    years: ['2026'],
    icon: undefined,
    lifeAreaIds: [],
    whyNow: 'old why',
    desiredDirection: 'old dir',
    tradeoffs: 'old tradeoffs',
    progressSignals: [],
    riskSignals: [],
    closingReflection: undefined,
    linkedCounts: { goals: 0, habits: 0, trackers: 0, initiatives: 0 },
    ...overrides,
  } as unknown as ObjectsLibraryListItem
}

const baseProps = {
  statusOptions: [
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'closed', label: 'Closed' },
  ],
  lifeAreaOptions: [],
  isNew: false,
}

// Stub out child components that pull in stores/i18n we don't need here.
const stubs = {
  IconPicker: true,
  AppIcon: true,
  StatusIconButton: true,
  PriorityYearsDropdown: true,
}

vi.mock('@/composables/useT', () => ({
  useT: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))

describe('ObjectsLibraryPriorityCard — race condition guard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('mirrors prop title into the input on initial render', () => {
    const wrapper = mount(ObjectsLibraryPriorityCard, {
      attachTo: document.body,
      props: { item: makePriorityItem(), ...baseProps },
      global: { stubs },
    })

    const input = wrapper.find('input[type="text"]').element as HTMLInputElement
    expect(input.value).toBe('Original title')
  })

  it('debounces field-change emission while the user is typing', async () => {
    const wrapper = mount(ObjectsLibraryPriorityCard, {
      attachTo: document.body,
      props: { item: makePriorityItem(), ...baseProps },
      global: { stubs },
    })

    const input = wrapper.find('input[type="text"]')
    await input.setValue('New title')

    expect(wrapper.emitted('field-change')).toBeUndefined()

    vi.advanceTimersByTime(400)
    await nextTick()

    const events = wrapper.emitted('field-change')
    expect(events).toHaveLength(1)
    expect(events?.[0]).toEqual(['pri-1', 'title', 'New title'])
  })

  it('keeps the user-typed value when prop updates mid-edit (race condition)', async () => {
    const wrapper = mount(ObjectsLibraryPriorityCard, {
      attachTo: document.body,
      props: { item: makePriorityItem({ title: 'Original' }), ...baseProps },
      global: { stubs },
    })

    const input = wrapper.find('input[type="text"]')
    const inputEl = input.element as HTMLInputElement

    // User focuses and starts typing
    inputEl.focus()
    await input.setValue('User typing')
    expect(inputEl.value).toBe('User typing')

    // External update arrives BEFORE debounce fires (e.g. loadBundle in parent)
    await wrapper.setProps({ item: makePriorityItem({ title: 'External change' }) })
    await nextTick()

    // The input must NOT have jumped to the external value
    expect(inputEl.value).toBe('User typing')

    // After debounce fires, the user's value commits — last-write-wins
    vi.advanceTimersByTime(400)
    await nextTick()

    const events = wrapper.emitted('field-change')
    expect(events?.[events.length - 1]).toEqual(['pri-1', 'title', 'User typing'])
  })

  it('syncs from prop when input is NOT focused', async () => {
    const wrapper = mount(ObjectsLibraryPriorityCard, {
      attachTo: document.body,
      props: { item: makePriorityItem({ title: 'A' }), ...baseProps },
      global: { stubs },
    })

    const inputEl = wrapper.find('input[type="text"]').element as HTMLInputElement
    expect(inputEl.value).toBe('A')

    // Prop changes while user is not editing — should sync
    await wrapper.setProps({ item: makePriorityItem({ title: 'B' }) })
    await nextTick()

    expect(inputEl.value).toBe('B')
  })

  it('flushes pending commit on blur', async () => {
    const wrapper = mount(ObjectsLibraryPriorityCard, {
      attachTo: document.body,
      props: { item: makePriorityItem(), ...baseProps },
      global: { stubs },
    })

    const input = wrapper.find('input[type="text"]')
    const inputEl = input.element as HTMLInputElement
    inputEl.focus()
    await input.setValue('Flushed')

    // Before debounce — no emit yet
    expect(wrapper.emitted('field-change')).toBeUndefined()

    // Blur triggers immediate flush
    await input.trigger('blur')

    const events = wrapper.emitted('field-change')
    expect(events).toHaveLength(1)
    expect(events?.[0]).toEqual(['pri-1', 'title', 'Flushed'])

    // Subsequent timer fire should not duplicate the emit
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.emitted('field-change')).toHaveLength(1)
  })
})
