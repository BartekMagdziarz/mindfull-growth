#!/usr/bin/env node
/**
 * Strażnik design systemu z zapadką (ratchet).
 *
 * Skanuje całe `src/` (.vue, .css, .ts) i liczy linie, które omijają system:
 * surowe kolory, lokalne cienie, lokalne font-family, literalne font-size i
 * border-radius, klasy legacy `neo-*` oraz utility Tailwinda zastępowane przez
 * tokeny (`rounded-*` poza `rounded-full`, `shadow-neu-*`, `text-[Npx]`).
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
  'src/features/program-path/partColors.ts': ['rawColor'], // kolory części IFS (K2)
  'src/utils/ratingGradient.ts': ['rawColor'], // rampy ocen czytane z tokenów produktu
}

const rules = {
  rawColor: {
    label: 'surowy kolor',
    test: line =>
      /(?<![\w&"'=#/])#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\((?!\s*var\()/i.test(line) &&
      !/href=["']#|url\(#|#app\b|#\{|\.hash|location\.|router|mask\s*:/i.test(line),
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
    label: 'utility rounded-* (poza rounded-full)',
    test: l => /(?<![\w-])rounded(?:-(?!full\b)[a-z0-9[\].]+)?(?=[\s"'`:])/.test(l),
  },
  tailwindShadow: { label: 'utility shadow-neu-*', test: l => /\bshadow-neu-[a-z-]+/.test(l) },
  tailwindArbitraryText: {
    label: 'utility text-[Npx]',
    test: l => /\btext-\[\d+(?:\.\d+)?px\]/.test(l),
  },
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
    for (const h of hits) console.log(`  :${h.line}  [${rules[h.rule].label}]  ${h.text}`)
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
      console.error(`    :${h.line}  [${rules[h.rule].label}]  ${h.text}`)
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
