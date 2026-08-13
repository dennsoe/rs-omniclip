import path from 'node:path'
import fs from 'node:fs'
import { ensureFfmpeg, runFfmpeg } from './ffmpeg'
import { createOutputFolderForBatch } from './paths'

export interface TrimPayload {
  id: string
  path: string
  start: string
  end: string
}

export interface TrimCompleteData {
  id: string
  success: boolean
  path?: string
  error?: string
}

/**
 * Memotong video secara LOSSLESS (stream copy, tanpa re-encode).
 * Hasil disimpan di folder `[CLEANED] - YYYY-MM-DD`; berkas asli tidak diubah.
 */
export async function trimVideo(payload: TrimPayload): Promise<TrimCompleteData> {
  const startSeconds = parseTimeToSeconds(payload.start)
  const endSeconds = parseTimeToSeconds(payload.end)

  if (startSeconds === null || endSeconds === null) {
    return {
      id: payload.id,
      success: false,
      error: 'Format waktu tidak valid. Gunakan HH:MM:SS atau MM:SS.'
    }
  }
  if (endSeconds <= startSeconds) {
    return { id: payload.id, success: false, error: 'Waktu selesai harus lebih besar dari waktu mulai.' }
  }
  if (!fs.existsSync(payload.path)) {
    return { id: payload.id, success: false, error: 'Berkas sumber tidak ditemukan.' }
  }

  try {
    const { ffmpeg } = await ensureFfmpeg()
    const outputFolder = createOutputFolderForBatch(payload.path)
    const safeStart = payload.start.replace(/[:.]/g, '-')
    const safeEnd = payload.end.replace(/[:.]/g, '-')
    const base = path.basename(payload.path, path.extname(payload.path))
    const output = path.join(outputFolder, `${base} - Potongan ${safeStart}-${safeEnd}.mp4`)

    await runFfmpeg({
      ffmpegPath: ffmpeg,
      args: [
        '-y',
        '-i',
        payload.path,
        '-ss',
        payload.start,
        '-to',
        payload.end,
        '-c',
        'copy',
        '-map_metadata',
        '-1',
        '-movflags',
        '+faststart',
        output
      ]
    })

    return { id: payload.id, success: true, path: output }
  } catch (err) {
    return {
      id: payload.id,
      success: false,
      error: err instanceof Error ? err.message : 'Pemotongan video gagal.'
    }
  }
}

/** Mengubah format waktu "HH:MM:SS", "MM:SS", atau detik menjadi angka detik. */
export function parseTimeToSeconds(value: string): number | null {
  const text = value.trim()
  if (/^\d+(\.\d+)?$/.test(text)) {
    return Number.parseFloat(text)
  }
  const parts = text.split(':').map((p) => Number.parseFloat(p))
  if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) {
    return null
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return null
}
