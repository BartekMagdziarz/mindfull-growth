import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'
import AppIcon from '../AppIcon.vue'
import EntityIcon from '../EntityIcon.vue'
import IconPicker from '../IconPicker.vue'
import { resolveIcon } from '@/design-system/icons/resolveIcon'
import { organicIcons } from '@/design-system/icons/organicIcons'
import { ENTITY_ICON_OPTIONS } from '@/constants/entityIconCatalog'
import { EXERCISE_CATALOG } from '@/data/exerciseCatalog'
import { PROGRAM_CATALOG } from '@/data/programCatalog'
import { EMOTION_GROUPS } from '@/domain/emotionGroups'
import { MATRIX_CELL_ICONS } from '@/domain/reflectionMatrix'

describe('organic icon migration', () => {
  it('renders the approved paths and retains layout and accessibility hooks without font text', () => {
    const wrapper = mount(AppIcon, {
      props: { name: 'calendar_month' },
      attrs: { class: 'text-xl rotate-180', style: 'color: red' },
    })
    expect(wrapper.attributes('data-glyph')).toBe('calendar')
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.classes()).toContain('text-xl')
    expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 24 24')
    expect(wrapper.text()).toBe('')
    expect(resolveIcon('mg-calendar').markup).toBe(
      organicIcons.find(i => i.id === 'calendar')?.markup
    )
    expect(resolveIcon('<script>alert(1)</script>').fallback).toBe(true)
    expect(resolveIcon('<script>alert(1)</script>').markup).not.toContain('script')
  })

  it('covers saved entity choices, exercise/program icons, emotion groups and every rating tuple', () => {
    for (const option of ENTITY_ICON_OPTIONS) {
      expect(resolveIcon(option.materialIcon).fallback, option.materialIcon).toBe(false)
      expect(resolveIcon(option.id).fallback, option.id).toBe(false)
    }
    for (const option of [...EXERCISE_CATALOG, ...PROGRAM_CATALOG, ...EMOTION_GROUPS])
      expect(resolveIcon(option.icon).fallback, option.icon).toBe(false)
    for (const sections of Object.values(MATRIX_CELL_ICONS))
      for (const names of Object.values(sections)) {
        for (const name of names) expect(resolveIcon(name).fallback, name).toBe(false)
        expect(new Set(names.map(name => resolveIcon(name).markup)).size, names.join(',')).toBe(5)
      }
    expect(resolveIcon('check_box').markup).not.toBe(resolveIcon('check_box_outline_blank').markup)
    expect(resolveIcon('radio_button_checked').markup).not.toBe(
      resolveIcon('radio_button_unchecked').markup
    )
  })

  it('gives every exercise a distinct catalog glyph', () => {
    const glyphs = EXERCISE_CATALOG.map(entry => resolveIcon(entry.icon))
    expect(glyphs.every(glyph => !glyph.fallback && glyph.id.startsWith('exercise-'))).toBe(true)
    expect(new Set(glyphs.map(glyph => glyph.markup)).size).toBe(EXERCISE_CATALOG.length)
  })

  it('preserves emoji and legacy ID rendering without modifying saved values', () => {
    const wrapper = mount(EntityIcon, { props: { icon: 'heart', size: 'lg' } })
    expect(wrapper.find('[data-glyph="health"]').exists()).toBe(true)
    const emoji = mount(EntityIcon, { props: { icon: '🌱' } })
    expect(emoji.text()).toBe('🌱')
    expect(mount(AppIcon, { props: { name: '🌱' } }).text()).toBe('🌱')
    expect(emoji.find('svg').exists()).toBe(false)
    expect(wrapper.emitted()).toEqual({})
  })

  it('offers the curated set immediately, filters without diacritics and emits a stable namespaced ID', async () => {
    const wrapper = mount(IconPicker, {
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.findAll('.grid button')).toHaveLength(309)
    await wrapper.find('input').setValue('youtube')
    expect(wrapper.findAll('.grid button')).toHaveLength(2)
    await wrapper.find('[data-glyph="youtube"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['mg-youtube'])
    expect(wrapper.find('input').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.find('button').element)
    wrapper.unmount()
  })

  it('covers all static application AppIcons and rejects raw font spans', () => {
    const errors: string[] = []
    function scan(dir: string) {
      for (const file of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, file.name)
        if (file.isDirectory()) {
          if (file.name !== '__tests__') scan(path)
          continue
        }
        if (!path.endsWith('.vue') || path.endsWith('/AppIcon.vue')) continue
        const template = parse(readFileSync(path, 'utf8')).descriptor.template
        if (!template) continue
        function visit(node: ReturnType<typeof parseTemplate> | any) {
          if (node.type === 1) {
            const cls =
              node.props.find((p: any) => p.type === 6 && p.name === 'class')?.value?.content ?? ''
            if (node.tag === 'span' && cls.includes('material-symbols-outlined'))
              errors.push(`${path}: raw font icon`)
            const name = node.props.find((p: any) => p.type === 6 && p.name === 'name')?.value
              ?.content
            if (node.tag === 'AppIcon' && name && resolveIcon(name).fallback)
              errors.push(`${path}: ${name}`)
          }
          for (const child of node.children ?? []) visit(child)
        }
        visit(parseTemplate(template.content))
      }
    }
    scan('src')
    expect(errors).toEqual([])
  })
})
