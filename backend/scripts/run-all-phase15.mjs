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
  'test-notifications.mjs',
  'test-embedding-provider.mjs',
  'test-fireworks-provider.mjs',
]

const results = []
for (const suite of suites) {
  // Orphaned postgres from a prior suite holds the port and data dir —
  // kill it and clear the dir before each suite.
  spawnSync('taskkill', ['//F', '//IM', 'postgres.exe'], { stdio: 'ignore' })
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
  results.push({ suite, code: r.status })
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
