import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
const src = path.join(publicDir, 'Nexus-Favicon.png')

const icons = [
  { name: 'icon-16.png',          size: 16  },
  { name: 'icon-32.png',          size: 32  },
  { name: 'icon-192.png',         size: 192 },
  { name: 'icon-512.png',         size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of icons) {
  const dest = path.join(publicDir, name)
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(dest)
  console.log(`✓ ${name} (${size}×${size})`)
}

console.log('\nAll icons generated from Nexus-Favicon.png')
