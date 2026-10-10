import { execSync } from 'child_process'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const viewports = [
  { name: 'tablet', w: 768, h: 1024 },
  { name: 'mobile', w: 390, h: 844 },
  { name: 'narrow', w: 360, h: 740 }
]

for (const vp of viewports) {
  try {
    const url = 'http://localhost:4173/dashboard'
    const outImg = `d:\\CommitCheck\\dist\\qa_responsive_${vp.name}.png`
    execSync(`"${chrome}" --headless --disable-gpu --virtual-time-budget=3000 --window-size=${vp.w},${vp.h} --screenshot="${outImg}" ${url}`, { stdio: 'pipe' })
    console.log(`Captured ${vp.name} (${vp.w}x${vp.h})`)
  } catch (e) {
    console.error(`Failed ${vp.name}:`, e.message)
  }
}
