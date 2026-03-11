/**
 * CI script: Compare EN and PL locale key sets.
 * Reports missing/extra keys per file.
 * Exit code 1 on mismatch; 0 when all keys match.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = join(SCRIPT_DIR, '..', 'src', 'locales')
const EN_DIR = join(LOCALES_DIR, 'en')
const PL_DIR = join(LOCALES_DIR, 'pl')

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

function readJson(filePath) {
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

const enFiles = readdirSync(EN_DIR).filter((f) => f.endsWith('.json')).sort()
const plFiles = readdirSync(PL_DIR).filter((f) => f.endsWith('.json')).sort()

const enSet = new Set(enFiles)
const plSet = new Set(plFiles)
const missingInPl = enFiles.filter((f) => !plSet.has(f))
const extraInPl = plFiles.filter((f) => !enSet.has(f))

let hasErrors = false

if (missingInPl.length > 0) {
  console.error(`\nFiles present in en/ but missing in pl/: ${missingInPl.join(', ')}`)
  hasErrors = true
}
if (extraInPl.length > 0) {
  console.error(`\nFiles present in pl/ but missing in en/: ${extraInPl.join(', ')}`)
  hasErrors = true
}

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
    console.error(`\n${basename(file)}:`)
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
  console.error('\nLocale key mismatches found. Fix the above issues.')
  process.exit(1)
}

console.log(`\nAll ${sharedFiles.length} locale files have matching keys between en/ and pl/.`)
