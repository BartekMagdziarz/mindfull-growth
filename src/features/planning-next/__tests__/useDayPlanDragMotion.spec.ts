import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { provideDayPlanDragMotion } from '../useDayPlanDragMotion'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers.length = 0
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
function setup(reduced = false) {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
  let motion!: ReturnType<typeof provideDayPlanDragMotion>
  const wrapper = mount(defineComponent({
    setup() {
      motion = provideDayPlanDragMotion()
      return () => h('article', { class: 'ndi' }, [h('span', { class: 'handle' }, 'Object')])
    },
  }), { attachTo: document.body })
  wrappers.push(wrapper)
  const setDragImage = vi.fn()
  motion.start({
    currentTarget: wrapper.find('.handle').element,
    clientX: 20, clientY: 20,
    dataTransfer: { setDragImage },
  } as unknown as DragEvent)
  return { wrapper, motion, setDragImage }
}
it('lifts the whole card and cleans the visual layer on workspace unmount', () => {
  const { wrapper, motion, setDragImage } = setup()
  expect(document.querySelector('.day-plan-drag-preview .ndi')?.textContent).toBe('Object')
  expect(wrapper.classes()).toContain('ndi--drag-source')
  expect(setDragImage).toHaveBeenCalledOnce()
  const day = document.createElement('button')
  motion.hover(day)
  expect(day.classList.contains('is-drag-over')).toBe(true)
  wrapper.unmount()
  expect(document.querySelector('.day-plan-drag-preview')).toBeNull()
  expect(day.classList.contains('is-drag-over')).toBe(false)
})
it('keeps the landing alive through native dragend, then removes it', () => {
  const animation = { cancel: vi.fn(), onfinish: null as null | (() => void) }
  const { wrapper, motion } = setup()
  const preview = document.querySelector<HTMLElement>('.day-plan-drag-preview')!
  preview.animate = vi.fn().mockReturnValue(animation)
  motion.land(document.createElement('button'))
  motion.cancel()
  expect(document.querySelector('.day-plan-drag-preview')).toBe(preview)
  animation.onfinish?.()
  expect(document.querySelector('.day-plan-drag-preview')).toBeNull()
  expect(wrapper.classes()).not.toContain('ndi--drag-source')
})
it('cleans up cancellation immediately with reduced motion', () => {
  const { wrapper, motion } = setup(true)
  motion.cancel()
  expect(document.querySelector('.day-plan-drag-preview')).toBeNull()
  expect(wrapper.classes()).not.toContain('ndi--drag-source')
})
