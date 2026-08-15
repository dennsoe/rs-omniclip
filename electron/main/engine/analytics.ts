import fs from 'node:fs'
import path from 'node:path'
import { getDownloadDir, formatDateKey } from './paths'

/**
 * Ekspor data analitik (engagement) hasil scrape/unduhan ke CSV (RFC 4180).
 * Dipakai tim riset: views/likes/comments/caption/hashtag video yang diunduh.
 * Ditulis dengan BOM (\uFEFF) agar terbuka rapi di Excel.
 */

export interface AnalyticsRecord {
  platform: string
  url: string
  id?: string
  title?: string
  views?: number
  likes?: number
  comments?: number
  caption?: string
  hashtags?: string
  duration?: number
  uploadedAt?: string
}

const COLUMNS = [
  'platform',
  'url',
  'id',
  'title',
  'views',
  'likes',
  'comments',
  'caption',
  'hashtags',
  'duration_seconds',
  'uploaded_at'
]

/** Escape satu field CSV (RFC 4180): kutip bila ada koma/kutip/baris baru. */
export function csvEscape(field: unknown): string {
  if (field === undefined || field === null) return ''
  const s = String(field)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Ekstrak hashtag (#...) dari caption/description. */
export function parseHashtags(caption?: string): string {
  if (!caption) return ''
  const tags = caption.match(/#[\p{L}\p{N}_]+/gu) ?? []
  return tags.join(' ')
}

/** Tulis file CSV ke `dir` (nama unik bila sudah ada). Mengembalikan path file. */
export function writeAnalyticsCsv(dir: string, records: AnalyticsRecord[]): string {
  fs.mkdirSync(dir, { recursive: true })
  const base = `analytics-${formatDateKey(new Date())}`
  let filePath = path.join(dir, `${base}.csv`)
  let counter = 1
  while (fs.existsSync(filePath)) {
    filePath = path.join(dir, `${base} (${counter}).csv`)
    counter++
  }

  const lines = [COLUMNS.join(',')]
  for (const r of records) {
    lines.push(
      [
        csvEscape(r.platform),
        csvEscape(r.url),
        csvEscape(r.id),
        csvEscape(r.title),
        csvEscape(r.views),
        csvEscape(r.likes),
        csvEscape(r.comments),
        csvEscape(r.caption),
        csvEscape(r.hashtags ?? parseHashtags(r.caption)),
        csvEscape(r.duration),
        csvEscape(r.uploadedAt)
      ].join(',')
    )
  }
  fs.writeFileSync(filePath, `\uFEFF${lines.join('\n')}`, 'utf8')
  return filePath
}

/** Tulis CSV dari daftar hasil scrape ke folder unduhan (convenience). */
export function exportScrapeToCsv(
  items: Array<{
    id?: string
    title?: string
    url: string
    duration?: number
    views?: number
    likes?: number
    comments?: number
    description?: string
  }>,
  platformGuesser: (url: string) => string
): string {
  const records: AnalyticsRecord[] = items.map((it) => ({
    platform: platformGuesser(it.url),
    url: it.url,
    id: it.id,
    title: it.title,
    views: it.views,
    likes: it.likes,
    comments: it.comments,
    caption: it.description,
    duration: it.duration
  }))
  return writeAnalyticsCsv(getDownloadDir(), records)
}
