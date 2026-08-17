import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { parseDouyinCookie } from './douyin'

/**
 * Jembatan cookie lokal untuk ekstensi "RS OmniTools — Cookie Capturer" (MV3).
 *
 * - Server HTTP hanya mendengarkan di LOOPBACK (127.0.0.1) pada port DINAMIS.
 * - Kode hubung (`<port>:<token>`) ditampilkan di aplikasi; user menempelkannya
 *   SEKALI ke ekstensi. Ekstensi mengirim token di tiap POST agar halaman web
 *   berbahaya / proses lain tidak bisa menyuntikkan cookie.
 * - Tanpa header CORS → browser tidak bisa MEMBACA respons lintas-origin;
 *   ditambah token untuk MENCEGAH penulisan. (Loopback + token cukup untuk
 *   skenario lokal desktop.)
 * - Endpoint:
 *   GET  /api/health   → { ok: true }                       (cek app hidup)
 *   POST /api/cookies  → { site, cookieHeader, token }      (kirim cookie)
 *     Respons: { ok, site, count, hasSession, supported } (401 bila token salah)
 *
 * Situs yang DIKENALI & disimpan aplikasi saat ini: `douyin` (via
 * parseDouyinCookie — satu sumber kebenaran). Situs lain tetap divalidasi
 * jumlah cookie & dilaporkan, tetapi `supported=false` (tidak disimpan).
 */

/** Nama file token di userData (stabil antar-restart → paste sekali saja). */
const TOKEN_FILE = 'cookie-bridge-token'

let server: http.Server | null = null
let port = 0
let token = ''

function loadOrCreateToken(): string {
  const file = path.join(app.getPath('userData'), TOKEN_FILE)
  try {
    const existing = fs.readFileSync(file, 'utf8').trim()
    if (existing.length >= 16) return existing
  } catch {
    // Belum ada / tak terbaca → buat baru.
  }
  const fresh = crypto.randomBytes(24).toString('hex')
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, fresh, 'utf8')
  } catch {
    // Mode privat / read-only → token hanya berlaku sesi ini.
  }
  return fresh
}

/** Perbandingan token yang aman terhadap timing attack. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
      if (data.length > 1024 * 1024) {
        reject(new Error('payload too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/** Info jembatan untuk ditampilkan di UI (kode hubung `<port>:<token>`). */
export interface CookieBridgeInfo {
  active: boolean
  port: number | null
  /** Kode hubung yang ditempel user ke ekstensi (`<port>:<token>`). */
  code: string | null
}

export function getCookieBridgeInfo(): CookieBridgeInfo {
  return { active: !!server && port > 0, port: port || null, code: port > 0 ? `${port}:${token}` : null }
}

/** Data cookie yang diterima dari ekstensi (dikirim ke renderer). */
export interface ReceivedCookie {
  site: string
  cookieHeader: string
  count: number
  hasSession: boolean
  /** true bila aplikasi menyimpan site ini (saat ini hanya 'douyin'). */
  supported: boolean
}

/**
 * Memulai server jembatan (idempoten). `onCookieReceived` dipanggil saat
 * ekstensi mengirim cookie yang valid.
 */
export function startCookieBridge(onCookieReceived: (data: ReceivedCookie) => void): void {
  if (server) return
  token = loadOrCreateToken()

  server = http.createServer(async (req, res) => {
    // Hanya izinkan koneksi loopback.
    const addr = req.socket.remoteAddress || ''
    if (addr !== '127.0.0.1' && addr !== '::1' && addr !== '::ffff:127.0.0.1') {
      res.writeHead(403).end()
      return
    }

    if (req.method === 'GET' && (req.url || '').startsWith('/api/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }))
      return
    }

    if (req.method === 'POST' && (req.url || '').startsWith('/api/cookies')) {
      const body = await readBody(req).catch(() => '')
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(body || '{}') as Record<string, unknown>
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: 'bad_json' }))
        return
      }
      const sentToken = typeof parsed.token === 'string' ? parsed.token : ''
      if (!safeEqual(sentToken, token)) {
        res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: 'invalid_token' }))
        return
      }
      const site = String(parsed.site || '').toLowerCase().trim()
      const cookieHeader = typeof parsed.cookieHeader === 'string' ? parsed.cookieHeader : ''
      if (!site || !cookieHeader) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: 'invalid_payload' }))
        return
      }

      let count = 0
      let hasSession = false
      const supported = site === 'douyin'
      if (site === 'douyin') {
        const p = parseDouyinCookie(cookieHeader)
        count = p.count
        hasSession = p.hasSession
      } else {
        count = cookieHeader.split(';').filter((s) => s.includes('=')).length
        hasSession = false
      }

      onCookieReceived({ site, cookieHeader, count, hasSession, supported })
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({ ok: true, site, count, hasSession, supported })
      )
      return
    }

    res.writeHead(404).end()
  })

  server.on('error', () => {
    server = null
    port = 0
  })

  server.listen(0, '127.0.0.1', () => {
    const addr = server?.address()
    if (addr && typeof addr === 'object') port = addr.port
  })
}
