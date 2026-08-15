import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Memformat durasi (detik) menjadi mm:ss / h:mm:ss. */
export function formatDuration(seconds?: number): string {
  if (!seconds || !isFinite(seconds) || seconds < 0) return ''
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Menebak nama platform dari URL (untuk badge hasil scrape / preview). */
export function guessPlatform(url: string): string {
  if (/tiktok/i.test(url)) return 'TikTok'
  if (/douyin|iesdouyin/i.test(url)) return 'Douyin'
  if (/youtube|youtu\.be/i.test(url)) return 'YouTube'
  if (/instagram/i.test(url)) return 'Instagram'
  if (/facebook|fb\.watch/i.test(url)) return 'Facebook'
  if (/twitter|x\.com/i.test(url)) return 'X / Twitter'
  return 'Video'
}

/** URL protokol kustom media:// untuk memutar file lokal di <video>. */
export function mediaUrlForFile(filePath: string): string {
  return `media://local/${encodeURIComponent(filePath)}`
}

/** Memformat byte menjadi teks ringkas (mis. "12.3 MB"). */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

/** Memformat kecepatan unduh (byte/detik) menjadi teks. */
export function formatSpeed(bytesPerSec?: number): string {
  return bytesPerSec && bytesPerSec > 0 ? `${formatBytes(bytesPerSec)}/dtk` : ''
}

/** Memformat estimasi sisa waktu (detik) menjadi teks. */
export function formatEta(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return ''
  const s = Math.round(seconds)
  if (s < 60) return `${s} dtk`
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m < 60) return `${m} mnt ${sec} dtk`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h} jam ${mm} mnt`
}
