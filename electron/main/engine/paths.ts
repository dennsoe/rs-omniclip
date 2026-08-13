import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

/** Folder tempat binary engine (ffmpeg, ffprobe, yt-dlp) disimpan. */
export function getEngineBinDir(): string {
  return path.join(app.getPath('userData'), 'bin')
}

/** Folder akar hasil keluaran unduhan. */
export function getOutputBaseDir(): string {
  return path.join(app.getPath('downloads'), 'RS-OmniClip')
}

/** Folder khusus hasil unduhan yt-dlp. */
export function getDownloadDir(): string {
  return path.join(getOutputBaseDir(), 'Unduhan')
}

/** Format tanggal YYYY-MM-DD. */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Membuat folder keluaran NON-DESTRUKTIF bernama `[CLEANED] - YYYY-MM-DD`
 * di dalam folder berkas sumber pertama. Seluruh hasil batch masuk ke sini.
 * Berkas asli tidak pernah ditimpa.
 */
export function createOutputFolderForBatch(firstSourcePath: string): string {
  const srcDir = path.dirname(firstSourcePath)
  const folderName = `[CLEANED] - ${formatDateKey(new Date())}`
  const outDir = path.join(srcDir, folderName)
  fs.mkdirSync(outDir, { recursive: true })
  return outDir
}
