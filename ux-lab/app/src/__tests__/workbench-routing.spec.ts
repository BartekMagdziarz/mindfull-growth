import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import WorkbenchScenario from '~lab/scenarios/WorkbenchScenario.vue'

describe('workbench URL state', () => {
  it('odtwarza preset, wariant, tryb i viewport oraz zapisuje zmianę trybu', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/views/:viewId', component: WorkbenchScenario }],
    })
    await router.push('/views/calendar-month?mode=compare&preset=closed&variant=reference-v1&viewport=mobile')
    await router.isReady()

    const wrapper = mount(WorkbenchScenario, {
      global: { plugins: [createPinia(), router] },
    })
    const selects = wrapper.findAll('select')

    expect((selects[0].element as HTMLSelectElement).value).toBe('closed')
    expect((selects[1].element as HTMLSelectElement).value).toBe('reference-v1')
    expect(wrapper.find('.workbench-canvas').classes()).toContain('workbench-canvas--compare')
    expect(wrapper.find('.surface-frame').classes()).toContain('surface-frame--mobile')
    expect(wrapper.find('iframe').attributes('src')).toBe('http://127.0.0.1:5199/calendar/stream/2026-06')

    const experiment = wrapper.findAll('.segmented-control button').find(button => button.text().includes('Eksperyment'))
    expect(experiment).toBeTruthy()
    await experiment!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      mode: 'experiment',
      preset: 'closed',
      variant: 'reference-v1',
      viewport: 'mobile',
    })
  })

  it('otwiera Month V2 na trasie planistycznej, niezależnie od baseline streamu', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/views/:viewId', component: WorkbenchScenario }],
    })
    await router.push('/views/calendar-month?mode=experiment&preset=current&variant=month-v2-verify')
    await router.isReady()

    const wrapper = mount(WorkbenchScenario, {
      global: { plugins: [createPinia(), router] },
    })

    expect(wrapper.find('iframe').attributes('src')).toBe(
      'http://127.0.0.1:5199/calendar/month/2026-07?layout=v2&chart=trend&density=comfortable&focus=all',
    )
  })
})
