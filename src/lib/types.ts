export type PresetType = 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' | 'vertical'
/** Mode pemrosesan: 'privacy' (cepat, tanpa efek) / 'enhance' (penjernihan maksimal). */
export type ProcessingMode = 'privacy' | 'enhance'
/** Kualitas encode (memetakan preset x264 + CRF). */
export type QualityLevel = 'auto' | 'best' | 'balanced' | 'compact'
/** Penanganan audio keluaran. */
export type AudioMode = 'original' | 'aac128' | 'aac192' | 'aac256'
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
  processingMode?: ProcessingMode
  cleanMetadata?: boolean
  quality?: QualityLevel
  audio?: AudioMode
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
  /** URL thumbnail bila tersedia dari playlist (mis. YouTube); kosong bila NA (mis. TikTok). */
  thumbnail?: string
  /** Durasi (detik) bila tersedia dari playlist (flat-playlist menyediakannya untuk TikTok). */
  duration?: number
  /** Engagement (best-effort; flat-playlist sering 'NA'). */
  views?: number
  likes?: number
  comments?: number
  /** Caption/description (berisi hashtag). */
  description?: string
}

/** Hasil resolusi pratinjau satu video (untuk thumbnail lazy & modal preview). */
export interface ResolvedPreview {
  /** URL video asal (yang diminta). */
  url: string
  /** URL media langsung yang bisa diputar <video>. */
  playUrl?: string
  /** URL thumbnail video. */
  thumbnail?: string
  /** Durasi (detik). */
  duration?: number
  /** Judul video. */
  title?: string
  /** Pesan kegagalan bila pratinjau tidak dapat diresolusi. */
  error?: string
}

/** Opsi unduhan (engine yt-dlp) — dikirim renderer → main → downloader. */
export interface DownloadOptions {
  /** Batas tinggi resolusi video (px). 0 / tanpa = kualitas terbaik (tanpa batas). */
  maxHeight?: number
  /** Browser untuk mengambil cookies (mis. 'chrome', 'edge', 'safari'). '' = tanpa cookies. */
  cookiesBrowser?: string
  /** Header Cookie mentah dari sesi Douyin yang sudah login (opsional, untuk Douyin). */
  douyinCookie?: string
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
  /** Durasi video (detik) — terisi saat berhasil. */
  duration?: number
  /** Nama akun/pembuat video (uploader/channel) — terisi saat berhasil. */
  uploader?: string
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

/** Entri riwayat unduhan (tersimpan di main process). */
export interface HistoryEntry {
  url: string
  title?: string
  thumbnail?: string
  filePath: string
  platform?: string
  ts: number
}

/** Akun yang dipantau Auto-Watcher. */
export interface WatchedAccount {
  url: string
  label?: string
  /** Detail profil (hasil verifikasi akun saat ditambahkan). */
  name?: string
  username?: string
  avatar?: string
  followers?: number
  bio?: string
  platform?: string
  lastSeenId?: string
  lastCheckedAt?: number
  lastFoundAt?: number
}

/** Hasil verifikasi/resolusi detail sebuah akun (dipakai Auto-Watcher). */
export interface AccountInfo {
  url: string
  /** Sudah terdaftar di Auto-Watcher (duplikat). */
  duplicate: boolean
  /** Terverifikasi ada (profil berhasil diambil). */
  exists: boolean
  name?: string
  username?: string
  avatar?: string
  followers?: number
  bio?: string
  platform?: string
  /** Pesan bila tidak dapat diverifikasi. */
  error?: string
}

/** Konfigurasi proxy (anti-banned system). */
export interface ProxyConfig {
  enabled: boolean
  proxies: string[]
  rotationEvery: number
}

/** Mode pemrosesan hardware (encoder GPU). */
export type HwAccelMode = 'auto' | 'videotoolbox' | 'nvenc' | 'amf'

/** Konfigurasi aplikasi (tersimpan di main process, bukan localStorage). */
export interface AppConfig {
  proxy: ProxyConfig
  watcher: { enabled: boolean; intervalHours: number; accounts: WatchedAccount[] }
  hwAccel: { mode: HwAccelMode }
  analyticsExport: boolean
  history: HistoryEntry[]
}
