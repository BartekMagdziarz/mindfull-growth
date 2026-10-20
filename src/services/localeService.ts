export const LOCALE_IDS = ['en', 'pl'] as const

export type LocaleId = (typeof LOCALE_IDS)[number]

export const DEFAULT_LOCALE_ID: LocaleId = 'pl'

function isLocaleId(value: string): value is LocaleId {
  return LOCALE_IDS.includes(value as LocaleId)
}

export function normalizeLocaleId(value: string | null | undefined): LocaleId {
  if (!value) return DEFAULT_LOCALE_ID
  return isLocaleId(value) ? value : DEFAULT_LOCALE_ID
}

export const GRAMMATICAL_GENDERS = ['masculine', 'feminine'] as const

export type GrammaticalGender = (typeof GRAMMATICAL_GENDERS)[number]

export const DEFAULT_GENDER: GrammaticalGender = 'masculine'

function isGrammaticalGender(value: string): value is GrammaticalGender {
  return GRAMMATICAL_GENDERS.includes(value as GrammaticalGender)
}

export function normalizeGender(value: string | null | undefined): GrammaticalGender {
  if (!value) return DEFAULT_GENDER
  return isGrammaticalGender(value) ? value : DEFAULT_GENDER
}
