#!/usr/bin/env node
/**
 * PostToolUse hook (Edit/Write/MultiEdit): runs the design-system guard on the
 * edited file and, if it has MORE violations than the baseline, reports them
 * back to Claude as a blocking reason. Silent otherwise. Never fails the edit
 * itself (exit 0) — the guard's full run is a commit gate.
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

let raw = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) raw += chunk

let file = ''
try {
  const input = JSON.parse(raw || '{}')
  file = input?.tool_response?.filePath || input?.tool_input?.file_path || ''
} catch {
  process.exit(0)
}
if (!file) process.exit(0)

const projectRoot = resolve(new URL('../../', import.meta.url).pathname)
const rel = resolve(file).startsWith(projectRoot + '/')
  ? resolve(file).slice(projectRoot.length + 1)
  : ''
if (!/^src\/.*\.(vue|css|ts)$/.test(rel)) process.exit(0)

const result = spawnSync('node', ['scripts/check-design-system.mjs', '--file', rel], {
  cwd: projectRoot,
  encoding: 'utf8',
})
if (result.status === 0) process.exit(0)
const report = (result.stderr || result.stdout || '').trim().slice(0, 4000)
process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason: `Design system guard: ${rel} ma więcej naruszeń niż baza (scripts/design-system-baseline.json). Użyj tokenów --mg-* / anatomii mg-v2-* albo rozszerz część wspólną (src/design-system/README.md, docs/design-system-governance.md). Szczegóły:\n${report}`,
  })
)
process.exit(0)
