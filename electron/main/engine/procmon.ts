import { execFile } from 'node:child_process'

/**
 * Registry proses kerja (anak) yang sedang berjalan (FFmpeg, yt-dlp).
 * Tujuannya agar statistik CPU/RAM aplikasi menyertakan beban pemrosesan
 * yang sebenarnya (child process tidak tercakup `app.getAppMetrics()`).
 */
const activePids = new Set<number>()

/** Mencatat PID proses anak yang baru di-spawn. */
export function trackProcess(pid: number): void {
  if (Number.isInteger(pid) && pid > 0) activePids.add(pid)
}

/** Menghapus PID proses anak saat selesai/gagal. */
export function untrackProcess(pid: number): void {
  activePids.delete(pid)
}

/** Daftar PID proses anak yang masih aktif. */
export function getTrackedPids(): number[] {
  return [...activePids]
}

export interface ProcessSample {
  /** Waktu CPU kumulatif proses dalam milidetik. */
  cpuTimeMs: number
  /** Resident set size dalam byte (dari `ps rss=` di Unix / WorkingSet di Windows). */
  rssBytes: number
}

/**
 * Membaca waktu CPU kumulatif + RSS sebuah proses (lintas-OS).
 * - macOS/Linux: `ps -p <pid> -o time=,rss=`
 * - Windows: PowerShell `Get-Process` (CPU dalam detik, WorkingSet64 dalam byte)
 * Mengembalikan null bila proses tidak ada / error.
 */
export function sampleProcess(pid: number): Promise<ProcessSample | null> {
  return process.platform === 'win32' ? sampleProcessWindows(pid) : sampleProcessUnix(pid)
}

function sampleProcessUnix(pid: number): Promise<ProcessSample | null> {
  return new Promise((resolve) => {
    execFile(
      'ps',
      ['-p', String(pid), '-o', 'time=,rss='],
      { timeout: 2000 },
      (err, stdout) => {
        if (err) {
          resolve(null)
          return
        }
        const parts = stdout.trim().split(/\s+/)
        const cpuMs = parsePsTimeToMs(parts[0] ?? '')
        const rssKb = Number.parseFloat(parts[1] ?? '')
        if (cpuMs === null || !Number.isFinite(rssKb)) {
          resolve(null)
          return
        }
        resolve({ cpuTimeMs: cpuMs, rssBytes: Math.round(rssKb * 1024) })
      }
    )
  })
}

/**
 * Implementasi Windows via PowerShell:
 *   Get-Process -Id <pid> | Select-Object CPU,WorkingSet64 | ConvertTo-Csv
 * Output: baris header diikuti baris data (`"<cpu_detik>","<working_set_byte>"`).
 */
function sampleProcessWindows(pid: number): Promise<ProcessSample | null> {
  return new Promise((resolve) => {
    const script = [
      'Get-Process -Id ' + String(pid) + ' -ErrorAction SilentlyContinue',
      '| Select-Object CPU,WorkingSet64',
      '| ConvertTo-Csv -NoTypeInformation'
    ].join(' ')
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 2000, windowsHide: true },
      (err, stdout) => {
        if (err) {
          resolve(null)
          return
        }
        const lines = stdout.trim().split(/\r?\n/).filter((l) => l.trim().length > 0)
        // Baris 0 = header, baris 1 = data.
        if (lines.length < 2) {
          resolve(null)
          return
        }
        const cells = lines[1].split(',').map((s) => s.replace(/^"|"$/g, '').trim())
        const cpuSec = Number.parseFloat(cells[0] ?? '')
        const workingSet = Number.parseFloat(cells[1] ?? '')
        if (!Number.isFinite(cpuSec) || !Number.isFinite(workingSet)) {
          resolve(null)
          return
        }
        resolve({ cpuTimeMs: Math.round(cpuSec * 1000), rssBytes: Math.round(workingSet) })
      }
    )
  })
}

/**
 * Mengubah format waktu kumulatif `ps` menjadi milidetik.
 * Format Unix: `M:SS.cc` (2 bagian) atau `H:MM:SS.cc` (3 bagian).
 */
function parsePsTimeToMs(text: string): number | null {
  if (!text) return null
  const parts = text.trim().split(':')
  if (parts.length === 2) {
    const m = Number.parseFloat(parts[0])
    const s = Number.parseFloat(parts[1])
    if (Number.isFinite(m) && Number.isFinite(s)) return Math.round((m * 60 + s) * 1000)
  } else if (parts.length === 3) {
    const h = Number.parseFloat(parts[0])
    const m = Number.parseFloat(parts[1])
    const s = Number.parseFloat(parts[2])
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s)) {
      return Math.round((h * 3600 + m * 60 + s) * 1000)
    }
  }
  return null
}
