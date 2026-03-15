export interface EntityIconOption {
  id: string
  label: string
  materialIcon: string
  search: string
}

function toLabel(id: string): string {
  return id
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function createOption(
  id: string,
  materialIcon: string,
  label: string,
  search: string[] = [],
): EntityIconOption {
  return {
    id,
    label,
    materialIcon,
    search: [id, label.toLowerCase(), materialIcon, ...search].join(' ').toLowerCase(),
  }
}

export const ENTITY_ICON_OPTIONS: EntityIconOption[] = [
  createOption('heart', 'favorite', 'Heart', ['health', 'care', 'wellbeing']),
  createOption('briefcase', 'work', 'Briefcase', ['career', 'work', 'job']),
  createOption('building-bank', 'account_balance', 'Bank', ['finance', 'money', 'bank']),
  createOption('users', 'group', 'Users', ['relationships', 'family', 'community']),
  createOption('home', 'home', 'Home', ['house', 'environment']),
  createOption('school', 'school', 'School', ['learning', 'growth', 'study']),
  createOption('sparkles', 'auto_awesome', 'Sparkles', ['joy', 'fun', 'magic']),
  createOption('palette', 'palette', 'Palette', ['art', 'creative', 'design']),
  createOption('bulb', 'lightbulb', 'Bulb', ['ideas', 'thinking', 'insight']),
  createOption('sun', 'wb_sunny', 'Sun', ['energy', 'day', 'light']),
  createOption('moon', 'dark_mode', 'Moon', ['rest', 'sleep', 'night']),
  createOption('star', 'star', 'Star', ['favorite', 'north star']),
  createOption('target', 'gps_fixed', 'Target', ['focus', 'goal', 'aim']),
  createOption('leaf', 'eco', 'Leaf', ['nature', 'green', 'calm']),
  createOption('barbell', 'fitness_center', 'Barbell', ['fitness', 'strength', 'gym']),
  createOption('run', 'directions_run', 'Run', ['movement', 'cardio', 'exercise']),
  createOption('book', 'menu_book', 'Book', ['reading', 'knowledge']),
  createOption('brain', 'psychology', 'Brain', ['mind', 'mental', 'clarity']),
  createOption('music', 'music_note', 'Music', ['song', 'sound', 'audio']),
  createOption('plane', 'flight', 'Plane', ['travel', 'trip', 'vacation']),
  createOption('car', 'directions_car', 'Car', ['drive', 'commute', 'transport']),
  createOption('bike', 'pedal_bike', 'Bike', ['cycling', 'ride']),
  createOption('map', 'map', 'Map', ['direction', 'path', 'explore']),
  createOption('camera', 'photo_camera', 'Camera', ['photo', 'memory']),
  createOption('chart-bar', 'bar_chart', 'Bar Chart', ['metrics', 'progress', 'analytics']),
  createOption('chart-pie', 'pie_chart', 'Pie Chart', ['balance', 'distribution']),
  createOption('coins', 'paid', 'Coins', ['cash', 'savings']),
  createOption('pig-money', 'savings', 'Savings', ['budget', 'save']),
  createOption('shirt', 'checkroom', 'Shirt', ['style', 'appearance']),
  createOption('forklift', 'forklift', 'Forklift', ['workshop', 'operations']),
  createOption('tools-kitchen-2', 'kitchen', 'Kitchen', ['food', 'cooking', 'kitchen']),
  createOption('coffee', 'coffee', 'Coffee', ['break', 'ritual', 'cafe']),
  createOption('bed', 'bed', 'Bed', ['sleep', 'recovery']),
  createOption('device-laptop', 'laptop', 'Laptop', ['computer', 'tech']),
  createOption('device-mobile', 'smartphone', 'Mobile', ['phone', 'mobile']),
  createOption('message', 'chat', 'Message', ['chat', 'speak']),
  createOption('messages', 'forum', 'Messages', ['conversation', 'social']),
  createOption('pencil', 'edit', 'Pencil', ['write', 'journal', 'edit']),
  createOption('check', 'check', 'Check', ['done', 'complete']),
  createOption('clock', 'schedule', 'Clock', ['time', 'schedule']),
  createOption('flame', 'local_fire_department', 'Flame', ['fire', 'passion', 'energy']),
  createOption('tree', 'park', 'Tree', ['forest', 'roots', 'grounded']),
  createOption('flower', 'local_florist', 'Flower', ['beauty', 'garden']),
  createOption('balloon', 'celebration', 'Balloon', ['celebrate', 'play']),
  createOption('scale', 'balance', 'Scale', ['balance', 'justice']),
  createOption('shield', 'shield', 'Shield', ['safety', 'protection']),
  createOption('trophy', 'emoji_events', 'Trophy', ['win', 'achievement']),
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
