import { describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { organicIcons, iconCategories, organicSvg, organicSprite, normalizeIconSearch } from '~lab/lab/organicIcons'
import { icons } from '~lab/lab/iconStudy'
import { APPROVED_ADDITIONS, APPROVED_COLLECTION_COUNTS, APPROVED_ICON_COUNT } from '~lab/lab/iconCatalogContract'
import catalog from '../../public/icon-library/catalog.json'
import OrganicIconCatalog from '~lab/experiments/OrganicIconCatalog.vue'

describe('organic icon catalog', () => {
  it('matches the approved catalogue contract (count, collections, additions)', () => {
    const collectionSum = Object.values(APPROVED_COLLECTION_COUNTS).reduce((sum, n) => sum + n, 0)
    expect(collectionSum).toBe(APPROVED_ICON_COUNT)
    expect(organicIcons).toHaveLength(APPROVED_ICON_COUNT)
    for (const [collection, count] of Object.entries(APPROVED_COLLECTION_COUNTS)) {
      expect(organicIcons.filter(i => i.collection === Number(collection))).toHaveLength(count)
    }
    for (const addition of APPROVED_ADDITIONS) {
      const icon = organicIcons.find(i => i.id === addition.id)
      expect(icon, addition.id).toBeDefined()
      expect(icon?.collection, addition.id).toBe(addition.collection)
    }
    // The exported catalogue (what the Lab serves) mirrors the source, in order.
    expect(catalog.map(i => i.id)).toEqual(organicIcons.map(i => i.id))
  })

  it('preserves approved contours and exports valid, uniquely named SVGs', () => {
    expect(new Set(organicIcons.map(i => i.id)).size).toBe(organicIcons.length)
    expect(new Set(organicIcons.map(i => i.markup)).size).toBe(organicIcons.length)
    for (const seed of icons) expect(organicIcons.find(i => i.id === seed.id)?.markup).toBe(seed.b)
    for (const icon of organicIcons) {
      expect(iconCategories.some(c => c.id === icon.category)).toBe(true)
      const svg = new DOMParser().parseFromString(organicSvg(icon), 'image/svg+xml')
      expect(svg.querySelector('parsererror')).toBeNull()
      expect(svg.documentElement.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(svg.querySelectorAll('path,circle').length).toBeGreaterThan(0)
    }
    const sprite = new DOMParser().parseFromString(organicSprite(), 'image/svg+xml')
    expect(sprite.querySelector('parsererror')).toBeNull()
    expect(sprite.querySelectorAll('symbol')).toHaveLength(organicIcons.length)
  })

  it('matches Polish names without diacritics', () => {
    expect(normalizeIconSearch('Życzliwość Łagodność')).toBe('zyczliwosc lagodnosc')
  })

  it('restores filters, selection and size from URL, handles empty results and keeps comparison available', async () => {
    const router = createRouter({history:createMemoryHistory(),routes:[{path:'/concepts/icons',component:OrganicIconCatalog}]})
    await router.push('/concepts/icons?category=activity&size=16&icon=sleep&q=sen&notes=0')
    const wrapper=mount(OrganicIconCatalog,{global:{plugins:[createPinia(),router]}})
    expect(wrapper.findAll('.oc-icon').map(i => i.text())).toEqual(['Sen', 'Pływanie']) // 'basen' also matches 'sen'.
    expect(wrapper.find('.oc-icon').text()).toBe('Sen')
    expect(wrapper.find('.oc-icon svg').attributes('width')).toBe('16')
    expect(wrapper.find('.oc-selected h2').text()).toBe('Sen')
    await wrapper.find('input').setValue('xyzbrak')
    await flushPromises()
    expect(router.currentRoute.value.query.q).toBe('xyzbrak')
    expect(wrapper.find('.oc-empty').exists()).toBe(true)
    await wrapper.find('.oc-empty button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.oc-icon')).toHaveLength(organicIcons.length)
    await router.replace({query:{collection:'2',notes:'0'}})
    await flushPromises()
    expect(wrapper.findAll('.oc-icon')).toHaveLength(organicIcons.filter(i => i.collection === 2).length)
    expect(wrapper.findAll('.oc-icon').some(i => i.text() === 'Rodzicielstwo')).toBe(true)
    await router.replace({query:{collection:'3',icon:'youtube',notes:'0'}})
    await flushPromises()
    expect(wrapper.findAll('.oc-icon')).toHaveLength(organicIcons.filter(i => i.collection === 3).length)
    expect(wrapper.find('.oc-selected h2').text()).toBe('YouTube')
    expect(wrapper.find('.oc-selected code').text()).toBe('mg-youtube')
    await router.replace({query:{collection:'4',icon:'phone-free',q:'bez telefonu',notes:'0'}})
    await flushPromises()
    expect(wrapper.findAll('.oc-icon').map(icon => icon.text())).toEqual(['Bez telefonu', 'Sypialnia bez telefonu'])
    expect(wrapper.find('.oc-selected code').text()).toBe('mg-phone-free')
    await wrapper.find('input').setValue('')
    await flushPromises()
    expect(wrapper.findAll('.oc-icon')).toHaveLength(organicIcons.filter(i => i.collection === 4).length)
    await wrapper.find('.oc-actions button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.is-sample')).toHaveLength(36)
    wrapper.unmount()
  })
})
