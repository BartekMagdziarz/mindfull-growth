import type { ObjectsLibraryLabel } from '@/services/objectsLibraryQueries'

export function resolveObjectsLibraryLabel(
  label: ObjectsLibraryLabel,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return typeof label === 'string' ? label : t(label.key, label.params)
}
