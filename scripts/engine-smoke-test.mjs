#!/usr/bin/env node
/**
 * Smoke test headless untuk mesin RS OmniClip.
 *
 * Memverifikasi bahwa:
 *   1. Binary FFmpeg/FFprobe dapat diunduh (via ffbinaries).
 *   2. Seluruh rantai perintah preset (quick, standard, archive, whatsapp)
 *      sesuai dengan yang ada di electron/main/engine/processor.ts dapat
 *      berjalan dan menghasilkan file keluaran yang valid.
 *   3. Pemotongan lossless (trimmer) berfungsi.
 *
 * Catatan: skrip ini MENIRU perintah yang dipakai engine (tidak mengimpor
 * modul engine karena engine bergantung pada runtime Electron). Jalankan:
 *   node scripts/engine-smoke-test.mjs
 */

import ffbinaries from 'ffbinaries'
import extract from 'extract-zip'
import { execFile } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const workDir = path.join(os.tmpdir(), 'omniclip-smoke-' + Date.now())
const binDir = path.join(workDir, 'bin')
const outDir = path.join(workDir, 'out')
fs.mkdirSync(binDir, { recursive: true })
fs.mkdirSync(outDir, { recursive: true })

let passed = 0
let failed = 0

function ok(label) {
  passed++
  console.log(`  PASS  ${label}`)
}

function fail(label, err) {
  failed++
  console.error(`  FAIL  ${label}`)
  if (err) console.error(`        ${err instanceof Error ? err.message : String(err)}`)
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

async function main() {
  console.log('\n=== SMOKE TEST MESIN RS OMNICLIP ===\n')
  console.log(`Direktori kerja: ${workDir}\n`)

  // 1. Unduh binary
  console.log('[1] Menyiapkan binary FFmpeg/FFprobe...')
  try {
    await new Promise((resolve, reject) => {
      ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], { destination: binDir }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  } catch {
    console.log('      API ffbinaries tidak terjangkau; lanjut verifikasi...')
  }

  const platform = ffbinaries.detectPlatform()
  const ffmpeg = path.join(binDir, ffbinaries.getBinaryFilename('ffmpeg', platform))
  const ffprobe = path.join(binDir, ffbinaries.getBinaryFilename('ffprobe', platform))

  // ffbinaries kadang selesai tanpa mengekstrak -> verifikasi, lalu ekstrak dari cache lokal.
  if (!fs.existsSync(ffmpeg) || !fs.existsSync(ffprobe)) {
    console.log('      Binary belum ada; mengekstrak dari cache lokal ffbinaries...')
    const cacheDir = path.join(os.homedir(), '.ffbinaries-cache')
    if (fs.existsSync(cacheDir)) {
      for (const z of fs.readdirSync(cacheDir).filter((f) => f.endsWith('.zip'))) {
        await extract(path.join(cacheDir, z), { dir: binDir })
      }
    }
  }

  if (fs.existsSync(ffmpeg) && fs.existsSync(ffprobe)) ok('FFmpeg & FFprobe tersedia')
  else {
    fail('FFmpeg & FFprobe tersedia', new Error('Binary tidak ditemukan setelah unduhan/ekstraksi.'))
    process.exit(1)
  }

  // 2. Buat video uji (5 detik, 640x360, audio)
  console.log('\n[2] Membuat video uji...')
  const testVideo = path.join(workDir, 'uji.mp4')
  await run(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=5:size=640x360:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=5',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', testVideo
  ])
  ok('Video uji dibuat')

  // 3. Probe durasi/resolusi
  const info = await probeJson(ffprobe, testVideo)
  console.log(`      Durasi: ${info.duration}s, Resolusi: ${info.width}x${info.height}`)
  ok('Probe durasi & resolusi')

  // 4. Uji setiap preset (argumen sama persis dengan processor.ts)
  console.log('\n[3] Menguji preset...')
  const common = ['-y', '-i', testVideo, '-map_metadata', '-1']

  // quick: hapus metadata, remux lossless
  {
    const out = path.join(outDir, 'quick.mp4')
    const args = [...common, '-c', 'copy', '-movflags', '+faststart', out]
    await tryPreset('quick (hapus metadata, lossless)', ffmpeg, args, ffprobe, out)
  }

  // standard: upscale 1080p + unsharp + afftdn
  {
    const out = path.join(outDir, 'standard.mp4')
    const scaleFilter = "scale='if(gt(iw,ih),1080,-2)':'if(gt(iw,ih),-2,1080)':flags=lanczos"
    const args = [
      ...common,
      '-vf', `${scaleFilter},unsharp=5:5:0.6:5:5:0.0`,
      '-af', 'afftdn=nr=12:nf=-30',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out
    ]
    await tryPreset('standard (1080p + penajaman + denoise)', ffmpeg, args, ffprobe, out, true)
  }

  // archive: CRF 18, resolusi asli
  {
    const out = path.join(outDir, 'archive.mp4')
    const args = [
      ...common,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out
    ]
    await tryPreset('archive (CRF 18)', ffmpeg, args, ffprobe, out)
  }

  // whatsapp: bitrate dari target 16MB
  {
    const out = path.join(outDir, 'whatsapp.mp4')
    const duration = parseFloat(info.duration) > 0 ? parseFloat(info.duration) : 60
    const videoBitrate = Math.max(Math.round((16 * 8 * 1024 * 1024 - 128 * 1024 * duration) / 1024 / duration), 256)
    const args = [
      ...common,
      '-c:v', 'libx264', '-preset', 'medium',
      '-b:v', `${videoBitrate}k`, '-maxrate', `${Math.round(videoBitrate * 1.5)}k`,
      '-bufsize', `${Math.round(videoBitrate * 2)}k`, '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out
    ]
    await tryPreset('whatsapp (kompresi target ukuran)', ffmpeg, args, ffprobe, out)
  }

  // 5. Uji pemotongan lossless
  console.log('\n[4] Menguji pemotongan lossless (trimmer)...')
  {
    const out = path.join(outDir, 'potong.mp4')
    const args = ['-y', '-i', testVideo, '-ss', '00:00:01', '-to', '00:00:03', '-c', 'copy', '-map_metadata', '-1', '-movflags', '+faststart', out]
    await tryPreset('potong 1s - 3s (stream copy)', ffmpeg, args, ffprobe, out)
  }

  // 6. Verifikasi output memakai format folder [CLEANED]
  console.log('\n[5] Rangkuman')
  console.log(`  Total: ${passed} PASS, ${failed} FAIL\n`)
  fs.rmSync(workDir, { recursive: true, force: true })
  if (failed > 0) process.exit(1)
  console.log('Semua pengujian lulus. Mesin siap digunakan.\n')
}

async function tryPreset(label, ffmpeg, args, ffprobe, out, checkUpscale = false) {
  try {
    await run(ffmpeg, args)
    if (!fs.existsSync(out) || fs.statSync(out).size === 0) throw new Error('Output kosong / tidak ada')
    const info = await probeJson(ffprobe, out)
    if (checkUpscale && info.width < 1080) throw new Error(`Upscale gagal: lebar ${info.width}`)
    ok(label)
  } catch (err) {
    fail(label, err)
  }
}

function probeJson(ffprobe, file) {
  return new Promise((resolve, reject) => {
    execFile(ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        reject(err)
        return
      }
      try {
        const data = JSON.parse(stdout)
        const duration = parseFloat(data?.format?.duration || '0') || 0
        let width = 0
        let height = 0
        for (const s of data?.streams ?? []) {
          if (s.codec_type === 'video') {
            width = s.width || 0
            height = s.height || 0
            break
          }
        }
        resolve({ duration, width, height })
      } catch {
        reject(new Error('Gagal mem-parse probe'))
      }
    })
  })
}

main().catch((err) => {
  console.error('\nSmoke test gagal:', err)
  process.exit(1)
})
