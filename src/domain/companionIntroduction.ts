import type { Citation } from '@/services/ai/companion/runtime'
export const INTRO_AREAS = [
  'identity',
  'values',
  'relationships',
  'strengths',
  'priorities',
  'currentContext',
  'preferences',
] as const
export type IntroArea = (typeof INTRO_AREAS)[number]
export const INTRO_LABELS: Record<IntroArea, string> = {
  identity: 'O Tobie',
  values: 'Wartości',
  relationships: 'Relacje',
  strengths: 'To, co pomaga',
  priorities: 'Kierunek i priorytety',
  currentContext: 'Obecna sytuacja',
  preferences: 'Wsparcie AI',
}
export const INTRO_QUESTIONS: Record<IntroArea, string> = {
  identity:
    'Na początek: jak chcesz się przedstawić? Opowiedz o rolach, zajęciach lub rzeczach, które są dla Ciebie ważną częścią życia.',
  values: 'Co cenisz i chcesz pielęgnować w swoim życiu?',
  relationships: 'Jaką rolę odgrywają teraz w Twoim życiu relacje i bliskie osoby?',
  strengths:
    'Co ostatnio działa dobrze? Co daje Ci radość, siłę lub pomaga w trudniejszych momentach?',
  priorities: 'W jakim kierunku chcesz zmierzać? Co jest dla Ciebie ważne w dłuższej perspektywie?',
  currentContext:
    'Co warto wiedzieć o Twojej obecnej sytuacji — zarówno o dobrych rzeczach, jak i o obciążeniach?',
  preferences: 'Jak chcesz korzystać z mojego wsparcia, a czego wolisz unikać?',
}
export interface CompanionIntroduction {
  id: string
  historyAccessRevision?: string
  profileEvidence?: Array<{ id: string; version: number }>
  revision: number
  status: 'active' | 'paused' | 'complete'
  area: IntroArea
  coverage: Partial<Record<IntroArea, 'answered' | 'skipped'>>
  exercises: Citation[]
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'notice'
    text: string
    createdAt: string
    area: IntroArea
  }>
  draft: string
  contextFingerprint?: string
  createdAt: string
  updatedAt: string
}
