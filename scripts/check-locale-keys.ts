/**
 * CI script: Compare EN and PL locale key sets.
 * Reports missing/extra keys per file.
 * Exit code 1 on mismatch; 0 when all keys match.
 *
 * Usage: npx tsx scripts/check-locale-keys.ts
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'

const LOCALES_DIR = join(import.meta.dirname, '..', 'src', 'locales')
const EN_DIR = join(LOCALES_DIR, 'en')
const PL_DIR = join(LOCALES_DIR, 'pl')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

function readJson(filePath: string): Record<string, unknown> {
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const enFiles = readdirSync(EN_DIR).filter((f) => f.endsWith('.json')).sort()
const plFiles = readdirSync(PL_DIR).filter((f) => f.endsWith('.json')).sort()

// Check that both directories have the same set of files
const enSet = new Set(enFiles)
const plSet = new Set(plFiles)
const missingInPl = enFiles.filter((f) => !plSet.has(f))
const extraInPl = plFiles.filter((f) => !enSet.has(f))

let hasErrors = false

if (missingInPl.length > 0) {
  console.error(`\n❌ Files present in en/ but missing in pl/: ${missingInPl.join(', ')}`)
  hasErrors = true
}
if (extraInPl.length > 0) {
  console.error(`\n❌ Files present in pl/ but missing in en/: ${extraInPl.join(', ')}`)
  hasErrors = true
}

// Compare keys for each shared file
const sharedFiles = enFiles.filter((f) => plSet.has(f))

for (const file of sharedFiles) {
  const enJson = readJson(join(EN_DIR, file))
  const plJson = readJson(join(PL_DIR, file))

  const enKeys = new Set(flattenKeys(enJson))
  const plKeys = new Set(flattenKeys(plJson))

  const missingInPlKeys = [...enKeys].filter((k) => !plKeys.has(k))
  const extraInPlKeys = [...plKeys].filter((k) => !enKeys.has(k))

  if (missingInPlKeys.length > 0 || extraInPlKeys.length > 0) {
    hasErrors = true
    console.error(`\n❌ ${basename(file)}:`)
    if (missingInPlKeys.length > 0) {
      console.error(`  Missing in pl/ (${missingInPlKeys.length}):`)
      for (const key of missingInPlKeys) {
        console.error(`    - ${key}`)
      }
    }
    if (extraInPlKeys.length > 0) {
      console.error(`  Extra in pl/ (${extraInPlKeys.length}):`)
      for (const key of extraInPlKeys) {
        console.error(`    + ${key}`)
      }
    }
  }
}

if (hasErrors) {
  console.error('\n❌ Locale key mismatches found. Fix the above issues.')
  process.exit(1)
} else {
  console.log(`\n✅ All ${sharedFiles.length} locale files have matching keys between en/ and pl/.`)
  process.exit(0)
}
