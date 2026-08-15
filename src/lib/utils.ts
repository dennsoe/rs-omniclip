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
