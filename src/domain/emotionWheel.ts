// emotionWheel.ts — model "koła emocji" (promień = emocja, pierścień = natężenie 1–5).
//
// Spłaszczenie taksonomii: dawne rodziny emocji stają się WPROST emocjami
// (33 promienie, 9/8/8/8 na ćwiartkę). Rodziny różniące się tylko natężeniem
// zlano w jeden promień (np. irytacja-i-frustracja → gniew jako "Złość:
// irytacja–furia"); scalenia opisuje SPOKE_OF_FAMILY (41 → 33). Slugi promieni
// = dotychczasowe slugi rodzin, więc zapisane emotionFamilyIds pozostają
// czytelne, a promienie zapisują się w starym polu bez migracji.
//
// Natężenie jest leksykalnie podpowiadane dawnymi słowami katalogu
// (hints: ID emocji per poziom, luki dozwolone) — słowa NIE są już
// pierwszoplanową jednostką zapisu, służą jako podpowiedź poziomu skali.
//
// Odłożone do F0 (wymaga nowych słów w katalogu): promień "Podziw · Inspiracja"
// (GEW Admiration) oraz podpowiedzi Zawiedziony/Skruszony/Doceniający/Pełen podziwu.
// Spec + mockup: ideas/html-plans/2026-07-06-emotion-wheel-gew.html

import type { Quadrant } from '@/domain/emotion'
import { FAMILY_OF } from '@/domain/emotionFamily'

export type WheelIntensity = 1 | 2 | 3 | 4 | 5

/** Pojedynczy wybór na kole: promień (emocja) + opcjonalne natężenie. */
export interface EmotionSelection {
  emotionId: string // slug promienia (= dotychczasowy slug rodziny)
  intensity?: WheelIntensity // brak = zaznaczono samą emocję (dziedzic family-only)
}

export interface WheelSpoke {
  id: string // slug (stabilny, wspólny z dawnymi rodzinami)
  quadrant: Quadrant
  /** Dawne slugi rodzin wchłonięte przez ten promień (poza własnym id). */
  absorbs: string[]
  /** ID emocji-podpowiedzi dla poziomów 1..5 (null = poziom bez podpowiedzi). */
  hints: (string | null)[]
}

export const WHEEL_INTENSITY_LEVELS = 5

/**
 * Katalog promieni w kolejności wachlarza (od krawędzi "energetycznej" /
 * "wstydowej" ćwiartki — sąsiedztwa z pełnego koła zachowane).
 */
export const WHEEL_SPOKES_BY_QUADRANT: Record<Quadrant, WheelSpoke[]> = {
  'high-energy-high-pleasantness': [
    { id: 'ciekawosc-i-naped', quadrant: 'high-energy-high-pleasantness', absorbs: [], hints: ['e4m8-curious-052', null, 'ext-intrigued-147', null, 'ext-fascinated-148'] },
    { id: 'zaskoczenie-i-zachwyt', quadrant: 'high-energy-high-pleasantness', absorbs: [], hints: ['e1m7-surprised-061', null, 'e2m10-amazed-026', 'e1m12-ecstatic-001', 'e1m8-awe-049'] },
    { id: 'ekscytacja', quadrant: 'high-energy-high-pleasantness', absorbs: ['energia'], hints: ['e3m8-eager-051', 'e1m9-exhilarated-037', 'e1m10-thrilled-025', 'e1m6-hyper-073', 'e2m7-excited-062'] },
    { id: 'zaangazowanie', quadrant: 'high-energy-high-pleasantness', absorbs: [], hints: ['e5m8-focused-053', null, 'e5m11-engaged-017', null, 'ext-absorbed-149'] },
    { id: 'determinacja', quadrant: 'high-energy-high-pleasantness', absorbs: [], hints: ['e5m12-challenged-005', null, 'e4m11-motivated-016', 'e2m8-determined-050', null] },
    { id: 'pewnosc-i-mistrzostwo', quadrant: 'high-energy-high-pleasantness', absorbs: ['duma'], hints: ['ext-capable-153', 'ext-bold-152', 'e5m10-confident-029', 'e3m12-proud-003', 'e2m9-successful-038'] },
    { id: 'nadzieja-i-spelnienie', quadrant: 'high-energy-high-pleasantness', absorbs: [], hints: ['ext-expectant-156', 'e2m11-inspired-014', 'e4m12-optimistic-004', 'e6m11-hopeful-018', null] },
    { id: 'radosc', quadrant: 'high-energy-high-pleasantness', absorbs: ['rozbawienie'], hints: ['e5m7-pleasant-065', 'e4m7-cheerful-064', 'ext-amused-145', 'e3m10-joyful-027', 'e4m10-happy-028'] },
    { id: 'bliskosc', quadrant: 'high-energy-high-pleasantness', absorbs: [], hints: ['ext-attached-155', null, 'e8m12-connected-008', 'ext-affectionate-154', 'e8m11-loved-020'] },
  ],
  'high-energy-low-pleasantness': [
    { id: 'stres-i-przytloczenie', quadrant: 'high-energy-low-pleasantness', absorbs: [], hints: ['e5m6-tense-077', null, 'e2m4-stressed-098', null, 'e2m3-overwhelmed-110'] },
    { id: 'zamet', quadrant: 'high-energy-low-pleasantness', absorbs: [], hints: ['e4m6-confused-076', null, 'ext-torn-163', null, 'e1m4-shocked-097'] },
    { id: 'niepokoj-i-zmartwienie', quadrant: 'high-energy-low-pleasantness', absorbs: [], hints: ['e6m6-uneasy-078', 'e7m3-insecure-115', 'e4m4-jittery-100', 'e6m4-nervous-102', 'e6m3-worried-114'] },
    { id: 'strach-i-panika', quadrant: 'high-energy-low-pleasantness', absorbs: [], hints: [null, 'e3m2-frightened-123', null, 'e1m2-terrified-121', 'e1m3-panicked-109'] },
    { id: 'gniew', quadrant: 'high-energy-low-pleasantness', absorbs: ['irytacja-i-frustracja'], hints: ['ext-impatient-162', 'e6m5-peeved-090', 'e3m5-irritated-087', 'e4m3-angry-112', 'e2m1-livid-134'] },
    { id: 'pogarda-i-zazdrosc', quadrant: 'high-energy-low-pleasantness', absorbs: [], hints: [null, 'e4m1-jealous-136', null, 'e5m1-envious-137', null] },
    { id: 'wstret', quadrant: 'high-energy-low-pleasantness', absorbs: [], hints: ['e5m2-repulsed-125', null, 'e6m1-contempt-138', null, 'e7m1-disgusted-139'] },
    { id: 'zazenowanie-i-upokorzenie', quadrant: 'high-energy-low-pleasantness', absorbs: [], hints: ['ext-flustered-164', null, 'e5m4-embarrassed-101', null, 'e8m1-humiliated-140'] },
  ],
  'low-energy-low-pleasantness': [
    { id: 'wstyd-i-wina', quadrant: 'low-energy-low-pleasantness', absorbs: [], hints: [null, 'e8m2-ashamed-128', 'e10m1-guilty-142', 'ext-regretful-171', null] },
    { id: 'smutek-i-zal', quadrant: 'low-energy-low-pleasantness', absorbs: ['przygnebienie'], hints: ['e7m5-down-091', 'e12m3-glum-120', 'e9m5-sad-093', 'e11m1-depressed-143', 'ext-devastated-167'] },
    { id: 'beznadzieja-i-rozpacz', quadrant: 'low-energy-low-pleasantness', absorbs: [], hints: ['e9m1-pessimistic-141', 'e12m6-helpless-084', 'e9m2-vulnerable-129', 'e11m2-hopeless-131', 'e12m2-despair-132'] },
    { id: 'zwatpienie-i-rozczarowanie', quadrant: 'low-energy-low-pleasantness', absorbs: [], hints: ['e10m5-discouraged-094', null, null, 'e8m4-disappointed-104', 'ext-resigned-168'] },
    { id: 'samotnosc-i-wykluczenie', quadrant: 'low-energy-low-pleasantness', absorbs: [], hints: ['e11m5-lonely-095', null, 'e9m4-forlorn-105', 'e11m3-alienated-119', 'e10m3-excluded-118'] },
    { id: 'tesknota', quadrant: 'low-energy-low-pleasantness', absorbs: [], hints: ['e11m4-nostalgic-107', null, 'ext-longing-170', null, null] },
    { id: 'zmeczenie-i-wypalenie', quadrant: 'low-energy-low-pleasantness', absorbs: [], hints: ['e8m6-tired-080', null, 'e12m5-exhausted-096', null, 'e12m4-burned-out-108'] },
    { id: 'apatia-i-znudzenie', quadrant: 'low-energy-low-pleasantness', absorbs: ['pustka'], hints: ['e8m5-meh-092', 'e7m6-bored-079', 'e11m6-apathetic-083', 'e10m2-numb-130', 'ext-empty-169'] },
  ],
  'low-energy-high-pleasantness': [
    { id: 'zaduma', quadrant: 'low-energy-high-pleasantness', absorbs: [], hints: ['e8m8-thoughtful-056', null, 'ext-reflective-160', null, 'e6m10-wishful-030'] },
    { id: 'spokoj-i-wyciszenie', quadrant: 'low-energy-high-pleasantness', absorbs: ['bezpieczenstwo'], hints: ['e11m9-balanced-047', 'e7m7-calm-067', 'e11m8-peaceful-059', 'e12m8-tranquil-060', null] },
    { id: 'odprezenie-i-swoboda', quadrant: 'low-energy-high-pleasantness', absorbs: [], hints: ['e7m8-at-ease-055', 'e9m8-chill-057', 'e9m7-relaxed-069', 'e12m7-carefree-072', 'e12m10-relieved-036'] },
    { id: 'zadowolenie-i-komfort', quadrant: 'low-energy-high-pleasantness', absorbs: [], hints: ['e8m7-good-068', 'e10m8-comfortable-058', 'e6m7-pleased-066', 'e12m11-satisfied-024', 'e7m12-blissful-007'] },
    { id: 'wdziecznosc', quadrant: 'low-energy-high-pleasantness', absorbs: [], hints: ['e12m9-thankful-048', null, 'e9m12-grateful-009', 'e10m12-moved-010', null] },
    { id: 'przynaleznosc-i-akceptacja', quadrant: 'low-energy-high-pleasantness', absorbs: [], hints: ['e10m11-accepted-022', 'e9m10-included-033', 'e8m10-supported-032', 'e7m9-understood-043', null] },
    { id: 'uznanie-i-szacunek', quadrant: 'low-energy-high-pleasantness', absorbs: [], hints: ['e9m11-valued-021', null, 'e8m9-appreciated-044', null, 'e7m10-respected-031'] },
    { id: 'czulosc', quadrant: 'low-energy-high-pleasantness', absorbs: ['troska-i-empatia'], hints: ['ext-warmhearted-157', 'e10m7-sympathetic-070', 'e9m9-compassionate-045', 'e10m9-empathetic-046', 'ext-tender-158'] },
  ],
}

export const WHEEL_SPOKES: WheelSpoke[] = Object.values(WHEEL_SPOKES_BY_QUADRANT).flat()

const SPOKE_BY_ID: Record<string, WheelSpoke> = Object.fromEntries(
  WHEEL_SPOKES.map((s) => [s.id, s]),
)

/** Dawny slug rodziny → slug promienia (identyczność + 8 wchłonięć). */
export const SPOKE_OF_FAMILY: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const spoke of WHEEL_SPOKES) {
    map[spoke.id] = spoke.id
    for (const absorbed of spoke.absorbs) map[absorbed] = spoke.id
  }
  return map
})()

/** (ID emocji-podpowiedzi) → { spoke, intensity } — do adaptera historii. */
const HINT_INDEX: Record<string, { spokeId: string; intensity: WheelIntensity }> = (() => {
  const map: Record<string, { spokeId: string; intensity: WheelIntensity }> = {}
  for (const spoke of WHEEL_SPOKES) {
    spoke.hints.forEach((hint, i) => {
      if (hint) map[hint] = { spokeId: spoke.id, intensity: (i + 1) as WheelIntensity }
    })
  }
  return map
})()

export function getSpoke(id: string): WheelSpoke | undefined {
  return SPOKE_BY_ID[id]
}

/** Slug promienia dla dawnego slugu rodziny (lub przekazany slug, jeśli już jest promieniem). */
export function resolveSpokeId(familyOrSpokeId: string): string | undefined {
  return SPOKE_OF_FAMILY[familyOrSpokeId]
}

/**
 * Adapter odczytu historii: stare pola (emotionIds = słowa, emotionFamilyIds =
 * rodziny) → wybory koła. Słowo będące podpowiedzią dostaje jej poziom;
 * pozostałe słowa mapują się przez FAMILY_OF na promień bez natężenia.
 * Nieznane ID są pomijane. Duplikaty per promień: wygrywa wpis z natężeniem
 * (najwyższym).
 */
export function legacyToSelections(input: {
  emotions?: EmotionSelection[]
  emotionIds?: string[]
  emotionFamilyIds?: string[]
}): EmotionSelection[] {
  if (input.emotions && input.emotions.length > 0) {
    return input.emotions
      .filter((s) => SPOKE_BY_ID[s.emotionId])
      .map((s) => ({ ...s }))
  }
  const bySpoke = new Map<string, EmotionSelection>()
  const add = (sel: EmotionSelection) => {
    const existing = bySpoke.get(sel.emotionId)
    if (!existing || (sel.intensity ?? 0) > (existing.intensity ?? 0)) {
      bySpoke.set(sel.emotionId, sel)
    }
  }
  for (const wordId of input.emotionIds ?? []) {
    const hint = HINT_INDEX[wordId]
    if (hint) {
      add({ emotionId: hint.spokeId, intensity: hint.intensity })
      continue
    }
    const family = FAMILY_OF[wordId]
    const spokeId = family ? SPOKE_OF_FAMILY[family] : undefined
    if (spokeId) add({ emotionId: spokeId })
  }
  for (const familyId of input.emotionFamilyIds ?? []) {
    const spokeId = SPOKE_OF_FAMILY[familyId]
    if (spokeId && !bySpoke.has(spokeId)) add({ emotionId: spokeId })
  }
  return [...bySpoke.values()]
}

/**
 * Mostek zapisu wstecz: promienie → emotionFamilyIds (slugi są wspólne),
 * dzięki czemu historia/rollupy/chipy rodzin działają bez zmian.
 */
export function selectionsToLegacyFamilyIds(selections: EmotionSelection[]): string[] {
  return [...new Set(selections.map((s) => s.emotionId))]
}
