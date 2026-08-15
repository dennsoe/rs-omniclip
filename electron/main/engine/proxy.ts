import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import http from 'node:http'
import https from 'node:https'
import { getConfig } from '../config'

/**
 * Manajer proxy (anti-banned system):
 * - Daftar proxy HTTP(S)/SOCKS5 dari konfigurasi main process.
 * - Rotasi otomatis: ganti proxy setiap `rotationEvery` unduhan.
 * - `nextProxy()` dipanggil per unduhan; counter berjalan di main process.
 * - `testProxy()` untuk memvalidasi satu proxy (latensi + status).
 */

/** Normalisasi satu baris proxy; null bila tidak valid. */
export function normalizeProxy(raw: string): string | null {
  const line = raw.trim().replace(/\/+$/, '')
  if (!line) return null
  try {
    const u = new URL(line)
    const scheme = u.protocol.replace(/:$/, '').toLowerCase()
    if (scheme !== 'http' && scheme !== 'https' && scheme !== 'socks5' && scheme !== 'socks5h') {
      return null
    }
    return line
  } catch {
    return null
  }
}

/** Buat agent HTTP(S)/SOCKS5 untuk sebuah proxy URL. */
export function proxyAgentFor(proxyUrl: string): http.Agent {
  const scheme = new URL(proxyUrl).protocol.replace(/:$/, '').toLowerCase()
  if (scheme === 'socks5' || scheme === 'socks5h') {
    return new SocksProxyAgent(proxyUrl) as unknown as http.Agent
  }
  return new HttpsProxyAgent(proxyUrl) as unknown as http.Agent
}

/** Ambil daftar proxy valid dari konfigurasi (sudah dinormalisasi). */
export function validProxies(): string[] {
  const cfg = getConfig().proxy
  if (!cfg?.enabled || !cfg.proxies || cfg.proxies.length === 0) return []
  return cfg.proxies.map(normalizeProxy).filter((p): p is string => p !== null)
}

/** Pilih proxy untuk indeks rotasi ke-`index` (tanpa mengubah counter). */
export function currentProxy(index: number): string | undefined {
  const list = validProxies()
  if (list.length === 0) return undefined
  const every = Math.max(1, getConfig().proxy?.rotationEvery || 1)
  const idx = Math.floor(index / every) % list.length
  return list[idx]
}

let rotationCounter = 0

/** Ambil proxy berikutnya (rotasi otomatis) + naikkan counter. */
export function nextProxy(): string | undefined {
  const p = currentProxy(rotationCounter)
  rotationCounter += 1
  return p
}

/** Reset counter rotasi (mis. saat konfigurasi proxy diubah). */
export function resetRotation(): void {
  rotationCounter = 0
}

/** Tes satu proxy terhadap endpoint publik (latensi + status). */
export async function testProxy(
  proxyUrl: string,
  timeoutMs = 10000
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  let agent: http.Agent
  try {
    agent = proxyAgentFor(proxyUrl)
  } catch (err) {
    return {
      ok: false,
      latencyMs: 0,
      error: err instanceof Error ? err.message : 'Format proxy tidak valid'
    }
  }
  const started = Date.now()
  return await new Promise((resolve) => {
    const req = https.get('https://api.ipify.org?format=json', { agent, timeout: timeoutMs }, (res) => {
      res.resume()
      res.on('end', () => {
        resolve({
          ok: res.statusCode === 200,
          latencyMs: Date.now() - started,
          error: res.statusCode === 200 ? undefined : `HTTP ${res.statusCode}`
        })
      })
    })
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, latencyMs: Date.now() - started, error: 'Waktu habis (timeout)' })
    })
    req.on('error', (err) => {
      resolve({ ok: false, latencyMs: Date.now() - started, error: err.message })
    })
  })
}
