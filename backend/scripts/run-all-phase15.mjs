// Phase 15 full-regression runner: executes every suite sequentially and
// prints a per-suite PASS/FAIL summary. Not part of the app; test-only.
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const suites = [
  'test-api.mjs',
  'test-scope-api.mjs',
  'test-meetings-api.mjs',
  'test-attachments-api.mjs',
  'test-commitments-api.mjs',
  'test-evidence-api.mjs',
  'test-analysis-api.mjs',
  'test-verification-api.mjs',
  'test-change-requests-api.mjs',
  'test-dashboard-api.mjs',
  'test-documents-api.mjs',
  'test-document-intelligence-api.mjs',
  'test-auth-isolation-rbac.mjs',
  'test-auth-jwks.mjs',
  'test-notifications.mjs',
  'test-embedding-provider.mjs',
  'test-fireworks-provider.mjs',
]

const results = []
for (const suite of suites) {
  // A hard-killed postgres can leave its named shared-memory section
  // lingering for a few seconds; a suite that initdb's in that window
  // crashes with "pre-existing shared memory block is still in use".
  // That is environmental, not a regression — so each suite gets up to
  // three attempts with a settle delay between them.
  let code = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) console.log(`\n↻ retrying ${suite} (attempt ${attempt}/3)`)
    await killPostgresAndSettle()
    const dataDir = path.join(here, '..', '.verify-pg-data')
    if (existsSync(dataDir)) {
      try { rmSync(dataDir, { recursive: true, force: true }) } catch { /* best effort */ }
    }
    console.log(`\n${'='.repeat(70)}\n▶ ${suite}\n${'='.repeat(70)}`)
    const r = spawnSync('node', [path.join(here, suite)], {
      cwd: path.join(here, '..'),
      stdio: 'inherit',
      env: process.env,
    })
    code = r.status
    if (code === 0) break
  }
  results.push({ suite, code })
}

/** Kill any postgres and wait until the process list (and shared memory) settles. */
async function killPostgresAndSettle() {
  spawnSync('taskkill', ['/F', '/IM', 'postgres.exe'], { stdio: 'ignore' })
  for (let i = 0; i < 24; i++) {
    const alive = spawnSync('tasklist', ['/FI', 'IMAGENAME eq postgres.exe'], { stdio: 'pipe' })
    if (alive.status !== 0 || !String(alive.stdout).includes('postgres.exe')) break
    await new Promise((r) => setTimeout(r, 500))
  }
  await new Promise((r) => setTimeout(r, 2000))
}

console.log(`\n${'='.repeat(70)}\n■ SUMMARY\n${'='.repeat(70)}`)
let failed = 0
for (const { suite, code } of results) {
  const ok = code === 0
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${suite}${ok ? '' : ` (exit ${code})`}`)
}
console.log(`\n${results.length - failed}/${results.length} suites passed`)
process.exit(failed === 0 ? 0 : 1)
