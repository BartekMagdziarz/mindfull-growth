#!/usr/bin/env node
/**
 * Strażnik design systemu z zapadką (ratchet).
 *
 * Skanuje całe `src/` (.vue, .css, .ts) i liczy linie, które omijają system:
 * surowe kolory, lokalne cienie, lokalne font-family, literalne font-size i
 * border-radius, klasy legacy `neo-*` oraz utility Tailwinda zastępowane przez
 * tokeny (`rounded-*` poza `rounded-full`, `shadow-neu-*`, `text-[Npx]`) oraz
 * kropki stanu narysowane poza wspólną studnią `.mg-well` (reguły blokowe CSS +
 * małe koła Tailwinda; wyjątek = komentarz `ds: not-a-dot — <powód>`).
 *
 * Zapadka: `scripts/design-system-baseline.json` trzyma liczbę naruszeń per
 * plik. Sprawdzenie kończy się błędem, gdy jakikolwiek plik ma WIĘCEJ naruszeń
 * niż w bazie (nowy dług) — stary dług nie blokuje, ale nie może rosnąć.
 *
 *   node scripts/check-design-system.mjs                 # pełne sprawdzenie
 *   node scripts/check-design-system.mjs --file a.vue b.css   # tylko te pliki (hook)
 *   node scripts/check-design-system.mjs --update-baseline     # zapisz nową bazę
 *   node scripts/check-design-system.mjs --list [--rule radiusLiteral]  # wypisz naruszenia
 *
 * Zasady i proces: docs/design-system-governance.md, src/design-system/README.md.
 */
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'

const projectRoot = resolve(new URL('../', import.meta.url).pathname)
const baselinePath = resolve(projectRoot, 'scripts/design-system-baseline.json')
const args = process.argv.slice(2)
const flag = name => args.includes(name)
const argValues = name => {
  const out = []
  for (let i = 0; i < args.length; i++)
    if (args[i] === name) while (args[i + 1] && !args[i + 1].startsWith('--')) out.push(args[++i])
  return out
}

// Pliki, które LEGALNIE trzymają literały: źródła tokenów, legacy przeznaczone do
// usunięcia, mostki, katalog ikon, dane domenowe (kolory emocji/części — K2).
const exemptPaths = [
  'src/styles/tokens.css',
  'src/styles/main.css',
  'src/design-system/tokens.css',
  'src/design-system/adapters.css',
  'src/design-system/icons/',
  'src/dev/',
  'src/locales/',
]
// Wyjątki per reguła: plik → reguły, których nie liczymy (z powodem w komentarzu).
const exemptRules = {
  'src/domain/emotionGroups.ts': ['rawColor'], // dane domenowe koła emocji (K2: tokeny)
  'src/domain/emotionFamily.ts': ['rawColor'], // j.w.
  'src/features/program-path/partColors.ts': ['rawColor', 'rawSky'], // kolory części IFS (K2)
  'src/domain/loadState.ts': ['rawSky'], // paleta pary obciążenie/stan (D10), kanały dla alf
  'src/components/shared/ColorSwatchPicker.vue': ['tailwindDot'], // próbki kolorów do wyboru, nie kropki stanu
}

const rules = {
  rawColor: {
    label: 'surowy kolor',
    test: line =>
      /(?<![\w&"'=#/])#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\((?!\s*var\()/i.test(line) &&
      !/href=["']#|url\(#|#app\b|#\{|\.hash|location\.|router|mask\s*:/i.test(line),
  },
  rawSky: {
    label: 'surowy odcień --sky-N (użyj tokenu: data-*, state, sky-field, surface…)',
    test: line => /var\(--sky-\d/.test(line),
  },
  localShadow: {
    label: 'lokalny cień',
    test: l =>
      /\bbox-shadow\s*:(?=\s*\S)(?!\s*(?:var\(--mg-(?:shadow|focus)|none|inherit))/i.test(l),
  },
  localFont: {
    label: 'lokalna typografia',
    test: l => /\bfont-family\s*:(?!\s*(?:var\(--mg-font-|inherit))/i.test(l),
  },
  fontSizeLiteral: {
    label: 'literalny font-size',
    test: l => /\bfont-size\s*:(?!\s*(?:var\(--mg-font-size|inherit|1em|100%))/i.test(l),
  },
  radiusLiteral: {
    label: 'literalny border-radius',
    test: l =>
      /\bborder-radius\s*:(?!\s*(?:var\(--mg-radius|0(?:px)?\s*[;}]|50%|inherit))/i.test(l),
  },
  legacyClass: { label: 'klasa legacy neo-*', test: l => /(?<!-)\bneo-[a-z0-9-]+\b/i.test(l) },
  tailwindRadius: {
    label: 'utility rounded-* (poza rounded-full i skalą tokenów rounded-mg-*)',
    test: l => /(?<![\w-])rounded(?:-(?!full\b|mg-)[a-z0-9[\].]+)?(?=[\s"'`:])/.test(l),
  },
  tailwindShadow: { label: 'utility shadow-neu-*', test: l => /\bshadow-neu-[a-z-]+/.test(l) },
  tailwindArbitraryText: {
    label: 'utility text-[Npx]',
    test: l => /\btext-\[\d+(?:\.\d+)?px\]/.test(l),
  },
  // Kropka = studnia (decyzja 2026-11-24): małe koło z Tailwinda (radio, kropka
  // stanu, kropka oceny) rysowane w szablonie zamiast `mg-well` / DsWell.
  tailwindDot: {
    label: 'kropka z Tailwinda (rounded-full w-N h-N) — użyj mg-well / DsWell albo mg-pip',
    test: l => {
      if (!/\brounded-full\b/.test(l) || /\bmg-(?:well|pip)\b|\banimate-|ds:\s*not-a-dot/.test(l))
        return false
      const size = axis =>
        l.match(new RegExp(`(?<![\\w-])${axis}-(1|1\\.5|2|2\\.5|3|3\\.5|4|5)(?![\\w.])`))?.[1]
      return size('w') !== undefined && size('w') === size('h')
    },
  },
}

// Reguły blokowe (całe reguły CSS w .css i <style> plików .vue).
// localDot: okrągły znak stanu narysowany lokalnie — kropka w kropce
// (pseudo-element o rozmiarze w % rodzica) albo klasa nazwana jak kropka
// (dot / radio / well / disc / blob / pip). Kropka stanu ma JEDNĄ anatomię:
// `.mg-well` (base.css) / DsWell / DsWellSvg; mała pełna kropka (klucz koloru,
// wypunktowanie, licznik) to `.mg-pip`. Rzecz, która tylko jest okrągła
// (gałka przełącznika, próbka koloru do wyboru), deklaruje to komentarzem
// `ds: not-a-dot — <powód>` przy regule.
const ROUND_RADIUS =
  /border-radius\s*:\s*(?:50%|100%|9{3,4}px|var\(--mg-radius-(?:organic|pill|full)[\w-]*\))/i
const DOT_NAME = /(?:^|[-_])(?:dot|dots|radio|well|disc|blob|pip)(?:$|[-_])/i
const paints = body =>
  /\bbackground(?:-color)?\s*:\s*(?!\s*(?:none|transparent)\s*[;}]?$)/im.test(body) ||
  /\bborder(?:-width)?\s*:\s*(?!\s*(?:0|none)\b)\S/i.test(body)
/** Koło, nie pasek: aspect-ratio 1 albo ta sama szerokość i wysokość. */
const isSquare = body => {
  if (/aspect-ratio\s*:\s*1\b/.test(body)) return true
  const w = body.match(/(?:^|[\s;{])width\s*:\s*([^;]+)/)?.[1]?.trim()
  const h = body.match(/(?:^|[\s;{])height\s*:\s*([^;]+)/)?.[1]?.trim()
  return Boolean(w) && w === h
}
/** Rozmiar kropki, nie kontrolki: szerokość ≤ 20 px (1.25rem). */
const isSmall = body => {
  const w = body.match(/(?:^|[\s;{])width\s*:\s*([\d.]+)(px|rem)\s*[;}]?/)
  if (!w) return false
  const px = w[2] === 'rem' ? parseFloat(w[1]) * 16 : parseFloat(w[1])
  return px <= 20
}
const lastCompound = sel =>
  sel
    .trim()
    .split(/\s*[\s>+~]\s*/)
    .pop() ?? ''
const blockRules = {
  localDot: {
    label: 'kropka poza studnią — użyj mg-well / DsWell albo mg-pip (README → „Kropka”)',
    test: (selector, body, note) => {
      if (/\bmg-(?:well|pip)\b/.test(selector) || /ds:\s*not-a-dot/i.test(note + body)) return false
      if (!ROUND_RADIUS.test(body)) return false
      return selector.split(',').some(sel => {
        const last = lastCompound(sel)
        const sized = isSquare(body) || !/(?:^|[\s;{])(?:width|height)\s*:/.test(body)
        // kropka w kropce: pseudo-element albo goły znacznik (i / b / span / button)
        const innerMark =
          (/::?(?:after|before)$/.test(last) ||
            /(?:^|[\s>+~])(?:i|b|span|button)(?:\[[^\]]*\])*$/.test(` ${last}`)) &&
          isSquare(body) &&
          paints(body)
        const named =
          sized &&
          last
            .split(/[.#:[\]]/)
            .some(part => part && !/^mg-(?:well|pip)/.test(part) && DOT_NAME.test(part))
        // każde małe okrągłe pole z kolorem albo obrysem (≤ 20 px) to kropka
        const small = isSquare(body) && paints(body) && isSmall(body)
        return innerMark || named || small
      })
    },
  },
}

const ruleLabels = { ...rules, ...blockRules }

/** Bloki CSS pliku: { selector, body, line } (selektor z komentarzem przed nim). */
function cssBlocks(rel, source) {
  const chunks = []
  if (rel.endsWith('.vue')) {
    const re = /<style[^>]*>([\s\S]*?)<\/style>/g
    let m
    while ((m = re.exec(source))) {
      const start = m.index + m[0].indexOf('>') + 1
      chunks.push({ css: m[1], offset: source.slice(0, start).split('\n').length - 1 })
    }
  } else if (rel.endsWith('.css')) {
    chunks.push({ css: source, offset: 0 })
  }
  const blocks = []
  for (const { css, offset } of chunks) {
    const re = /([^{}]+)\{([^{}]*)\}/g
    let m
    while ((m = re.exec(css))) {
      const raw = m[1]
      const selector = raw.replace(/\/\*[\s\S]*?\*\//g, '').trim()
      if (!selector || selector.startsWith('@')) continue
      const lead = raw.length - raw.trimStart().length
      const comments = (raw.match(/\/\*[\s\S]*?\*\//g) ?? []).join(' ')
      const selectorAt = m.index + raw.lastIndexOf(selector.split('\n')[0])
      blocks.push({
        selector,
        note: comments,
        body: m[2],
        line: offset + css.slice(0, Math.max(selectorAt, m.index + lead)).split('\n').length,
        text: selector.replace(/\s+/g, ' ').slice(0, 110),
      })
    }
  }
  return blocks
}

const allowedExtensions = new Set(['.css', '.ts', '.vue'])
const toRel = abs => relative(projectRoot, abs).split(sep).join('/')
const isExempt = rel => exemptPaths.some(p => (p.endsWith('/') ? rel.startsWith(p) : rel === p))
const isTestFile = rel => /(^|\/)__tests__\//.test(rel) || /\.spec\.ts$/.test(rel)

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const abs = resolve(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(abs)))
    else if (allowedExtensions.has(extname(entry.name))) files.push(abs)
  }
  return files
}

async function scanFile(abs) {
  const rel = toRel(abs)
  const hits = []
  if (isExempt(rel) || isTestFile(rel)) return { rel, hits }
  const skip = new Set(exemptRules[rel] ?? [])
  const source = await readFile(abs, 'utf8')
  // .ts: tylko kod stylujący (template strings z CSS / klasami) — reguły CSS-owe
  // i tak trafiają w literalne `font-size:` itp.; importy/ścieżki pomijamy.
  source.split('\n').forEach((line, index) => {
    const trimmed = line.trim()
    if (
      !trimmed ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('<!--')
    )
      return
    if (/^\s*import\b/.test(line)) return
    for (const [id, rule] of Object.entries(rules)) {
      if (skip.has(id)) continue
      if (rule.test(line)) hits.push({ line: index + 1, rule: id, text: trimmed.slice(0, 110) })
    }
  })
  for (const block of cssBlocks(rel, source))
    for (const [id, rule] of Object.entries(blockRules)) {
      if (skip.has(id)) continue
      if (rule.test(block.selector, block.body, block.note))
        hits.push({ line: block.line, rule: id, text: block.text })
    }
  return { rel, hits }
}

async function loadBaseline() {
  try {
    return JSON.parse(await readFile(baselinePath, 'utf8'))
  } catch {
    return null
  }
}

const onlyFiles = argValues('--file')
let targets
if (onlyFiles.length) {
  targets = []
  for (const f of onlyFiles) {
    const abs = resolve(projectRoot, f)
    try {
      if (
        (await stat(abs)).isFile() &&
        allowedExtensions.has(extname(abs)) &&
        toRel(abs).startsWith('src/')
      )
        targets.push(abs)
    } catch {
      /* usunięty plik — nic do sprawdzenia */
    }
  }
} else {
  targets = await walk(resolve(projectRoot, 'src'))
}

const results = (await Promise.all(targets.map(scanFile))).filter(r => r.hits.length)
const counts = Object.fromEntries(results.map(r => [r.rel, r.hits.length]))
const total = Object.values(counts).reduce((a, b) => a + b, 0)

if (flag('--list')) {
  const ruleFilter = argValues('--rule')
  for (const r of results.sort((a, b) => b.hits.length - a.hits.length)) {
    const hits = ruleFilter.length ? r.hits.filter(h => ruleFilter.includes(h.rule)) : r.hits
    if (!hits.length) continue
    console.log(`\n${r.rel} (${hits.length})`)
    for (const h of hits) console.log(`  :${h.line}  [${ruleLabels[h.rule].label}]  ${h.text}`)
  }
  console.log(`\nRazem: ${total} naruszeń w ${results.length} plikach`)
  process.exit(0)
}

if (flag('--update-baseline')) {
  if (onlyFiles.length) {
    console.error('--update-baseline działa tylko dla pełnego skanu.')
    process.exit(2)
  }
  const byRule = {}
  for (const r of results) for (const h of r.hits) byRule[h.rule] = (byRule[h.rule] ?? 0) + 1
  await writeFile(
    baselinePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        total,
        byRule,
        files: Object.fromEntries(Object.entries(counts).sort()),
      },
      null,
      2
    ) + '\n'
  )
  console.log(
    `Baza zapisana: ${total} naruszeń w ${Object.keys(counts).length} plikach → ${toRel(baselinePath)}`
  )
  process.exit(0)
}

const baseline = await loadBaseline()
if (!baseline) {
  console.error('Brak scripts/design-system-baseline.json — uruchom z --update-baseline.')
  process.exit(2)
}

const regressions = []
for (const r of results) {
  const allowed = baseline.files[r.rel] ?? 0
  if (r.hits.length > allowed)
    regressions.push({ rel: r.rel, allowed, now: r.hits.length, hits: r.hits })
}

if (regressions.length) {
  console.error('Nowy UI omija design system (naruszeń więcej niż w bazie):')
  for (const reg of regressions) {
    console.error(`\n  ${reg.rel}: ${reg.now} (baza ${reg.allowed})`)
    for (const h of reg.hits.slice(0, 12))
      console.error(`    :${h.line}  [${ruleLabels[h.rule].label}]  ${h.text}`)
    if (reg.hits.length > 12)
      console.error(`    … i ${reg.hits.length - 12} więcej (--list --file ${reg.rel})`)
  }
  console.error(
    '\nUżyj tokenów/anatomii (src/design-system/README.md) albo rozszerz część wspólną; wyjątek = exemptRules z powodem.'
  )
  process.exitCode = 1
} else {
  const scope = onlyFiles.length ? `${targets.length} plików` : 'src/'
  const delta = onlyFiles.length
    ? ''
    : ` (baza: ${baseline.total}${total < baseline.total ? ` — dług zmalał o ${baseline.total - total}, zapisz: --update-baseline` : ''})`
  console.log(`Design system guard: OK — ${scope}, ${total} naruszeń${delta}`)
}
