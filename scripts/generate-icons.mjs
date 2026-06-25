import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')
const appDir    = path.join(root, 'src', 'app')
const src       = path.join(publicDir, 'Nexus-Favicon.png')

// ── PNG icons ────────────────────────────────────────────────────────────────
const pngIcons = [
  { name: 'icon-16.png',          size: 16  },
  { name: 'icon-32.png',          size: 32  },
  { name: 'icon-48.png',          size: 48  },
  { name: 'icon-192.png',         size: 192 },
  { name: 'icon-512.png',         size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of pngIcons) {
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(publicDir, name))
  console.log(`✓ public/${name} (${size}×${size})`)
}

// ── Next.js App Router icon (auto-picked up, adds <link rel="icon">) ─────────
await sharp(src).resize(32, 32, { fit: 'cover' }).png().toFile(path.join(appDir, 'icon.png'))
console.log('✓ src/app/icon.png (32×32) — Next.js App Router convention')

// ── favicon.ico (multi-size ICO wrapping PNG data) ───────────────────────────
// ICO spec: header (6 bytes) + dir entries (16 bytes each) + image data
// Modern browsers support PNG-inside-ICO (Vista+ / Chrome / Firefox / Edge)
const icoSizes = [16, 32, 48]
const pngBuffers = await Promise.all(
  icoSizes.map((s) => sharp(src).resize(s, s, { fit: 'cover' }).png().toBuffer())
)

const headerSize  = 6
const dirSize     = 16 * icoSizes.length
let   offset      = headerSize + dirSize

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)              // reserved
header.writeUInt16LE(1, 2)              // type = 1 (icon)
header.writeUInt16LE(icoSizes.length, 4) // number of images

const dirEntries = icoSizes.map((s, i) => {
  const buf = Buffer.alloc(16)
  buf.writeUInt8(s === 256 ? 0 : s, 0)  // width (0 = 256)
  buf.writeUInt8(s === 256 ? 0 : s, 1)  // height
  buf.writeUInt8(0, 2)                   // color count
  buf.writeUInt8(0, 3)                   // reserved
  buf.writeUInt16LE(1, 4)               // color planes
  buf.writeUInt16LE(32, 6)              // bits per pixel
  buf.writeUInt32LE(pngBuffers[i].length, 8) // size of image data
  buf.writeUInt32LE(offset, 12)         // offset of image data
  offset += pngBuffers[i].length
  return buf
})

const ico = Buffer.concat([header, ...dirEntries, ...pngBuffers])
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico)
console.log('✓ public/favicon.ico (16+32+48 multi-size ICO)')

console.log('\nAll icons done.')
