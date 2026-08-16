# Spesifikasi Teknis — RS OmniTools

Versi: 1.0
Tanggal: 2026-08-13

## 1. Arsitektur Aplikasi

RS OmniTools adalah aplikasi desktop **Electron-Vite** dengan tiga proses:

```
┌─────────────────────────────────────────────────────────────┐
│  PROSES RENDERER (React 19 + Tailwind v4)                    │
│  src/ — UI Bahasa Indonesia, estetika macOS                  │
│  Berkomunikasi hanya via window.api (contextBridge)          │
└───────────────────────────┬─────────────────────────────────┘
                            │ IPC (contextBridge / ipcRenderer)
┌───────────────────────────▼─────────────────────────────────┐
│  PROSES PRELOAD (electron/preload/index.ts)                  │
│  Mengekspos window.api (kontrak IPC) + webUtils              │
└───────────────────────────┬─────────────────────────────────┘
                            │ IPC (ipcMain)
┌───────────────────────────▼─────────────────────────────────┐
│  PROSES UTAMA (electron/main/index.ts)                       │
│  Node.js backend engine:                                     │
│   - FFmpeg/FFprobe (pembersih, enhancer, kompresor, trim)   │
│   - yt-dlp (pengunduh universal)                             │
│   - shell.openPath (buka folder)                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. Stack Teknologi

| Komponen | Teknologi | Versi |
|---|---|---|
| Framework desktop | Electron | ^33 (terpasang 33.4.11) |
| Build tool | Electron-Vite | ^3.1 |
| Bundler | Vite | ^6 (terpasang 6.4.3) |
| UI | React | ^19.2.1 |
| Bahasa | TypeScript | ^5.9.3 |
| Styling | Tailwind CSS v4 + PostCSS | 4.1.11 |
| Animasi | motion (framer-motion) | ^12.23 |
| Ikon | lucide-react | ^0.553 |
| Drag & drop file | react-dropzone | ^20.1 |
| Sortable antrean | @dnd-kit | core/sortable/utilities |
| Engine video | FFmpeg/FFprobe 6.1 (evermeet/ffbinaries) | 6.1 |
| Pengunduh | yt-dlp | latest (GitHub) |
| Download binary FFmpeg | ffbinaries + extract-zip | 1.1.6 / 2.0.1 |
| Packaging | electron-builder | ^25.1 |

## 3. Struktur Folder

```
rs-omni/
├── electron/
│   ├── main/
│   │   ├── index.ts            # lifecycle + pendaftaran IPC
│   │   └── engine/
│   │       ├── paths.ts        # lokasi binary, output, unduhan
│   │       ├── net.ts          # unduhan HTTPS (redirect + timeout)
│   │       ├── ffmpeg.ts       # provisioning + probe + eksekusi FFmpeg
│   │       ├── processor.ts    # preset pemrosesan batch
│   │       ├── trimmer.ts      # pemotongan lossless
│   │       └── downloader.ts   # yt-dlp
│   └── preload/
│       └── index.ts            # contextBridge → window.api
├── src/
│   ├── index.html              # entri renderer
│   ├── main.tsx                # mount React
│   ├── App.tsx                 # UI utama (migrasi dari app/page.tsx)
│   ├── assets/main.css         # Tailwind v4
│   ├── components/             # StatusBadge, SortableFileItem, Toasts, modals, dll.
│   ├── lib/                    # types.ts, utils.ts (cn)
│   ├── hooks/use-mobile.ts
│   └── types/global.d.ts       # deklarasi window.api
├── scripts/engine-smoke-test.mjs
├── docs/                       # dokumentasi ini
├── _archive_nextjs/            # arsip ekspor Next.js lama
├── electron.vite.config.ts
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
└── out/                        # hasil build (main, preload, renderer)
```

## 4. Konfigurasi Build (electron.vite.config.ts)

- **main**: entry `electron/main/index.ts`, plugin `externalizeDepsPlugin`,
  alias `@engine` → `electron/main/engine`.
- **preload**: entry `electron/preload/index.ts`, `externalizeDepsPlugin`.
- **renderer**: root `src/`, `base: './'`, entry `src/index.html`, alias
  `@`, `@components`, `@lib`, `@hooks`.

Hasil build ke `out/main/index.js`, `out/preload/index.js`,
`out/renderer/index.html` + assets.

## 5. Konfigurasi TypeScript

- `tsconfig.json` — solution style (`files: []` + references node & web).
- `tsconfig.node.json` — proses utama + preload + `electron.vite.config.ts`,
  `types: ["node", "electron-vite/node"]`.
- `tsconfig.web.json` — renderer (DOM, jsx react-jsx, alias `@*`).
- Path alias tanpa `baseUrl` (relatif `./`).

## 6. Keamanan

- `contextIsolation: true` — renderer tidak pernah mengakses Node secara langsung.
- `nodeIntegration: false`.
- `sandbox: false` (preload memakai `webUtils` dan mengekspos API terbatas).
- `setWindowOpenHandler` → semua link eksternal dibuka lewat `shell.openExternal`
  (jendela baru diblokir).
- Renderer hanya menerima data via channel IPC yang sudah ditentukan
  (tidak ada `ipcRenderer.send` sembarang dari renderer; semua lewat preload).

## 7. Alur Proses Batch (Pembersih)

1. Renderer: `window.api.startProcessing({ files, preset })`.
2. Main: `handleProcessing` → `processBatch` (engine/processor.ts).
3. `ensureFfmpeg()` memastikan binary tersedia (unduh bila perlu).
4. `createOutputFolderForBatch` membuat folder `[CLEANED] - YYYY-MM-DD` di
   folder berkas sumber pertama.
5. Untuk tiap file: `probe()` (durasi/resolusi) → jalankan FFmpeg sesuai preset →
   kirim `processing:progress` (persen dari baris `time=` di stderr).
6. Selesai → `processing:complete { outputFolder }`.

## 8. Alur Proses Unduhan (Batch & Scrape)

### 8.1 Unduhan Banyak Link

1. Renderer: `window.api.startDownloadBatch(urls, options?)` (array URL; payload
   `{ urls, options }` dengan `options = { maxHeight?, cookiesBrowser?, parallel? }`).
2. Main: `handleDownload` → `startDownloadBatch` (engine/downloader.ts) — loop
   **berurutan** per URL (atau maks 2 paralel bila `parallel`).
3. **Jalur TikTok (Lapisan 0)**: bila `isTikTokUrl(url)` → coba **API TikWM**
   (`electron/main/engine/tiktok.ts`) lebih dulu — 5 `api_key` (failover
   berurutan k1→k5): resolve `code:0` + `data.play`, unduh MP4 via **GET** dengan
   UA Chrome + `Referer: https://www.tiktok.com/` (HEAD CDN = 503), progress
   0→100, nama `[judul] [id].mp4` (sanitasi + dedupe). Sukses → event `success`
   (`description: "TikTok · via TikWM"`); gagal → jatuh ke jalur yt-dlp di bawah.
   (Alasan: bot-detection TikTok 2026 memutus yt-dlp global; TikWM emulasi
   mobile di sisi server tetap bekerja.)
4. `ensureYtdlp()` memastikan binary yt-dlp tersedia.
5. Tiap URL (non-TikTok / fallback TikTok): spawn `yt-dlp --newline --no-playlist
   --progress [-f bv*[height<=H]...] [--cookies-from-browser <browser>]
   --print after_move:__RSMETA__{json} -o <template> <url>`.
6. **Progress realtime**: stdout di-buffer per baris; baris `[download] NN% of X
   at Y/s ETA MM:SS` diurai → `download:progress { id=url, url, percent, status,
   speedBytesPerSec?, etaSeconds?, sizeBytes?, phase? }` (throttle 300 ms).
7. **Retry + self-heal**: retry transien (2×, jeda mundur) untuk error extractor
   sementara; bila masih gagal dengan error situs/extractor (mis. TikTok
   bot-detection), coba ulang dengan **user-agent Chrome**, lalu **perbarui
   yt-dlp otomatis ke rilis terbaru** dan coba lagi (sekali per sesi).
8. **Metadata** `title/thumbnail/description/filePath` dari baris `__RSMETA__`
   (JSON setelah `after_move`) disertakan pada event sukses.
9. Selesai semua → `download:complete { total, success, failed }`.
10. Output: `~/Downloads/RS-OmniTools/Unduhan/`; "Buka folder" via `folder:reveal`.

### 8.2 Ambil Daftar Akun / Halaman

1. Renderer: `window.api.scrapeAccount({ id, url })`.
2. Main: `handleScrape` → `scrapeAccount` (engine/downloader.ts).
3. Spawn `yt-dlp --flat-playlist --no-warnings --print "%(id)s\t%(title)s\t%(webpage_url)s" <url>`.
4. Parse tab-separated → `ScrapeItem[] { index, id, title, url }` (dedupe, max 500).
5. Kirim `scrape:complete { id, items, truncated?, error? }`.
6. Item terpilih (URL) dikirim ulang ke `startDownloadBatch`.

## 9. Siklus Hidup Aplikasi (main/index.ts)

- Single instance lock (`requestSingleInstanceLock`).
- `app.whenReady` → register IPC → create window → `initEngine()` (single-flight).
- Window: 1320x840 (min 980x640), `titleBarStyle: 'hiddenInset'`,
  `trafficLightPosition: {x:16, y:16}`, background `#f8fafc`.
- macOS: window tetap aktif saat semua jendela ditutup (`activate` → buat ulang).
- Non-macOS: quit saat semua jendela ditutup.

## 10. Keterkaitan Antar-Proses (Data yang Dikirim)

| Arah | Data |
|---|---|
| Renderer → Main | payload processing (files + preset), payload download (url + id), payload trim (id + path + start + end), folder path untuk dibuka |
| Main → Renderer | status engine (string), ready (bool), progress processing, complete (outputFolder), progress download, hasil trim |

Seluruh data dikirim sebagai objek/primitive serializable (structured clone) —
tidak ada fungsi atau objek kompleks yang melintasi batas proses.
