import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { DayRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'

const push = vi.fn()
const launch = vi.fn()
const enrollments = ref<ProgramEnrollment[]>([])
const entries = ref<MicroExerciseEntry[]>([])
const weekTaskState = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { props: ['to'], template: '<a :href="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>' },
}))
vi.mock('@/composables/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      `${key.split('.').at(-1)}${params ? `:${Object.values(params).join('/')}` : ''}`,
    tp: (n: number, ...keys: string[]) => `${keys[0].split('.').at(-2)}:{done}/${n}`,
    locale: ref('pl-PL'),
  }),
}))
vi.mock('../useDayWellness', () => ({
  useDayWellness: () => ({ isToday: ref(true), activeEnrollments: enrollments, ensureLoaded: vi.fn(async () => {}) }),
}))
vi.mock('@/stores/exercisePlan.store', () => ({ useExercisePlanStore: () => ({ pendingItems: [] }) }))
vi.mock('@/stores/microExerciseEntry.store', () => ({
  useMicroExerciseEntryStore: () => ({
    get entries() {
      return entries.value
    },
    loadEntries: vi.fn(async () => {}),
  }),
}))
vi.mock('@/stores/today.store', () => ({ useTodayStore: () => ({ bundle: null }) }))
vi.mock('@/features/program-path/useStepLauncher', () => ({
  useStepLauncher: () => ({ pickerOpen: ref(false), pickerMoments: ref([]), launch, picked: vi.fn() }),
}))
vi.mock('@/services/programWeekService', () => ({ weekTaskState: (...args: unknown[]) => weekTaskState(...args) }))

import { getProgramDefinition } from '@/data/programCatalog'
import { addDaysToDayRef } from '@/utils/periods'
import NextDayPrograms from '../NextDayPrograms.vue'

const TODAY = '2026-03-12' as DayRef

function enrollment(programSlug: string, currentStepIndex: number, overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  // The last completion sits exactly the current step's gap behind today, so the step is due "today".
  const gap = getProgramDefinition(programSlug)?.steps[currentStepIndex]?.minGapDays ?? 0
  const completedSteps = Array.from({ length: currentStepIndex }, (_, stepIndex) => ({
    stepIndex,
    completedAt:
      stepIndex === currentStepIndex - 1
        ? `${addDaysToDayRef(TODAY, -gap)}T12:00:00.000Z`
        : `2026-02-${String(10 + stepIndex).padStart(2, '0')}T12:00:00.000Z`,
  }))
  return {
    id: `e-${programSlug}`,
    programSlug,
    status: 'active',
    startedAt: '2026-02-10T12:00:00.000Z',
    currentStepIndex,
    completedSteps,
    contentVersion: 3,
    createdAt: '2026-02-10T12:00:00.000Z',
    updatedAt: '2026-02-10T12:00:00.000Z',
    ...overrides,
  }
}

function mountCard() {
  return mount(NextDayPrograms, {
    props: { dayRef: TODAY },
    global: { stubs: { AppIcon: true, MomentPickerDialog: true, DsSurface: { template: '<section><slot /></section>' } } },
  })
}

describe('NextDayPrograms', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockReset()
    launch.mockReset()
    entries.value = []
    weekTaskState.mockReset()
    weekTaskState.mockResolvedValue({ intention: null, doneCount: 0, doneDays: [] })
  })

  it('renders nothing without an active path, and skips paused and closed ones', async () => {
    enrollments.value = [enrollment('shame-compassion', 9, { status: 'paused' }), enrollment('shame-compassion', 24, { id: 'closed', status: 'completed' })]
    const wrapper = mountCard()
    await flushPromises()
    expect(wrapper.find('[data-testid="today-path-tile"]').exists()).toBe(false)
  })

  it('one row per active path: the phase with its number and week dots, the next step with a date, the moment action', async () => {
    enrollments.value = [enrollment('shame-compassion', 9)]
    const wrapper = mountCard()
    await flushPromises()
    const tiles = wrapper.findAll('[data-testid="today-path-tile"]')
    expect(tiles).toHaveLength(1)
    const tile = tiles[0]

    const phase = tile.find('[data-testid="today-path-phase"]')
    expect(phase.find('.ndpath__eyebrow').exists()).toBe(false)
    expect(phase.find('.ndpath__phase .ndpath__text').text()).toBe('title')
    expect(phase.attributes('href')).toContain('program-detail')
    expect(phase.find('.ndpath__open').text()).toBe('programsOpen')
    const dots = phase.findAll('.ndpath-dots > i')
    expect(dots).toHaveLength(8)
    expect(dots.filter((dot) => dot.classes('is-done'))).toHaveLength(3)
    expect(dots[3].classes()).toContain('is-current')
    expect(phase.find('.ndpath-dots').attributes('aria-label')).toBe('programWeekProgress:4/8')
    expect(tile.text()).not.toMatch(/\d\s*z\s*\d/)

    const step = tile.find('[data-testid="today-path-step"]')
    expect(step.find('.ndpath__text').text()).toContain('title')
    expect(step.find('.ndpath__when').text()).toBe('today')
    await step.trigger('click')
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ slug: 'shame-compassion' }), 9)

    expect(tile.find('[data-testid="today-path-moment"]').attributes('href')).toBe('/exercises/micro/moment-shame')
    expect(tile.find('[data-testid="today-path-task"]').exists()).toBe(false)
    expect(tile.find('[data-testid="today-path-dose"]').exists()).toBe(false)
    expect(wrapper.find('.ndt-card__links').exists()).toBe(false)
  })

  it('a path without weeks counts steps, and one without a moment kind has no moment tile', async () => {
    enrollments.value = [enrollment('ifs-parts', 2, { contentVersion: undefined })]
    const wrapper = mountCard()
    await flushPromises()
    const phase = wrapper.find('[data-testid="today-path-phase"]')
    expect(phase.find('.ndpath__phase .ndpath__text').exists()).toBe(false)
    expect(phase.find('.ndpath-dots').attributes('aria-label')).toBe('programStepProgress:3/7')
    expect(phase.findAll('.ndpath-dots > i')).toHaveLength(7)
    expect(phase.findAll('.ndpath-dots > i.is-done')).toHaveLength(2)
    expect(wrapper.find('[data-testid="today-path-moment"]').exists()).toBe(false)
  })

  it('shows the accepted week task as dots with the fraction in the title only, and the rhythm proposal after a heavy dose check', async () => {
    weekTaskState.mockResolvedValue({
      intention: { id: 'i1', title: 'Nazwij wstyd w chwili, gdy się pojawia', target: { kind: 'count', operator: 'min', value: 3 } },
      task: { key: 'useResponse', times: 3 },
      doneCount: 2,
      doneDays: [],
    })
    entries.value = [
      { id: 'd1', exerciseSlug: 'dose-check', createdAt: '2026-03-10T12:00:00.000Z', responses: { load: 'tooMuch' } } as unknown as MicroExerciseEntry,
    ]
    enrollments.value = [enrollment('shame-compassion', 9), enrollment('anxiety-approach', 6, { id: 'e-anx' })]
    const wrapper = mountCard()
    await flushPromises()
    const tiles = wrapper.findAll('[data-testid="today-path-tile"]')
    expect(tiles).toHaveLength(2)

    const task = tiles[0].find('[data-testid="today-path-task"]')
    expect(task.find('.ndpath__task-text .ndpath__text').text()).toBe('Nazwij wstyd w chwili, gdy się pojawia')
    expect(task.findAll('.ndpath__task-dots > i')).toHaveLength(3)
    expect(task.findAll('.ndpath-dots > i.is-done')).toHaveLength(2)
    expect(task.attributes('title')).toBe('taskDays:2/3')
    expect(task.text()).not.toContain('2')

    expect(tiles[0].find('[data-testid="today-path-dose"]').exists()).toBe(true)
    // Every path field is the link to its path view, with the floating label.
    expect(tiles[1].find('a.ndpath__path .ndpath__open').exists()).toBe(true)
    // Both action tiles share the grammar of "Najbliżej": icon field, title, quiet line; the eyebrow is in the tooltip.
    expect(tiles[0].find('[data-testid="today-path-step"] .ndpath__glyph').exists()).toBe(true)
    expect(tiles[0].find('[data-testid="today-path-step"] .ndpath__eyebrow').exists()).toBe(false)
    const moment = tiles[0].find('[data-testid="today-path-moment"]')
    expect(moment.find('.ndpath__glyph').exists()).toBe(true)
    expect(moment.find('.ndpath__eyebrow').exists()).toBe(false)
    expect(moment.attributes('title')).toBe('title')
  })
})
