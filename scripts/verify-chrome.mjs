import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
try {
  // Capture screenshot of desktop
  execSync(`"${chrome}" --headless --disable-gpu --window-size=1440,900 --screenshot="d:\\CommitCheck\\dist\\desktop_screenshot.png" http://localhost:4173/`, { stdio: 'inherit' })
  console.log('Desktop screenshot captured successfully')

  // Capture screenshot of mobile
  execSync(`"${chrome}" --headless --disable-gpu --window-size=390,844 --screenshot="d:\\CommitCheck\\dist\\mobile_screenshot.png" http://localhost:4173/`, { stdio: 'inherit' })
  console.log('Mobile screenshot captured successfully')

  // Dump DOM
  const dom = execSync(`"${chrome}" --headless --disable-gpu --virtual-time-budget=3000 --dump-dom http://localhost:4173/`, { encoding: 'utf-8' })
  console.log('DOM length:', dom.length)
  console.log('Has root children:', dom.includes('<div id="root">') && !dom.includes('<div id="root"></div>'))
  console.log('Contains CommitCheck branding:', dom.includes('CommitCheck') || dom.includes('PixelForge'))
} catch (err) {
  console.error('Chrome verify error:', err.message)
}
