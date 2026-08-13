import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { getEngineBinDir } from './paths'
import { ensureFfmpeg, resetFfmpegCache } from './ffmpeg'
import { ensureYtdlp, resetYtdlpCache } from './downloader'

/**
 * Modul pembaruan RS OmniClip — SEPENUHNYA GRATIS (tanpa biaya apa pun):
 *  - Cek versi aplikasi via GitHub Releases API (repo publik, tanpa token).
 *  - Strategi macOS: manual — tombol membuka halaman rilis, user mengunduh
 *    dmg/zip lalu membukanya sendiri (tidak butuh Developer ID/notarisasi).
 *  - Update resource (ffmpeg/yt-dlp) via manifest `resources.json` di repo.
 */

export const UPDATE_REPO_OWNER = 'dennsoe'
export const UPDATE_REPO_NAME = 'rs-omniclip'
const REPO = `${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`
const MANIFEST_URL = `https://raw.githubusercontent.com/${REPO}/main/resources.json`
const YTDLP_LATEST_API = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
const FETCH_TIMEOUT_MS = 15_000

export interface UpdateInfo {
  /** Versi lokal dari package.json (app.getVersion). */
  current: string
  /** Versi rilis terbaru (tag_name tanpa awalan "v"); null jika tidak dapat diambil. */
  latest: string | null
  /** true bila rilis terbaru lebih tinggi dari versi lokal. */
  hasUpdate: boolean
  /** URL halaman rilis GitHub untuk unduhan manual. */
  url: string | null
  /** Catatan rilis (changelog) dalam format markdown. */
  notes: string | null
}

export interface ResourceInfo {
  id: string
  label: string
  /** Versi yang terpasang di mesin (null jika belum terpasang / tak terdeteksi). */
  current: string | null
  /** Versi yang diharapkan menurut manifest ("latest" = versi rilis terbaru). */
  expected: string | null
  /** true bila perlu diperbarui (belum ada atau versi lama). */
  outdated: boolean
}

interface ManifestResource {
  id: string
  label: string
  version: string
}

interface Manifest {
  schema: number
  resources: ManifestResource[]
}

interface InstalledVersions {
  ffmpeg?: string | null
  'yt-dlp'?: string | null
}

/* ------------------------------------------------------------------ */
/* Cek pembaruan APLIKASI (GitHub Releases API, repo publik, gratis).   */
/* ------------------------------------------------------------------ */

/** Mengambil JSON dari URL dengan batas waktu dan User-Agent yang benar. */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RS-OmniClip', Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

/**
 * Membandingkan dua versi semantik (boleh awalan "v", boleh format date yt-dlp).
 * Mengembalikan >0 bila a > b, <0 bila a < b, 0 bila sama.
 */
export function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.replace(/^v/, '').trim()
  const pa = norm(a).split(/[.\-+]/).map(Number)
  const pb = norm(b).split(/[.\-+]/).map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x - y
  }
  return 0
}

/** Mengambil info rilis terbaru aplikasi dari GitHub (tanpa token). */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = app.getVersion()
  try {
    const data = await fetchJson<{
      tag_name?: string
      html_url?: string
      body?: string
    }>(LATEST_RELEASE_API)
    const latest = (data.tag_name ?? '').replace(/^v/, '')
    const hasUpdate = latest !== '' && compareVersions(latest, current) > 0
    return {
      current,
      latest: latest || null,
      hasUpdate,
      url: data.html_url ?? null,
      notes: data.body ?? null
    }
  } catch {
    return { current, latest: null, hasUpdate: false, url: null, notes: null }
  }
}

/* ------------------------------------------------------------------ */
/* Versi resource yang terpasang (ffmpeg / yt-dlp).                     */
/* ------------------------------------------------------------------ */

function versionsFilePath(): string {
  return path.join(getEngineBinDir(), 'versions.json')
}

function readInstalledVersions(): InstalledVersions {
  try {
    const raw = fs.readFileSync(versionsFilePath(), 'utf8')
    return JSON.parse(raw) as InstalledVersions
  } catch {
    return {}
  }
}

function writeInstalledVersions(versions: InstalledVersions): void {
  try {
    fs.mkdirSync(getEngineBinDir(), { recursive: true })
    fs.writeFileSync(versionsFilePath(), JSON.stringify(versions, null, 2), 'utf8')
  } catch {
    // Abaikan: hanya cache status, bukan jalur kritis.
  }
}

/** Menjalankan binary untuk membaca versi (ffmpeg -version, yt-dlp --version). */
function detectVersion(binPath: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(binPath, args, { timeout: 10_000 }, (err, stdout) => {
      if (err) return resolve(null)
      const firstLine = String(stdout).split('\n')[0] ?? ''
      const m = firstLine.match(/(\d+\.\d+(?:\.\d+)?[^\s]*)/)
      resolve(m ? m[1] : firstLine.trim() || null)
    })
  })
}

/** Mendeteksi dan menyimpan versi ffmpeg/yt-dlp yang terpasang. */
export async function recordInstalledVersions(): Promise<InstalledVersions> {
  const versions: InstalledVersions = {}

  try {
    const ffmpeg = await ensureFfmpeg()
    const ffmpegVersion = await detectVersion(ffmpeg.ffmpeg, ['-version'])
    const ffprobeVersion = await detectVersion(ffmpeg.ffprobe, ['-version'])
    versions.ffmpeg = ffmpegVersion ?? ffprobeVersion
  } catch {
    versions.ffmpeg = null
  }

  const ytdlp = await ensureYtdlp()
  versions['yt-dlp'] = ytdlp ? await detectVersion(ytdlp, ['--version']) : null

  writeInstalledVersions(versions)
  return versions
}

/** Mengambil manifest resource dari repo (raw.githubusercontent, gratis). */
async function fetchManifest(): Promise<Manifest> {
  const data = await fetchJson<Manifest>(MANIFEST_URL)
  return Array.isArray(data.resources) ? data : { schema: 1, resources: [] }
}

/**
 * Status resource: membandingkan versi terpasang dengan manifest.
 * Untuk resource ber-version "latest", versi diharapkan = rilis terbaru
 * dari proyek masing-masing (ffmpeg pinned / yt-dlp mengikuti rilis GitHub).
 */
export async function getResourceStatus(): Promise<ResourceInfo[]> {
  const installed = readInstalledVersions()

  let manifest: Manifest
  try {
    manifest = await fetchManifest()
  } catch {
    manifest = { schema: 1, resources: [] }
  }

  // Selesaikan "latest" untuk yt-dlp bila manifest memintanya.
  const expectedMap = new Map<string, string>()
  for (const r of manifest.resources) {
    let expected = r.version
    if (expected === 'latest' && r.id === 'yt-dlp') {
      try {
        const rel = await fetchJson<{ tag_name?: string }>(YTDLP_LATEST_API)
        expected = (rel.tag_name ?? '').replace(/^v/, '') || 'latest'
      } catch {
        expected = 'latest'
      }
    }
    expectedMap.set(r.id, expected)
  }

  const build = (id: string, label: string, fallbackExpected: string): ResourceInfo => {
    const current = installed[id as keyof InstalledVersions] ?? null
    const expected = expectedMap.get(id) ?? fallbackExpected
    // Perbandingan awalan: ffmpeg "6.1-tessus" tetap dianggap cocok dengan "6.1".
    const outdated =
      current === null ||
      (expected !== 'latest' && !String(current).startsWith(String(expected)))
    return { id, label, current, expected, outdated }
  }

  const resources = manifest.resources.length > 0
    ? manifest.resources.map((r) => build(r.id, r.label, r.version))
    : [build('ffmpeg', 'FFmpeg', '6.1'), build('yt-dlp', 'yt-dlp', 'latest')]

  return resources
}

/* ------------------------------------------------------------------ */
/* Proses pembaruan resource (ffmpeg/yt-dlp).                           */
/* ------------------------------------------------------------------ */

/** Menghapus binary lokal untuk resource yang benar-benar di-update. */
function removeBinariesFor(ids: string[]): void {
  const binDir = getEngineBinDir()
  try {
    for (const entry of fs.readdirSync(binDir)) {
      const isFfmpeg = /^(ffmpeg|ffprobe)/.test(entry)
      // Nama binary yt-dlp lintas-OS: `yt-dlp` (macOS/Linux) / `yt-dlp.exe` (Windows).
      const isYtdlp = entry === 'yt-dlp' || entry === 'yt-dlp.exe'
      const shouldDelete =
        (ids.includes('ffmpeg') && isFfmpeg) || (ids.includes('yt-dlp') && isYtdlp)
      if (shouldDelete) fs.rmSync(path.join(binDir, entry), { force: true })
    }
  } catch {
    // Folder belum ada — tidak masalah.
  }
}

/**
 * Memperbarui resource yang outdated (atau memaksa semuanya bila force=true).
 * Mengunduh ulang binary, lalu mencatat versi terbaru. Mengembalikan status baru.
 */
export async function updateResources(
  onStatus?: (message: string) => void,
  force = false
): Promise<ResourceInfo[]> {
  const before = await getResourceStatus()
  const target = force ? before : before.filter((r) => r.outdated)
  if (target.length === 0) {
    onStatus?.('Semua resource sudah yang terbaru.')
    return before
  }

  // Hanya hapus binary untuk resource yang di-update (yang lain tetap utuh).
  removeBinariesFor(target.map((r) => r.id))
  // Reset cache single-flight agar ensure* benar-benar mengunduh ulang.
  resetFfmpegCache()
  resetYtdlpCache()
  onStatus?.('Mengunduh ulang resource yang perlu diperbarui...')

  for (const r of target) {
    if (r.id === 'ffmpeg') {
      onStatus?.('Memperbarui FFmpeg...')
      await ensureFfmpeg(onStatus)
    } else if (r.id === 'yt-dlp') {
      onStatus?.('Memperbarui yt-dlp...')
      await ensureYtdlp(onStatus)
    }
  }

  await recordInstalledVersions()
  onStatus?.('Resource berhasil diperbarui.')
  return getResourceStatus()
}
