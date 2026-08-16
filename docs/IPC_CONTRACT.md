# Kontrak Jembatan IPC — `window.api`

Dokumen ini adalah referensi resmi kontrak antara renderer React dan backend
Node.js (proses utama) melalui preload script.

- Implementasi preload: `electron/preload/index.ts`
- Deklarasi tipe renderer: `src/types/global.d.ts`

## 1. Gambaran Umum

Preload mengekspos objek `window.api` melalui `contextBridge.exposeInMainWorld`.
Semua metode `on*` mengembalikan fungsi pembatalan (unsubscribe) agar renderer
dapat membersihkan listener saat unmount.

## 2. Daftar Channel IPC

| Arah | Channel | Tujuan |
|---|---|---|
| R → M | `engine:check` | Meminta inisialisasi/pemeriksaan mesin |
| M → R | `engine:status` | Status teks inisialisasi mesin |
| M → R | `app:ready` | Boolean: mesin siap digunakan |
| R → M | `processing:start` | Memulai batch pemrosesan |
| M → R | `processing:progress` | Kemajuan per file |
| M → R | `processing:complete` | Selesai batch (folder output) |
| R → M | `folder:open` | Membuka folder di Finder |
| R → M | `download:start` | Memulai unduhan batch — payload `{ urls, options? }` (kualitas, cookies, paralel) |
| M → R | `download:progress` | Kemajuan per URL |
| M → R | `download:complete` | Ringkasan akhir batch `{ total, success, failed }` |
| R → M | `scrape:start` | Ambil daftar video dari satu akun/halaman |
| M → R | `scrape:complete` | Hasil daftar video `{ id, items, truncated?, error? }` |
| R → M | `trim:start` | Memotong video (lossless) |
| M → R | `trim:complete` | Hasil pemotongan |
| M → R | `system:stats` | Pemakaian CPU/RAM aplikasi ini (realtime, interval ~1,5 detik) |
| R → M | `update:check` (invoke) | Cek rilis terbaru aplikasi dari GitHub Releases API → `UpdateInfo` |
| R → M | `update:open` (invoke) | Buka halaman rilis GitHub di browser (unduh manual macOS) |
| R → M | `resource:check` (invoke) | Status resource ffmpeg/yt-dlp vs `resources.json` → `ResourceInfo[]` |
| R → M | `resource:update` (invoke) | Perbarui resource yang outdated (opsi `force`) → `ResourceInfo[]` |
| M → R | `resource:status` | Pesan progres pembaruan resource dari proses utama |
| M → R | `resource:changed` | Status resource SEGAR `ResourceInfo[]` (dikirim main setelah versi terdeteksi — basis badge update sidebar) |

## 3. Signature Lengkap `window.api`

```typescript
interface Window {
  api?: {
    // --- Kontrak inti ---
    checkEngine: () => void
    onEngineStatus: (cb: (status: string) => void) => () => void
    onAppReady: (cb: (isReady: boolean) => void) => () => void

    startProcessing: (payload: {
      files: FileItem[]
      preset: 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' | 'vertical'
      processingMode?: 'privacy' | 'enhance'
      cleanMetadata?: boolean
      quality?: 'auto' | 'best' | 'balanced' | 'compact'
      audio?: 'original' | 'aac128' | 'aac192' | 'aac256'
    }) => void

    onProcessingProgress: (
      cb: (data: {
        id: string
        percent: number
        status: 'processing' | 'success' | 'failed'
      }) => void
    ) => () => void

    onProcessingComplete: (
      cb: (data: { outputFolder: string }) => void
    ) => () => void

    openFolder: (folderPath: string) => void

    startDownloadBatch: (urls: string[], options?: DownloadOptions) => void

    onDownloadProgress: (
      cb: (data: {
        id: string
        url: string
        percent: number
        status: 'downloading' | 'success' | 'failed'
        error?: string
        speedBytesPerSec?: number
        etaSeconds?: number
        sizeBytes?: number
        phase?: 'extracting' | 'downloading' | 'merging' | 'retrying' | 'done'
        title?: string
        thumbnail?: string
        description?: string
        filePath?: string
      }) => void
    ) => () => void

    onDownloadComplete: (
      cb: (data: { total: number; success: number; failed: number }) => void
    ) => () => void

    showItemInFolder: (filePath: string) => void

    scrapeAccount: (payload: { id: string; url: string }) => void

    onScrapeComplete: (
      cb: (data: {
        id: string
        items: Array<{ index: number; id: string; title: string; url: string }>
        truncated?: boolean
        error?: string
      }) => void
    ) => () => void

    // --- Ekstensi (tidak mengubah kontrak inti) ---
    getPathForFile: (file: File) => string
    trimVideo: (payload: {
      id: string
      path: string
      start: string
      end: string
    }) => void
    onTrimComplete: (
      cb: (data: {
        id: string
        success: boolean
        path?: string
        error?: string
      }) => void
    ) => () => void

    onSystemStats: (
      cb: (data: { cpuPercent: number; ramUsedMb: number; ramTotalMb: number }) => void
    ) => () => void

    // --- Pembaruan aplikasi & resource (gratis, repo publik) ---
    checkForUpdate: () => Promise<{
      current: string
      latest: string | null
      hasUpdate: boolean
      url: string | null
      notes: string | null
    }>
    openUpdatePage: (url: string) => Promise<boolean>
    checkResources: () => Promise<
      Array<{ id: string; label: string; current: string | null; expected: string | null; outdated: boolean }>
    >
    onResourceChanged: (cb: (data: ResourceInfo[]) => void) => () => void
    updateResources: (force?: boolean) => Promise<
      Array<{ id: string; label: string; current: string | null; expected: string | null; outdated: boolean }>
    >
    onResourceStatus: (cb: (message: string) => void) => () => void
  }
}
```

## 4. Detail Payload

### 4.1 `FileItem` (payload `startProcessing`)

```typescript
interface FileItem {
  id: string        // id unik di renderer (dipakai mencocokkan progress)
  path: string      // jalur absolut berkas sumber
  name: string      // nama berkas
  size: number      // ukuran byte
  status: 'pending' | 'processing' | 'success' | 'failed'
  progress: number  // 0 - 100
  errorMessage?: string
  file?: File       // referensi File asli untuk preview (renderer only)
}
```

Catatan: `file` (objek `File`) tidak dikirim ke proses utama — hanya
`id/path/name/size/status/progress` yang relevan bagi engine.

### 4.2 Kemajuan Processing (`processing:progress`)

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string | id file (sama dengan `FileItem.id`) |
| `percent` | number | 0–100 (dihitung dari `time=` stderr FFmpeg ÷ durasi) |
| `status` | 'processing' \| 'success' \| 'failed' | status saat ini |
| `error` | string? | pesan kegagalan (hanya saat `status: 'failed'`) |

`success` dikirim dengan `percent: 100`; `failed` dikirim dengan `percent: 100`
dan `error` (jika tersedia) (batch tetap melanjutkan file berikutnya).

### 4.3 Selesai Processing (`processing:complete`)

| Field | Tipe | Keterangan |
|---|---|---|
| `outputFolder` | string | Folder `[CLEANED] - YYYY-MM-DD`. String kosong jika gagal total (mis. mesin belum siap). |

### 4.4 Unduhan Batch (`download:start` / `download:progress` / `download:complete`)

- `startDownloadBatch(urls, options?)` mengirim `{ urls, options }` ke channel
  `download:start`. `options` = `{ maxHeight?, cookiesBrowser?, parallel? }`:
  - `maxHeight` (px): batas resolusi via `-f bv*[height<=H]+ba/b[height<=H]`;
    tanpa/kosong = kualitas terbaik.
  - `cookiesBrowser` (mis. `'chrome'`): kirim `--cookies-from-browser` untuk
    Facebook/Instagram yang membatasi unduhan anonim.
  - `parallel: true`: unduh maks 2 URL sekaligus (default berurutan).
  - `id` setiap progress = URL-nya.
- `download:progress` membawa `{ id, url, percent, status, ... }` dengan status
  `'downloading' | 'success' | 'failed'`, plus field opsional:
  - `error` — pesan kegagalan (hanya saat `status: 'failed'`). Error extractor
    (mis. Facebook "Cannot parse data") diberi keterangan ramah + saran.
  - `speedBytesPerSec`, `etaSeconds`, `sizeBytes` — kecepatan, perkiraan waktu
    sisa, dan ukuran total (dari baris `[download] NN% of X at Y/s ETA MM:SS`).
  - `phase` — `extracting | downloading | merging | retrying | done` (UI
    menampilkan label "Mengunduh…", "Menggabungkan…", "Mencoba ulang…").
  - `title`, `thumbnail`, `description`, `filePath` — metadata video dari
    `--print after_move` (objek JSON `__RSMETA__`); diisi pada event sukses
    (`percent: 100`) untuk menampilkan judul, thumbnail, deskripsi, dan
    tombol "Buka folder" (via `showItemInFolder` → channel `folder:reveal`).
  - Progress dikirim **maks 1×/300 ms** (throttle + koalesen) agar realtime
    tanpa membebani IPC.
- `download:complete` membawa ringkasan akhir `{ total, success, failed }`
  agar UI bisa menampilkan toast kesimpulan (bukan toast per URL).

### 4.5 Ambil Daftar Akun (`scrape:start` / `scrape:complete`)

- `scrapeAccount({ id, url })` — `url` = tautan akun/halaman (YouTube channel/
  @user, TikTok @user, Instagram username, dll).
- `scrape:complete` membawa `{ id, items, truncated?, error? }`:
  - `items`: `ScrapeItem[]` `{ index, id, title, url }` (url = tautan langsung
    video, siap dikirim ke `startDownloadBatch`).
  - `truncated: true` bila daftar dipotong di batas 500 item.
  - `error` diisi bila gagal (mis. akun privat, tidak ada video).

### 4.6 Pemotongan (`trim:start` / `trim:complete`)

- `start` / `end` format waktu: `HH:MM:SS`, `MM:SS`, atau detik.
- `trim:complete` membawa `{ id, success, path?, error? }`:
  - `success: true` → `path` = berkas hasil potongan.
  - `success: false` → `error` = pesan kegagalan (format waktu, waktu tidak
    valid, berkas tidak ditemukan, error FFmpeg).

### 4.7 `getPathForFile`

Memakai `webUtils.getPathForFile(file)` di preload untuk mendapatkan jalur
absolut dari objek `File` yang di-drop renderer. Mengembalikan `''` jika file
tidak punya jalur nyata.

### 4.8 Pembaruan Aplikasi (`update:check` / `update:open`)

- `checkForUpdate()` (invoke) → proses utama memanggil
  `GET api.github.com/repos/dennsoe/rs-omniclip/releases/latest` (repo publik,
  tanpa token; `User-Agent: RS-OmniClip`; timeout 15 dtk). Mengembalikan
  `UpdateInfo { current, latest, hasUpdate, url, notes }`. Bila API gagal/404
  (repo belum publik / belum ada rilis), `latest` = `null` & `hasUpdate` =
  `false` (aplikasi tetap berjalan normal).
- `openUpdatePage(url)` (invoke) → membuka halaman rilis GitHub di browser
  default (`shell.openExternal`). Ini strategi **unduh manual macOS**: user
  mengunduh dmg/zip lalu membukanya sendiri (gratis, tanpa Developer ID).

### 4.9 Update Resource (`resource:check` / `resource:update` / `resource:status`)

- `checkResources()` (invoke) → membaca `bin/versions.json` (versi terpasang,
  dicatat saat startup via `recordInstalledVersions()`) dan membandingkannya
  dengan `resources.json` dari repo (raw.githubusercontent). Mengembalikan
  `ResourceInfo[] { id, label, current, expected, outdated }`.
  - `ffmpeg` pin `6.1` — cocok via awalan (menangani `6.1-tessus`).
  - `yt-dlp` = `latest` → diharapkan mengikuti rilis terbaru GitHub yt-dlp.
- `updateResources(force?)` (invoke) → menghapus binary lama, me-reset cache
  single-flight (`resetFfmpegCache` / `resetYtdlpCache`), mengunduh ulang yang
  outdated, lalu mencatat ulang versi. Progres dikirim lewat event
  `resource:status` (string pesan Bahasa Indonesia).- `onResourceChanged(cb)` (event) → proses utama mengirim `ResourceInfo[]`
  SEGAR setelah `recordInstalledVersions()` selesai (saat startup). Dipakai
  renderer sebagai **basis akurat badge update di sidebar** — menghindari
  badge palsu karena `versions.json` belum terisi saat mount (deteksi yt-dlp
  butuh ~11 detik boot). Renderer juga menerima daftar ini setelah membuka
  app tanpa perlu klik "Periksa Resource".
## 4.9. Performa Kampanye (analytics + AI) — BARU (2026-08-16)

Channel `analytics:*` & `ai:*` untuk fitur menu "Performa Kampanye".

| Arah | Channel | Tujuan |
|---|---|---|
| R → M | `analytics:list` (invoke) | Daftar workspace ringkas `{ id, name, profileName, updatedAt }` |
| R → M | `analytics:load` (invoke) | Muat workspace by id → `CampaignWorkspace` (termasuk CSV text) |
| R → M | `analytics:save` (invoke) | Simpan workspace → `{ id, savedAt }` (tulis atomik) |
| R → M | `analytics:delete` (invoke) | Hapus workspace by id → `boolean` |
| R → M | `ai:getKey` (invoke) | Ambil `GEMINI_API_KEY` dari config main (string, bisa kosong) |
| R → M | `ai:setKey` (invoke) | Simpan `GEMINI_API_KEY` ke config main (tanpa login) |
| R → M | `ai:analyze` (invoke) | Panggil Gemini → `{ text }`; payload `{ campaignsSummary, totalMetrics, question?, chatHistory? }` |

`window.api` (preload): `listCampaignWorkspaces()`, `loadCampaignWorkspace(id)`,
`saveCampaignWorkspace(payload)`, `deleteCampaignWorkspace(id)`,
`getGeminiApiKey()`, `setGeminiApiKey(key)`, `aiAnalyze(payload)`.

Catatan: `ai:analyze` WAJIB lewat main process (fetch Node) karena CSP renderer
`connect-src 'self' ws:` memblokir akses keluar. Kunci Gemini disimpan di
`userData/omni-config.json` (`AppConfig.geminiApiKey`), BUKAN sistem auth/login.

## 5. Aturan Penggunaan di Renderer

1. Selalu panggil metode lewat optional chaining (`window.api?.method`) karena
   `api` bertipe opsional (mode web/demo tanpa Electron).
2. Bersihkan listener: simpan nilai kembalian `on*` lalu panggil saat unmount.
3. Panggil `checkEngine()` sekali saat mount setelah mendaftarkan
   `onEngineStatus` dan `onAppReady`.
4. Jangan kirim objek non-serializable (fungsi, class instance) lewat IPC.

## 6. Contoh Pola Renderer

```typescript
useEffect(() => {
  if (!window.api?.checkEngine) return
  const offStatus = window.api.onEngineStatus((s) => setEngineStatus(s))
  const offReady = window.api.onAppReady((r) => setIsAppReady(r))
  window.api.checkEngine()
  return () => {
    offStatus()
    offReady()
  }
}, [])
```
