// emotionGroups.ts — taksonomia v2 „grupy + suwak” (45 grup; 12/11/12/10 na ćwiartkę).
//
// Zastąpiła model promieni z drabinkami podpowiedzi: słowa katalogu są PRZYKŁADAMI
// jakości grupy, bez przypisanego natężenia — natężenie 1–5 wybiera użytkownik
// suwakiem. Zapis wyboru pozostaje w kształcie { emotionId, intensity? }, gdzie
// emotionId = slug grupy; mostek emotionFamilyIds działa dalej (grupy SĄ warstwą
// „rodzin” — patrz emotionFamily.ts, generowany z tych samych danych).
//
// Spadkobiercy historii (stare wpisy family-only): energia→ekscytacja,
// przygnebienie→smutek-i-zal, bezpieczenstwo→spokoj-i-wyciszenie,
// zazenowanie-i-upokorzenie→wstyd-i-wina. Stare wpisy-słowa odzyskują natężenie
// z LEGACY_WORD_INTENSITY (dawne drabinki koła v1 — wyłącznie do odczytu),
// a grupę z GROUP_OF_WORD (przenosiny słów v2 uwzględnione, np. Urażony→zranienie;
// usunięty z katalogu Produktywny mapowany jest tu nadal — dla starych wpisów).
//
// Nazwy i appraisale grup: locales/{pl,en}/emotionGroups.json. Ikony: Material
// Symbols. Twarze grup: src/assets/emotion-faces/<slug>.svg (CSS mask w pickerze).
// Źródło danych: ideas/design/emotion-picker-v3/handoff/emotion-data.js (design 6c).

import type { Quadrant } from '@/domain/emotion'

export type GroupIntensity = 1 | 2 | 3 | 4 | 5

/** Pojedynczy wybór: grupa + opcjonalne natężenie (brak = zaznaczona sama grupa). */
export interface EmotionGroupSelection {
  emotionId: string // slug grupy
  intensity?: GroupIntensity
}

export interface EmotionGroup {
  slug: string
  quadrant: Quadrant
  /** Grupa nowa w taksonomii v2 (kropka „nowe” na kaflu pickera). */
  isNew: boolean
  /** Ikona Material Symbols Rounded. */
  icon: string
  /** Słowa katalogu należące do grupy (kolejność z designu; bez natężeń). */
  wordIds: string[]
  /** Dwa słowa-wizytówki kafla (ID — nazwy lokalizowane przez emotions.<id>.name). */
  auxIds: string[]
}

export interface QuadrantStyle {
  id: Quadrant
  icon: string
  top: string
  bottom: string
  accent: string
  text: string
}

export const GROUP_INTENSITY_LEVELS = 5

export const GROUPS_BY_QUADRANT: Record<Quadrant, EmotionGroup[]> = {
  'high-energy-high-pleasantness': [
    { slug: 'radosc', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'sentiment_very_satisfied',
      wordIds: ['e5m7-pleasant-065', 'e4m7-cheerful-064', 'e6m9-delighted-042', 'e3m10-joyful-027', 'e4m10-happy-028', 'e1m11-elated-013'],
      auxIds: ['e5m7-pleasant-065', 'e4m10-happy-028'] },
    { slug: 'rozbawienie', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'mood',
      wordIds: ['e6m8-playful-054', 'ext-amused-145', 'ext-giddy-146'],
      auxIds: ['e6m8-playful-054', 'ext-giddy-146'] },
    { slug: 'ekscytacja', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'celebration',
      wordIds: ['e1m10-thrilled-025', 'e2m7-excited-062', 'e3m8-eager-051', 'e3m9-enthusiastic-039', 'e3m7-energized-063', 'e4m9-upbeat-040', 'e1m6-hyper-073', 'e5m9-alive-041', 'e1m9-exhilarated-037'],
      auxIds: ['e1m9-exhilarated-037', 'e1m6-hyper-073'] },
    { slug: 'ciekawosc-i-naped', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'travel_explore',
      wordIds: ['e4m8-curious-052', 'ext-intrigued-147', 'ext-fascinated-148'],
      auxIds: ['ext-intrigued-147', 'ext-fascinated-148'] },
    { slug: 'zaangazowanie', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'target',
      wordIds: ['e5m8-focused-053', 'e5m11-engaged-017', 'ext-absorbed-149'],
      auxIds: ['e5m8-focused-053', 'ext-absorbed-149'] },
    { slug: 'determinacja', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'rocket_launch',
      wordIds: ['e5m12-challenged-005', 'e4m11-motivated-016', 'ext-resolute-150', 'ext-ambitious-151', 'e2m8-determined-050'],
      auxIds: ['ext-resolute-150', 'ext-ambitious-151'] },
    { slug: 'pewnosc-i-mistrzostwo', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'verified',
      wordIds: ['ext-capable-153', 'e5m10-confident-029', 'ext-bold-152', 'e2m12-empowered-002', 'e6m12-accomplished-006'],
      auxIds: ['ext-capable-153', 'ext-bold-152'] },
    { slug: 'duma', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'trophy',
      wordIds: ['e3m12-proud-003', 'e2m9-successful-038', 'e7m11-fulfilled-019'],
      auxIds: ['e7m11-fulfilled-019', 'e2m9-successful-038'] },
    { slug: 'nadzieja-i-spelnienie', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'wb_twilight',
      wordIds: ['e4m12-optimistic-004', 'e6m11-hopeful-018', 'ext-expectant-156'],
      auxIds: ['ext-expectant-156', 'e4m12-optimistic-004'] },
    { slug: 'zaskoczenie-i-zachwyt', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'stars',
      wordIds: ['ext-astonished-172', 'e1m7-surprised-061', 'e2m10-amazed-026'],
      auxIds: ['ext-astonished-172', 'e2m10-amazed-026'] },
    { slug: 'bliskosc', quadrant: 'high-energy-high-pleasantness', isNew: false, icon: 'favorite',
      wordIds: ['e8m11-loved-020', 'e8m12-connected-008', 'ext-attached-155', 'ext-loving-173', 'ext-inlove-174'],
      auxIds: ['e8m12-connected-008', 'ext-inlove-174'] },
    { slug: 'podziw', quadrant: 'high-energy-high-pleasantness', isNew: true, icon: 'auto_awesome',
      wordIds: ['e2m11-inspired-014', 'e1m8-awe-049', 'e1m12-ecstatic-001', 'ext-admiring-175'],
      auxIds: ['e2m11-inspired-014', 'e1m8-awe-049'] },
  ],
  'high-energy-low-pleasantness': [
    { slug: 'stres-i-przytloczenie', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'compress',
      wordIds: ['e5m6-tense-077', 'e2m4-stressed-098', 'e2m3-overwhelmed-110', 'e2m6-pressured-074'],
      auxIds: ['e5m6-tense-077', 'e2m3-overwhelmed-110'] },
    { slug: 'szok', quadrant: 'high-energy-low-pleasantness', isNew: true, icon: 'flash_on',
      wordIds: ['ext-dazed-180', 'e1m4-shocked-097', 'ext-stunned-181', 'ext-dumbfounded-182'],
      auxIds: ['e1m4-shocked-097', 'ext-dumbfounded-182'] },
    { slug: 'zamet', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'sync_problem',
      wordIds: ['e4m6-confused-076', 'ext-torn-163', 'e8m3-lost-116'],
      auxIds: ['ext-torn-163', 'e8m3-lost-116'] },
    { slug: 'niepokoj-i-zmartwienie', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'sentiment_stressed',
      wordIds: ['e6m6-uneasy-078', 'e7m3-insecure-115', 'e6m3-worried-114', 'e6m4-nervous-102', 'e4m4-jittery-100', 'e4m5-fomo-088'],
      auxIds: ['e6m6-uneasy-078', 'e6m4-nervous-102'] },
    { slug: 'strach-i-panika', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'crisis_alert',
      wordIds: ['e3m2-frightened-123', 'e1m2-terrified-121', 'e1m3-panicked-109', 'ext-apprehensive-183'],
      auxIds: ['ext-apprehensive-183', 'e1m2-terrified-121'] },
    { slug: 'irytacja-i-frustracja', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'sentiment_extremely_dissatisfied',
      wordIds: ['e6m5-peeved-090', 'ext-impatient-162', 'e3m5-irritated-087', 'e5m3-frustrated-113'],
      auxIds: ['e3m5-irritated-087', 'e5m3-frustrated-113'] },
    { slug: 'gniew', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'local_fire_department',
      wordIds: ['e4m3-angry-112', 'e2m1-livid-134', 'e1m1-enraged-133', 'ext-indignant-184'],
      auxIds: ['ext-indignant-184', 'e2m1-livid-134'] },
    { slug: 'pogarda-i-zazdrosc', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'visibility',
      wordIds: ['e4m1-jealous-136', 'e5m1-envious-137'],
      auxIds: ['e4m1-jealous-136', 'e5m1-envious-137'] },
    { slug: 'wstret', quadrant: 'high-energy-low-pleasantness', isNew: false, icon: 'sick',
      wordIds: ['e5m2-repulsed-125', 'e7m1-disgusted-139'],
      auxIds: ['e5m2-repulsed-125', 'e7m1-disgusted-139'] },
    { slug: 'pogarda', quadrant: 'high-energy-low-pleasantness', isNew: true, icon: 'thumb_down',
      wordIds: ['ext-dismissive-166', 'ext-haughty-165', 'e6m1-contempt-138'],
      auxIds: ['ext-dismissive-166', 'ext-haughty-165'] },
    { slug: 'upokorzenie', quadrant: 'high-energy-low-pleasantness', isNew: true, icon: 'trending_down',
      wordIds: ['ext-ridiculed-185', 'e8m1-humiliated-140', 'ext-demeaned-186', 'ext-disgraced-187'],
      auxIds: ['ext-ridiculed-185', 'ext-disgraced-187'] },
  ],
  'low-energy-low-pleasantness': [
    { slug: 'wstyd-i-wina', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'masks',
      wordIds: ['ext-flustered-164', 'e5m4-embarrassed-101', 'e8m2-ashamed-128', 'ext-abashed-188'],
      auxIds: ['ext-flustered-164', 'ext-abashed-188'] },
    { slug: 'wina-i-zal', quadrant: 'low-energy-low-pleasantness', isNew: true, icon: 'gavel',
      wordIds: ['e10m1-guilty-142', 'ext-regretful-171', 'ext-contrite-189'],
      auxIds: ['ext-regretful-171', 'ext-contrite-189'] },
    { slug: 'zranienie', quadrant: 'low-energy-low-pleasantness', isNew: true, icon: 'heart_broken',
      wordIds: ['ext-offended-161', 'ext-wounded-190', 'ext-stung-191', 'ext-wronged-192', 'ext-embittered-193'],
      auxIds: ['ext-stung-191', 'ext-wronged-192'] },
    { slug: 'smutek-i-zal', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'rainy',
      wordIds: ['e7m5-down-091', 'e9m5-sad-093', 'e12m3-glum-120', 'e11m1-depressed-143', 'ext-devastated-167', 'e12m1-miserable-144'],
      auxIds: ['e7m5-down-091', 'ext-devastated-167'] },
    { slug: 'beznadzieja-i-rozpacz', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'storm',
      wordIds: ['e12m6-helpless-084', 'e7m2-trapped-127', 'e11m2-hopeless-131', 'e12m2-despair-132', 'e9m1-pessimistic-141', 'e9m2-vulnerable-129'],
      auxIds: ['e12m6-helpless-084', 'e12m2-despair-132'] },
    { slug: 'zwatpienie-i-rozczarowanie', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'do_not_disturb_on',
      wordIds: ['ext-soured-194', 'e10m5-discouraged-094', 'ext-resigned-168'],
      auxIds: ['ext-soured-194', 'ext-resigned-168'] },
    { slug: 'rozczarowanie', quadrant: 'low-energy-low-pleasantness', isNew: true, icon: 'trending_down',
      wordIds: ['e8m4-disappointed-104', 'ext-letdown-196', 'ext-bitter-195'],
      auxIds: ['ext-letdown-196', 'ext-bitter-195'] },
    { slug: 'samotnosc-i-wykluczenie', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'person_off',
      wordIds: ['e11m5-lonely-095', 'e9m4-forlorn-105', 'e10m3-excluded-118', 'e11m3-alienated-119'],
      auxIds: ['e11m3-alienated-119', 'e9m4-forlorn-105'] },
    { slug: 'tesknota', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'distance',
      wordIds: ['ext-longing-170', 'e11m4-nostalgic-107', 'ext-wistful-197'],
      auxIds: ['e11m4-nostalgic-107', 'ext-wistful-197'] },
    { slug: 'zmeczenie-i-wypalenie', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'battery_1_bar',
      wordIds: ['ext-weary-198', 'e8m6-tired-080', 'e12m5-exhausted-096', 'e12m4-burned-out-108'],
      auxIds: ['ext-weary-198', 'e12m4-burned-out-108'] },
    { slug: 'apatia-i-znudzenie', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'hourglass_empty',
      wordIds: ['e7m6-bored-079', 'e8m5-meh-092', 'e11m6-apathetic-083', 'ext-indifferent-199'],
      auxIds: ['e7m6-bored-079', 'ext-indifferent-199'] },
    { slug: 'pustka', quadrant: 'low-energy-low-pleasantness', isNew: false, icon: 'blur_circular',
      wordIds: ['e10m2-numb-130', 'ext-empty-169', 'ext-dulled-200'],
      auxIds: ['ext-dulled-200', 'e10m2-numb-130'] },
  ],
  'low-energy-high-pleasantness': [
    { slug: 'spokoj-i-wyciszenie', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'spa',
      wordIds: ['e7m7-calm-067', 'e11m9-balanced-047', 'e11m8-peaceful-059', 'e11m7-mellow-071', 'e12m8-tranquil-060', 'e12m12-serene-012', 'e11m10-safe-035', 'e11m11-secure-023'],
      auxIds: ['e7m7-calm-067', 'e12m8-tranquil-060'] },
    { slug: 'odprezenie-i-swoboda', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'self_improvement',
      wordIds: ['e7m8-at-ease-055', 'e9m8-chill-057', 'e9m7-relaxed-069', 'e12m7-carefree-072', 'e12m10-relieved-036'],
      auxIds: ['e7m8-at-ease-055', 'e12m7-carefree-072'] },
    { slug: 'zadowolenie-i-komfort', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'weekend',
      wordIds: ['e8m7-good-068', 'e10m8-comfortable-058', 'e6m7-pleased-066', 'e10m10-content-034', 'e12m11-satisfied-024', 'e7m12-blissful-007'],
      auxIds: ['e8m7-good-068', 'e7m12-blissful-007'] },
    { slug: 'zaduma', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'psychology_alt',
      wordIds: ['e8m8-thoughtful-056', 'ext-reflective-160', 'e6m10-wishful-030'],
      auxIds: ['e8m8-thoughtful-056', 'ext-reflective-160'] },
    { slug: 'wdziecznosc', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'volunteer_activism',
      wordIds: ['e12m9-thankful-048', 'e9m12-grateful-009', 'e11m12-blessed-011', 'ext-appreciative-176'],
      auxIds: ['e12m9-thankful-048', 'ext-appreciative-176'] },
    { slug: 'wzruszenie', quadrant: 'low-energy-high-pleasantness', isNew: true, icon: 'blur_on',
      wordIds: ['e10m12-moved-010', 'ext-enraptured-159'],
      auxIds: ['e10m12-moved-010', 'ext-enraptured-159'] },
    { slug: 'czulosc', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'front_hand',
      wordIds: ['ext-warmhearted-157', 'ext-tender-158', 'ext-affectionate-154', 'ext-doting-177'],
      auxIds: ['ext-warmhearted-157', 'ext-doting-177'] },
    { slug: 'troska-i-empatia', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'diversity_1',
      wordIds: ['e10m7-sympathetic-070', 'e9m9-compassionate-045', 'e10m9-empathetic-046', 'ext-concerned-178'],
      auxIds: ['e10m7-sympathetic-070', 'ext-concerned-178'] },
    { slug: 'przynaleznosc-i-akceptacja', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'diversity_3',
      wordIds: ['e10m11-accepted-022', 'e9m10-included-033', 'e8m10-supported-032', 'e7m9-understood-043'],
      auxIds: ['e10m11-accepted-022', 'e8m10-supported-032'] },
    { slug: 'uznanie-i-szacunek', quadrant: 'low-energy-high-pleasantness', isNew: false, icon: 'workspace_premium',
      wordIds: ['ext-noticed-179', 'e9m11-valued-021', 'e8m9-appreciated-044', 'e7m10-respected-031'],
      auxIds: ['e8m9-appreciated-044', 'e7m10-respected-031'] },
  ],
}

export const EMOTION_GROUPS: EmotionGroup[] = Object.values(GROUPS_BY_QUADRANT).flat()

const GROUP_BY_SLUG: Record<string, EmotionGroup> = Object.fromEntries(
  EMOTION_GROUPS.map((g) => [g.slug, g]),
)

export function getGroup(slug: string): EmotionGroup | undefined {
  return GROUP_BY_SLUG[slug]
}

/** Kolory i ikony ćwiartek z designu 6c (tintowanie panelu akcentem). */
export const QUADRANT_STYLES: Record<Quadrant, QuadrantStyle> = {
  'high-energy-high-pleasantness': { id: 'high-energy-high-pleasantness', icon: 'wb_sunny', top: '#aad3ff', bottom: '#85C0FF', accent: '#2E93FF', text: '#003975' },
  'high-energy-low-pleasantness': { id: 'high-energy-low-pleasantness', icon: 'bolt', top: '#ffe5ee', bottom: '#ffc7db', accent: '#e8618f', text: '#6e1f3c' },
  'low-energy-low-pleasantness': { id: 'low-energy-low-pleasantness', icon: 'cloud', top: '#efe6f3', bottom: '#dccbe6', accent: '#9d6fc0', text: '#3f1f55' },
  'low-energy-high-pleasantness': { id: 'low-energy-high-pleasantness', icon: 'auto_awesome', top: '#dbecff', bottom: '#cce4ff', accent: '#5CABFF', text: '#004FA3' },
}

/**
 * Stałe kolorystyczne EmotionGroupPicker. Plik .vue jest pod strażnikiem
 * design-systemu v2 (zero surowych hex/rgba w komponencie), więc literały
 * bazowe akcentu i pary cieni neumorficznych żyją tu, w warstwie domenowej.
 */
export const EGP_DEFAULT_ACCENT = '#2E93FF'
export const EGP_SHADOW_BASE = {
  /** jasna strona cienia (przegląd ćwiartek, bez tinty) */
  light: 'rgba(255,255,255,.9)',
  /** ciemna strona cienia (baza mieszana z akcentem po drill-downie) */
  dark: '#8CA6CA',
  /** jasna baza mieszana z akcentem po drill-downie */
  lightTint: 'rgba(255,255,255,.72)',
} as const

/** Dawny slug rodziny/promienia → slug grupy (identyczność + 4 spadkobierców). */
export const GROUP_OF_FAMILY: Record<string, string> = {
  'apatia-i-znudzenie': 'apatia-i-znudzenie',
  'beznadzieja-i-rozpacz': 'beznadzieja-i-rozpacz',
  'bezpieczenstwo': 'spokoj-i-wyciszenie',
  'bliskosc': 'bliskosc',
  'ciekawosc-i-naped': 'ciekawosc-i-naped',
  'czulosc': 'czulosc',
  'determinacja': 'determinacja',
  'duma': 'duma',
  'ekscytacja': 'ekscytacja',
  'energia': 'ekscytacja',
  'gniew': 'gniew',
  'irytacja-i-frustracja': 'irytacja-i-frustracja',
  'nadzieja-i-spelnienie': 'nadzieja-i-spelnienie',
  'niepokoj-i-zmartwienie': 'niepokoj-i-zmartwienie',
  'odprezenie-i-swoboda': 'odprezenie-i-swoboda',
  'pewnosc-i-mistrzostwo': 'pewnosc-i-mistrzostwo',
  'podziw': 'podziw',
  'pogarda': 'pogarda',
  'pogarda-i-zazdrosc': 'pogarda-i-zazdrosc',
  'przygnebienie': 'smutek-i-zal',
  'przynaleznosc-i-akceptacja': 'przynaleznosc-i-akceptacja',
  'pustka': 'pustka',
  'radosc': 'radosc',
  'rozbawienie': 'rozbawienie',
  'rozczarowanie': 'rozczarowanie',
  'samotnosc-i-wykluczenie': 'samotnosc-i-wykluczenie',
  'smutek-i-zal': 'smutek-i-zal',
  'spokoj-i-wyciszenie': 'spokoj-i-wyciszenie',
  'strach-i-panika': 'strach-i-panika',
  'stres-i-przytloczenie': 'stres-i-przytloczenie',
  'szok': 'szok',
  'tesknota': 'tesknota',
  'troska-i-empatia': 'troska-i-empatia',
  'upokorzenie': 'upokorzenie',
  'uznanie-i-szacunek': 'uznanie-i-szacunek',
  'wdziecznosc': 'wdziecznosc',
  'wina-i-zal': 'wina-i-zal',
  'wstret': 'wstret',
  'wstyd-i-wina': 'wstyd-i-wina',
  'wzruszenie': 'wzruszenie',
  'zaangazowanie': 'zaangazowanie',
  'zadowolenie-i-komfort': 'zadowolenie-i-komfort',
  'zaduma': 'zaduma',
  'zamet': 'zamet',
  'zaskoczenie-i-zachwyt': 'zaskoczenie-i-zachwyt',
  'zazenowanie-i-upokorzenie': 'wstyd-i-wina',
  'zmeczenie-i-wypalenie': 'zmeczenie-i-wypalenie',
  'zranienie': 'zranienie',
  'zwatpienie-i-rozczarowanie': 'zwatpienie-i-rozczarowanie',
}

/** Slug grupy dla dawnego slugu rodziny/promienia (lub przekazany slug grupy). */
export function resolveGroupSlug(familyOrGroupSlug: string): string | undefined {
  return GROUP_OF_FAMILY[familyOrGroupSlug]
}

/** ID słowa → slug grupy. Obejmuje też usunięte z katalogu Produktywny (historia). */
export const GROUP_OF_WORD: Record<string, string> = {
  'e10m1-guilty-142': 'wina-i-zal',
  'e10m10-content-034': 'zadowolenie-i-komfort',
  'e10m11-accepted-022': 'przynaleznosc-i-akceptacja',
  'e10m12-moved-010': 'wzruszenie',
  'e10m2-numb-130': 'pustka',
  'e10m3-excluded-118': 'samotnosc-i-wykluczenie',
  'e10m5-discouraged-094': 'zwatpienie-i-rozczarowanie',
  'e10m7-sympathetic-070': 'troska-i-empatia',
  'e10m8-comfortable-058': 'zadowolenie-i-komfort',
  'e10m9-empathetic-046': 'troska-i-empatia',
  'e11m1-depressed-143': 'smutek-i-zal',
  'e11m10-safe-035': 'spokoj-i-wyciszenie',
  'e11m11-secure-023': 'spokoj-i-wyciszenie',
  'e11m12-blessed-011': 'wdziecznosc',
  'e11m2-hopeless-131': 'beznadzieja-i-rozpacz',
  'e11m3-alienated-119': 'samotnosc-i-wykluczenie',
  'e11m4-nostalgic-107': 'tesknota',
  'e11m5-lonely-095': 'samotnosc-i-wykluczenie',
  'e11m6-apathetic-083': 'apatia-i-znudzenie',
  'e11m7-mellow-071': 'spokoj-i-wyciszenie',
  'e11m8-peaceful-059': 'spokoj-i-wyciszenie',
  'e11m9-balanced-047': 'spokoj-i-wyciszenie',
  'e12m1-miserable-144': 'smutek-i-zal',
  'e12m10-relieved-036': 'odprezenie-i-swoboda',
  'e12m11-satisfied-024': 'zadowolenie-i-komfort',
  'e12m12-serene-012': 'spokoj-i-wyciszenie',
  'e12m2-despair-132': 'beznadzieja-i-rozpacz',
  'e12m3-glum-120': 'smutek-i-zal',
  'e12m4-burned-out-108': 'zmeczenie-i-wypalenie',
  'e12m5-exhausted-096': 'zmeczenie-i-wypalenie',
  'e12m6-helpless-084': 'beznadzieja-i-rozpacz',
  'e12m7-carefree-072': 'odprezenie-i-swoboda',
  'e12m8-tranquil-060': 'spokoj-i-wyciszenie',
  'e12m9-thankful-048': 'wdziecznosc',
  'e1m1-enraged-133': 'gniew',
  'e1m10-thrilled-025': 'ekscytacja',
  'e1m11-elated-013': 'radosc',
  'e1m12-ecstatic-001': 'podziw',
  'e1m2-terrified-121': 'strach-i-panika',
  'e1m3-panicked-109': 'strach-i-panika',
  'e1m4-shocked-097': 'szok',
  'e1m6-hyper-073': 'ekscytacja',
  'e1m7-surprised-061': 'zaskoczenie-i-zachwyt',
  'e1m8-awe-049': 'podziw',
  'e1m9-exhilarated-037': 'ekscytacja',
  'e2m1-livid-134': 'gniew',
  'e2m10-amazed-026': 'zaskoczenie-i-zachwyt',
  'e2m11-inspired-014': 'podziw',
  'e2m12-empowered-002': 'pewnosc-i-mistrzostwo',
  'e2m3-overwhelmed-110': 'stres-i-przytloczenie',
  'e2m4-stressed-098': 'stres-i-przytloczenie',
  'e2m6-pressured-074': 'stres-i-przytloczenie',
  'e2m7-excited-062': 'ekscytacja',
  'e2m8-determined-050': 'determinacja',
  'e2m9-successful-038': 'duma',
  'e3m10-joyful-027': 'radosc',
  'e3m11-productive-015': 'zaangazowanie',
  'e3m12-proud-003': 'duma',
  'e3m2-frightened-123': 'strach-i-panika',
  'e3m5-irritated-087': 'irytacja-i-frustracja',
  'e3m7-energized-063': 'ekscytacja',
  'e3m8-eager-051': 'ekscytacja',
  'e3m9-enthusiastic-039': 'ekscytacja',
  'e4m1-jealous-136': 'pogarda-i-zazdrosc',
  'e4m10-happy-028': 'radosc',
  'e4m11-motivated-016': 'determinacja',
  'e4m12-optimistic-004': 'nadzieja-i-spelnienie',
  'e4m3-angry-112': 'gniew',
  'e4m4-jittery-100': 'niepokoj-i-zmartwienie',
  'e4m5-fomo-088': 'niepokoj-i-zmartwienie',
  'e4m6-confused-076': 'zamet',
  'e4m7-cheerful-064': 'radosc',
  'e4m8-curious-052': 'ciekawosc-i-naped',
  'e4m9-upbeat-040': 'ekscytacja',
  'e5m1-envious-137': 'pogarda-i-zazdrosc',
  'e5m10-confident-029': 'pewnosc-i-mistrzostwo',
  'e5m11-engaged-017': 'zaangazowanie',
  'e5m12-challenged-005': 'determinacja',
  'e5m2-repulsed-125': 'wstret',
  'e5m3-frustrated-113': 'irytacja-i-frustracja',
  'e5m4-embarrassed-101': 'wstyd-i-wina',
  'e5m6-tense-077': 'stres-i-przytloczenie',
  'e5m7-pleasant-065': 'radosc',
  'e5m8-focused-053': 'zaangazowanie',
  'e5m9-alive-041': 'ekscytacja',
  'e6m1-contempt-138': 'pogarda',
  'e6m10-wishful-030': 'zaduma',
  'e6m11-hopeful-018': 'nadzieja-i-spelnienie',
  'e6m12-accomplished-006': 'pewnosc-i-mistrzostwo',
  'e6m3-worried-114': 'niepokoj-i-zmartwienie',
  'e6m4-nervous-102': 'niepokoj-i-zmartwienie',
  'e6m5-peeved-090': 'irytacja-i-frustracja',
  'e6m6-uneasy-078': 'niepokoj-i-zmartwienie',
  'e6m7-pleased-066': 'zadowolenie-i-komfort',
  'e6m8-playful-054': 'rozbawienie',
  'e6m9-delighted-042': 'radosc',
  'e7m1-disgusted-139': 'wstret',
  'e7m10-respected-031': 'uznanie-i-szacunek',
  'e7m11-fulfilled-019': 'duma',
  'e7m12-blissful-007': 'zadowolenie-i-komfort',
  'e7m2-trapped-127': 'beznadzieja-i-rozpacz',
  'e7m3-insecure-115': 'niepokoj-i-zmartwienie',
  'e7m5-down-091': 'smutek-i-zal',
  'e7m6-bored-079': 'apatia-i-znudzenie',
  'e7m7-calm-067': 'spokoj-i-wyciszenie',
  'e7m8-at-ease-055': 'odprezenie-i-swoboda',
  'e7m9-understood-043': 'przynaleznosc-i-akceptacja',
  'e8m1-humiliated-140': 'upokorzenie',
  'e8m10-supported-032': 'przynaleznosc-i-akceptacja',
  'e8m11-loved-020': 'bliskosc',
  'e8m12-connected-008': 'bliskosc',
  'e8m2-ashamed-128': 'wstyd-i-wina',
  'e8m3-lost-116': 'zamet',
  'e8m4-disappointed-104': 'rozczarowanie',
  'e8m5-meh-092': 'apatia-i-znudzenie',
  'e8m6-tired-080': 'zmeczenie-i-wypalenie',
  'e8m7-good-068': 'zadowolenie-i-komfort',
  'e8m8-thoughtful-056': 'zaduma',
  'e8m9-appreciated-044': 'uznanie-i-szacunek',
  'e9m1-pessimistic-141': 'beznadzieja-i-rozpacz',
  'e9m10-included-033': 'przynaleznosc-i-akceptacja',
  'e9m11-valued-021': 'uznanie-i-szacunek',
  'e9m12-grateful-009': 'wdziecznosc',
  'e9m2-vulnerable-129': 'beznadzieja-i-rozpacz',
  'e9m4-forlorn-105': 'samotnosc-i-wykluczenie',
  'e9m5-sad-093': 'smutek-i-zal',
  'e9m7-relaxed-069': 'odprezenie-i-swoboda',
  'e9m8-chill-057': 'odprezenie-i-swoboda',
  'e9m9-compassionate-045': 'troska-i-empatia',
  'ext-abashed-188': 'wstyd-i-wina',
  'ext-absorbed-149': 'zaangazowanie',
  'ext-admiring-175': 'podziw',
  'ext-affectionate-154': 'czulosc',
  'ext-ambitious-151': 'determinacja',
  'ext-amused-145': 'rozbawienie',
  'ext-appreciative-176': 'wdziecznosc',
  'ext-apprehensive-183': 'strach-i-panika',
  'ext-astonished-172': 'zaskoczenie-i-zachwyt',
  'ext-attached-155': 'bliskosc',
  'ext-bitter-195': 'rozczarowanie',
  'ext-bold-152': 'pewnosc-i-mistrzostwo',
  'ext-capable-153': 'pewnosc-i-mistrzostwo',
  'ext-concerned-178': 'troska-i-empatia',
  'ext-contrite-189': 'wina-i-zal',
  'ext-dazed-180': 'szok',
  'ext-demeaned-186': 'upokorzenie',
  'ext-devastated-167': 'smutek-i-zal',
  'ext-disgraced-187': 'upokorzenie',
  'ext-dismissive-166': 'pogarda',
  'ext-doting-177': 'czulosc',
  'ext-dulled-200': 'pustka',
  'ext-dumbfounded-182': 'szok',
  'ext-embittered-193': 'zranienie',
  'ext-empty-169': 'pustka',
  'ext-enraptured-159': 'wzruszenie',
  'ext-expectant-156': 'nadzieja-i-spelnienie',
  'ext-fascinated-148': 'ciekawosc-i-naped',
  'ext-flustered-164': 'wstyd-i-wina',
  'ext-giddy-146': 'rozbawienie',
  'ext-haughty-165': 'pogarda',
  'ext-impatient-162': 'irytacja-i-frustracja',
  'ext-indifferent-199': 'apatia-i-znudzenie',
  'ext-indignant-184': 'gniew',
  'ext-inlove-174': 'bliskosc',
  'ext-intrigued-147': 'ciekawosc-i-naped',
  'ext-letdown-196': 'rozczarowanie',
  'ext-longing-170': 'tesknota',
  'ext-loving-173': 'bliskosc',
  'ext-noticed-179': 'uznanie-i-szacunek',
  'ext-offended-161': 'zranienie',
  'ext-reflective-160': 'zaduma',
  'ext-regretful-171': 'wina-i-zal',
  'ext-resigned-168': 'zwatpienie-i-rozczarowanie',
  'ext-resolute-150': 'determinacja',
  'ext-ridiculed-185': 'upokorzenie',
  'ext-soured-194': 'zwatpienie-i-rozczarowanie',
  'ext-stung-191': 'zranienie',
  'ext-stunned-181': 'szok',
  'ext-tender-158': 'czulosc',
  'ext-torn-163': 'zamet',
  'ext-warmhearted-157': 'czulosc',
  'ext-weary-198': 'zmeczenie-i-wypalenie',
  'ext-wistful-197': 'tesknota',
  'ext-wounded-190': 'zranienie',
  'ext-wronged-192': 'zranienie',
}

// Dawne drabinki podpowiedzi koła v1 (słowo → poziom 1–5) — WYŁĄCZNIE do odczytu
// historii (stare wpisy emotionIds); UI pickera v3 tego nie pokazuje.
export const LEGACY_WORD_INTENSITY: Record<string, GroupIntensity> = {
  'e10m1-guilty-142': 3,
  'e10m11-accepted-022': 1,
  'e10m12-moved-010': 4,
  'e10m2-numb-130': 4,
  'e10m3-excluded-118': 5,
  'e10m5-discouraged-094': 1,
  'e10m7-sympathetic-070': 2,
  'e10m8-comfortable-058': 2,
  'e10m9-empathetic-046': 4,
  'e11m1-depressed-143': 4,
  'e11m2-hopeless-131': 4,
  'e11m3-alienated-119': 4,
  'e11m4-nostalgic-107': 1,
  'e11m5-lonely-095': 1,
  'e11m6-apathetic-083': 3,
  'e11m8-peaceful-059': 3,
  'e11m9-balanced-047': 1,
  'e12m10-relieved-036': 5,
  'e12m11-satisfied-024': 4,
  'e12m2-despair-132': 5,
  'e12m3-glum-120': 2,
  'e12m4-burned-out-108': 5,
  'e12m5-exhausted-096': 3,
  'e12m6-helpless-084': 2,
  'e12m7-carefree-072': 4,
  'e12m8-tranquil-060': 4,
  'e12m9-thankful-048': 1,
  'e1m10-thrilled-025': 3,
  'e1m12-ecstatic-001': 4,
  'e1m2-terrified-121': 4,
  'e1m3-panicked-109': 5,
  'e1m4-shocked-097': 5,
  'e1m6-hyper-073': 4,
  'e1m7-surprised-061': 1,
  'e1m8-awe-049': 5,
  'e1m9-exhilarated-037': 2,
  'e2m1-livid-134': 5,
  'e2m10-amazed-026': 3,
  'e2m11-inspired-014': 2,
  'e2m3-overwhelmed-110': 5,
  'e2m4-stressed-098': 3,
  'e2m7-excited-062': 5,
  'e2m8-determined-050': 4,
  'e2m9-successful-038': 5,
  'e3m10-joyful-027': 4,
  'e3m12-proud-003': 4,
  'e3m2-frightened-123': 2,
  'e3m5-irritated-087': 3,
  'e3m8-eager-051': 1,
  'e4m1-jealous-136': 2,
  'e4m10-happy-028': 5,
  'e4m11-motivated-016': 3,
  'e4m12-optimistic-004': 3,
  'e4m3-angry-112': 4,
  'e4m4-jittery-100': 3,
  'e4m6-confused-076': 1,
  'e4m7-cheerful-064': 2,
  'e4m8-curious-052': 1,
  'e5m1-envious-137': 4,
  'e5m10-confident-029': 3,
  'e5m11-engaged-017': 3,
  'e5m12-challenged-005': 1,
  'e5m2-repulsed-125': 1,
  'e5m4-embarrassed-101': 3,
  'e5m6-tense-077': 1,
  'e5m7-pleasant-065': 1,
  'e5m8-focused-053': 1,
  'e6m1-contempt-138': 3,
  'e6m10-wishful-030': 5,
  'e6m11-hopeful-018': 4,
  'e6m3-worried-114': 5,
  'e6m4-nervous-102': 4,
  'e6m5-peeved-090': 2,
  'e6m6-uneasy-078': 1,
  'e6m7-pleased-066': 3,
  'e7m1-disgusted-139': 5,
  'e7m10-respected-031': 5,
  'e7m12-blissful-007': 5,
  'e7m3-insecure-115': 2,
  'e7m5-down-091': 1,
  'e7m6-bored-079': 2,
  'e7m7-calm-067': 2,
  'e7m8-at-ease-055': 1,
  'e7m9-understood-043': 4,
  'e8m1-humiliated-140': 5,
  'e8m10-supported-032': 3,
  'e8m11-loved-020': 5,
  'e8m12-connected-008': 3,
  'e8m2-ashamed-128': 2,
  'e8m4-disappointed-104': 4,
  'e8m5-meh-092': 1,
  'e8m6-tired-080': 1,
  'e8m7-good-068': 1,
  'e8m8-thoughtful-056': 1,
  'e8m9-appreciated-044': 3,
  'e9m1-pessimistic-141': 1,
  'e9m10-included-033': 2,
  'e9m11-valued-021': 1,
  'e9m12-grateful-009': 3,
  'e9m2-vulnerable-129': 3,
  'e9m4-forlorn-105': 3,
  'e9m5-sad-093': 3,
  'e9m7-relaxed-069': 3,
  'e9m8-chill-057': 2,
  'e9m9-compassionate-045': 3,
  'ext-absorbed-149': 5,
  'ext-affectionate-154': 4,
  'ext-amused-145': 3,
  'ext-attached-155': 1,
  'ext-bold-152': 2,
  'ext-capable-153': 1,
  'ext-devastated-167': 5,
  'ext-empty-169': 5,
  'ext-expectant-156': 1,
  'ext-fascinated-148': 5,
  'ext-flustered-164': 1,
  'ext-impatient-162': 1,
  'ext-intrigued-147': 3,
  'ext-longing-170': 3,
  'ext-reflective-160': 3,
  'ext-regretful-171': 4,
  'ext-resigned-168': 5,
  'ext-tender-158': 5,
  'ext-torn-163': 3,
  'ext-warmhearted-157': 1,
}

/**
 * Adapter odczytu historii: nowe pole emotions (slug grupy LUB dawny slug
 * promienia) oraz stare pola (emotionIds = słowa, emotionFamilyIds = rodziny)
 * → wybory grup. Słowo-dawna-podpowiedź dostaje poziom z LEGACY_WORD_INTENSITY;
 * pozostałe słowa i rodziny mapują się bez natężenia. Nieznane ID są pomijane.
 * Duplikaty per grupa: wygrywa wpis z najwyższym natężeniem.
 */
export function legacyToGroupSelections(input: {
  emotions?: EmotionGroupSelection[]
  emotionIds?: string[]
  emotionFamilyIds?: string[]
}): EmotionGroupSelection[] {
  const byGroup = new Map<string, EmotionGroupSelection>()
  const add = (sel: EmotionGroupSelection) => {
    const existing = byGroup.get(sel.emotionId)
    if (!existing || (sel.intensity ?? 0) > (existing.intensity ?? 0)) {
      byGroup.set(sel.emotionId, sel)
    }
  }
  for (const s of input.emotions ?? []) {
    const slug = GROUP_OF_FAMILY[s.emotionId]
    if (slug) add({ emotionId: slug, intensity: s.intensity })
  }
  for (const wordId of input.emotionIds ?? []) {
    const slug = GROUP_OF_WORD[wordId]
    if (!slug) continue
    const intensity = LEGACY_WORD_INTENSITY[wordId]
    add(intensity ? { emotionId: slug, intensity } : { emotionId: slug })
  }
  for (const familyId of input.emotionFamilyIds ?? []) {
    const slug = GROUP_OF_FAMILY[familyId]
    if (slug && !byGroup.has(slug)) add({ emotionId: slug })
  }
  return [...byGroup.values()]
}

/**
 * Mostek zapisu wstecz: grupy → emotionFamilyIds (grupy są warstwą rodzin),
 * dzięki czemu historia/rollupy/chipy działają bez zmian.
 */
export function groupSelectionsToFamilyIds(selections: EmotionGroupSelection[]): string[] {
  return [...new Set(selections.map((s) => s.emotionId))]
}
