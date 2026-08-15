import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const sourceRoot = join(appRoot, 'src')
const sourceExtensions = new Set(['.ts', '.vue', '.js'])
const violations = []

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
  }))
}

await walk(sourceRoot)

if (violations.length > 0) {
  console.error('UX Lab narusza granice importów:')
  violations.forEach(violation => console.error(`- ${violation}`))
  process.exitCode = 1
} else {
  console.log('UX Lab import boundaries: OK')
}
