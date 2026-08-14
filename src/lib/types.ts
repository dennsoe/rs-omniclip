export type PresetType = 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' | 'whatsapp'
export type FileStatus = 'pending' | 'processing' | 'success' | 'failed'

export interface FileItem {
  /** Id unik item (dibuat di renderer, dipakai engine untuk mencocokkan progress). */
  id: string
  /** Jalur absolut berkas sumber video. */
  path: string
  /** Nama berkas (mis. video.mp4). */
  name: string
  /** Ukuran berkas dalam byte. */
  size: number
  status: FileStatus
  /** Kemajuan 0 - 100. */
  progress: number
  errorMessage?: string
  /** Referensi objek File asli untuk preview di renderer. */
  file?: File
}

export interface ProcessingPayload {
  files: FileItem[]
  preset: PresetType
}

/** Satu item video hasil scrape akun/halaman (yt-dlp --flat-playlist). */
export interface ScrapeItem {
  index: number
  /** Id video sesuai extractor (mis. id TikTok / videoId YouTube). */
  id: string
  /** Judul video. */
  title: string
  /** URL langsung video (siap diunduh). */
  url: string
}

/** Opsi unduhan (engine yt-dlp) — dikirim renderer → main → downloader. */
export interface DownloadOptions {
  /** Batas tinggi resolusi video (px). 0 / tanpa = kualitas terbaik (tanpa batas). */
  maxHeight?: number
  /** Browser untuk mengambil cookies (mis. 'chrome', 'edge', 'safari'). '' = tanpa cookies. */
  cookiesBrowser?: string
  /** Unduh beberapa URL sekaligus (maks 2) alih-alih berurutan. Default false. */
  parallel?: boolean
}

/** Satu item progress unduhan (dari engine yt-dlp). */
export interface DownloadProgress {
  id: string
  url: string
  percent: number
  status: 'downloading' | 'success' | 'failed'
  /** Pesan kegagalan opsional (hanya saat status 'failed'). */
  error?: string
  /** Kecepatan unduh (byte/detik). */
  speedBytesPerSec?: number
  /** Estimasi sisa waktu (detik). */
  etaSeconds?: number
  /** Ukuran total (byte). */
  sizeBytes?: number
  /** Fase proses: ekstraksi, unduh, penggabungan, retry, selesai. */
  phase?: 'extracting' | 'downloading' | 'merging' | 'retrying' | 'done'
  /** Metadata dari yt-dlp (terisi saat berhasil). */
  title?: string
  thumbnail?: string
  description?: string
  filePath?: string
}

/** Info versi aplikasi (lokal vs rilis terbaru dari GitHub). */
export interface UpdateInfo {
  /** Versi lokal dari package.json. */
  current: string
  /** Versi rilis terbaru; null bila tidak dapat diambil. */
  latest: string | null
  /** true bila tersedia versi baru yang lebih tinggi. */
  hasUpdate: boolean
  /** URL halaman rilis GitHub untuk unduhan manual. */
  url: string | null
  /** Catatan rilis / changelog (markdown). */
  notes: string | null
}

/** Status satu resource engine (ffmpeg / yt-dlp). */
export interface ResourceInfo {
  id: string
  label: string
  current: string | null
  expected: string | null
  outdated: boolean
}
