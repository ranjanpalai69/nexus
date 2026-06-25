import sharp from 'sharp'
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

// High-res source SVG — gradient N icon on dark rounded-square bg
const iconSvg = (size) => {
  const r = Math.round(size * 0.18)   // corner radius
  const pad = Math.round(size * 0.18) // inner padding
  const sw = Math.round(size * 0.115) // stroke width
  const x1 = pad, y1 = pad
  const x2 = size - pad, y2 = size - pad
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="${size}" x2="${size}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#FF5C00"/>
      <stop offset="33%"  stop-color="#E91E8C"/>
      <stop offset="66%"  stop-color="#9333EA"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="#0F0A1E"/>
  <path d="M ${x1} ${y2} L ${x1} ${y1} L ${x2} ${y2} L ${x2} ${y1}"
        stroke="url(#g)"
        stroke-width="${sw}"
        stroke-linecap="round"
        stroke-linejoin="round"/>
</svg>`
}

const icons = [
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-32.png',         size: 32  },
  { name: 'icon-16.png',         size: 16  },
]

for (const { name, size } of icons) {
  const svg = Buffer.from(iconSvg(size))
  const dest = path.join(publicDir, name)
  await sharp(svg).png().toFile(dest)
  console.log(`✓ ${name} (${size}×${size})`)
}

console.log('\nAll icons generated.')
