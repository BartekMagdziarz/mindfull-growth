import {
  HistoryToolError,
  LIMITS,
  SOURCE_COLLECTIONS,
  SOURCE_KINDS,
  type HistoryFilter,
  type SourceRef,
} from './contracts'
import { validateRef } from './access'
export const invalid = (message: string): never => {
  throw new HistoryToolError('invalid-input', message)
}
export function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    return invalid(`Expected integer ${min}–${max}`)
  return value
}
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLocaleLowerCase('pl')
}
export function dayInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function validDay(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function instant(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !validDay(value.slice(0, 10)) ||
    !Number.isFinite(Date.parse(value))
  )
    return invalid('Expected an ISO timestamp with timezone')
  return new Date(value).toISOString()
}
export function inRange(iso: string, filter: HistoryFilter, timeZone: string): boolean {
  const lower = filter.from
  const upper = filter.to
  return (
    (!lower || (validDay(lower) ? dayInZone(iso, timeZone) >= lower : iso >= instant(lower))) &&
    (!upper || (validDay(upper) ? dayInZone(iso, timeZone) <= upper : iso <= instant(upper)))
  )
}
export function validateFilter(filter: HistoryFilter): void {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter))
    invalid('Expected a filter object')
  for (const bound of [filter.from, filter.to])
    if (bound !== undefined && !(typeof bound === 'string' && validDay(bound))) instant(bound)
  if (
    filter.from &&
    filter.to &&
    validDay(filter.from) === validDay(filter.to) &&
    (validDay(filter.from) ? filter.from > filter.to : instant(filter.from) > instant(filter.to))
  )
    invalid('from must not follow to')
  for (const key of [
    'kinds',
    'collections',
    'contextTagIds',
    'peopleTagIds',
    'emotionIds',
    'emotionFamilyIds',
  ] as const) {
    const values = filter[key]
    if (values === undefined) continue
    if (
      !Array.isArray(values) ||
      !values.length ||
      values.length > LIMITS.filterValues ||
      !values.every(v => typeof v === 'string' && v.length > 0 && v.length <= 256)
    )
      invalid(`Invalid ${key}`)
  }
  if (filter.kinds?.some(k => !SOURCE_KINDS.includes(k))) invalid('Unknown source kind')
  if (filter.collections?.some(c => !Object.hasOwn(SOURCE_COLLECTIONS, c)))
    invalid('Unknown source collection')
  if (filter.relatedRefs !== undefined) {
    if (
      !Array.isArray(filter.relatedRefs) ||
      !filter.relatedRefs.length ||
      filter.relatedRefs.length > LIMITS.filterValues
    )
      invalid('Invalid relatedRefs')
    filter.relatedRefs.forEach(validateRef)
  }
}
/** Fingerprint for invalidation, not a cryptographic authenticator or secret. */
export function fingerprint(text: string): string {
  let a = 2166136261,
    b = 5381
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619)
    b = Math.imul(b, 33) ^ text.charCodeAt(i)
  }
  return `${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}`
}
export const refEquals = (a: SourceRef, b: SourceRef) =>
  a.collection === b.collection && a.id === b.id
