import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import { proxyAgentFor } from './proxy'

/**
 * Integrasi TikTok via API TikWM (www.tikwm.com) dengan failover multi-key.
 *
 * LATAR BELAKANG:
 * TikTok memperketat bot-detection (Agustus 2026) yang memutus SEMUA pengunduh
 * berbasis yt-dlp (issue yt-dlp #17403). TikWM memakai emulasi perangkat
 * mobile di sisi server sehingga tetap mampu mengunduh. Setiap provider punya
 * `apiKey` sendiri; bila satu provider gagal (API error / rate-limit / unduhan
 * CDN gagal), otomatis lanjut ke provider berikutnya (failover berurutan).
 *
 * HASIL AUDIT (diverifikasi langsung, 5 key):
 * - Endpoint : GET https://www.tikwm.com/api/?url=<url>&api_key=<key>
 * - Sukses   : HTTP 200, { code: 0, msg: 'success', data: { id, title, cover,
 *              duration, size, play, wmplay, author, ... } }
 * - Video    : URL di `data.play` WAJIB diunduh via GET dengan header browser
 *              (User-Agent Chrome + Referer https://www.tiktok.com/).
 *              HEAD mengembalikan 503; GET mengembalikan MP4 valid (HTTP 200).
 * - Catatan  : parameter `api_key` saat ini diterima endpoint namun belum
 *              di-enforce (key invalid pun tetap code:0). Failover tetap
 *              diterapkan atas dasar kegagalan nyata (HTTP error, code != 0,
 *              `play` kosong, unduhan CDN gagal) sehingga bila salah satu key
 *              mulai di-rate-limit/diblokir, unduhan otomatis pindah ke key
 *              berikutnya tanpa intervensi pengguna.
 */

/** Endpoint publik TikWM (bukan `api.tikwm.com` yang tidak dapat dijangkau). */
const TIKWM_API_BASE = 'https://www.tikwm.com/api'

/**
 * Daftar provider TikWM beserta api_key masing-masing (disimpan di codebase,
 * sesuai keputusan: tanpa UI tambah key).
 */
export interface TikWmProvider {
  id: string
  baseUrl: string
  apiKey: string
}

export const TIKWM_PROVIDERS: TikWmProvider[] = [
  { id: 'k1', baseUrl: TIKWM_API_BASE, apiKey: 'a3b7950783bc74e1cb60106242caf202' },
  { id: 'k2', baseUrl: TIKWM_API_BASE, apiKey: '73b05c12b943a3a30d4c9193b219f549' },
  { id: 'k3', baseUrl: TIKWM_API_BASE, apiKey: '8294b336054592785e45cb3f0b840761' },
  { id: 'k4', baseUrl: TIKWM_API_BASE, apiKey: '1b4c3c94989345563e4b851717f17a2d' },
  { id: 'k5', baseUrl: TIKWM_API_BASE, apiKey: '1b5d259dfaa7da94b7bc70649060f85e' }
]

/** User-Agent Chrome agar permintaan API/CDN tidak ditolak sebagai bot.
 *  Chrome/126 (bukan 140) — TikTok mem-flag UA Chrome/140 (audit 2026-08-16). */
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/** Referer wajib saat mengunduh `data.play` dari CDN TikTok. */
const TIKTOK_REFERER = 'https://www.tiktok.com/'

/** Metadata video yang berhasil diselesaikan dari API TikWM. */
export interface TikTokInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  sizeBytes: number
  playUrl: string
}

/** Hasil akhir unduhan TikTok (dipakai `downloader.ts` untuk event success). */
export interface TikTokDownloadResult {
  ok: boolean
  /** Path file MP4 final (terisi saat sukses). */
  filePath?: string
  title?: string
  thumbnail?: string
  sizeBytes?: number
  /** Id video TikTok (untuk nama file final). */
  videoId?: string
  error?: string
}

/** Fase unduhan TikTok untuk dilaporkan ke antrean. */
export type TikTokProgressPhase = 'resolving' | 'downloading' | 'done'

/**
 * Deteksi URL TikTok (www/vt/vm/tiktokv) sebelum memilih jalur TikWM.
 * Aman dipanggil untuk URL apa pun — mengembalikan false bila bukan TikTok.
 */
export function isTikTokUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return host.endsWith('tiktok.com') || host.endsWith('tiktokv.com')
  } catch {
    return false
  }
}

/**
 * Melakukan request GET sederhana (Node https/http) dengan penanganan redirect
 * dan batas waktu. Dipakai untuk memanggil API TikWM.
 */
function getRequest(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 45000,
  agent?: http.Agent
): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http
    const req = lib.get(url, { headers, agent }, (res) => {
      const status = res.statusCode ?? 0
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        const location = res.headers.location
        const origin = new URL(url).origin
        const next = location.startsWith('http') ? location : `${origin}${location}`
        // Teruskan agent (proxy) agar request redirect tetap lewat proxy aktif.
        resolve(getRequest(next, headers, timeoutMs, agent))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ status, body: Buffer.concat(chunks) }))
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`TikWM timeout (${timeoutMs} ms)`)))
  })
}

/** Menyelesaikan info video dari satu provider TikWM; null bila gagal. */
async function resolveWithProvider(
  provider: TikWmProvider,
  url: string,
  proxy?: string
): Promise<TikTokInfo | null> {
  const apiUrl = `${provider.baseUrl}/?url=${encodeURIComponent(url)}&api_key=${encodeURIComponent(provider.apiKey)}`
  const agent = proxy ? proxyAgentFor(proxy) : undefined
  const { status, body } = await getRequest(apiUrl, { 'User-Agent': CHROME_USER_AGENT }, 45000, agent)
  if (status !== 200) return null
  let obj: unknown
  try {
    obj = JSON.parse(body.toString('utf8'))
  } catch {
    return null
  }
  const root = obj as { code?: number; data?: Record<string, unknown> }
  if (!root || root.code !== 0 || !root.data) return null
  const d = root.data
  const play = typeof d.play === 'string' && d.play.length > 0 ? d.play : ''
  if (!play) return null
  return {
    id: typeof d.id === 'string' ? d.id : String(d.id ?? ''),
    title: typeof d.title === 'string' ? d.title : '',
    thumbnail: typeof d.cover === 'string' ? d.cover : '',
    duration: typeof d.duration === 'number' ? d.duration : 0,
    sizeBytes: typeof d.size === 'number' ? d.size : 0,
    playUrl: play
  }
}

/**
 * Menyelesaikan info video TikTok dengan failover berurutan di seluruh
 * provider. Melempar Error bila semua provider gagal.
 */
export async function resolveTikTokInfo(url: string, proxy?: string): Promise<TikTokInfo> {
  let lastError = ''
  for (const provider of TIKWM_PROVIDERS) {
    try {
      const info = await resolveWithProvider(provider, url, proxy)
      if (info) return info
      lastError = `provider ${provider.id}: tidak ada data.play`
    } catch (err) {
      lastError = `provider ${provider.id}: ${err instanceof Error ? err.message : String(err)}`
    }
  }
  throw new Error(
    `TikWM gagal untuk ${TIKWM_PROVIDERS.length} provider (${lastError}). TikTok menolak akses; coba lagi nanti.`
  )
}

/**
 * Mengunduh `data.play` (MP4) dari CDN TikTok ke `destPath` dengan header
 * browser (User-Agent + Referer) dan penanganan redirect. HEAD tidak dipakai
 * karena dikembalikan 503 — progress dihitung dari `content-length` bila ada.
 */
function downloadVideoUrl(
  playUrl: string,
  destPath: string,
  onProgress?: (percent: number) => void,
  agent?: http.Agent
): Promise<{ ok: boolean; sizeBytes: number; error?: string }> {
  return new Promise((resolve) => {
    const lib = playUrl.startsWith('https:') ? https : http
    const file = fs.createWriteStream(destPath)
    let total: number | undefined
    let received = 0
    let lastEmit = 0

    const emit = (): void => {
      const now = Date.now()
      if (now - lastEmit >= 250) {
        lastEmit = now
        if (total && total > 0) {
          onProgress?.(Math.min(99, Math.round((received / total) * 100)))
        } else {
          onProgress?.(0)
        }
      }
    }

    const fail = (err: Error): void => {
      file.destroy()
      fs.rmSync(destPath, { force: true })
      resolve({ ok: false, sizeBytes: 0, error: err.message })
    }

    const req = lib.get(
      playUrl,
      {
        headers: {
          'User-Agent': CHROME_USER_AGENT,
          Referer: TIKTOK_REFERER,
          Accept: '*/*'
        },
        agent
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          file.destroy()
          fs.rmSync(destPath, { force: true })
          const location = res.headers.location
          const origin = new URL(playUrl).origin
          const next = location.startsWith('http') ? location : `${origin}${location}`
          resolve(downloadVideoUrl(next, destPath, onProgress, agent))
          return
        }
        if (status !== 200) {
          res.resume()
          fail(new Error(`HTTP ${status} dari CDN TikTok`))
          return
        }
        total = res.headers['content-length'] ? Number(res.headers['content-length']) : undefined
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          emit()
        })
        res.pipe(file)
        file.on('finish', () => {
          file.close(() => resolve({ ok: true, sizeBytes: received }))
        })
      }
    )
    req.on('error', fail)
    file.on('error', fail)
    req.setTimeout(120000, () => req.destroy(new Error('Timeout mengunduh video TikTok')))
  })
}

/** Sanitasi nama file (aman dari karakter khusus lintas-OS). */
function sanitizeFileName(name: string): string {
  const ILLEGAL = '<>:"/\\|?*'
  let cleaned = ''
  for (const ch of name) {
    const code = ch.codePointAt(0) ?? 0
    // Karakter kontrol (ASCII 0x00-0x1F) diganti spasi.
    if (code < 0x20) {
      cleaned += ' '
      continue
    }
    cleaned += ILLEGAL.includes(ch) ? '_' : ch
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim().slice(0, 80)
  return cleaned || 'TikTok Video'
}

/**
 * Memastikan path final unik: bila file sudah ada, tambahkan ` (2)`, ` (3)`,
 * dst. Mengembalikan path final yang aman untuk ditulis.
 */
function uniquePath(destPath: string): string {
  if (!fs.existsSync(destPath)) return destPath
  const ext = path.extname(destPath)
  const base = destPath.slice(0, destPath.length - ext.length)
  for (let i = 2; i < 100; i++) {
    const candidate = `${base} (${i})${ext}`
    if (!fs.existsSync(candidate)) return candidate
  }
  return `${base} (${Date.now()})${ext}`
}

/**
 * Alur unduhan TikTok dengan failover penuh:
 * resolve info → unduh MP4 → sukses; bila resolve/unduh gagal, lanjut ke
 * provider berikutnya sampai habis. File diunduh ke path sementara yang unik,
 * lalu (saat sukses) di-rename ke `[judul] [id].mp4` di folder yang sama.
 */
export async function downloadTikTokVideo(
  url: string,
  destDir: string,
  onProgress?: (phase: TikTokProgressPhase, percent: number) => void,
  proxy?: string
): Promise<TikTokDownloadResult> {
  await fs.promises.mkdir(destDir, { recursive: true })
  const tempPath = uniquePath(path.join(destDir, `.tiktok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`))
  let lastError = ''

  for (const provider of TIKWM_PROVIDERS) {
    onProgress?.('resolving', 0)
    let info: TikTokInfo
    try {
      const found = await resolveWithProvider(provider, url, proxy)
      if (!found) {
        lastError = `provider ${provider.id}: tidak ada data.play`
        continue
      }
      info = found
    } catch (err) {
      lastError = `provider ${provider.id}: ${err instanceof Error ? err.message : String(err)}`
      continue
    }

    const dl = await downloadVideoUrl(
      info.playUrl,
      tempPath,
      (percent) => onProgress?.('downloading', percent),
      proxy ? proxyAgentFor(proxy) : undefined
    )
    if (dl.ok) {
      const finalName = `${sanitizeFileName(info.title)} [${info.id || 'tiktok'}].mp4`
      const finalPath = uniquePath(path.join(destDir, finalName))
      try {
        await fs.promises.rename(tempPath, finalPath)
      } catch {
        // Rename lintas volume jarang terjadi; salin sebagai cadangan.
        await fs.promises.copyFile(tempPath, finalPath)
        fs.rmSync(tempPath, { force: true })
      }
      onProgress?.('done', 100)
      return {
        ok: true,
        filePath: finalPath,
        title: info.title || undefined,
        thumbnail: info.thumbnail || undefined,
        sizeBytes: dl.sizeBytes || info.sizeBytes || undefined,
        videoId: info.id || undefined
      }
    }
    lastError = `provider ${provider.id}: unduhan CDN gagal (${dl.error})`
  }

  fs.rmSync(tempPath, { force: true })
  return { ok: false, error: `TikWM gagal di ${TIKWM_PROVIDERS.length} provider (${lastError}).` }
}

/** Detail profil akun TikTok (dari SSR halaman profil; best-effort). */
export interface TikTokProfile {
  name?: string
  username?: string
  avatar?: string
  followers?: number
  bio?: string
}

/**
 * Resolve profil akun TikTok dengan membaca halaman profil secara langsung
 * (HTML + JSON SSR `__UNIVERSAL_DATA_FOR_REHYDRATION__`). Best-effort:
 * bila TikTok menyajikan halaman challenge (bot-detection), fungsi mengembalikan
 * null dan pemanggil akan melaporkan "tidak dapat diverifikasi".
 */
export async function resolveTikTokProfile(url: string): Promise<TikTokProfile | null> {
  const html = await new Promise<string | null>((resolve) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': CHROME_USER_AGENT, 'Accept-Language': 'id-ID,id;q=0.9' } },
      (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          res.resume()
          resolve(null)
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      }
    )
    req.on('error', () => resolve(null))
    req.setTimeout(15000, () => req.destroy(new Error('timeout')))
  })
  if (!html) return null

  const m = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/.exec(
    html
  )
  if (!m) return null
  try {
    const data = JSON.parse(m[1]) as {
      __DEFAULT_SCOPE__?: Record<string, unknown>
    }
    const scope = data.__DEFAULT_SCOPE__?.['webapp.user-detail'] as
      | { userInfo?: { user?: Record<string, unknown> } }
      | undefined
    const user = scope?.userInfo?.user
    if (!user) return null
    const followersRaw = user.followerCount
    return {
      name: typeof user.nickname === 'string' ? user.nickname : undefined,
      username: typeof user.uniqueId === 'string' ? user.uniqueId : undefined,
      avatar: typeof user.avatarLarger === 'string' ? user.avatarLarger : undefined,
      followers:
        typeof followersRaw === 'number' && Number.isFinite(followersRaw) ? followersRaw : undefined,
      bio: typeof user.signature === 'string' ? user.signature.slice(0, 500) : undefined
    }
  } catch {
    return null
  }
}
