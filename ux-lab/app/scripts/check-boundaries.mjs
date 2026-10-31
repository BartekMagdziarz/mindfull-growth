import { access, readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const productRoot = fileURLToPath(new URL('../../../src', import.meta.url))
const sourceRoot = join(appRoot, 'src')
const sourceExtensions = new Set(['.ts', '.vue', '.js'])
const violations = []
const missingProductImports = []

// Every `@product/...` specifier (static or dynamic import) must point at a
// file that still exists: the Lab's vue-tsc does not resolve the alias, so a
// component deleted from the product would otherwise surface only at runtime
// as a broken scene (B-11, 2026-10-27).
const productImportPattern = /(?:from\s+|import\s*\(\s*)['"]@product\/([^'"]+)['"]/g
const resolutionCandidates = ['', '.ts', '.vue', '.js', '/index.ts']

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function productImportExists(specifier) {
  for (const suffix of resolutionCandidates) {
    if (await exists(join(productRoot, specifier + suffix))) return true
  }
  return false
}

const forbiddenImports = [
  /from\s+['"](?:@product|@)\/(?:repositories|stores|views)\//,
  /import\s*\(\s*['"](?:@product|@)\/(?:repositories|stores|views)\//,
  /from\s+['"][.]{1,2}\/[^'"]*\/(?:repositories|stores|views)\//,
]
const forbiddenRuntimeReferences = [
  /from\s+['"]dexie['"]/,
  /import\s*\(\s*['"]dexie['"]\s*\)/,
  /from\s+['"][^'"]*userDatabase[^'"]*['"]/,
]

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  await Promise.all(entries.map(async entry => {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(absolutePath)
      return
    }
    if (!sourceExtensions.has(extname(entry.name))) return

    const content = await readFile(absolutePath, 'utf8')
    const patterns = [...forbiddenImports, ...forbiddenRuntimeReferences]
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        violations.push(`${relative(appRoot, absolutePath)}: ${pattern}`)
      }
    }
    for (const match of content.matchAll(productImportPattern)) {
      const specifier = match[1]
      if (!(await productImportExists(specifier))) {
        missingProductImports.push(`${relative(appRoot, absolutePath)}: @product/${specifier}`)
      }
    }
  }))
}

await walk(sourceRoot)

if (violations.length > 0) {
  console.error('UX Lab narusza granice importów:')
  violations.forEach(violation => console.error(`- ${violation}`))
  process.exitCode = 1
}
if (missingProductImports.length > 0) {
  console.error('UX Lab importuje nieistniejące pliki produktu (@product/...):')
  missingProductImports.sort().forEach(entry => console.error(`- ${entry}`))
  process.exitCode = 1
}
if (process.exitCode !== 1) {
  console.log('UX Lab import boundaries: OK')
}
