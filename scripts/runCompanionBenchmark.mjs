import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

// This file is Node-only. Never use VITE_* for API credentials.
if (existsSync('.env.ai-companion.local')) process.loadEnvFile('.env.ai-companion.local')
if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error(
    'Add OPENAI_API_KEY to .env.ai-companion.local (see .env.ai-companion.example), then rerun. Do not paste the key into chat.'
  )
  process.exit(1)
}
const result = spawnSync(
  process.execPath,
  ['node_modules/vitest/vitest.mjs', 'run', 'src/dev/ai-companion/__tests__/liveBenchmark.spec.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, AI_COMPANION_LIVE: '1' },
  }
)
process.exit(result.status ?? 1)
