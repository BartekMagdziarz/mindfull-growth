// emotionFace.ts — minimalist LINE-FACE engine for the emotion scatter prototype.
//
// Ported from the "Ikony emocji" Claude Design project (icons-{hehp,help,lehp,lelp}.jsx).
// Każda emocja to maleńka twarz: usta kodują przyjemność, oczy/brwi energię i
// charakter, a iskry/serca/łzy to akcenty. Mimika stopniuje się w obrębie grupy
// (łagodne → mocne). Tu renderujemy BEZ obrysu głowy (head=false) — granicę twarzy
// daje neumorficzny krążek w EmotionFaceIcon.vue.
//
// Cztery tablice F z designu (po jednej na ćwiartkę) są rozłączne i scalone w
// FACE_SPECS. Dziesięć nazw z naszej taksonomii, których design nie zawierał
// (przeredagował je), dostało spójne specyfikacje z tego samego słownika cech.

import plEmotions from '@/locales/pl/emotions.json'

export type FaceSpec = {
  eyes: string
  brow: string
  mouth: [string, number]
  accent: string
}

// ----- geometria twarzy (viewBox 0 0 32 32) -----
const CX = 16,
  EL = 11.5,
  ER = 20.5,
  EY = 14.2,
  BY = 9.6,
  MY = 21.0,
  ML = 11.0,
  MR = 21.0,
  SW = 1.2

// pomocniczy stroke-path (cienka kreska, zaokrąglone końce)
function sp(d: string, c: string, join = false): string {
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"${
    join ? ' stroke-linejoin="round"' : ''
  }/>`
}

function star(cx: number, cy: number, R: number, c: string): string {
  const q = R * 0.3
  const d = `M${cx} ${cy - R} Q ${cx + q} ${cy - q} ${cx + R} ${cy} Q ${cx + q} ${cy + q} ${cx} ${cy + R} Q ${cx - q} ${cy + q} ${cx - R} ${cy} Q ${cx - q} ${cy - q} ${cx} ${cy - R} Z`
  return `<path d="${d}" fill="${c}"/>`
}

function heart(cx: number, cy: number, s: number, c: string): string {
  const d = `M${cx} ${cy + s * 0.78} C ${cx - s} ${cy - s * 0.05} ${cx - s * 0.5} ${cy - s} ${cx} ${cy - s * 0.32} C ${cx + s * 0.5} ${cy - s} ${cx + s} ${cy - s * 0.05} ${cx} ${cy + s * 0.78} Z`
  return `<path d="${d}" fill="${c}"/>`
}

function gearEye(cx: number, cy: number, c: string): string {
  let teeth = ''
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 12
    teeth += `<line x1="${(cx + Math.cos(a) * 1.55).toFixed(2)}" y1="${(cy + Math.sin(a) * 1.55).toFixed(2)}" x2="${(cx + Math.cos(a) * 2.95).toFixed(2)}" y2="${(cy + Math.sin(a) * 2.95).toFixed(2)}"/>`
  }
  return (
    `<g stroke="${c}" stroke-width="${SW * 0.9}" stroke-linecap="round" fill="none"><circle cx="${cx}" cy="${cy}" r="1.55"/>${teeth}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="0.62" fill="${c}"/>`
  )
}

// jedno oko o środku w (cx, EY)
function eye(type: string, cx: number, c: string): string {
  switch (type) {
    case 'dot':
      return `<circle cx="${cx}" cy="${EY}" r="1.55" fill="${c}"/>`
    case 'wide':
      return `<circle cx="${cx}" cy="${EY}" r="2.85" fill="none" stroke="${c}" stroke-width="${SW}"/><circle cx="${cx}" cy="${EY + 0.4}" r="0.8" fill="${c}"/>`
    case 'wider':
      return `<circle cx="${cx}" cy="${EY}" r="3.25" fill="none" stroke="${c}" stroke-width="${SW}"/><circle cx="${cx}" cy="${EY + 0.5}" r="0.85" fill="${c}"/>`
    case 'happy':
      return sp(`M${cx - 2.9} ${EY + 1.0} Q ${cx} ${EY - 2.5} ${cx + 2.9} ${EY + 1.0}`, c)
    case 'soft':
      return sp(`M${cx - 2.5} ${EY - 0.4} Q ${cx} ${EY + 2.0} ${cx + 2.5} ${EY - 0.4}`, c)
    case 'closed':
      return sp(`M${cx - 2.6} ${EY} Q ${cx} ${EY + 1.1} ${cx + 2.6} ${EY}`, c)
    case 'droop':
      return (
        sp(`M${cx - 2.6} ${EY - 0.6} Q ${cx} ${EY + 1.2} ${cx + 2.6} ${EY - 0.6}`, c) +
        `<circle cx="${cx}" cy="${EY + 0.2}" r="0.95" fill="${c}"/>`
      )
    case 'half':
      return (
        sp(`M${cx - 2.4} ${EY - 0.6} L ${cx + 2.4} ${EY - 0.6}`, c) +
        `<circle cx="${cx}" cy="${EY + 0.8}" r="0.95" fill="${c}"/>`
      )
    case 'glance':
      return `<circle cx="${cx + 1.2}" cy="${EY}" r="1.5" fill="${c}"/>`
    case 'look':
      return `<circle cx="${cx}" cy="${EY + 1.0}" r="1.5" fill="${c}"/>`
    case 'up':
      return `<circle cx="${cx}" cy="${EY}" r="2.5" fill="none" stroke="${c}" stroke-width="${SW}"/><circle cx="${cx}" cy="${EY - 1.25}" r="0.95" fill="${c}"/>`
    case 'star':
      return star(cx, EY, 3.45, c)
    case 'heart':
      return heart(cx, EY, 3.1, c)
    case 'gear':
      return gearEye(cx, EY, c)
    default:
      return `<circle cx="${cx}" cy="${EY}" r="1.55" fill="${c}"/>`
  }
}

function brows(type: string, c: string): string {
  switch (type) {
    case 'raise':
      return [EL, ER]
        .map((cx) => sp(`M${cx - 2.8} ${BY + 0.9} Q ${cx} ${BY - 1.1} ${cx + 2.8} ${BY + 0.9}`, c))
        .join('')
    case 'flat':
      return [EL, ER]
        .map((cx) => sp(`M${cx - 2.6} ${BY + 1.1} L ${cx + 2.6} ${BY + 1.1}`, c))
        .join('')
    case 'anger':
      return (
        sp(`M${EL - 2.8} ${BY - 0.3} L ${EL + 2.7} ${BY + 1.9}`, c) +
        sp(`M${ER - 2.7} ${BY + 1.9} L ${ER + 2.8} ${BY - 0.3}`, c)
      )
    case 'worry':
      return (
        sp(`M${EL - 2.8} ${BY + 1.7} L ${EL + 2.7} ${BY - 0.3}`, c) +
        sp(`M${ER - 2.7} ${BY - 0.3} L ${ER + 2.8} ${BY + 1.7}`, c)
      )
    case 'sad':
      return (
        sp(`M${EL - 2.8} ${BY + 1.7} L ${EL + 2.7} ${BY - 0.2}`, c) +
        sp(`M${ER - 2.7} ${BY - 0.2} L ${ER + 2.8} ${BY + 1.7}`, c)
      )
    case 'one':
      return (
        sp(`M${EL - 2.6} ${BY + 1.5} L ${EL + 2.6} ${BY + 1.1}`, c) +
        sp(`M${ER - 2.8} ${BY + 0.5} Q ${ER} ${BY - 1.5} ${ER + 2.8} ${BY + 0.5}`, c)
      )
    default:
      return ''
  }
}

function mouth(spec: [string, number], c: string): string {
  const [t, k] = spec
  switch (t) {
    case 'grin':
      return `<path d="M${ML} ${MY - 0.3} Q ${CX} ${MY + k + 1.2} ${MR} ${MY - 0.3} Z" fill="${c}" stroke="${c}" stroke-width="${SW * 0.5}" stroke-linejoin="round"/>`
    case 'smirk':
      return sp(`M${ML + 0.5} ${MY + 0.4} Q ${CX} ${MY} ${MR + 0.5} ${MY - 2.0}`, c)
    case 'open':
      return `<ellipse cx="${CX}" cy="${MY + 0.35}" rx="${(k * 0.77).toFixed(2)}" ry="${k}" fill="none" stroke="${c}" stroke-width="${SW}"/>`
    case 'frown':
      return sp(`M${ML} ${MY + 0.6} Q ${CX} ${MY - k} ${MR} ${MY + 0.6}`, c)
    case 'flat':
      return sp(`M${ML} ${MY} L ${MR} ${MY}`, c)
    case 'wavy':
      return sp(`M${ML} ${MY} Q ${ML + 2.5} ${MY - k} ${CX} ${MY} T ${MR} ${MY}`, c)
    case 'smirkdown':
      return sp(`M${ML + 0.4} ${MY - 1.5} Q ${CX} ${MY + 0.3} ${MR + 0.3} ${MY + 1.0}`, c, true)
    case 'grimace':
      return sp(
        `M${ML} ${MY - 0.4} Q ${ML + 3} ${MY + 1.6} ${CX} ${MY - 0.2} Q ${CX + 3} ${MY - 1.6} ${MR} ${MY + 0.4}`,
        c,
        true
      )
    case 'small':
      return sp(`M${ML + 2.4} ${MY + 0.4} Q ${CX} ${MY - k} ${MR - 2.4} ${MY + 0.4}`, c)
    case 'wist':
      return sp(`M${ML + 2.2} ${MY} Q ${CX} ${MY + k} ${MR - 2.2} ${MY}`, c)
    case 'grit': {
      const x0 = ML + 0.8,
        x1 = MR - 0.8,
        top = MY - k,
        bot = MY + k
      const t1 = x0 + (x1 - x0) / 3,
        t2 = x0 + ((x1 - x0) * 2) / 3
      return `<g fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"><path d="M${x0} ${top} L${x1} ${top} L${x1} ${bot} L${x0} ${bot} Z"/><line x1="${t1}" y1="${top}" x2="${t1}" y2="${bot}"/><line x1="${t2}" y1="${top}" x2="${t2}" y2="${bot}"/></g>`
    }
    default:
      // smile / calm
      return sp(`M${ML} ${MY} Q ${CX} ${MY + k} ${MR} ${MY}`, c)
  }
}

function accent(type: string, c: string): string {
  switch (type) {
    case 'spark1':
      return star(26.6, 7.0, 2.4, c)
    case 'spark2':
      return star(26.8, 6.8, 2.4, c) + star(5.2, 8.6, 1.9, c)
    case 'idea':
      return star(CX, 3.6, 2.4, c)
    case 'heart':
      return heart(26.4, 7.0, 2.7, c)
    case 'blush':
      return `<ellipse cx="9.0" cy="19.5" rx="1.9" ry="1.1" fill="${c}" opacity="0.23"/><ellipse cx="23.0" cy="19.5" rx="1.9" ry="1.1" fill="${c}" opacity="0.23"/>`
    case 'sweat':
      return `<path d="M24.9 6.6 C26.4 8.8 26.4 10.7 24.9 10.7 C23.4 10.7 23.4 8.8 24.9 6.6 Z" fill="${c}" opacity="0.85"/>`
    case 'steam':
      return (
        sp('M12.2 3.4 Q10.9 1.9 12.2 0.6', c).replace('/>', ' opacity="0.8"/>') +
        sp('M16.6 3.2 Q17.9 1.7 16.6 0.5', c).replace('/>', ' opacity="0.8"/>')
      )
    case 'tear':
      return `<path d="M${EL} ${EY + 2.4} C ${EL + 1.35} ${EY + 4.4} ${EL + 1.35} ${EY + 5.9} ${EL} ${EY + 5.9} C ${EL - 1.35} ${EY + 5.9} ${EL - 1.35} ${EY + 4.4} ${EL} ${EY + 2.4} Z" fill="${c}" opacity="0.8"/>`
    default:
      return ''
  }
}

// Renderuje SVG twarzy z gotowej specyfikacji (wspólny rdzeń dla obu wejść).
function renderFace(spec: FaceSpec, color: string, size: number): string {
  const c = color
  let inner = ''
  if (spec.eyes === 'wink') {
    inner += `<circle cx="${EL}" cy="${EY}" r="1.55" fill="${c}"/>`
    inner += sp(`M${ER - 2.8} ${EY + 1.1} Q ${ER} ${EY - 2.0} ${ER + 2.8} ${EY + 1.1}`, c)
  } else {
    inner += eye(spec.eyes, EL, c) + eye(spec.eyes, ER, c)
  }
  inner += brows(spec.brow, c)
  inner += mouth(spec.mouth, c)
  inner += accent(spec.accent, c)
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">${inner}</svg>`
}

// Pełen SVG twarzy po polskiej nazwie (klucz designu). Zwraca '' dla nieznanej nazwy.
export function buildFaceSvg(name: string, color: string, size = 28): string {
  const spec = FACE_SPECS[name]
  if (!spec) return ''
  return renderFace(spec, color, size)
}

// per-emocja specyfikacja mimiki { eyes, brow, mouth:[type,k], accent }
export const FACE_SPECS: Record<string, FaceSpec> = {
  "Pogodny": { eyes: "dot", brow: "none", mouth: ["smile", 2], accent: "none" },
  "Wesoły": { eyes: "dot", brow: "none", mouth: ["smile", 3.4], accent: "none" },
  "Radosny": { eyes: "dot", brow: "none", mouth: ["smile", 4.4], accent: "none" },
  "Ucieszony": { eyes: "happy", brow: "none", mouth: ["smile", 4.2], accent: "none" },
  "Rozradowany": { eyes: "happy", brow: "none", mouth: ["grin", 5], accent: "none" },
  "Szczęśliwy": { eyes: "happy", brow: "none", mouth: ["grin", 5.2], accent: "blush" },
  "Podekscytowany": { eyes: "dot", brow: "raise", mouth: ["open", 3], accent: "spark1" },
  "Zachwycony": { eyes: "star", brow: "none", mouth: ["grin", 5.6], accent: "spark2" },
  "Pobudzony": { eyes: "dot", brow: "raise", mouth: ["smile", 3], accent: "none" },
  "Pełen energii": { eyes: "dot", brow: "raise", mouth: ["smile", 3.8], accent: "none" },
  "Nakręcony": { eyes: "dot", brow: "raise", mouth: ["open", 2.8], accent: "spark1" },
  "Rozentuzjazmowany": { eyes: "dot", brow: "raise", mouth: ["grin", 4.8], accent: "spark1" },
  "Entuzjastyczny": { eyes: "star", brow: "raise", mouth: ["grin", 5], accent: "spark2" },
  "Pełen życia": { eyes: "happy", brow: "none", mouth: ["grin", 5], accent: "spark1" },
  "Ożywiony": { eyes: "dot", brow: "raise", mouth: ["open", 3.3], accent: "spark2" },
  "Ciekawy": { eyes: "dot", brow: "one", mouth: ["smile", 2.2], accent: "none" },
  "Zaangażowany": { eyes: "dot", brow: "none", mouth: ["smile", 2.6], accent: "none" },
  "Skupiony": { eyes: "dot", brow: "flat", mouth: ["calm", 1.4], accent: "none" },
  "Zmotywowany": { eyes: "dot", brow: "one", mouth: ["smile", 2.8], accent: "none" },
  "Zmobilizowany": { eyes: "dot", brow: "flat", mouth: ["smirk", 0], accent: "none" },
  "Zdeterminowany": { eyes: "dot", brow: "flat", mouth: ["smirk", 0], accent: "none" },
  "Zainspirowany": { eyes: "dot", brow: "none", mouth: ["smile", 3.2], accent: "idea" },
  "Wzmocniony": { eyes: "dot", brow: "none", mouth: ["smirk", 0], accent: "none" },
  "Pewny siebie": { eyes: "dot", brow: "one", mouth: ["smirk", 0], accent: "none" },
  "Produktywny": { eyes: "gear", brow: "none", mouth: ["smile", 2.8], accent: "none" },
  "Kompetentny": { eyes: "soft", brow: "one", mouth: ["smirk", 0], accent: "none" },
  "Dumny": { eyes: "happy", brow: "none", mouth: ["smirk", 0], accent: "none" },
  "Zwycięski": { eyes: "dot", brow: "none", mouth: ["grin", 5], accent: "spark1" },
  "Pełen nadziei": { eyes: "up", brow: "none", mouth: ["smile", 2.6], accent: "spark1" },
  "Optymistyczny": { eyes: "happy", brow: "none", mouth: ["smile", 3], accent: "none" },
  "Kontent": { eyes: "soft", brow: "none", mouth: ["calm", 2], accent: "none" },
  "Spełniony": { eyes: "soft", brow: "none", mouth: ["smile", 2.4], accent: "none" },
  "Zaskoczony": { eyes: "wide", brow: "raise", mouth: ["open", 2.4], accent: "none" },
  "Zdumiony": { eyes: "wide", brow: "raise", mouth: ["open", 3.4], accent: "spark1" },
  "Oniemiały": { eyes: "wide", brow: "raise", mouth: ["open", 4.3], accent: "spark2" },
  "Figlarny": { eyes: "wink", brow: "none", mouth: ["smile", 3.4], accent: "spark1" },
  "Połączony": { eyes: "happy", brow: "none", mouth: ["smile", 3.2], accent: "blush" },
  "Kochany": { eyes: "heart", brow: "none", mouth: ["smile", 3], accent: "heart" },
  "Zły": { eyes: "dot", brow: "anger", mouth: ["frown", 2.6], accent: "none" },
  "Rozsierdzony": { eyes: "dot", brow: "anger", mouth: ["frown", 3.2], accent: "none" },
  "Rozjuszony": { eyes: "dot", brow: "anger", mouth: ["grit", 1.3], accent: "none" },
  "Wściekły": { eyes: "dot", brow: "anger", mouth: ["grit", 1.6], accent: "steam" },
  "Rozwścieczony": { eyes: "dot", brow: "anger", mouth: ["grit", 2.2], accent: "steam" },
  "Zazdrosny": { eyes: "glance", brow: "one", mouth: ["frown", 2], accent: "none" },
  "Zawistny": { eyes: "glance", brow: "one", mouth: ["flat", 0], accent: "none" },
  "Pogardliwy": { eyes: "glance", brow: "one", mouth: ["smirkdown", 0], accent: "none" },
  "Wystraszony": { eyes: "wide", brow: "raise", mouth: ["open", 2], accent: "none" },
  "Przestraszony": { eyes: "wide", brow: "raise", mouth: ["open", 2.6], accent: "none" },
  "Strwożony": { eyes: "wide", brow: "worry", mouth: ["open", 2.4], accent: "none" },
  "Zlękniony": { eyes: "wide", brow: "worry", mouth: ["open", 2.8], accent: "none" },
  "Wstrząśnięty": { eyes: "wider", brow: "raise", mouth: ["open", 3.6], accent: "sweat" },
  "Spanikowany": { eyes: "wider", brow: "raise", mouth: ["open", 3.4], accent: "sweat" },
  "Przerażony": { eyes: "wider", brow: "raise", mouth: ["open", 4.2], accent: "sweat" },
  "Spięty": { eyes: "dot", brow: "flat", mouth: ["grit", 1.3], accent: "none" },
  "Przyciśnięty": { eyes: "dot", brow: "flat", mouth: ["grit", 1.4], accent: "sweat" },
  "Rozgorączkowany": { eyes: "dot", brow: "anger", mouth: ["grit", 1.5], accent: "sweat" },
  "Zestresowany": { eyes: "dot", brow: "anger", mouth: ["grit", 1.5], accent: "sweat" },
  "Przytłoczony": { eyes: "wide", brow: "anger", mouth: ["grit", 1.8], accent: "sweat" },
  "Nieswój": { eyes: "dot", brow: "worry", mouth: ["wavy", 1.2], accent: "none" },
  "Niespokojny": { eyes: "dot", brow: "worry", mouth: ["wavy", 1.3], accent: "none" },
  "Zaniepokojony": { eyes: "dot", brow: "worry", mouth: ["frown", 2.4], accent: "none" },
  "Zmartwiony": { eyes: "dot", brow: "worry", mouth: ["frown", 2.8], accent: "none" },
  "Strapiony": { eyes: "dot", brow: "worry", mouth: ["frown", 3], accent: "sweat" },
  "Podenerwowany": { eyes: "dot", brow: "worry", mouth: ["wavy", 1.4], accent: "sweat" },
  "Zdenerwowany": { eyes: "dot", brow: "worry", mouth: ["frown", 2.6], accent: "sweat" },
  "Podrażniony": { eyes: "half", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Poirytowany": { eyes: "half", brow: "flat", mouth: ["frown", 2.2], accent: "none" },
  "Zirytowany": { eyes: "half", brow: "anger", mouth: ["frown", 2.6], accent: "none" },
  "Sfrustrowany": { eyes: "dot", brow: "anger", mouth: ["grit", 1.5], accent: "sweat" },
  "FOMO": { eyes: "dot", brow: "raise", mouth: ["wavy", 1.4], accent: "none" },
  "Zniesmaczony": { eyes: "half", brow: "one", mouth: ["grimace", 0], accent: "none" },
  "Skrępowany": { eyes: "glance", brow: "worry", mouth: ["wavy", 1.2], accent: "sweat" },
  "Zdezorientowany": { eyes: "dot", brow: "one", mouth: ["open", 1.6], accent: "none" },
  "Opanowany": { eyes: "soft", brow: "none", mouth: ["calm", 1.6], accent: "none" },
  "Spokojny": { eyes: "soft", brow: "none", mouth: ["smile", 2], accent: "none" },
  "Łagodny": { eyes: "soft", brow: "none", mouth: ["smile", 2], accent: "none" },
  "Wyciszony": { eyes: "closed", brow: "none", mouth: ["calm", 1.6], accent: "none" },
  "Zrównoważony": { eyes: "dot", brow: "none", mouth: ["smile", 1.8], accent: "none" },
  "Pełen harmonii": { eyes: "closed", brow: "none", mouth: ["smile", 2], accent: "none" },
  "Swobodny": { eyes: "soft", brow: "none", mouth: ["smile", 2.4], accent: "none" },
  "Wyluzowany": { eyes: "soft", brow: "none", mouth: ["smile", 2.6], accent: "none" },
  "Odprężony": { eyes: "closed", brow: "none", mouth: ["smile", 2.2], accent: "none" },
  "Odciążony": { eyes: "closed", brow: "none", mouth: ["smile", 2.4], accent: "none" },
  "Beztroski": { eyes: "happy", brow: "none", mouth: ["smile", 2.8], accent: "none" },
  "Dobrze": { eyes: "dot", brow: "none", mouth: ["smile", 2.4], accent: "none" },
  "Komfortowo": { eyes: "soft", brow: "none", mouth: ["smile", 2.4], accent: "none" },
  "Zaspokojony": { eyes: "soft", brow: "none", mouth: ["smile", 2.6], accent: "none" },
  "Usatysfakcjonowany": { eyes: "happy", brow: "none", mouth: ["smile", 2.8], accent: "none" },
  "Błogi": { eyes: "closed", brow: "none", mouth: ["smile", 2.6], accent: "spark1" },
  "Poruszony": { eyes: "soft", brow: "none", mouth: ["smile", 2], accent: "spark1" },
  "Wdzięczny": { eyes: "soft", brow: "none", mouth: ["smile", 2.4], accent: "spark1" },
  "Pełen wdzięczności": { eyes: "closed", brow: "none", mouth: ["smile", 2.6], accent: "spark1" },
  "Błogosławiony": { eyes: "up", brow: "none", mouth: ["smile", 2.4], accent: "spark2" },
  "Szanowany": { eyes: "dot", brow: "none", mouth: ["smile", 2.2], accent: "none" },
  "Ceniony": { eyes: "dot", brow: "none", mouth: ["smile", 2.2], accent: "none" },
  "Akceptowany": { eyes: "soft", brow: "none", mouth: ["smile", 2.4], accent: "none" },
  "Wspierany": { eyes: "soft", brow: "none", mouth: ["smile", 2.4], accent: "blush" },
  "Przynależny": { eyes: "happy", brow: "none", mouth: ["smile", 2.4], accent: "blush" },
  "Doceniony": { eyes: "happy", brow: "none", mouth: ["smile", 2.6], accent: "blush" },
  "Zrozumiany": { eyes: "dot", brow: "none", mouth: ["smile", 2], accent: "none" },
  "Chroniony": { eyes: "soft", brow: "none", mouth: ["smile", 2], accent: "none" },
  "Bezpieczny": { eyes: "closed", brow: "none", mouth: ["calm", 1.8], accent: "none" },
  "Zamyślony": { eyes: "dot", brow: "none", mouth: ["calm", 1.4], accent: "none" },
  "Współczujący": { eyes: "soft", brow: "none", mouth: ["smile", 2], accent: "heart" },
  "Empatyczny": { eyes: "soft", brow: "none", mouth: ["smile", 2], accent: "heart" },
  "Troskliwy": { eyes: "happy", brow: "none", mouth: ["smile", 2.2], accent: "heart" },
  "Markotny": { eyes: "dot", brow: "sad", mouth: ["frown", 2], accent: "none" },
  "Przybity": { eyes: "dot", brow: "sad", mouth: ["frown", 2.6], accent: "none" },
  "Smutny": { eyes: "dot", brow: "sad", mouth: ["frown", 3], accent: "none" },
  "Przygnębiony": { eyes: "droop", brow: "sad", mouth: ["frown", 3.2], accent: "none" },
  "Ponury": { eyes: "droop", brow: "sad", mouth: ["frown", 3.4], accent: "none" },
  "Nieszczęśliwy": { eyes: "dot", brow: "sad", mouth: ["frown", 3.6], accent: "tear" },
  "Pesymistyczny": { eyes: "dot", brow: "sad", mouth: ["frown", 2.6], accent: "none" },
  "Zniechęcony": { eyes: "droop", brow: "sad", mouth: ["frown", 3], accent: "none" },
  "Beznadziejny": { eyes: "droop", brow: "sad", mouth: ["frown", 3.4], accent: "tear" },
  "Bezradny": { eyes: "droop", brow: "sad", mouth: ["frown", 3.2], accent: "tear" },
  "Zrozpaczony": { eyes: "closed", brow: "sad", mouth: ["frown", 4], accent: "tear" },
  "Zmęczony": { eyes: "droop", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Wymęczony": { eyes: "droop", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Wykończony": { eyes: "closed", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Wyczerpany": { eyes: "closed", brow: "flat", mouth: ["small", 1.4], accent: "none" },
  "Wypalony": { eyes: "closed", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Znudzony": { eyes: "half", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Nijako": { eyes: "half", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Odrętwiały": { eyes: "half", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Wyłączony": { eyes: "closed", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Apatyczny": { eyes: "half", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Odłączony": { eyes: "look", brow: "flat", mouth: ["small", 1.4], accent: "none" },
  "Wyobcowany": { eyes: "look", brow: "flat", mouth: ["flat", 0], accent: "none" },
  "Wykluczony": { eyes: "look", brow: "sad", mouth: ["frown", 2.2], accent: "none" },
  "Samotny": { eyes: "look", brow: "sad", mouth: ["frown", 2.4], accent: "none" },
  "Opuszczony": { eyes: "look", brow: "sad", mouth: ["frown", 2.8], accent: "tear" },
  "Bezbronny": { eyes: "look", brow: "sad", mouth: ["wavy", 1.2], accent: "none" },
  "Zawstydzony": { eyes: "look", brow: "sad", mouth: ["wavy", 1.2], accent: "blush" },
  "Winny": { eyes: "look", brow: "sad", mouth: ["frown", 2.2], accent: "none" },
  "Uwięziony": { eyes: "dot", brow: "sad", mouth: ["frown", 2.8], accent: "none" },
  "Upokorzony": { eyes: "look", brow: "sad", mouth: ["frown", 2.6], accent: "blush" },
  "Niepewny": { eyes: "dot", brow: "one", mouth: ["wavy", 1.2], accent: "none" },
  "Nostalgiczny": { eyes: "dot", brow: "sad", mouth: ["wist", 1.3], accent: "none" },
  "Zagubiony": { eyes: "look", brow: "one", mouth: ["open", 1.6], accent: "none" },
  "Rozczarowany": { eyes: "dot", brow: "sad", mouth: ["frown", 2.6], accent: "none" },
  "Zbrzydzony": { eyes: "half", brow: "one", mouth: ["grimace", 0], accent: "none" },
  // Nazwy z naszej taksonomii, które design przeredagował — spójne specyfikacje.
  "Marzący": { eyes: "up", brow: "none", mouth: ["smile", 2.6], accent: "spark1" },
  "Chętny": { eyes: "dot", brow: "raise", mouth: ["smile", 3], accent: "none" },
  "Zadowolony": { eyes: "soft", brow: "none", mouth: ["smile", 2.6], accent: "none" },
  "Pod presją": { eyes: "dot", brow: "anger", mouth: ["grit", 1.4], accent: "sweat" },
  "Rozedrgany": { eyes: "wide", brow: "raise", mouth: ["wavy", 1.4], accent: "sweat" },
  "Pełen obaw": { eyes: "dot", brow: "worry", mouth: ["frown", 2.6], accent: "sweat" },
  "Roztrzęsiony": { eyes: "wide", brow: "worry", mouth: ["open", 2.4], accent: "sweat" },
  "Nerwowy": { eyes: "dot", brow: "worry", mouth: ["wavy", 1.4], accent: "sweat" },
  "Wkurzony": { eyes: "dot", brow: "anger", mouth: ["grit", 1.6], accent: "steam" },
  "Zatroskany": { eyes: "dot", brow: "worry", mouth: ["frown", 2.4], accent: "none" },
  // --- Rozszerzenie HEHP (Wysoka energia / Przyjemne) ---
  "Rozbawiony": { eyes: "happy", brow: "none", mouth: ["grin", 4.4], accent: "none" },
  "Rozbrykany": { eyes: "happy", brow: "raise", mouth: ["grin", 5], accent: "spark1" },
  "Zaintrygowany": { eyes: "dot", brow: "one", mouth: ["smile", 2.2], accent: "none" },
  "Zafascynowany": { eyes: "star", brow: "raise", mouth: ["smile", 3], accent: "idea" },
  "Pochłonięty": { eyes: "dot", brow: "flat", mouth: ["calm", 1.6], accent: "none" },
  "Zdecydowany": { eyes: "dot", brow: "flat", mouth: ["smirk", 0], accent: "none" },
  "Ambitny": { eyes: "dot", brow: "one", mouth: ["smirk", 0], accent: "spark1" },
  "Śmiały": { eyes: "dot", brow: "raise", mouth: ["smirk", 0], accent: "none" },
  "Zdolny": { eyes: "soft", brow: "one", mouth: ["smile", 2.4], accent: "none" },
  "Czuły": { eyes: "soft", brow: "none", mouth: ["smile", 2.6], accent: "heart" },
  "Przywiązany": { eyes: "happy", brow: "none", mouth: ["smile", 2.4], accent: "blush" },
  "Wyczekujący": { eyes: "up", brow: "raise", mouth: ["smile", 1.8], accent: "none" },
}

// Neutralna twarz — fallback dla nieznanego ID emocji.
const NEUTRAL_FACE: FaceSpec = { eyes: 'dot', brow: 'none', mouth: ['flat', 0], accent: 'none' }

// Mapa ID emocji → spec twarzy. Klucz po ID jest niezależny od języka, więc twarze
// działają też po angielsku. FACE_SPECS jest kluczowane polską nazwą (stały klucz
// z designu), dlatego mapujemy: ID → polska nazwa (locale PL) → spec.
export const FACE_SPEC_BY_ID: Record<string, FaceSpec> = Object.fromEntries(
  Object.entries(plEmotions as Record<string, { name: string }>)
    .map(([id, t]) => [id, FACE_SPECS[t.name]] as const)
    .filter((entry): entry is readonly [string, FaceSpec] => entry[1] !== undefined)
)

// Buduje twarz po ID emocji (niezależnie od języka). Nieznane ID → neutralna twarz.
export function buildFaceSvgById(id: string, color: string, size = 28): string {
  return renderFace(FACE_SPEC_BY_ID[id] ?? NEUTRAL_FACE, color, size)
}
