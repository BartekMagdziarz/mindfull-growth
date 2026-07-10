// emotionFamily.ts — warstwa RODZIN emocji = 45 grup taksonomii v2.
//
// Od 2026-07-10 rodziny są tożsame z grupami pickera (emotionGroups.ts) i są
// generowane z tych samych danych (design 6c). Zachowany interfejs konsumentów:
// chipy historii (HistoryEntryCard) i EmotionSelector w kreatorach. FAMILY_OF
// mapuje 184 słowa katalogu na grupy; rep = polska nazwa emocji reprezentatywnej
// (twarz-ikona, buildFaceSvg po nazwie). getFamilyById rozwiązuje też DAWNE slugi
// rodzin (energia, przygnebienie, bezpieczenstwo, zazenowanie-i-upokorzenie)
// przez spadkobierców — stare wpisy emotionFamilyIds w historii nadal dostają chip.
// Nazwy/sub lokalizowane przez t('emotionFamilies.<id>.name') — locale ma 45 wpisów.

import type { Quadrant } from '@/domain/emotion'
import { GROUP_OF_FAMILY } from '@/domain/emotionGroups'

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
    { id: "radosc", name: "Radość", sub: "pogodny · szczęśliwy", tint: "#2D74C9", rep: "Radosny", quadrant: "high-energy-high-pleasantness" },
    { id: "rozbawienie", name: "Rozbawienie", sub: "figlarny · rozbrykany", tint: "#2FA0D8", rep: "Figlarny", quadrant: "high-energy-high-pleasantness" },
    { id: "ekscytacja", name: "Ekscytacja · Energia", sub: "ożywiony · nakręcony", tint: "#2F8AE0", rep: "Podekscytowany", quadrant: "high-energy-high-pleasantness" },
    { id: "ciekawosc-i-naped", name: "Ciekawość", sub: "zaintrygowany · zafascynowany", tint: "#1F8FB0", rep: "Ciekawy", quadrant: "high-energy-high-pleasantness" },
    { id: "zaangazowanie", name: "Zaangażowanie", sub: "skupiony · pochłonięty", tint: "#3AA0A8", rep: "Zaangażowany", quadrant: "high-energy-high-pleasantness" },
    { id: "determinacja", name: "Determinacja", sub: "zdecydowany · ambitny", tint: "#2C9C8F", rep: "Zmotywowany", quadrant: "high-energy-high-pleasantness" },
    { id: "pewnosc-i-mistrzostwo", name: "Pewność siebie", sub: "zdolny · śmiały", tint: "#6168C9", rep: "Pewny siebie", quadrant: "high-energy-high-pleasantness" },
    { id: "duma", name: "Duma", sub: "spełniony · zwycięski", tint: "#7E6AD0", rep: "Dumny", quadrant: "high-energy-high-pleasantness" },
    { id: "nadzieja-i-spelnienie", name: "Nadzieja", sub: "wyczekujący · optymistyczny", tint: "#3F8FD0", rep: "Pełen nadziei", quadrant: "high-energy-high-pleasantness" },
    { id: "zaskoczenie-i-zachwyt", name: "Zaskoczenie", sub: "zdziwiony · zdumiony", tint: "#4A86D8", rep: "Zdumiony", quadrant: "high-energy-high-pleasantness" },
    { id: "bliskosc", name: "Bliskość", sub: "połączony · zakochany", tint: "#B5638F", rep: "Połączony", quadrant: "high-energy-high-pleasantness" },
    { id: "podziw", name: "Podziw · Inspiracja", sub: "zainspirowany · oniemiały", tint: "#5A7BD8", rep: "Zainspirowany", quadrant: "high-energy-high-pleasantness" },
  ],
  "high-energy-low-pleasantness": [
    { id: "stres-i-przytloczenie", name: "Stres · Przytłoczenie", sub: "spięty · przytłoczony", tint: "#c25a6c", rep: "Zestresowany", quadrant: "high-energy-low-pleasantness" },
    { id: "szok", name: "Szok · Wstrząs", sub: "wstrząśnięty · osłupiały", tint: "#c94f74", rep: "Wstrząśnięty", quadrant: "high-energy-low-pleasantness" },
    { id: "zamet", name: "Zamęt · Rozdarcie", sub: "rozdarty · zagubiony", tint: "#b85a86", rep: "Zdezorientowany", quadrant: "high-energy-low-pleasantness" },
    { id: "niepokoj-i-zmartwienie", name: "Niepokój · Zmartwienie", sub: "nieswój · zdenerwowany", tint: "#a85a92", rep: "Zmartwiony", quadrant: "high-energy-low-pleasantness" },
    { id: "strach-i-panika", name: "Strach · Panika", sub: "pełen obaw · przerażony", tint: "#b8447e", rep: "Przestraszony", quadrant: "high-energy-low-pleasantness" },
    { id: "irytacja-i-frustracja", name: "Irytacja · Frustracja", sub: "zirytowany · sfrustrowany", tint: "#cc5560", rep: "Zirytowany", quadrant: "high-energy-low-pleasantness" },
    { id: "gniew", name: "Złość", sub: "oburzony · wściekły", tint: "#c23a52", rep: "Zły", quadrant: "high-energy-low-pleasantness" },
    { id: "pogarda-i-zazdrosc", name: "Zazdrość · Zawiść", sub: "zazdrosny · zawistny", tint: "#9c4f8e", rep: "Zazdrosny", quadrant: "high-energy-low-pleasantness" },
    { id: "wstret", name: "Wstręt", sub: "zniesmaczony · zbrzydzony", tint: "#8f5aa0", rep: "Zbrzydzony", quadrant: "high-energy-low-pleasantness" },
    { id: "pogarda", name: "Pogarda", sub: "lekceważący · wyniosły", tint: "#96549c", rep: "Pogardliwy", quadrant: "high-energy-low-pleasantness" },
    { id: "upokorzenie", name: "Upokorzenie · Poniżenie", sub: "ośmieszony · zhańbiony", tint: "#a84f7e", rep: "Upokorzony", quadrant: "high-energy-low-pleasantness" },
  ],
  "low-energy-low-pleasantness": [
    { id: "wstyd-i-wina", name: "Wstyd · Zażenowanie", sub: "speszony · zażenowany", tint: "#9c5a92", rep: "Zawstydzony", quadrant: "low-energy-low-pleasantness" },
    { id: "wina-i-zal", name: "Wina · Żal", sub: "żałujący · skruszony", tint: "#8a5a9e", rep: "Winny", quadrant: "low-energy-low-pleasantness" },
    { id: "zranienie", name: "Zranienie", sub: "dotknięty · skrzywdzony", tint: "#7d5aa8", rep: "Urażony", quadrant: "low-energy-low-pleasantness" },
    { id: "smutek-i-zal", name: "Smutek · Przygnębienie", sub: "markotny · załamany", tint: "#6f5aa6", rep: "Smutny", quadrant: "low-energy-low-pleasantness" },
    { id: "beznadzieja-i-rozpacz", name: "Bezsilność · Rozpacz", sub: "bezradny · zrozpaczony", tint: "#5e4f97", rep: "Bezradny", quadrant: "low-energy-low-pleasantness" },
    { id: "zwatpienie-i-rozczarowanie", name: "Zniechęcenie", sub: "zrażony · zrezygnowany", tint: "#7560a4", rep: "Zniechęcony", quadrant: "low-energy-low-pleasantness" },
    { id: "rozczarowanie", name: "Rozczarowanie", sub: "zawiedziony · zgorzkniały", tint: "#6f5f9e", rep: "Rozczarowany", quadrant: "low-energy-low-pleasantness" },
    { id: "samotnosc-i-wykluczenie", name: "Samotność · Wykluczenie", sub: "wyobcowany · opuszczony", tint: "#6a5aa2", rep: "Samotny", quadrant: "low-energy-low-pleasantness" },
    { id: "tesknota", name: "Tęsknota", sub: "nostalgiczny · rzewny", tint: "#8a6aa6", rep: "Nostalgiczny", quadrant: "low-energy-low-pleasantness" },
    { id: "zmeczenie-i-wypalenie", name: "Zmęczenie · Wypalenie", sub: "znużony · wypalony", tint: "#7a6aaa", rep: "Zmęczony", quadrant: "low-energy-low-pleasantness" },
    { id: "apatia-i-znudzenie", name: "Apatia · Znudzenie", sub: "znudzony · obojętny", tint: "#8678a8", rep: "Znudzony", quadrant: "low-energy-low-pleasantness" },
    { id: "pustka", name: "Pustka", sub: "otępiały · odrętwiały", tint: "#6e6398", rep: "Odrętwiały", quadrant: "low-energy-low-pleasantness" },
  ],
  "low-energy-high-pleasantness": [
    { id: "spokoj-i-wyciszenie", name: "Spokój · Bezpieczeństwo", sub: "opanowany · wyciszony", tint: "#3a86cc", rep: "Spokojny", quadrant: "low-energy-high-pleasantness" },
    { id: "odprezenie-i-swoboda", name: "Odprężenie · Ulga", sub: "swobodny · beztroski", tint: "#3f97bf", rep: "Odprężony", quadrant: "low-energy-high-pleasantness" },
    { id: "zadowolenie-i-komfort", name: "Zadowolenie · Komfort", sub: "dobrze · błogi", tint: "#4a8fcf", rep: "Błogi", quadrant: "low-energy-high-pleasantness" },
    { id: "zaduma", name: "Zaduma", sub: "zamyślony · refleksyjny", tint: "#5572B8", rep: "Marzący", quadrant: "low-energy-high-pleasantness" },
    { id: "wdziecznosc", name: "Wdzięczność", sub: "wdzięczny · doceniający", tint: "#5a86d2", rep: "Pełen wdzięczności", quadrant: "low-energy-high-pleasantness" },
    { id: "wzruszenie", name: "Wzruszenie", sub: "poruszony · rozanielony", tint: "#647FD4", rep: "Poruszony", quadrant: "low-energy-high-pleasantness" },
    { id: "czulosc", name: "Czułość", sub: "serdeczny · tkliwy", tint: "#6E84D0", rep: "Rozczulony", quadrant: "low-energy-high-pleasantness" },
    { id: "troska-i-empatia", name: "Współczucie · Troska", sub: "troskliwy · przejęty", tint: "#6a86c8", rep: "Troskliwy", quadrant: "low-energy-high-pleasantness" },
    { id: "przynaleznosc-i-akceptacja", name: "Przynależność · Akceptacja", sub: "akceptowany · wspierany", tint: "#4f97c8", rep: "Przynależny", quadrant: "low-energy-high-pleasantness" },
    { id: "uznanie-i-szacunek", name: "Uznanie · Docenienie", sub: "doceniony · szanowany", tint: "#5a90cf", rep: "Ceniony", quadrant: "low-energy-high-pleasantness" },
  ],
}

// ID emocji → ID rodziny (= slug grupy). Generowane z emotion-data (design 6c).
export const FAMILY_OF: Record<string, string> = {
  "e10m1-guilty-142": "wina-i-zal", // Winny
  "e10m10-content-034": "zadowolenie-i-komfort", // Zaspokojony
  "e10m11-accepted-022": "przynaleznosc-i-akceptacja", // Akceptowany
  "e10m12-moved-010": "wzruszenie", // Poruszony
  "e10m2-numb-130": "pustka", // Odrętwiały
  "e10m3-excluded-118": "samotnosc-i-wykluczenie", // Wykluczony
  "e10m5-discouraged-094": "zwatpienie-i-rozczarowanie", // Zniechęcony
  "e10m7-sympathetic-070": "troska-i-empatia", // Troskliwy
  "e10m8-comfortable-058": "zadowolenie-i-komfort", // Komfortowo
  "e10m9-empathetic-046": "troska-i-empatia", // Empatyczny
  "e11m1-depressed-143": "smutek-i-zal", // Przygnębiony
  "e11m10-safe-035": "spokoj-i-wyciszenie", // Bezpieczny
  "e11m11-secure-023": "spokoj-i-wyciszenie", // Chroniony
  "e11m12-blessed-011": "wdziecznosc", // Błogosławiony
  "e11m2-hopeless-131": "beznadzieja-i-rozpacz", // Beznadziejny
  "e11m3-alienated-119": "samotnosc-i-wykluczenie", // Wyobcowany
  "e11m4-nostalgic-107": "tesknota", // Nostalgiczny
  "e11m5-lonely-095": "samotnosc-i-wykluczenie", // Samotny
  "e11m6-apathetic-083": "apatia-i-znudzenie", // Apatyczny
  "e11m7-mellow-071": "spokoj-i-wyciszenie", // Łagodny
  "e11m8-peaceful-059": "spokoj-i-wyciszenie", // Spokojny
  "e11m9-balanced-047": "spokoj-i-wyciszenie", // Zrównoważony
  "e12m1-miserable-144": "smutek-i-zal", // Nieszczęśliwy
  "e12m10-relieved-036": "odprezenie-i-swoboda", // Odciążony
  "e12m11-satisfied-024": "zadowolenie-i-komfort", // Usatysfakcjonowany
  "e12m12-serene-012": "spokoj-i-wyciszenie", // Pełen harmonii
  "e12m2-despair-132": "beznadzieja-i-rozpacz", // Zrozpaczony
  "e12m3-glum-120": "smutek-i-zal", // Ponury
  "e12m4-burned-out-108": "zmeczenie-i-wypalenie", // Wypalony
  "e12m5-exhausted-096": "zmeczenie-i-wypalenie", // Wyczerpany
  "e12m6-helpless-084": "beznadzieja-i-rozpacz", // Bezradny
  "e12m7-carefree-072": "odprezenie-i-swoboda", // Beztroski
  "e12m8-tranquil-060": "spokoj-i-wyciszenie", // Wyciszony
  "e12m9-thankful-048": "wdziecznosc", // Wdzięczny
  "e1m1-enraged-133": "gniew", // Rozwścieczony
  "e1m10-thrilled-025": "ekscytacja", // Podekscytowany
  "e1m11-elated-013": "radosc", // Rozradowany
  "e1m12-ecstatic-001": "podziw", // Zachwycony
  "e1m2-terrified-121": "strach-i-panika", // Przerażony
  "e1m3-panicked-109": "strach-i-panika", // Spanikowany
  "e1m4-shocked-097": "szok", // Wstrząśnięty
  "e1m6-hyper-073": "ekscytacja", // Nakręcony
  "e1m7-surprised-061": "zaskoczenie-i-zachwyt", // Zaskoczony
  "e1m8-awe-049": "podziw", // Oniemiały
  "e1m9-exhilarated-037": "ekscytacja", // Ożywiony
  "e2m1-livid-134": "gniew", // Wściekły
  "e2m10-amazed-026": "zaskoczenie-i-zachwyt", // Zdumiony
  "e2m11-inspired-014": "podziw", // Zainspirowany
  "e2m12-empowered-002": "pewnosc-i-mistrzostwo", // Wzmocniony
  "e2m3-overwhelmed-110": "stres-i-przytloczenie", // Przytłoczony
  "e2m4-stressed-098": "stres-i-przytloczenie", // Zestresowany
  "e2m6-pressured-074": "stres-i-przytloczenie", // Przyciśnięty
  "e2m7-excited-062": "ekscytacja", // Rozentuzjazmowany
  "e2m8-determined-050": "determinacja", // Zdeterminowany
  "e2m9-successful-038": "duma", // Zwycięski
  "e3m10-joyful-027": "radosc", // Radosny
  "e3m12-proud-003": "duma", // Dumny
  "e3m2-frightened-123": "strach-i-panika", // Przestraszony
  "e3m5-irritated-087": "irytacja-i-frustracja", // Zirytowany
  "e3m7-energized-063": "ekscytacja", // Pełen energii
  "e3m8-eager-051": "ekscytacja", // Chętny
  "e3m9-enthusiastic-039": "ekscytacja", // Entuzjastyczny
  "e4m1-jealous-136": "pogarda-i-zazdrosc", // Zazdrosny
  "e4m10-happy-028": "radosc", // Szczęśliwy
  "e4m11-motivated-016": "determinacja", // Zmotywowany
  "e4m12-optimistic-004": "nadzieja-i-spelnienie", // Optymistyczny
  "e4m3-angry-112": "gniew", // Zły
  "e4m4-jittery-100": "niepokoj-i-zmartwienie", // Podenerwowany
  "e4m5-fomo-088": "niepokoj-i-zmartwienie", // FOMO
  "e4m6-confused-076": "zamet", // Zdezorientowany
  "e4m7-cheerful-064": "radosc", // Wesoły
  "e4m8-curious-052": "ciekawosc-i-naped", // Ciekawy
  "e4m9-upbeat-040": "ekscytacja", // Pobudzony
  "e5m1-envious-137": "pogarda-i-zazdrosc", // Zawistny
  "e5m10-confident-029": "pewnosc-i-mistrzostwo", // Pewny siebie
  "e5m11-engaged-017": "zaangazowanie", // Zaangażowany
  "e5m12-challenged-005": "determinacja", // Zmobilizowany
  "e5m2-repulsed-125": "wstret", // Zniesmaczony
  "e5m3-frustrated-113": "irytacja-i-frustracja", // Sfrustrowany
  "e5m4-embarrassed-101": "wstyd-i-wina", // Skrępowany
  "e5m6-tense-077": "stres-i-przytloczenie", // Spięty
  "e5m7-pleasant-065": "radosc", // Pogodny
  "e5m8-focused-053": "zaangazowanie", // Skupiony
  "e5m9-alive-041": "ekscytacja", // Pełen życia
  "e6m1-contempt-138": "pogarda", // Pogardliwy
  "e6m10-wishful-030": "zaduma", // Marzący
  "e6m11-hopeful-018": "nadzieja-i-spelnienie", // Pełen nadziei
  "e6m12-accomplished-006": "pewnosc-i-mistrzostwo", // Kompetentny
  "e6m3-worried-114": "niepokoj-i-zmartwienie", // Zmartwiony
  "e6m4-nervous-102": "niepokoj-i-zmartwienie", // Zdenerwowany
  "e6m5-peeved-090": "irytacja-i-frustracja", // Podrażniony
  "e6m6-uneasy-078": "niepokoj-i-zmartwienie", // Nieswój
  "e6m7-pleased-066": "zadowolenie-i-komfort", // Zadowolony
  "e6m8-playful-054": "rozbawienie", // Figlarny
  "e6m9-delighted-042": "radosc", // Ucieszony
  "e7m1-disgusted-139": "wstret", // Zbrzydzony
  "e7m10-respected-031": "uznanie-i-szacunek", // Szanowany
  "e7m11-fulfilled-019": "duma", // Spełniony
  "e7m12-blissful-007": "zadowolenie-i-komfort", // Błogi
  "e7m2-trapped-127": "beznadzieja-i-rozpacz", // Uwięziony
  "e7m3-insecure-115": "niepokoj-i-zmartwienie", // Niepewny
  "e7m5-down-091": "smutek-i-zal", // Markotny
  "e7m6-bored-079": "apatia-i-znudzenie", // Znudzony
  "e7m7-calm-067": "spokoj-i-wyciszenie", // Opanowany
  "e7m8-at-ease-055": "odprezenie-i-swoboda", // Swobodny
  "e7m9-understood-043": "przynaleznosc-i-akceptacja", // Zrozumiany
  "e8m1-humiliated-140": "upokorzenie", // Upokorzony
  "e8m10-supported-032": "przynaleznosc-i-akceptacja", // Wspierany
  "e8m11-loved-020": "bliskosc", // Kochany
  "e8m12-connected-008": "bliskosc", // Połączony
  "e8m2-ashamed-128": "wstyd-i-wina", // Zawstydzony
  "e8m3-lost-116": "zamet", // Zagubiony
  "e8m4-disappointed-104": "rozczarowanie", // Rozczarowany
  "e8m5-meh-092": "apatia-i-znudzenie", // Nijako
  "e8m6-tired-080": "zmeczenie-i-wypalenie", // Zmęczony
  "e8m7-good-068": "zadowolenie-i-komfort", // Dobrze
  "e8m8-thoughtful-056": "zaduma", // Zamyślony
  "e8m9-appreciated-044": "uznanie-i-szacunek", // Doceniony
  "e9m1-pessimistic-141": "beznadzieja-i-rozpacz", // Pesymistyczny
  "e9m10-included-033": "przynaleznosc-i-akceptacja", // Przynależny
  "e9m11-valued-021": "uznanie-i-szacunek", // Ceniony
  "e9m12-grateful-009": "wdziecznosc", // Pełen wdzięczności
  "e9m2-vulnerable-129": "beznadzieja-i-rozpacz", // Bezbronny
  "e9m4-forlorn-105": "samotnosc-i-wykluczenie", // Opuszczony
  "e9m5-sad-093": "smutek-i-zal", // Smutny
  "e9m7-relaxed-069": "odprezenie-i-swoboda", // Odprężony
  "e9m8-chill-057": "odprezenie-i-swoboda", // Wyluzowany
  "e9m9-compassionate-045": "troska-i-empatia", // Współczujący
  "ext-abashed-188": "wstyd-i-wina", // Zażenowany
  "ext-absorbed-149": "zaangazowanie", // Pochłonięty
  "ext-admiring-175": "podziw", // Pełen podziwu
  "ext-affectionate-154": "czulosc", // Czuły
  "ext-ambitious-151": "determinacja", // Ambitny
  "ext-amused-145": "rozbawienie", // Rozbawiony
  "ext-appreciative-176": "wdziecznosc", // Doceniający
  "ext-apprehensive-183": "strach-i-panika", // Pełen obaw
  "ext-astonished-172": "zaskoczenie-i-zachwyt", // Zdziwiony
  "ext-attached-155": "bliskosc", // Przywiązany
  "ext-bitter-195": "rozczarowanie", // Zgorzkniały
  "ext-bold-152": "pewnosc-i-mistrzostwo", // Śmiały
  "ext-capable-153": "pewnosc-i-mistrzostwo", // Zdolny
  "ext-concerned-178": "troska-i-empatia", // Przejęty
  "ext-contrite-189": "wina-i-zal", // Skruszony
  "ext-dazed-180": "szok", // Oszołomiony
  "ext-demeaned-186": "upokorzenie", // Poniżony
  "ext-devastated-167": "smutek-i-zal", // Załamany
  "ext-disgraced-187": "upokorzenie", // Zhańbiony
  "ext-dismissive-166": "pogarda", // Lekceważący
  "ext-doting-177": "czulosc", // Tkliwy
  "ext-dulled-200": "pustka", // Otępiały
  "ext-dumbfounded-182": "szok", // Osłupiały
  "ext-embittered-193": "zranienie", // Rozgoryczony
  "ext-empty-169": "pustka", // Pusty
  "ext-enraptured-159": "wzruszenie", // Rozanielony
  "ext-expectant-156": "nadzieja-i-spelnienie", // Wyczekujący
  "ext-fascinated-148": "ciekawosc-i-naped", // Zafascynowany
  "ext-flustered-164": "wstyd-i-wina", // Speszony
  "ext-giddy-146": "rozbawienie", // Rozbrykany
  "ext-haughty-165": "pogarda", // Wyniosły
  "ext-impatient-162": "irytacja-i-frustracja", // Zniecierpliwiony
  "ext-indifferent-199": "apatia-i-znudzenie", // Obojętny
  "ext-indignant-184": "gniew", // Oburzony
  "ext-inlove-174": "bliskosc", // Zakochany
  "ext-intrigued-147": "ciekawosc-i-naped", // Zaintrygowany
  "ext-letdown-196": "rozczarowanie", // Zawiedziony
  "ext-longing-170": "tesknota", // Stęskniony
  "ext-loving-173": "bliskosc", // Kochający
  "ext-noticed-179": "uznanie-i-szacunek", // Zauważony
  "ext-offended-161": "zranienie", // Urażony
  "ext-reflective-160": "zaduma", // Refleksyjny
  "ext-regretful-171": "wina-i-zal", // Żałujący
  "ext-resigned-168": "zwatpienie-i-rozczarowanie", // Zrezygnowany
  "ext-resolute-150": "determinacja", // Zdecydowany
  "ext-ridiculed-185": "upokorzenie", // Ośmieszony
  "ext-soured-194": "zwatpienie-i-rozczarowanie", // Zrażony
  "ext-stung-191": "zranienie", // Dotknięty
  "ext-stunned-181": "szok", // Zszokowany
  "ext-tender-158": "czulosc", // Rozczulony
  "ext-torn-163": "zamet", // Rozdarty
  "ext-warmhearted-157": "czulosc", // Serdeczny
  "ext-weary-198": "zmeczenie-i-wypalenie", // Znużony
  "ext-wistful-197": "tesknota", // Rzewny
  "ext-wounded-190": "zranienie", // Zraniony
  "ext-wronged-192": "zranienie", // Skrzywdzony
}

export function familyOfEmotionId(id: string): string | undefined {
  return FAMILY_OF[id]
}

export const ALL_FAMILIES: EmotionFamily[] = Object.values(FAMILIES_BY_QUADRANT).flat()
const FAMILY_BY_ID: Record<string, EmotionFamily> = Object.fromEntries(
  ALL_FAMILIES.map((f) => [f.id, f])
)

/** Rodzina po ID; dawne slugi rodzin rozwiązywane przez spadkobierców grup. */
export function getFamilyById(id: string): EmotionFamily | undefined {
  return FAMILY_BY_ID[id] ?? FAMILY_BY_ID[GROUP_OF_FAMILY[id] ?? '']
}
