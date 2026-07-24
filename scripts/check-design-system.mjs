import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, relative } from 'node:path'

const projectRoot = new URL('../', import.meta.url)
// Entries may be directories or single files (migrated legacy views/components).
const guardedRoots = [
  'src/design-system/components',
  'src/features/planning-next',
  'src/views/EmotionLogEditorView.vue',
  'src/views/JournalEditorView.vue',
  'src/views/ObjectsLibraryView.vue',
  'src/components/emotion/EmotionGroupPicker.vue',
  'src/components/TagInput.vue',
  'src/components/objects',
]
// Files inside guarded directories that legally keep neo-*/product-token styling:
// shared with legacy screens (bridged via adapters.css) or chart-token consumers.
const exemptPaths = [
  'src/components/objects/StatusIconButton.vue',
  'src/components/objects/MultiItemsEditor.vue',
  'src/components/objects/MeasurementTargetSentence.vue',
  'src/components/objects/KrPillDropdown.vue',
  'src/components/objects/MeasurementSparkline.vue',
  'src/components/objects/ScalableSparkline.vue',
  'src/components/objects/sparklines/',
]
const allowedExtensions = new Set(['.css', '.ts', '.vue'])
const violations = []

const rules = [
  {
    label: 'surowy kolor',
    pattern: /(?:#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\()/gi,
  },
  {
    label: 'lokalny cień',
    pattern: /\bbox-shadow\s*:(?!\s*(?:var\(--mg-shadow-|none))/gi,
  },
  {
    label: 'lokalna typografia',
    pattern: /\bfont-family\s*:(?!\s*var\(--mg-font-)/gi,
  },
  {
    label: 'klasa legacy neo-*',
    pattern: /\bneo-[a-z0-9-]+\b/gi,
  },
]

async function walk(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl)
    if (entry.isDirectory()) files.push(...await walk(entryUrl))
    else if (allowedExtensions.has(extname(entry.name))) files.push(entryUrl)
  }
  return files
}

function isExempt(fileUrl) {
  const relPath = relative(projectRoot.pathname, fileUrl.pathname)
  return exemptPaths.some((exempt) =>
    exempt.endsWith('/') ? relPath.startsWith(exempt) : relPath === exempt,
  )
}

for (const guardedRoot of guardedRoots) {
  let files = []
  try {
    const rootStat = await stat(new URL(guardedRoot, projectRoot))
    if (rootStat.isDirectory()) {
      files = await walk(new URL(`${guardedRoot}/`, projectRoot))
    } else {
      files = [new URL(guardedRoot, projectRoot)]
    }
  } catch (error) {
    if (error?.code === 'ENOENT') continue
    throw error
  }

  for (const fileUrl of files) {
    if (isExempt(fileUrl)) continue
    const source = await readFile(fileUrl, 'utf8')
    const lines = source.split('\n')
    lines.forEach((line, index) => {
      for (const rule of rules) {
        rule.pattern.lastIndex = 0
        if (rule.pattern.test(line)) {
          violations.push(`${relative(projectRoot.pathname, fileUrl.pathname)}:${index + 1} — ${rule.label}`)
        }
      }
    })
  }
}

if (violations.length) {
  console.error('Nowy UI omija design system:')
  for (const violation of violations) console.error(`  ${violation}`)
  process.exitCode = 1
} else {
  console.log('Design system guard: OK')
}
