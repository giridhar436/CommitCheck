import { execSync } from 'child_process'
import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const pwaDir = join(publicDir, 'pwa')

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
]

const browserPath = chromePaths.find(p => existsSync(p))
if (!browserPath) {
  console.error('No Chrome or Edge found')
  process.exit(1)
}

const icons = [
  { name: 'icon-192x192.png', size: 192, svg: 'icon-192x192.svg' },
  { name: 'icon-512x512.png', size: 512, svg: 'icon-512x512.svg' },
  { name: 'maskable-icon-512x512.png', size: 512, svg: 'maskable-icon-512x512.svg' },
  { name: 'apple-touch-icon.png', size: 180, svg: 'apple-touch-icon.svg' }
]

for (const icon of icons) {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${icon.size}px; height: ${icon.size}px; overflow: hidden; background: transparent; }
  img { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
<img src="${join(pwaDir, icon.svg).replace(/\\/g, '/')}" />
</body>
</html>`

  const tempHtmlPath = join(pwaDir, `_temp_${icon.size}.html`)
  writeFileSync(tempHtmlPath, htmlContent)

  const outPngPath = join(pwaDir, icon.name)
  const cmd = `"${browserPath}" --headless --disable-gpu --hide-scrollbars --window-size=${icon.size},${icon.size} --screenshot="${outPngPath}" "file:///${tempHtmlPath.replace(/\\/g, '/')}"`
  
  execSync(cmd, { stdio: 'pipe' })
  console.log(`Generated ${icon.name} (${icon.size}x${icon.size})`)
}

console.log('PNG icon generation complete!')
