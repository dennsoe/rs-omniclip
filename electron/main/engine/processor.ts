import path from 'node:path'
import fs from 'node:fs'
import { ensureFfmpeg, probe, runFfmpeg, type ProbeResult } from './ffmpeg'
import { createOutputFolderForBatch } from './paths'

export type PresetType = 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' | 'whatsapp'

export interface ProcessFileInput {
  id: string
  path: string
  name: string
}

export interface ProcessProgress {
  id: string
  percent: number
  status: 'processing' | 'success' | 'failed'
  /** Pesan kegagalan opsional (diisi hanya saat status 'failed'). */
  error?: string
}

/** Target resolusi sumbu panjang (piksel). */
type ScaleTarget = 720 | 1080 | 2160

/** Target ukuran file WhatsApp dalam MB (batas umum berbagi video WA). */
const WHATSAPP_TARGET_MB = 16

/**
 * Memproses sekumpulan video secara berurutan (batch) sesuai prasetel.
 * NON-DESTRUKTIF: hasil ditulis ke folder `[CLEANED] - YYYY-MM-DD`,
 * tidak pernah menimpa berkas asli.
 *
 * @returns folder keluaran batch.
 */
export async function processBatch(
  files: ProcessFileInput[],
  preset: PresetType,
  onProgress: (p: ProcessProgress) => void
): Promise<string> {
  if (!files || files.length === 0) {
    throw new Error('Tidak ada video untuk diproses.')
  }

  const { ffmpeg, ffprobe } = await ensureFfmpeg()
  const outputFolder = createOutputFolderForBatch(files[0].path)

  for (const file of files) {
    const outputPath = uniqueOutputPath(outputFolder, stripExtension(file.name))
    try {
      const info = await probe(file.path, ffprobe)
      const argSets = buildArgSets(preset, file.path, outputPath, info)
      const totalDuration = info.duration || 0

      let processed = false
      for (let i = 0; i < argSets.length; i++) {
        try {
          await runFfmpeg({
            ffmpegPath: ffmpeg,
            args: argSets[i],
            totalDuration,
            onProgress: (percent) => onProgress({ id: file.id, percent, status: 'processing' })
          })
          processed = true
          break
        } catch (err) {
          // Jika ini set argumen terakhir, biarkan error naik.
          if (i === argSets.length - 1) {
            throw err
          }
          // Jika bukan, coba set argumen cadangan (fallback).
        }
      }

      if (processed) {
        onProgress({ id: file.id, percent: 100, status: 'success' })
      }
    } catch (err) {
      onProgress({
        id: file.id,
        percent: 100,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Gagal memproses video.'
      })
    }
  }

  return outputFolder
}

/**
 * Menghasilkan jalur output yang TIDAK menimpa berkas yang sudah ada.
 * Jika nama sudah dipakai (mis. diproses ulang di hari yang sama), tambahkan
 * akhiran "(n)" — menjaga prinsip non-destruktif untuk SEMUA hasil, bukan
 * hanya berkas sumber.
 */
function uniqueOutputPath(outputFolder: string, baseName: string): string {
  let candidate = path.join(outputFolder, `${baseName}.mp4`)
  let counter = 1
  while (fs.existsSync(candidate)) {
    candidate = path.join(outputFolder, `${baseName} (${counter}).mp4`)
    counter++
  }
  return candidate
}

function stripExtension(name: string): string {
  const ext = path.extname(name)
  return ext ? name.slice(0, -ext.length) : name
}

/**
 * Membangun daftar set argumen ffmpeg. Set pertama adalah set utama,
 * set berikutnya adalah fallback jika set utama gagal.
 */
function buildArgSets(
  preset: PresetType,
  input: string,
  output: string,
  info: ProbeResult
): string[][] {
  const common = ['-y', '-i', input, '-map_metadata', '-1']

  switch (preset) {
    case 'metadata': {
      // Hanya menghapus metadata - remux lossless, tanpa re-encode.
      return [
        [...common, '-c', 'copy', '-movflags', '+faststart', output],
        // Fallback: codec tidak dapat diremux ke .mp4 -> encode minimal.
        [
          ...common,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          output
        ]
      ]
    }

    case 'hd':
      return buildEnhance(common, 720, output)
    case 'fullhd':
      return buildEnhance(common, 1080, output)
    case 'uhd':
      return buildEnhance(common, 2160, output)

    case 'archive': {
      // Arsip kualitas maks: resolusi asli + CRF 18.
      return [
        [
          ...common,
          '-c:v',
          'libx264',
          '-preset',
          'slow',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '256k',
          '-movflags',
          '+faststart',
          output
        ]
      ]
    }

    case 'whatsapp': {
      // Kompresi WhatsApp: hitung bitrate dari target ukuran dan durasi.
      const videoBitrate = computeWhatsappVideoBitrate(info)
      return [
        [
          ...common,
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-b:v',
          `${videoBitrate}k`,
          '-maxrate',
          `${Math.round(videoBitrate * 1.5)}k`,
          '-bufsize',
          `${Math.round(videoBitrate * 2)}k`,
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          output
        ]
      ]
    }

    default:
      throw new Error(`Prasetel tidak dikenal: ${preset}`)
  }
}

/**
 * Set argumen preset "peningkat": upscale ke target sumbu panjang +
 * penajaman + denoise audio (dengan fallback tanpa filter audio).
 */
function buildEnhance(common: string[], target: ScaleTarget, output: string): string[][] {
  const videoArgs = [
    ...common,
    '-vf',
    `scale='if(gt(iw,ih),${target},-2)':'if(gt(iw,ih),-2,${target})':flags=lanczos,unsharp=5:5:0.6:5:5:0.0`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p'
  ]
  const audioArgs = ['-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart']

  return [
    // Set utama: dengan filter reduksi noise audio.
    [...videoArgs, '-af', 'afftdn=nr=12:nf=-30', ...audioArgs, output],
    // Fallback: tanpa filter audio (kompatibilitas codec audio tertentu).
    [...videoArgs, ...audioArgs, output]
  ]
}

/**
 * Menghitung bitrate video (kbps) agar ukuran akhir mendekati target WhatsApp.
 * Bitrate audio diasumsikan 128 kbps.
 */
function computeWhatsappVideoBitrate(info: ProbeResult): number {
  const duration = info.duration > 0 ? info.duration : 60
  const totalBits = WHATSAPP_TARGET_MB * 8 * 1024 * 1024
  const audioBits = 128 * 1024 * duration
  const videoBits = Math.max(totalBits - audioBits, 256 * 1024 * duration)
  return Math.round(videoBits / 1024 / duration)
}
