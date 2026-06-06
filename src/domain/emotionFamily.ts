// emotionFamilies.ts — warstwa RODZIN emocji (poziom między ćwiartką a emocją).
//
// Taksonomia z projektu Claude Design (GROUPS w icons-*.jsx): wyjściowo 7 rodzin na
// ćwiartkę. Ćwiartkę „Wysoka energia / Przyjemne" przebudowano na 12 rodzin: rozbito
// spójnikowe rodziny na czyste pojęcia — „Ciekawość i napęd" → Ciekawość + Determinacja,
// „Pewność i mistrzostwo" → Pewność siebie + Duma, „Nadzieja i spełnienie" → Nadzieja
// (Spełniony i Zaspokojony przeniesione do Dumy; Zaspokojony docelowo do LEHP) — oraz
// wydzielono Rozbawienie (z Bliskości) i dodano 12 nowych emocji. UWAGA: dla zgodności z
// zapisanymi emotionFamilyIds NIE zmieniamy istniejących slugów — id „ciekawosc-i-naped" /
// „pewnosc-i-mistrzostwo" / „nadzieja-i-spelnienie" / „zaskoczenie-i-zachwyt" zostają,
// zmienia się tylko nazwa wyświetlana; nowe rodziny to „rozbawienie", „determinacja",
// „duma". Ćwiartkę „Wysoka energia / Nieprzyjemne" również przebudowano na 9:
// rozbito przeładowany „Niepokój" (lęk poznawczy + „Rozedrganie i nerwy") oraz
// rozdzielono „Wstręt" od „Zażenowania i upokorzenia" („Zdezorientowany" → Stres).
// Czyste przegrupowanie istniejących emocji — bez dodawania nowych. Ćwiartkę
// „Niska energia / Przyjemne" → 8: rozdzielono „Bliskość i uznanie" na
// „Przynależność i akceptacja" + „Uznanie i szacunek" (przynależność vs uznanie).
// Ćwiartkę „Niska energia / Nieprzyjemne" → 8: rozbito „Smutek" na „Smutek i żal"
// (żywy ból: smutny/przybity/zatroskany/nieszczęśliwy) + „Przygnębienie" (płaski,
// ciężki, przygaszony nastrój: markotny/ponury/przygnębiony).
// Każda rodzina ma id (slug), polską nazwę, podtytuł, kolor (tint) oraz emocję
// reprezentatywną (jej twarz służy za ikonę rodziny). FAMILY_OF mapuje ID emocji
// na ID rodziny — ID emocji są wspólne z produkcyjnym emotions-meta.json, więc ta
// sama mapa zadziała też w produkcji.
//
// 13 emocji (10 przeredagowanych w designie + 3 leżące tuż za granicą ćwiartki w
// naszych współrzędnych NAWL) przypisano ręcznie do rodziny w ICH ćwiartce.

import type { Quadrant } from '@/domain/emotion'

export interface EmotionFamily {
  id: string
  name: string
  sub: string
  tint: string
  rep: string
  quadrant: Quadrant
}

export const FAMILIES_BY_QUADRANT: Record<Quadrant, EmotionFamily[]> = {
  "high-energy-high-pleasantness": [
    { id: "radosc", name: "Radość", sub: "radość · pogoda", tint: "#2D74C9", rep: "Radosny", quadrant: "high-energy-high-pleasantness" },
    { id: "ekscytacja", name: "Ekscytacja", sub: "podekscytowanie · uniesienie", tint: "#2F8AE0", rep: "Podekscytowany", quadrant: "high-energy-high-pleasantness" },
    { id: "energia", name: "Energia", sub: "pobudzenie · witalność", tint: "#3E63D8", rep: "Nakręcony", quadrant: "high-energy-high-pleasantness" },
    { id: "rozbawienie", name: "Rozbawienie", sub: "zabawa · humor", tint: "#2FA0D8", rep: "Figlarny", quadrant: "high-energy-high-pleasantness" },
    { id: "ciekawosc-i-naped", name: "Ciekawość", sub: "zainteresowanie · dociekliwość", tint: "#1F8FB0", rep: "Ciekawy", quadrant: "high-energy-high-pleasantness" },
    { id: "zaangazowanie", name: "Zaangażowanie", sub: "przepływ · skupienie", tint: "#3AA0A8", rep: "Zaangażowany", quadrant: "high-energy-high-pleasantness" },
    { id: "determinacja", name: "Determinacja", sub: "napęd · dążenie", tint: "#2C9C8F", rep: "Zmotywowany", quadrant: "high-energy-high-pleasantness" },
    { id: "pewnosc-i-mistrzostwo", name: "Pewność siebie", sub: "sprawczość · śmiałość", tint: "#6168C9", rep: "Pewny siebie", quadrant: "high-energy-high-pleasantness" },
    { id: "duma", name: "Duma", sub: "osiągnięcie · sukces", tint: "#7E6AD0", rep: "Dumny", quadrant: "high-energy-high-pleasantness" },
    { id: "nadzieja-i-spelnienie", name: "Nadzieja", sub: "optymizm", tint: "#3F8FD0", rep: "Pełen nadziei", quadrant: "high-energy-high-pleasantness" },
    { id: "zaskoczenie-i-zachwyt", name: "Zaskoczenie", sub: "zdziwienie · podziw", tint: "#4A86D8", rep: "Zdumiony", quadrant: "high-energy-high-pleasantness" },
    { id: "bliskosc", name: "Bliskość", sub: "więź · miłość", tint: "#B5638F", rep: "Połączony", quadrant: "high-energy-high-pleasantness" },
  ],
  "high-energy-low-pleasantness": [
    { id: "gniew", name: "Gniew", sub: "złość", tint: "#c23a52", rep: "Zły", quadrant: "high-energy-low-pleasantness" },
    { id: "irytacja-i-frustracja", name: "Irytacja i frustracja", sub: "rozdrażnienie", tint: "#cc5560", rep: "Zirytowany", quadrant: "high-energy-low-pleasantness" },
    { id: "strach-i-panika", name: "Strach i panika", sub: "lęk", tint: "#b8447e", rep: "Przestraszony", quadrant: "high-energy-low-pleasantness" },
    { id: "niepokoj-i-zmartwienie", name: "Niepokój i zmartwienie", sub: "troska · lęk", tint: "#a85a92", rep: "Zaniepokojony", quadrant: "high-energy-low-pleasantness" },
    { id: "rozedrganie-i-nerwy", name: "Rozedrganie i nerwy", sub: "nerwowość · rozdygotanie", tint: "#b85a86", rep: "Roztrzęsiony", quadrant: "high-energy-low-pleasantness" },
    { id: "stres-i-przytloczenie", name: "Stres i przytłoczenie", sub: "napięcie", tint: "#c25a6c", rep: "Zestresowany", quadrant: "high-energy-low-pleasantness" },
    { id: "wstret", name: "Wstręt", sub: "odraza · niesmak", tint: "#8f5aa0", rep: "Zbrzydzony", quadrant: "high-energy-low-pleasantness" },
    { id: "zazenowanie-i-upokorzenie", name: "Zażenowanie i upokorzenie", sub: "zażenowanie · upokorzenie", tint: "#a05a96", rep: "Skrępowany", quadrant: "high-energy-low-pleasantness" },
    { id: "pogarda-i-zazdrosc", name: "Pogarda i zazdrość", sub: "niechęć", tint: "#9c4f8e", rep: "Pogardliwy", quadrant: "high-energy-low-pleasantness" },
  ],
  "low-energy-high-pleasantness": [
    { id: "spokoj-i-wyciszenie", name: "Spokój i wyciszenie", sub: "ukojenie", tint: "#3a86cc", rep: "Spokojny", quadrant: "low-energy-high-pleasantness" },
    { id: "odprezenie-i-swoboda", name: "Odprężenie i swoboda", sub: "swoboda", tint: "#3f97bf", rep: "Odprężony", quadrant: "low-energy-high-pleasantness" },
    { id: "zadowolenie-i-komfort", name: "Zadowolenie i komfort", sub: "komfort", tint: "#4a8fcf", rep: "Błogi", quadrant: "low-energy-high-pleasantness" },
    { id: "wdziecznosc", name: "Wdzięczność", sub: "wdzięczność", tint: "#5a86d2", rep: "Pełen wdzięczności", quadrant: "low-energy-high-pleasantness" },
    { id: "przynaleznosc-i-akceptacja", name: "Przynależność i akceptacja", sub: "więź · akceptacja", tint: "#4f97c8", rep: "Przynależny", quadrant: "low-energy-high-pleasantness" },
    { id: "uznanie-i-szacunek", name: "Uznanie i szacunek", sub: "uznanie · szacunek", tint: "#5a90cf", rep: "Ceniony", quadrant: "low-energy-high-pleasantness" },
    { id: "troska-i-empatia", name: "Troska i empatia", sub: "empatia", tint: "#6a86c8", rep: "Troskliwy", quadrant: "low-energy-high-pleasantness" },
    { id: "bezpieczenstwo", name: "Bezpieczeństwo", sub: "bezpieczeństwo", tint: "#3f8fc4", rep: "Bezpieczny", quadrant: "low-energy-high-pleasantness" },
  ],
  "low-energy-low-pleasantness": [
    { id: "smutek-i-zal", name: "Smutek i żal", sub: "żal · żywy ból", tint: "#6f5aa6", rep: "Smutny", quadrant: "low-energy-low-pleasantness" },
    { id: "przygnebienie", name: "Przygnębienie", sub: "przygaszenie · ciężar", tint: "#6a5ca8", rep: "Przygnębiony", quadrant: "low-energy-low-pleasantness" },
    { id: "beznadzieja-i-rozpacz", name: "Beznadzieja i rozpacz", sub: "rozpacz", tint: "#5e4f97", rep: "Bezradny", quadrant: "low-energy-low-pleasantness" },
    { id: "zmeczenie-i-wypalenie", name: "Zmęczenie i wypalenie", sub: "wyczerpanie", tint: "#7a6aaa", rep: "Zmęczony", quadrant: "low-energy-low-pleasantness" },
    { id: "apatia-i-znudzenie", name: "Apatia i znudzenie", sub: "obojętność", tint: "#8678a8", rep: "Znudzony", quadrant: "low-energy-low-pleasantness" },
    { id: "samotnosc-i-wykluczenie", name: "Samotność i wykluczenie", sub: "osamotnienie", tint: "#6a5aa2", rep: "Samotny", quadrant: "low-energy-low-pleasantness" },
    { id: "wstyd-i-wina", name: "Wstyd i wina", sub: "zażenowanie", tint: "#9c5a92", rep: "Winny", quadrant: "low-energy-low-pleasantness" },
    { id: "zwatpienie-i-rozczarowanie", name: "Zwątpienie i rozczarowanie", sub: "zawód", tint: "#7560a4", rep: "Rozczarowany", quadrant: "low-energy-low-pleasantness" },
  ],
}

// ID emocji → ID rodziny
export const FAMILY_OF: Record<string, string> = {
  "e1m12-ecstatic-001": "ekscytacja", // Zachwycony
  "e2m12-empowered-002": "pewnosc-i-mistrzostwo", // Wzmocniony
  "e3m12-proud-003": "duma", // Dumny
  "e4m12-optimistic-004": "nadzieja-i-spelnienie", // Optymistyczny
  "e5m12-challenged-005": "determinacja", // Zmobilizowany
  "e6m12-accomplished-006": "duma", // Kompetentny
  "e7m12-blissful-007": "zadowolenie-i-komfort", // Błogi
  "e8m12-connected-008": "bliskosc", // Połączony
  "e9m12-grateful-009": "wdziecznosc", // Pełen wdzięczności
  "e10m12-moved-010": "wdziecznosc", // Poruszony
  "e11m12-blessed-011": "wdziecznosc", // Błogosławiony
  "e12m12-serene-012": "spokoj-i-wyciszenie", // Pełen harmonii
  "e1m11-elated-013": "ekscytacja", // Rozradowany
  "e2m11-inspired-014": "ciekawosc-i-naped", // Zainspirowany
  "e3m11-productive-015": "zaangazowanie", // Produktywny
  "e4m11-motivated-016": "determinacja", // Zmotywowany
  "e5m11-engaged-017": "zaangazowanie", // Zaangażowany
  "e6m11-hopeful-018": "nadzieja-i-spelnienie", // Pełen nadziei
  "e7m11-fulfilled-019": "duma", // Spełniony (przeniesiony z nadziei)
  "e8m11-loved-020": "bliskosc", // Kochany
  "e9m11-valued-021": "uznanie-i-szacunek", // Ceniony
  "e10m11-accepted-022": "przynaleznosc-i-akceptacja", // Akceptowany
  "e11m11-secure-023": "bezpieczenstwo", // Chroniony
  "e12m11-satisfied-024": "zadowolenie-i-komfort", // Usatysfakcjonowany
  "e1m10-thrilled-025": "ekscytacja", // Podekscytowany
  "e2m10-amazed-026": "zaskoczenie-i-zachwyt", // Zdumiony
  "e3m10-joyful-027": "radosc", // Radosny
  "e4m10-happy-028": "radosc", // Szczęśliwy
  "e5m10-confident-029": "pewnosc-i-mistrzostwo", // Pewny siebie
  "e6m10-wishful-030": "zadowolenie-i-komfort", // Marzący
  "e7m10-respected-031": "uznanie-i-szacunek", // Szanowany
  "e8m10-supported-032": "przynaleznosc-i-akceptacja", // Wspierany
  "e9m10-included-033": "przynaleznosc-i-akceptacja", // Przynależny
  "e10m10-content-034": "duma", // Zaspokojony (tymczasowo; docelowo LEHP „zadowolenie-i-komfort")
  "e11m10-safe-035": "bezpieczenstwo", // Bezpieczny
  "e12m10-relieved-036": "odprezenie-i-swoboda", // Odciążony
  "e1m9-exhilarated-037": "ekscytacja", // Ożywiony
  "e2m9-successful-038": "duma", // Zwycięski
  "e3m9-enthusiastic-039": "energia", // Entuzjastyczny
  "e4m9-upbeat-040": "energia", // Pobudzony
  "e5m9-alive-041": "energia", // Pełen życia
  "e6m9-delighted-042": "radosc", // Ucieszony
  "e7m9-understood-043": "bezpieczenstwo", // Zrozumiany
  "e8m9-appreciated-044": "uznanie-i-szacunek", // Doceniony
  "e9m9-compassionate-045": "troska-i-empatia", // Współczujący
  "e10m9-empathetic-046": "troska-i-empatia", // Empatyczny
  "e11m9-balanced-047": "spokoj-i-wyciszenie", // Zrównoważony
  "e12m9-thankful-048": "wdziecznosc", // Wdzięczny
  "e1m8-awe-049": "zaskoczenie-i-zachwyt", // Oniemiały
  "e2m8-determined-050": "determinacja", // Zdeterminowany
  "e3m8-eager-051": "ekscytacja", // Chętny
  "e4m8-curious-052": "ciekawosc-i-naped", // Ciekawy
  "e5m8-focused-053": "zaangazowanie", // Skupiony
  "e6m8-playful-054": "rozbawienie", // Figlarny
  "e7m8-at-ease-055": "odprezenie-i-swoboda", // Swobodny
  "e8m8-thoughtful-056": "troska-i-empatia", // Zamyślony
  "e9m8-chill-057": "odprezenie-i-swoboda", // Wyluzowany
  "e10m8-comfortable-058": "zadowolenie-i-komfort", // Komfortowo
  "e11m8-peaceful-059": "spokoj-i-wyciszenie", // Spokojny
  "e12m8-tranquil-060": "spokoj-i-wyciszenie", // Wyciszony
  "e1m7-surprised-061": "zaskoczenie-i-zachwyt", // Zaskoczony
  "e2m7-excited-062": "ekscytacja", // Rozentuzjazmowany
  "e3m7-energized-063": "energia", // Pełen energii
  "e4m7-cheerful-064": "radosc", // Wesoły
  "e5m7-pleasant-065": "radosc", // Pogodny
  "e6m7-pleased-066": "zadowolenie-i-komfort", // Zadowolony
  "e7m7-calm-067": "spokoj-i-wyciszenie", // Opanowany
  "e8m7-good-068": "zadowolenie-i-komfort", // Dobrze
  "e9m7-relaxed-069": "odprezenie-i-swoboda", // Odprężony
  "e10m7-sympathetic-070": "troska-i-empatia", // Troskliwy
  "e11m7-mellow-071": "spokoj-i-wyciszenie", // Łagodny
  "e12m7-carefree-072": "odprezenie-i-swoboda", // Beztroski
  "e1m6-hyper-073": "energia", // Nakręcony
  "e2m6-pressured-074": "stres-i-przytloczenie", // Pod presją
  "e3m6-restless-075": "rozedrganie-i-nerwy", // Rozedrgany
  "e4m6-confused-076": "stres-i-przytloczenie", // Zdezorientowany
  "e5m6-tense-077": "stres-i-przytloczenie", // Spięty
  "e6m6-uneasy-078": "niepokoj-i-zmartwienie", // Nieswój
  "e7m6-bored-079": "apatia-i-znudzenie", // Znudzony
  "e8m6-tired-080": "zmeczenie-i-wypalenie", // Zmęczony
  "e9m6-fatigued-081": "zmeczenie-i-wypalenie", // Wymęczony
  "e10m6-disengaged-082": "apatia-i-znudzenie", // Wyłączony
  "e11m6-apathetic-083": "apatia-i-znudzenie", // Apatyczny
  "e12m6-helpless-084": "beznadzieja-i-rozpacz", // Bezradny
  "e1m5-impassioned-085": "stres-i-przytloczenie", // Rozgorączkowany
  "e2m5-annoyed-086": "irytacja-i-frustracja", // Poirytowany
  "e3m5-irritated-087": "irytacja-i-frustracja", // Zirytowany
  "e4m5-fomo-088": "irytacja-i-frustracja", // FOMO
  "e5m5-concerned-089": "niepokoj-i-zmartwienie", // Zaniepokojony
  "e6m5-peeved-090": "irytacja-i-frustracja", // Podrażniony
  "e7m5-down-091": "przygnebienie", // Markotny
  "e8m5-meh-092": "apatia-i-znudzenie", // Nijako
  "e9m5-sad-093": "smutek-i-zal", // Smutny
  "e10m5-discouraged-094": "beznadzieja-i-rozpacz", // Zniechęcony
  "e11m5-lonely-095": "samotnosc-i-wykluczenie", // Samotny
  "e12m5-exhausted-096": "zmeczenie-i-wypalenie", // Wyczerpany
  "e1m4-shocked-097": "strach-i-panika", // Wstrząśnięty
  "e2m4-stressed-098": "stres-i-przytloczenie", // Zestresowany
  "e3m4-apprehensive-099": "strach-i-panika", // Pełen obaw
  "e4m4-jittery-100": "rozedrganie-i-nerwy", // Roztrzęsiony
  "e5m4-embarrassed-101": "zazenowanie-i-upokorzenie", // Skrępowany
  "e6m4-nervous-102": "rozedrganie-i-nerwy", // Nerwowy
  "e7m4-disheartened-103": "smutek-i-zal", // Przybity
  "e8m4-disappointed-104": "zwatpienie-i-rozczarowanie", // Rozczarowany
  "e9m4-forlorn-105": "samotnosc-i-wykluczenie", // Opuszczony
  "e10m4-spent-106": "zmeczenie-i-wypalenie", // Wykończony
  "e11m4-nostalgic-107": "zwatpienie-i-rozczarowanie", // Nostalgiczny
  "e12m4-burned-out-108": "zmeczenie-i-wypalenie", // Wypalony
  "e1m3-panicked-109": "strach-i-panika", // Spanikowany
  "e2m3-overwhelmed-110": "stres-i-przytloczenie", // Przytłoczony
  "e3m3-anxious-111": "niepokoj-i-zmartwienie", // Niespokojny
  "e4m3-angry-112": "gniew", // Zły
  "e5m3-frustrated-113": "irytacja-i-frustracja", // Sfrustrowany
  "e6m3-worried-114": "niepokoj-i-zmartwienie", // Zmartwiony
  "e7m3-insecure-115": "niepokoj-i-zmartwienie", // Niepewny
  "e8m3-lost-116": "zwatpienie-i-rozczarowanie", // Zagubiony
  "e9m3-disconnected-117": "samotnosc-i-wykluczenie", // Odłączony
  "e10m3-excluded-118": "samotnosc-i-wykluczenie", // Wykluczony
  "e11m3-alienated-119": "samotnosc-i-wykluczenie", // Wyobcowany
  "e12m3-glum-120": "przygnebienie", // Ponury
  "e1m2-terrified-121": "strach-i-panika", // Przerażony
  "e2m2-irate-122": "gniew", // Wkurzony
  "e3m2-frightened-123": "strach-i-panika", // Przestraszony
  "e4m2-scared-124": "strach-i-panika", // Wystraszony
  "e5m2-repulsed-125": "wstret", // Zniesmaczony
  "e6m2-troubled-126": "smutek-i-zal", // Zatroskany
  "e7m2-trapped-127": "wstyd-i-wina", // Uwięziony
  "e8m2-ashamed-128": "wstyd-i-wina", // Zawstydzony
  "e9m2-vulnerable-129": "wstyd-i-wina", // Bezbronny
  "e10m2-numb-130": "apatia-i-znudzenie", // Odrętwiały
  "e11m2-hopeless-131": "beznadzieja-i-rozpacz", // Beznadziejny
  "e12m2-despair-132": "beznadzieja-i-rozpacz", // Zrozpaczony
  "e1m1-enraged-133": "gniew", // Rozwścieczony
  "e2m1-livid-134": "gniew", // Wściekły
  "e3m1-furious-135": "gniew", // Rozjuszony
  "e4m1-jealous-136": "pogarda-i-zazdrosc", // Zazdrosny
  "e5m1-envious-137": "pogarda-i-zazdrosc", // Zawistny
  "e6m1-contempt-138": "pogarda-i-zazdrosc", // Pogardliwy
  "e7m1-disgusted-139": "wstret", // Zbrzydzony
  "e8m1-humiliated-140": "zazenowanie-i-upokorzenie", // Upokorzony
  "e9m1-pessimistic-141": "beznadzieja-i-rozpacz", // Pesymistyczny
  "e10m1-guilty-142": "wstyd-i-wina", // Winny
  "e11m1-depressed-143": "przygnebienie", // Przygnębiony
  "e12m1-miserable-144": "smutek-i-zal", // Nieszczęśliwy

  // --- Rozszerzenie HEHP (Wysoka energia / Przyjemne): 12 nowych emocji ---
  "ext-amused-145": "rozbawienie", // Rozbawiony
  "ext-giddy-146": "rozbawienie", // Rozbrykany
  "ext-intrigued-147": "ciekawosc-i-naped", // Zaintrygowany
  "ext-fascinated-148": "ciekawosc-i-naped", // Zafascynowany
  "ext-absorbed-149": "zaangazowanie", // Pochłonięty
  "ext-resolute-150": "determinacja", // Zdecydowany
  "ext-ambitious-151": "determinacja", // Ambitny
  "ext-bold-152": "pewnosc-i-mistrzostwo", // Śmiały
  "ext-capable-153": "pewnosc-i-mistrzostwo", // Zdolny
  "ext-affectionate-154": "bliskosc", // Czuły
  "ext-attached-155": "bliskosc", // Przywiązany
  "ext-expectant-156": "nadzieja-i-spelnienie", // Wyczekujący
}

export function familyOfEmotionId(id: string): string | undefined {
  return FAMILY_OF[id]
}

// Płaska lista wszystkich rodzin + szybkie wyszukiwanie po ID (read-side: chipy
// rodzin w historii/kalendarzu). Nazwy lokalizujemy przez t('emotionFamilies.<id>.name').
export const ALL_FAMILIES: EmotionFamily[] = Object.values(FAMILIES_BY_QUADRANT).flat()
const FAMILY_BY_ID: Record<string, EmotionFamily> = Object.fromEntries(
  ALL_FAMILIES.map((f) => [f.id, f])
)
export function getFamilyById(id: string): EmotionFamily | undefined {
  return FAMILY_BY_ID[id]
}
