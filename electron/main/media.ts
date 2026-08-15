import { protocol } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

/**
 * Protokol kustom `media://` — streaming video LOKAL ke renderer.
 * Dipakai utk pratinjau hasil unduhan (path string) tanpa memuat file ke
 * memori. Mendukung Range (utk seeking) sehingga pemutar bisa lompat waktu.
 *
 * Format URL: `media://local/<encodeURIComponent(absFilePath)>`
 */

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo'
}

function mimeFor(filePath: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

/** Buat URL media:// untuk sebuah path file lokal. */
export function mediaUrlForFile(filePath: string): string {
  return `media://local/${encodeURIComponent(filePath)}`
}

/** Daftarkan skema `media` sebagai privileged (WAJIB sebelum app ready). */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { stream: true, supportFetchAPI: true, bypassCSP: false } }
  ])
}

/** Handler streaming file lokal (dengan dukungan Range). */
async function handleMediaRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  let filePath = ''
  try {
    filePath = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  let stat: fs.Stats
  try {
    stat = await fs.promises.stat(filePath)
    if (!stat.isFile()) throw new Error('bukan file')
  } catch {
    return new Response('Not Found', { status: 404 })
  }

  const size = stat.size
  const rangeHeader = request.headers.get('Range')
  const baseHeaders: Record<string, string> = {
    'Content-Type': mimeFor(filePath),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store'
  }

  if (rangeHeader) {
    const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
    if (m) {
      const hasStart = m[1] !== ''
      const hasEnd = m[2] !== ''
      let start = hasStart ? Number(m[1]) : 0
      let end = hasEnd ? Number(m[2]) : size - 1
      // Range sufiks `bytes=-N`: N byte TERAKHIR (bukan 0..N).
      if (!hasStart && hasEnd) {
        const suffix = Number(m[2])
        start = Math.max(size - suffix, 0)
        end = size - 1
      }
      if (Number.isNaN(start) || Number.isNaN(end)) start = 0
      end = Math.min(end, size - 1)
      if (start > end || start >= size) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` }
        })
      }
      const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as unknown as ReadableStream
      return new Response(stream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${size}`
        }
      })
    }
  }

  const stream = Readable.toWeb(fs.createReadStream(filePath)) as unknown as ReadableStream
  return new Response(stream, {
    status: 200,
    headers: { ...baseHeaders, 'Content-Length': String(size) }
  })
}

/** Aktifkan handler protokol (panggil setelah app ready). */
export function registerMediaProtocol(): void {
  protocol.handle('media', (request) => handleMediaRequest(request))
}
