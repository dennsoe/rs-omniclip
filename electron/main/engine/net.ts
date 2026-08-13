import https from 'node:https'
import type { ClientRequest } from 'node:http'
import fs from 'node:fs'

/**
 * Mengunduh file via HTTPS dengan dukungan redirect dan batas waktu.
 * Menulis ke `dest`; membersihkan file parsial dan membatalkan koneksi
 * bila gagal atau timeout (tidak ada operasi yang menggantung di background).
 */
export function downloadFile(url: string, dest: string, timeoutMs = 120000): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    let settled = false
    let timer: NodeJS.Timeout | null = null
    let currentReq: ClientRequest | null = null

    const cleanup = (): void => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      currentReq?.destroy()
      currentReq = null
    }

    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }

    const fail = (err: Error): void => {
      finish(() => {
        file.destroy()
        fs.rmSync(dest, { force: true })
        reject(err)
      })
    }

    const request = (target: string): void => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fail(new Error(`Unduhan melebihi batas waktu ${timeoutMs} ms.`))
      }, timeoutMs)

      const req = https.get(target, (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          const location = res.headers.location
          const origin = new URL(target).origin
          const next = location.startsWith('http') ? location : `${origin}${location}`
          request(next)
          return
        }
        if (status !== 200) {
          res.resume()
          fail(new Error(`Gagal mengunduh: HTTP ${status}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => {
          finish(() => {
            file.close(() => resolve())
          })
        })
      })
      currentReq = req
      req.on('error', fail)
    }

    request(url)
  })
}
