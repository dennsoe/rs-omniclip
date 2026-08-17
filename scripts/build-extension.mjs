#!/usr/bin/env node
// Build ekstensi cookie MV3 menjadi ZIP distribusi.
//
// Sumber versi SATU-SATUNYA: "version" di manifest.json ekstensi.
// Output: extensions/rs-omni-cookie-capturer.zip  (isi ZIP = file ekstensi di
// root, tanpa folder induk, tanpa .DS_Store/__MACOSX) — di-commit ke repo dan
// dibundel ke aplikasi via `build.extraResources`.
//
// Pemakaian:  node scripts/build-extension.mjs   (atau npm run build:extension)
// Dibutuhkan: perintah `zip` (tersedia bawaan macOS/Linux); di Windows memakai
// PowerShell Compress-Archive secara otomatis.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const extDir = path.join(root, 'extensions', 'rs-omni-cookie-capturer')
const outZip = path.join(root, 'extensions', 'rs-omni-cookie-capturer.zip')

if (!fs.existsSync(path.join(extDir, 'manifest.json'))) {
  console.error(`Manifest tidak ditemukan: ${path.join(extDir, 'manifest.json')}`)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'))
const version = manifest.version
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Versi ekstensi tidak valid di manifest.json: "${String(version)}"`)
  process.exit(1)
}

if (fs.existsSync(outZip)) fs.rmSync(outZip, { force: true })

if (process.platform === 'win32') {
  const src = path.join(extDir, '*')
  const dest = outZip
  const ps = `Compress-Archive -Path '${src.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'inherit' })
} else {
  execFileSync(
    'zip',
    ['-r', '-X', outZip, '.', '-x', '*.DS_Store', '*__MACOSX*'],
    { cwd: extDir, stdio: 'inherit' }
  )
}

if (!fs.existsSync(outZip)) {
  console.error('Gagal membuat ZIP ekstensi.')
  process.exit(1)
}

console.log(
  `OK: extensions/rs-omni-cookie-capturer.zip (ekstensi v${version}, ${fs.statSync(outZip).size} byte)`
)
