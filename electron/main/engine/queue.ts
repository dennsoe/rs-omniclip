import {
  startDownloadBatch,
  type DownloadProgress,
  type DownloadBatchComplete,
  type DownloadOptions
} from './downloader'

/**
 * Antrean unduhan terpusat di main process.
 *
 * Tujuan: koordinasi SEMUA batch unduhan (manual dari UI + otomatis dari
 * Auto-Watcher) agar tidak berjalan bersamaan (bentrok beban/rate-limit).
 * Batch dieksekusi SATU per SATU (FIFO). Untuk batch tunggal, perilakunya
 * identik dengan memanggil `startDownloadBatch` langsung.
 */

export type DownloadSource = 'manual' | 'watcher'

export interface QueueJob {
  urls: string[]
  options: DownloadOptions
  source: DownloadSource
  onProgress?: (p: DownloadProgress) => void
  onComplete?: (r: DownloadBatchComplete) => void
}

const queue: QueueJob[] = []
let running = false

/** Tambah batch ke antrean dan mulai proses bila idle. */
export function enqueueBatch(job: Omit<QueueJob, 'source'> & { source?: DownloadSource }): void {
  queue.push({
    urls: job.urls,
    options: job.options,
    source: job.source ?? 'manual',
    onProgress: job.onProgress,
    onComplete: job.onComplete
  })
  void drain()
}

/** Jumlah job yang sedang aktif / menunggu. */
export function queueStatus(): { active: boolean; pending: number } {
  return { active: running, pending: queue.length }
}

async function drain(): Promise<void> {
  if (running) return
  running = true
  try {
    while (queue.length > 0) {
      const job = queue.shift()
      if (!job) continue
      try {
        await startDownloadBatch(
          job.urls,
          (p) => job.onProgress?.(p),
          (r) => job.onComplete?.(r),
          job.options
        )
      } catch (err) {
        console.error('[RS OmniTools] Batch unduhan gagal (queue):', err)
        job.onComplete?.({ total: job.urls.length, success: 0, failed: job.urls.length })
      }
    }
  } finally {
    running = false
  }
}
