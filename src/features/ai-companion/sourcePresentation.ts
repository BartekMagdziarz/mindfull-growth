import type { ContentBlock } from '@/services/ai/history/contracts'
const labels: Record<string, string> = {
  wentWell: 'Co poszło dobrze',
  challenges: 'Co było trudne',
  lessons: 'Lekcje i spostrzeżenia',
  proudOf: 'Powody do dumy',
  growth: 'Rozwój i nauka',
  note: 'Notatka',
  notes: 'Notatki',
  body: 'Treść wpisu',
  title: 'Tytuł',
  description: 'Opis',
  freeformReflection: 'Refleksja',
  promptResponses: 'Odpowiedzi w refleksji',
  situation: 'Sytuacja',
  automaticThoughts: 'Myśli automatyczne',
  evidenceFor: 'Dowody za',
  evidenceAgainst: 'Dowody przeciw',
  balancedThought: 'Zrównoważona myśl',
  moodRating: 'Samopoczucie',
  energyRating: 'Energia',
  calmRating: 'Radzenie sobie z zadaniami',
  connectionRating: 'Bliskość',
  physicalIntensityRating: 'Ciało — wymagania',
  emotionalIntensityRating: 'Emocje — wymagania',
  taskLoadRating: 'Zadania — obciążenie',
  closeOnesNeedsRating: 'Bliscy — potrzeby',
  physicalCareRating: 'Troska o ciało',
  emotionalProcessingRating: 'Zajmowanie się emocjami',
  productivityRating: 'Działanie w sprawach',
  closeOnesSupportRating: 'Wsparcie bliskich',
  balanceRating: 'Balans',
  purposeRating: 'Sens',
  growthRating: 'Rozwój',
  coherenceRating: 'Spójność',
  agencyRating: 'Sprawczość',
  value: 'Zapisana wartość',
  letter: 'List',
  target: 'Cel pomiaru',
  cadence: 'Rytm',
  activityState: 'Stan planu',
  status: 'Status',
}
const technical = (key: string) =>
  /(?:Id|Ids|Ref|At)$/.test(key) ||
  ['id', 'schemaVersion', 'version', 'aiSummary', 'emotions'].includes(key)
const opaque = (value: string) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value)
function readable(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string')
    return opaque(value)
      ? ''
      : ((
          {
            weekly: 'Co tydzień',
            monthly: 'Co miesiąc',
            active: 'Aktywny',
            paused: 'Wstrzymany',
          } as Record<string, string>
        )[value] ?? value)
  if (Array.isArray(value)) return value.map(readable).filter(Boolean).join('\n')
  if (typeof value === 'object')
    return Object.entries(value)
      .filter(([k]) => !technical(k))
      .map(([k, v]) => {
        const text = readable(v)
        return text ? `${labels[k] ?? 'Odpowiedź'}: ${text}` : ''
      })
      .filter(Boolean)
      .join('\n')
  return String(value)
}
export function readableSourceBlocks(blocks: ContentBlock[]) {
  return blocks
    .filter(b => !technical(b.label))
    .flatMap(b => {
      let value: unknown = b.text
      try {
        value = JSON.parse(b.text)
      } catch {
        /* Plain user prose. */
      }
      const text = readable(value)
      if (!text) return []
      return [
        {
          label: b.author === 'assistant' ? 'Wypowiedź AI' : (labels[b.label] ?? 'Treść zapisu'),
          text: /Rating$/.test(b.label) ? `${text} / 5` : text,
        },
      ]
    })
}

export function readableSourceTitle(source: { title: string; ref: { collection: string } }) {
  return source.title === source.ref.collection
    ? ((
        {
          emotionLogs: 'Log emocji',
          journalEntries: 'Wpis Dziennika',
          thoughtRecords: 'Zapis myśli',
          weeklyReflections: 'Refleksja tygodniowa',
          monthlyReflections: 'Refleksja miesięczna',
          dailyMeasurementEntries: 'Zapis realizacji',
        } as Record<string, string>
      )[source.ref.collection] ?? 'Zapis z historii')
    : source.title
}
