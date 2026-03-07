import type { Component } from 'vue'
import { icons as tablerIcons } from '@tabler/icons-vue'

export interface EntityIconOption {
  id: string
  label: string
  component: Component
  search: string
}

function toKebabCase(value: string): string {
  return value
    .replace(/^Icon/, '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
    .toLowerCase()
}

function toLabel(value: string): string {
  return value
    .replace(/^Icon/, '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .trim()
}

const rawOptions = Object.entries(tablerIcons)
  .map(([name, component]) => {
    const id = toKebabCase(name)
    const label = toLabel(name)
    return {
      id,
      label,
      component: component as Component,
      search: `${id} ${label.toLowerCase()}`,
    } satisfies EntityIconOption
  })
  .sort((a, b) => a.label.localeCompare(b.label))

const dedupedOptions: EntityIconOption[] = []
const seenIconIds = new Set<string>()
for (const option of rawOptions) {
  if (seenIconIds.has(option.id)) continue
  seenIconIds.add(option.id)
  dedupedOptions.push(option)
}

export const ENTITY_ICON_OPTIONS: EntityIconOption[] = dedupedOptions

const LEGACY_ICON_ID_MAP: Record<string, string> = {
  airplane: 'plane',
  bank: 'building-bank',
  cap: 'school',
  card: 'credit-card',
  cart: 'shopping-cart',
  chart: 'chart-bar',
  chat: 'message',
  fire: 'flame',
  home: 'home',
  'home-modern': 'home',
  office: 'building',
  paint: 'brush',
  photo: 'photo',
  pie: 'chart-pie',
  swatch: 'palette',
  tools: 'hammer',
  landmark: 'building-bank',
  'graduation-cap': 'school',
  house: 'home',
  'message-circle': 'message',
  image: 'photo',
  paintbrush: 'brush',
}

const ENTITY_ICON_MAP = new Map(ENTITY_ICON_OPTIONS.map((icon) => [icon.id, icon]))

export function getEntityIconOption(iconId?: string): EntityIconOption | undefined {
  if (!iconId) return undefined
  const mappedId = LEGACY_ICON_ID_MAP[iconId] ?? iconId
  return ENTITY_ICON_MAP.get(mappedId)
}

export function isLegacyEmojiIcon(value?: string): boolean {
  if (!value) return false
  return /\p{Extended_Pictographic}/u.test(value)
}

export function getDefaultIconIdByLifeAreaName(name: string): string | undefined {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('health')) return 'heart'
  if (normalized.includes('career') || normalized.includes('work')) return 'briefcase'
  if (normalized.includes('finance') || normalized.includes('money')) return 'building-bank'
  if (normalized.includes('relationship')) return 'users'
  if (normalized.includes('family')) return 'home'
  if (normalized.includes('personal growth') || normalized.includes('growth')) return 'school'
  if (normalized.includes('fun') || normalized.includes('recreation')) return 'sparkles'
  if (normalized.includes('environment') || normalized.includes('home')) return 'home'
  return undefined
}
