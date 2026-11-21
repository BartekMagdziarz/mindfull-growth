import catalog from '@product/data/valueCatalog.json'

export const categories = [
  { id: 'mostImportant', label: 'Najważniejsze' },
  { id: 'veryImportant', label: 'Bardzo ważne' },
  { id: 'important', label: 'Ważne' },
  { id: 'somewhatImportant', label: 'Trochę ważne' },
  { id: 'notImportant', label: 'Nieważne' },
] as const

export type CategoryId = typeof categories[number]['id']
export type Destination = CategoryId | 'queue'
export type SortPreset = 'start' | 'mid' | 'end'
export interface ValueCard {
  id: string
  label: string
  description: string
}

export const valueCards: ValueCard[] = catalog.values.map(value => ({
  id: value.id,
  label: value.label.pl,
  description: value.description.pl,
}))

const distributions = {
  mid: [2, 8, 29, 12, 3],
  end: [3, 10, 48, 25, 5],
}

export function assignmentsFor(preset: SortPreset): Partial<Record<string, CategoryId>> {
  if (preset === 'start') return {}
  const assignments: Partial<Record<string, CategoryId>> = {}
  let offset = 0
  categories.forEach(({ id }, index) => {
    const end = offset + distributions[preset][index]
    for (const card of valueCards.slice(offset, end)) assignments[card.id] = id
    offset = end
  })
  return assignments
}
