import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

// Local worktrees may contain source images without the generated catalog assets.
const root = resolve(process.argv[2] ?? '.')
const require = createRequire(join(root, 'package.json'))
const sharp = require('sharp')
const ktx = require('ktx-parse')
const library = readFileSync(join(root, 'packages/core/src/material-library.ts'), 'utf8')
const paths = [...new Set([...library.matchAll(/['"](\/material\/[^'"]+)['"]/g)].map(m => m[1]))]
const roles = { basecolor: ['basecolor', 'diffuse', 'albedo'], normal: ['normal'], ao: ['ambientocclusion', 'ao'], roughness: ['roughness'], metallic: ['metallic', 'metalness'], displacement: ['height', 'displacement'] }
let generated = 0
const missing = []
for (const url of paths) {
  const destination = join(root, 'apps/editor/public', url)
  if (existsSync(destination)) continue
  const thumbnail = url.endsWith('_thumb.webp')
  const role = thumbnail ? 'basecolor' : Object.keys(roles).find(value => url.includes(`_${value}_`))
  const directory = dirname(destination)
  const candidates = existsSync(directory) ? readdirSync(directory).filter(name =>
    /\.(webp|png|jpe?g)$/i.test(name) && !name.includes('_thumb') &&
    roles[role]?.some(token => name.toLowerCase().replace(/[-_ ]/g, '').includes(token))) : []
  if (candidates.length !== 1) { missing.push(url); continue }
  const source = join(directory, candidates[0])
  if (thumbnail) {
    await sharp(source).resize(192, 192, { fit: 'inside' }).webp({ quality: 82 }).toFile(destination)
  } else {
    // Standard RGBA KTX2 keeps the existing catalog URLs usable without native encoders.
    const { data, info } = await sharp(source).resize(512, 512, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const container = ktx.createDefaultContainer()
    Object.assign(container, { vkFormat: role === 'basecolor' ? ktx.VK_FORMAT_R8G8B8A8_SRGB : ktx.VK_FORMAT_R8G8B8A8_UNORM,
      pixelWidth: info.width, pixelHeight: info.height, levelCount: 1,
      levels: [{ levelData: data, uncompressedByteLength: data.length }] })
    const dfd = container.dataFormatDescriptor[0]
    Object.assign(dfd, { colorModel: 1, transferFunction: role === 'basecolor' ? 2 : 1,
      bytesPlane: [4, 0, 0, 0, 0, 0, 0, 0], samples: [0, 1, 2, 15].map((channel, index) => ({
        bitOffset: index * 8, bitLength: 7, channelType: channel, samplePosition: [0, 0, 0, 0], sampleLower: 0, sampleUpper: 255,
      })) })
    writeFileSync(destination, ktx.write(container))
  }
  generated++
}
console.log(JSON.stringify({ generated, missing }, null, 2))
if (missing.length) process.exitCode = 1
