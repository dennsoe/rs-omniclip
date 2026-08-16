import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Migrasi data pengguna saat rebranding (RS OmniClip → RS OmniTools).
 *
 * Perubahan `package.json` `name` mengubah jalur userData dari
 * `.../rs-omniclip` menjadi `.../rs-omnitools`. Tanpa migrasi, pengguna akan
 * kehilangan binary engine (ffmpeg/yt-dlp), konfigurasi, riwayat, dan workspace
 * Performa Kampanye.
 *
 * Modul ini menyalin item penting dari userData LAMA ke BARU — sekali, per-item,
 * idempoten (hanya jika item belum ada di tujuan). Dipanggil di awal main
 * process, SEBELUM app menulis apa pun ke userData baru.
 */

/** Nama folder userData lama (sebelum rebranding). */
const OLD_USERDATA_NAME = 'rs-omniclip'

/** Item penting yang dimigrasikan (folder/file). */
const MIGRATE_ITEMS = ['bin', 'omni-config.json', 'analytics'] as const

/** Salin satu kali data penting dari userData lama → baru. */
export function migrateLegacyUserData(): void {
  const newDir = app.getPath('userData')
  const oldDir = path.join(app.getPath('appData'), OLD_USERDATA_NAME)
  if (oldDir === newDir) return
  if (!fs.existsSync(oldDir)) return

  for (const item of MIGRATE_ITEMS) {
    const src = path.join(oldDir, item)
    const dst = path.join(newDir, item)
    // Hanya salin bila belum ada di tujuan (idempoten, aman untuk user baru).
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      try {
        fs.cpSync(src, dst, { recursive: true })
      } catch (err) {
        console.error(`[RS OmniTools] Gagal memigrasikan '${item}':`, err)
      }
    }
  }
}
