import path from 'node:path'
import fs from 'node:fs'
import { ensureFfmpeg, probe, runFfmpeg, type ProbeResult } from './ffmpeg'
import { createOutputFolderForBatch } from './paths'
import type { HwAccelMode } from '../config'

export type PresetType = 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' | 'vertical'
/** Mode pemrosesan: 'privacy' (cepat, tanpa filter berat) / 'enhance' (pipeline jernih). */
export type ProcessingMode = 'privacy' | 'enhance'

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

/** Kualitas encode (memetakan preset x264 + CRF). */
export type QualityLevel = 'auto' | 'best' | 'balanced' | 'compact'
/** Penanganan audio keluaran. */
export type AudioMode = 'original' | 'aac128' | 'aac192' | 'aac256'

/** Opsi pemrosesan global (mode + hardware + kualitas/audio/metadata). */
export interface ProcessOptions {
  hwAccel?: HwAccelMode
  /** Mode pemrosesan (default 'enhance'). */
  processingMode?: ProcessingMode
  /** Hapus metadata/GPS (default true). */
  cleanMetadata?: boolean
  /** Kualitas encode (default 'auto'). */
  quality?: QualityLevel
  /** Penanganan audio (default 'original'). */
  audio?: AudioMode
}

/** Target resolusi sumbu panjang (piksel). */
type ScaleTarget = 720 | 1080 | 2160

/** Resolusi 9:16 vertikal (Story/Shorts/Reels). */
const VERTICAL_W = 1080
const VERTICAL_H = 1920

/**
 * Filter skala ke sisi TERPANJANG = `target` (aman untuk landscape & portrait).
 * Bila `lanczos` true, gunakan interpolasi lanczos (mode penjernihan).
 */
function scaleLongSide(target: number, lanczos = false): string {
  const flags = lanczos ? ':flags=lanczos' : ''
  return `scale='if(gt(iw,ih),-2,${target})':'if(gt(iw,ih),${target},-2)'${flags}`
}

/**
 * Transformasi 9:16 "pad-blur": konten utuh di tengah, latar terisi blur
 * (bukan hitam) — tidak memotong konten. `crop` memaksa latar ke 1080×1920
 * genap agar kompatibel dengan yuv420p/libx264.
 */
const VERTICAL_PAD_BLUR =
  `split=2[fg][bg];` +
  `[bg]scale=${VERTICAL_W}:${VERTICAL_H}:force_original_aspect_ratio=increase,crop=${VERTICAL_W}:${VERTICAL_H},boxblur=20:5,eq=brightness=0.25:contrast=1.0[bg2];` +
  `[fg]scale=${VERTICAL_W}:${VERTICAL_H}:force_original_aspect_ratio=decrease[fg2];` +
  `[bg2][fg2]overlay=(W-w)/2:(H-h)/2`

/** CRF dasar sesuai tingkat kualitas. */
function crfForQuality(quality: QualityLevel): number {
  switch (quality) {
    case 'best':
      return 18
    case 'balanced':
      return 20
    case 'compact':
      return 26
    default:
      return 20
  }
}

/** Preset x264 sesuai tingkat kualitas (kecepatan vs kompresi). */
function x264QualityArgs(quality: QualityLevel): string[] {
  switch (quality) {
    case 'best':
      return ['-preset', 'slow']
    case 'balanced':
      return ['-preset', 'medium']
    default:
      return ['-preset', 'veryfast']
  }
}

/** Argumen audio keluaran sesuai mode (original = salin tanpa ubah). */
function audioModeArgs(audio: AudioMode): string[] {
  switch (audio) {
    case 'aac128':
      return ['-c:a', 'aac', '-b:a', '128k']
    case 'aac192':
      return ['-c:a', 'aac', '-b:a', '192k']
    case 'aac256':
      return ['-c:a', 'aac', '-b:a', '256k']
    default:
      return ['-c:a', 'copy']
  }
}

/** Encode cepat mode privacy (libx264 + kualitas/audio) — fallback tanpa filter bila gagal. */
function privacyEncode(
  common: string[],
  vf: string | null,
  output: string,
  quality: QualityLevel = 'auto',
  audio: AudioMode = 'original'
): string[] {
  return [
    ...common,
    ...(vf ? ['-vf', vf] : []),
    '-c:v',
    'libx264',
    ...x264QualityArgs(quality),
    '-crf',
    String(crfForQuality(quality)),
    '-pix_fmt',
    'yuv420p',
    ...audioModeArgs(audio),
    '-movflags',
    '+faststart',
    output
  ]
}

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
  options: ProcessOptions = {}
): Promise<string> {
  if (!files || files.length === 0) {
    throw new Error('Tidak ada video untuk diproses.')
  }
  const hwAccel = options.hwAccel ?? 'auto'
  const processingMode: ProcessingMode = options.processingMode ?? 'enhance'
  const cleanMetadata = options.cleanMetadata !== false
  const quality: QualityLevel = options.quality ?? 'auto'
  const audio: AudioMode = options.audio ?? 'original'

  const { ffmpeg, ffprobe } = await ensureFfmpeg()
  const outputFolder = createOutputFolderForBatch(files[0].path)

  for (const file of files) {
    const outputPath = uniqueOutputPath(outputFolder, stripExtension(file.name))
    try {
      const info = await probe(file.path, ffprobe)
      const argSets = buildArgSets(
        preset,
        file.path,
        outputPath,
        info,
        hwAccel,
        processingMode,
        cleanMetadata,
        quality,
        audio
      )
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
  _info: ProbeResult,
  hwAccel: HwAccelMode = 'auto',
  processingMode: ProcessingMode = 'enhance',
  cleanMetadata = true,
  quality: QualityLevel = 'auto',
  audio: AudioMode = 'original'
): string[][] {
  // Metadata dibuang sesuai saklar "Hapus Metadata" (default dibuang).
  const common = ['-y', '-i', input, ...(cleanMetadata ? ['-map_metadata', '-1'] : [])]

  // Preset 'metadata' (khusus Auto-Watcher auto-clean): remux lossless.
  if (preset === 'metadata') {
    return [
      [...common, '-c', 'copy', '-movflags', '+faststart', output],
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

  // --- Mode PRIVACY: cepat, tanpa filter berat (denoise/CAS/eq). ---
  if (processingMode === 'privacy') {
    // Kualitas Asli → salin instan (tanpa re-encode video).
    if (preset === 'archive') {
      if (audio === 'original') {
        return [
          [...common, '-c', 'copy', '-movflags', '+faststart', output],
          privacyEncode(common, null, output, quality, 'aac192')
        ]
      }
      // Audio diubah → re-encode audio saja (video tetap salin, cepat).
      return [
        [...common, '-c:v', 'copy', ...audioModeArgs(audio), '-movflags', '+faststart', output],
        privacyEncode(common, null, output, quality, audio)
      ]
    }
    // Vertikal 9:16 → pad-blur + encode cepat.
    if (preset === 'vertical') {
      return [
        privacyEncode(common, VERTICAL_PAD_BLUR, output, quality, audio),
        privacyEncode(common, null, output, quality, audio)
      ]
    }
    // Resolusi (hd/fullhd/uhd) → scale biasa + encode cepat.
    const target: ScaleTarget = preset === 'hd' ? 720 : preset === 'fullhd' ? 1080 : 2160
    return [
      privacyEncode(common, scaleLongSide(target), output, quality, audio),
      privacyEncode(common, null, output, quality, audio)
    ]
  }

  // --- Mode ENHANCE: wajib re-encode + pipeline jernih ---
  // Pipeline "Penjernihan Maksimal" (terverifikasi empiris pd sumber terkompresi):
  //   hqdn3d (denoise spatial+temporal, diperkuat) → deband (bintik/banding) →
  //   <scale lanczos | pad-blur> → cas (penajam edge-aware, minim amplifikasi
  //   noise) → unsharp radius sedang (tepi halus + local contrast) → eq.
  // Uji klip TikTok 720p: detail bersih +6.9% vs sumber, noise −36%; FullHD
  // upscale +2.7% vs perilaku lama (sebelumnya malah menurunkan ketajaman).
  // CATATAN: cas=1.0 dgn build ini justru menurunkan detail (uji) → batas aman 0.95.
  const enhanceFilter = (extra: string): string =>
    `hqdn3d=2.5:2.5:12:9,deband${extra ? `,${extra}` : ''},cas=0.95,unsharp=7:7:0.7:5:5:0.3,eq=saturation=1.15:contrast=1.04`

  switch (preset) {
    case 'archive':
      return buildEnhance(common, enhanceFilter(''), output, hwAccel, quality, audio)
    case 'vertical':
      return buildEnhance(common, enhanceFilter(VERTICAL_PAD_BLUR), output, hwAccel, quality, audio)
    case 'hd':
      return buildEnhance(common, enhanceFilter(scaleLongSide(720, true)), output, hwAccel, quality, audio)
    case 'fullhd':
      return buildEnhance(common, enhanceFilter(scaleLongSide(1080, true)), output, hwAccel, quality, audio)
    case 'uhd':
      return buildEnhance(common, enhanceFilter(scaleLongSide(2160, true)), output, hwAccel, quality, audio)
    default:
      throw new Error(`Prasetel tidak dikenal: ${preset}`)
  }
}

/**
 * Set argumen encode mode "enhance": filter jernih (hqdn3d → deband → scale →
 * cas → unsharp → eq) + encoder CRF. Bila hwAccel != auto: set HW dicoba dulu,
 * lalu fallback x264 (dengan & tanpa denoise audio).
 */
function buildEnhance(
  common: string[],
  filter: string,
  output: string,
  hwAccel: HwAccelMode = 'auto',
  quality: QualityLevel = 'auto',
  audio: AudioMode = 'original'
): string[][] {
  const crf = crfForQuality(quality)
  const x264VideoArgs = [
    ...common,
    '-vf',
    filter,
    '-c:v',
    'libx264',
    ...x264QualityArgs(quality),
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p'
  ]
  const useAudioFilter = audio !== 'original'
  const audioArgs = [...audioModeArgs(audio), '-movflags', '+faststart']

  const sets: string[][] = []
  if (hwAccel !== 'auto') {
    const hwVideoArgs = [...common, '-vf', filter, ...encoderCrfArgs(hwAccel, crf), '-pix_fmt', 'yuv420p']
    if (useAudioFilter) {
      sets.push([...hwVideoArgs, '-af', 'afftdn=nr=12:nf=-30', ...audioArgs, output])
      sets.push([...hwVideoArgs, ...audioArgs, output])
    } else {
      sets.push([...hwVideoArgs, ...audioArgs, output])
    }
  }
  if (useAudioFilter) {
    sets.push([...x264VideoArgs, '-af', 'afftdn=nr=12:nf=-30', ...audioArgs, output])
    sets.push([...x264VideoArgs, ...audioArgs, output])
  } else {
    sets.push([...x264VideoArgs, ...audioArgs, output])
  }
  return sets
}

/** Argumen encoder hardware utk mode "kualitas" (CRF/qp/q:v). */
function encoderCrfArgs(hwAccel: HwAccelMode, crf: number): string[] {
  switch (hwAccel) {
    case 'videotoolbox':
      // h264_videotoolbox TIDAK mendukung -crf (opsi diterima tapi diabaikan,
      // size sama untuk crf 18/20/26). Kualitas dikendalikan -q:v (0–100) yang
      // pd build FFmpeg ini nilainya LEBIH TINGGI = kualitas LEBIH BAIK
      // (terverifikasi: q:v 75 → PSNR 47.4, 68 → 45.4, 55 → 41.4).
      return ['-c:v', 'h264_videotoolbox', '-q:v', String(videoToolboxQuality(crf))]
    case 'nvenc':
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', String(crf)]
    case 'amf':
      return ['-c:v', 'h264_amf', '-quality', 'speed', '-qp_i', String(crf), '-qp_p', String(crf)]
    default:
      return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf)]
  }
}

/**
 * Pemetaan CRF → -q:v untuk h264_videotoolbox (makin tinggi = makin baik).
 * Diselaraskan dgn crfForQuality: best(18)→75, balanced/auto(20)→68, compact(26)→55.
 */
function videoToolboxQuality(crf: number): number {
  if (crf <= 18) return 75
  if (crf <= 20) return 68
  return 55
}
