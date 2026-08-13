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
  if (
    !payload ||
    typeof payload.path !== 'string' ||
    typeof payload.start !== 'string' ||
    typeof payload.end !== 'string'
  ) {
    return { id: payload?.id ?? '', success: false, error: 'Payload pemotongan tidak valid.' }
  }

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
    const output = uniqueTrimPath(outputFolder, base, safeStart, safeEnd)

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

/** Menghasilkan jalur hasil potongan yang tidak menimpa berkas yang sudah ada. */
function uniqueTrimPath(outputFolder: string, base: string, safeStart: string, safeEnd: string): string {
  let candidate = path.join(outputFolder, `${base} - Potongan ${safeStart}-${safeEnd}.mp4`)
  let counter = 1
  while (fs.existsSync(candidate)) {
    candidate = path.join(outputFolder, `${base} - Potongan ${safeStart}-${safeEnd} (${counter}).mp4`)
    counter++
  }
  return candidate
}

/** Mengubah format waktu "HH:MM:SS", "MM:SS", atau detik menjadi angka detik. */
export function parseTimeToSeconds(value: string): number | null {
  const text = value.trim()
  if (!text) return null

  if (/^\d+(\.\d+)?$/.test(text)) {
    const sec = Number.parseFloat(text)
    return Number.isFinite(sec) && sec >= 0 ? sec : null
  }

  const parts = text.split(':')
  if (parts.length < 2 || parts.length > 3) return null

  const nums = parts.map((p) => Number.parseFloat(p))
  if (nums.some((p) => !Number.isFinite(p) || p < 0)) return null

  const [h, m, s] = parts.length === 3 ? nums : [0, ...nums]
  if (m > 59 || s > 59) return null

  return h * 3600 + m * 60 + s
}
