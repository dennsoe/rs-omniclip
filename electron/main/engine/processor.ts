import path from 'node:path'
import fs from 'node:fs'
import { ensureFfmpeg, probe, runFfmpeg, type ProbeResult } from './ffmpeg'
import { createOutputFolderForBatch } from './paths'
import type { HwAccelMode } from '../config'

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
  onProgress: (p: ProcessProgress) => void,
  hwAccel: HwAccelMode = 'auto'
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
      const argSets = buildArgSets(preset, file.path, outputPath, info, hwAccel)
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
  info: ProbeResult,
  hwAccel: HwAccelMode = 'auto'
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
          ...encoderCrfArgs(hwAccel, 23),
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
      return buildEnhance(common, 720, output, hwAccel)
    case 'fullhd':
      return buildEnhance(common, 1080, output, hwAccel)
    case 'uhd':
      return buildEnhance(common, 2160, output, hwAccel)

    case 'archive': {
      // Arsip kualitas maks: resolusi asli + CRF 18. HW dulu, lalu fallback x264.
      const sets: string[][] = []
      if (hwAccel !== 'auto') {
        sets.push([
          ...common,
          ...encoderCrfArgs(hwAccel, 18),
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '256k',
          '-movflags',
          '+faststart',
          output
        ])
      }
      sets.push([
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
      ])
      return sets
    }

    case 'whatsapp': {
      // Kompresi WhatsApp: hitung bitrate dari target ukuran dan durasi.
      const videoBitrate = computeWhatsappVideoBitrate(info)
      const maxrate = Math.round(videoBitrate * 1.5)
      const bufsize = Math.round(videoBitrate * 2)
      const sets: string[][] = []
      if (hwAccel !== 'auto') {
        sets.push([
          ...common,
          ...encoderBitrateArgs(hwAccel, videoBitrate, maxrate, bufsize),
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          output
        ])
      }
      sets.push([
        ...common,
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-b:v',
        `${videoBitrate}k`,
        '-maxrate',
        `${maxrate}k`,
        '-bufsize',
        `${bufsize}k`,
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        output
      ])
      return sets
    }

    default:
      throw new Error(`Prasetel tidak dikenal: ${preset}`)
  }
}

/**
 * Set argumen preset "peningkat": upscale ke target sumbu panjang +
 * penajaman + denoise audio (dengan fallback tanpa filter audio).
 * Bila hwAccel != auto: set HW dicoba lebih dulu, lalu fallback x264.
 */
function buildEnhance(
  common: string[],
  target: ScaleTarget,
  output: string,
  hwAccel: HwAccelMode = 'auto'
): string[][] {
  const filter = `scale='if(gt(iw,ih),${target},-2)':'if(gt(iw,ih),-2,${target})':flags=lanczos,unsharp=5:5:0.6:5:5:0.0`
  const x264VideoArgs = [
    ...common,
    '-vf',
    filter,
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

  const sets: string[][] = []
  if (hwAccel !== 'auto') {
    const hwVideoArgs = [...common, '-vf', filter, ...encoderCrfArgs(hwAccel, 20), '-pix_fmt', 'yuv420p']
    sets.push([...hwVideoArgs, '-af', 'afftdn=nr=12:nf=-30', ...audioArgs, output])
    sets.push([...hwVideoArgs, ...audioArgs, output])
  }
  sets.push([...x264VideoArgs, '-af', 'afftdn=nr=12:nf=-30', ...audioArgs, output])
  sets.push([...x264VideoArgs, ...audioArgs, output])
  return sets
}

/** Argumen encoder hardware utk mode "kualitas" (CRF/qp/q:v). */
function encoderCrfArgs(hwAccel: HwAccelMode, crf: number): string[] {
  switch (hwAccel) {
    case 'videotoolbox':
      return ['-c:v', 'h264_videotoolbox', '-q:v', '60']
    case 'nvenc':
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', String(crf)]
    case 'amf':
      return ['-c:v', 'h264_amf', '-quality', 'speed', '-qp_i', String(crf), '-qp_p', String(crf)]
    default:
      return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf)]
  }
}

/** Argumen encoder hardware utk mode "bitrate target" (WhatsApp). */
function encoderBitrateArgs(
  hwAccel: HwAccelMode,
  bitrateK: number,
  maxrateK: number,
  bufsizeK: number
): string[] {
  const base = ['-b:v', `${bitrateK}k`, '-maxrate', `${maxrateK}k`, '-bufsize', `${bufsizeK}k`]
  switch (hwAccel) {
    case 'videotoolbox':
      return ['-c:v', 'h264_videotoolbox', ...base]
    case 'nvenc':
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', ...base]
    case 'amf':
      return ['-c:v', 'h264_amf', '-quality', 'speed', ...base]
    default:
      return ['-c:v', 'libx264', '-preset', 'medium', ...base]
  }
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
