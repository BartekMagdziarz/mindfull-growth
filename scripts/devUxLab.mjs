import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = new Set()
let shuttingDown = false

function start(label, args, options = {}) {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
    ...options,
  })
  children.add(child)

  child.once('exit', code => {
    children.delete(child)
    if (shuttingDown) return
    console.error(`[dev:lab] ${label} stopped${code === null ? '' : ` with code ${code}`}.`)
    shutdown(code ?? 1)
  })

  child.once('error', error => {
    console.error(`[dev:lab] Could not start ${label}:`, error)
    shutdown(1)
  })

  return child
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  const forceTimer = setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill('SIGKILL')
    }
  }, 1500)
  forceTimer.unref()
  setTimeout(() => process.exit(exitCode), 1700).unref()
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('[dev:lab] Starting verify at http://127.0.0.1:5199 and UX Lab at http://127.0.0.1:5201')
start('verify', ['run', 'dev:verify'])
start('UX Lab', ['--prefix', 'ux-lab/app', 'run', 'dev'])
