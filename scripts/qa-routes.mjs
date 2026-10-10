import { execSync } from 'child_process'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const routes = [
  { path: 'dashboard', name: 'dashboard' },
  { path: 'projects', name: 'projects' },
  { path: 'commitments', name: 'commitments' },
  { path: 'change-requests', name: 'change_requests' },
  { path: 'meetings', name: 'meetings' },
  { path: 'settings', name: 'settings' },
  { path: 'offline.html', name: 'offline' }
]

for (const r of routes) {
  try {
    const url = `http://localhost:4173/${r.path}`
    const outImg = `d:\\CommitCheck\\dist\\qa_${r.name}.png`
    execSync(`"${chrome}" --headless --disable-gpu --virtual-time-budget=3000 --window-size=1440,900 --screenshot="${outImg}" ${url}`, { stdio: 'pipe' })
    console.log(`Captured ${r.name} successfully`)
  } catch (e) {
    console.error(`Failed ${r.name}:`, e.message)
  }
}
