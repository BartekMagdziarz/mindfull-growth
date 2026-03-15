import { MATERIAL_SYMBOLS } from '@/constants/materialSymbolsIcons'

export function searchSymbols(query: string): string[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  // Split on _ so "fitness" matches "fitness_center", "center" also matches it
  return MATERIAL_SYMBOLS.filter((name) => name.includes(q) || name.replace(/_/g, ' ').includes(q))
}

export const totalSymbolCount = MATERIAL_SYMBOLS.length
