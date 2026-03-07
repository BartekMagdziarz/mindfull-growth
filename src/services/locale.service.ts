export const LOCALE_IDS = ['en', 'pl'] as const

export type LocaleId = (typeof LOCALE_IDS)[number]

export const DEFAULT_LOCALE_ID: LocaleId = 'en'

function isLocaleId(value: string): value is LocaleId {
  return LOCALE_IDS.includes(value as LocaleId)
}

export function normalizeLocaleId(value: string | null | undefined): LocaleId {
  if (!value) return DEFAULT_LOCALE_ID
  return isLocaleId(value) ? value : DEFAULT_LOCALE_ID
}
