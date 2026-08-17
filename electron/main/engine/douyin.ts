import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'

/**
 * Dukungan unduhan Douyin (www.douyin.com).
 *
 * HASIL AUDIT (2026-08-14, diverifikasi langsung di lapangan):
 * - Resolve short link `v.douyin.com/xxx` -> URL kanonik MASIH berfungsi tanpa
 *   login (ikut redirect sampai ke `www.iesdouyin.com/share/video/{id}/...`,
 *   aweme_id bisa diekstrak dari URL akhir).
 * - Endpoint publik lama `iesdouyin.com/web/api/v2/aweme/iteminfo` -> HTTP 200
 *   namun body KOSONG (sudah diblokir anti-bot).
 * - Endpoint web `douyin.com/aweme/v1/web/aweme/detail` -> HTTP 200 namun body
 *   KOSONG tanpa tanda tangan X-Bogus + cookie sesi.
 * - yt-dlp extractor Douyin (versi 2026.07.04) -> `Fresh cookies (not
 *   necessarily logged in) are needed` bila tanpa cookie sesi.
 *
 * KESIMPULAN: TIDAK ada metode gratis tanpa cookie untuk Douyin (anti-bot
 * sangat ketat; memengaruhi semua pengunduh). Solusi yang didukung = berikan
 * cookie sesi Douyin (paste header Cookie atau Cookies Browser) lalu biarkan
 * yt-dlp (extractor Douyin yang terus diperbarui) yang mengunduh.
 *
 * Modul ini menyediakan tiga utilitas:
 * 1) `isDouyinUrl`          — deteksi URL Douyin (douyin.com / iesdouyin.com).
 * 2) `normalizeDouyinUrl`   — resolve short link menjadi URL kanonik
 *                             `https://www.douyin.com/video/{id}`.
 * 3) `writeNetscapeCookieFile` — konversi header Cookie mentah menjadi file
 *                             cookies format Netscape untuk `yt-dlp --cookies`.
 */

/** Deteksi URL Douyin (douyin.com / iesdouyin.com), termasuk short link. */
export function isDouyinUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return host === 'douyin.com' || host.endsWith('.douyin.com') || host.endsWith('iesdouyin.com')
  } catch {
    return false
  }
}

/**
 * Mengekstrak aweme_id dari URL Douyin (pola share / kanonik / short-link).
 * Mengembalikan null bila tidak ditemukan.
 */
export function extractAwemeId(url: string): string | null {
  const patterns = [
    /[?&]modal_id=(\d+)/,
    /[?&]aweme_id=(\d+)/,
    /[?&]item_ids=(\d+)/,
    /\/(?:video|note|share\/video)\/(\d+)/,
    /\/(\d{15,25})\//
  ]
  for (const re of patterns) {
    const m = re.exec(url)
    if (m && m[1]) return m[1]
  }
  return null
}

/** User-Agent browser agar redirect short link tidak ditolak anti-bot. */
const DOUYIN_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'

/** Mengikuti redirect (maks N hop) dan mengembalikan URL akhir. */
function followRedirects(url: string, timeoutMs = 20000, maxHops = 6): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http
    const req = lib.get(url, { headers: { 'User-Agent': DOUYIN_UA } }, (res) => {
      const status = res.statusCode ?? 0
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        const location = res.headers.location
        const origin = new URL(url).origin
        const next = location.startsWith('http') ? location : `${origin}${location}`
        resolve(maxHops <= 0 ? next : followRedirects(next, timeoutMs, maxHops - 1))
        return
      }
      res.resume()
      resolve(url)
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Douyin resolve timeout (${timeoutMs} ms)`)))
  })
}

/**
 * Menormalkan URL Douyin menjadi URL kanonik `https://www.douyin.com/video/{id}`:
 * - Short link `v.douyin.com/xxx` di-resolve (ikut redirect) untuk mendapat id.
 * - URL yang sudah punya id dan bukan short link dikembalikan apa adanya.
 * Bila resolve gagal, URL asli dikembalikan (yt-dlp tetap mencoba).
 */
export async function normalizeDouyinUrl(url: string): Promise<string> {
  if (!isDouyinUrl(url)) return url
  try {
    const host = new URL(url).hostname.toLowerCase()
    const directId = extractAwemeId(url)
    if (directId && !host.includes('v.douyin.com')) {
      return url
    }
    const finalUrl = await followRedirects(url)
    const id = extractAwemeId(finalUrl)
    if (id) return `https://www.douyin.com/video/${id}`
    return finalUrl
  } catch {
    return url
  }
}

/**
 * Menulis header Cookie mentah (mis. `name1=v1; name2=v2`) menjadi file cookies
 * format Netscape yang dipahami `yt-dlp --cookies <file>`. Bagian yang tidak
 * valid dilewati; nilai mengandung tab/baris baru dibersihkan.
 *
 * Kolom baris: domain \t includeSubdomains \t path \t secure \t expiry \t name \t value
 */
export function writeNetscapeCookieFile(rawCookie: string, filePath: string): void {
  const lines: string[] = ['# Netscape HTTP Cookie File', '']
  for (const part of rawCookie.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const name = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim().replace(/[\t\r\n]/g, '')
    if (!name || !value) continue
    // Expiry 4102444800 = 2100-01-01 (cookie sesi dianggap valid jangka panjang).
    lines.push(`.douyin.com\tTRUE\t/\tTRUE\t4102444800\t${name}\t${value}`)
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8')
}

/** Hasil pemeriksaan header Cookie Douyin (satu sumber kebenaran: main process). */
export interface DouyinCookieParse {
  /** Jumlah pasangan name=value yang valid (sama dengan yang ditulis ke file). */
  count: number
  /** Jumlah segmen yang diabaikan (format tidak valid / kosong). */
  invalid: number
  /** Daftar nama cookie yang terdeteksi (urutan kemunculan). */
  keys: string[]
  /** true bila memuat cookie sesi penting Douyin (ttwid/msToken/odin_tt/passport_csrf_token/sid_guard). */
  hasSession: boolean
}

/** Cookie sesi Douyin yang menandakan login/anti-bot (bagian dari set yang lazim). */
const DOUYIN_SESSION_KEYS = ['ttwid', 'msToken', 'odin_tt', 'passport_csrf_token', 'sid_guard']

/**
 * Memeriksa header Cookie mentah Douyin. Aturan validasi SAMA dengan
 * `writeNetscapeCookieFile` (name di kiri '=', value tidak kosong) agar UI
 * menampilkan status yang akurat dengan apa yang benar-benar dipakai yt-dlp.
 */
export function parseDouyinCookie(raw: string): DouyinCookieParse {
  const keys: string[] = []
  let invalid = 0
  for (const part of String(raw ?? '').split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) {
      invalid++
      continue
    }
    const name = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (!name || !value) {
      invalid++
      continue
    }
    keys.push(name)
  }
  const lower = keys.map((k) => k.toLowerCase())
  const hasSession = DOUYIN_SESSION_KEYS.some((k) => lower.includes(k))
  return { count: keys.length, invalid, keys, hasSession }
}
