/**
 * Generate PWA icon SVGs at required sizes.
 * Since we can't easily rasterize SVGs to PNGs without sharp/canvas,
 * we create properly sized SVGs that browsers can use as PWA icons.
 * For production, these would be replaced with actual PNGs.
 */
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const pwaDir = join(publicDir, 'pwa')

// Read the existing favicon SVG
const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'), 'utf-8')

// Create SVG icons at specific sizes for PWA
const sizes = [192, 512]

for (const size of sizes) {
  // Wrap the existing favicon SVG content in a properly sized SVG
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.1)}" fill="#0f0f14"/>
  <g transform="translate(${size * 0.15}, ${size * 0.17}) scale(${(size * 0.7) / 48})">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" style="fill:#863bff;fill-opacity:1"/>
  </g>
</svg>`

  writeFileSync(join(pwaDir, `icon-${size}x${size}.svg`), iconSvg)
  console.log(`Created icon-${size}x${size}.svg`)
}

// Create maskable icon (with safe zone padding)
const maskableSize = 512
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maskableSize}" height="${maskableSize}" viewBox="0 0 ${maskableSize} ${maskableSize}">
  <rect width="${maskableSize}" height="${maskableSize}" fill="#0f0f14"/>
  <g transform="translate(${maskableSize * 0.2}, ${maskableSize * 0.22}) scale(${(maskableSize * 0.6) / 48})">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" style="fill:#863bff;fill-opacity:1"/>
  </g>
</svg>`

writeFileSync(join(pwaDir, `maskable-icon-512x512.svg`), maskableSvg)
console.log(`Created maskable-icon-512x512.svg`)

// Create Apple Touch Icon (180x180)
const appleSize = 180
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${appleSize}" height="${appleSize}" viewBox="0 0 ${appleSize} ${appleSize}">
  <rect width="${appleSize}" height="${appleSize}" rx="${Math.round(appleSize * 0.15)}" fill="#0f0f14"/>
  <g transform="translate(${appleSize * 0.15}, ${appleSize * 0.17}) scale(${(appleSize * 0.7) / 48})">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" style="fill:#863bff;fill-opacity:1"/>
  </g>
</svg>`

writeFileSync(join(pwaDir, `apple-touch-icon.svg`), appleSvg)
console.log(`Created apple-touch-icon.svg`)

console.log('\nAll PWA icons generated successfully!')
