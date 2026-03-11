import type { Component } from 'vue'
import {
  IconBalloon,
  IconBarbell,
  IconBed,
  IconBike,
  IconBook,
  IconBrain,
  IconBriefcase,
  IconBuildingBank,
  IconBulb,
  IconCamera,
  IconCar,
  IconChartBar,
  IconChartPie,
  IconCheck,
  IconClock,
  IconCoffee,
  IconCoins,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconFlame,
  IconFlower,
  IconForklift,
  IconHeart,
  IconHome,
  IconLeaf,
  IconMap,
  IconMessage,
  IconMessages,
  IconMoon,
  IconMusic,
  IconPalette,
  IconPencil,
  IconPigMoney,
  IconPlane,
  IconRun,
  IconScale,
  IconSchool,
  IconShield,
  IconShirt,
  IconSparkles,
  IconStar,
  IconSun,
  IconTarget,
  IconToolsKitchen2,
  IconTree,
  IconTrophy,
  IconUsers,
  type Icon,
} from '@tabler/icons-vue'

export interface EntityIconOption {
  id: string
  label: string
  component: Component
  search: string
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

function createOption(
  id: string,
  component: Icon,
  search: string[] = [],
): EntityIconOption {
  const label = toLabel(component.name)
  return {
    id,
    label,
    component: component as Component,
    search: [id, label.toLowerCase(), ...search].join(' ').toLowerCase(),
  }
}

export const ENTITY_ICON_OPTIONS: EntityIconOption[] = [
  createOption('heart', IconHeart, ['health', 'care', 'wellbeing']),
  createOption('briefcase', IconBriefcase, ['career', 'work', 'job']),
  createOption('building-bank', IconBuildingBank, ['finance', 'money', 'bank']),
  createOption('users', IconUsers, ['relationships', 'family', 'community']),
  createOption('home', IconHome, ['house', 'environment']),
  createOption('school', IconSchool, ['learning', 'growth', 'study']),
  createOption('sparkles', IconSparkles, ['joy', 'fun', 'magic']),
  createOption('palette', IconPalette, ['art', 'creative', 'design']),
  createOption('bulb', IconBulb, ['ideas', 'thinking', 'insight']),
  createOption('sun', IconSun, ['energy', 'day', 'light']),
  createOption('moon', IconMoon, ['rest', 'sleep', 'night']),
  createOption('star', IconStar, ['favorite', 'north star']),
  createOption('target', IconTarget, ['focus', 'goal', 'aim']),
  createOption('leaf', IconLeaf, ['nature', 'green', 'calm']),
  createOption('barbell', IconBarbell, ['fitness', 'strength', 'gym']),
  createOption('run', IconRun, ['movement', 'cardio', 'exercise']),
  createOption('book', IconBook, ['reading', 'knowledge']),
  createOption('brain', IconBrain, ['mind', 'mental', 'clarity']),
  createOption('music', IconMusic, ['song', 'sound', 'audio']),
  createOption('plane', IconPlane, ['travel', 'trip', 'vacation']),
  createOption('car', IconCar, ['drive', 'commute', 'transport']),
  createOption('bike', IconBike, ['cycling', 'ride']),
  createOption('map', IconMap, ['direction', 'path', 'explore']),
  createOption('camera', IconCamera, ['photo', 'memory']),
  createOption('chart-bar', IconChartBar, ['metrics', 'progress', 'analytics']),
  createOption('chart-pie', IconChartPie, ['balance', 'distribution']),
  createOption('coins', IconCoins, ['cash', 'savings']),
  createOption('pig-money', IconPigMoney, ['budget', 'save']),
  createOption('shirt', IconShirt, ['style', 'appearance']),
  createOption('forklift', IconForklift, ['workshop', 'operations']),
  createOption('tools-kitchen-2', IconToolsKitchen2, ['food', 'cooking', 'kitchen']),
  createOption('coffee', IconCoffee, ['break', 'ritual', 'cafe']),
  createOption('bed', IconBed, ['sleep', 'recovery']),
  createOption('device-laptop', IconDeviceLaptop, ['computer', 'tech']),
  createOption('device-mobile', IconDeviceMobile, ['phone', 'mobile']),
  createOption('message', IconMessage, ['chat', 'speak']),
  createOption('messages', IconMessages, ['conversation', 'social']),
  createOption('pencil', IconPencil, ['write', 'journal', 'edit']),
  createOption('check', IconCheck, ['done', 'complete']),
  createOption('clock', IconClock, ['time', 'schedule']),
  createOption('flame', IconFlame, ['fire', 'passion', 'energy']),
  createOption('tree', IconTree, ['forest', 'roots', 'grounded']),
  createOption('flower', IconFlower, ['beauty', 'garden']),
  createOption('balloon', IconBalloon, ['celebrate', 'play']),
  createOption('scale', IconScale, ['balance', 'justice']),
  createOption('shield', IconShield, ['safety', 'protection']),
  createOption('trophy', IconTrophy, ['win', 'achievement']),
]

const LEGACY_ICON_ID_MAP: Record<string, string> = {
  airplane: 'plane',
  bank: 'building-bank',
  cap: 'school',
  card: 'coins',
  cart: 'forklift',
  chart: 'chart-bar',
  chat: 'message',
  fire: 'flame',
  'home-modern': 'home',
  office: 'briefcase',
  paint: 'palette',
  photo: 'camera',
  pie: 'chart-pie',
  swatch: 'palette',
  tools: 'tools-kitchen-2',
  landmark: 'building-bank',
  'graduation-cap': 'school',
  house: 'home',
  'message-circle': 'message',
  image: 'camera',
  paintbrush: 'palette',
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
