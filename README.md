# RS OmniClip

**Super App desktop** untuk pemrosesan massal video pendek (< 1 menit) yang dibangun
dengan **Electron-Vite (React + TypeScript)** dan mesin lokal **Node.js + FFmpeg + yt-dlp**.

Aplikasi ini merupakan migrasi dari ekspor Next.js (AI Studio UI builder) ke arsitektur
desktop **Electron-Vite** dengan backend Node.js asli. Kode lama tersimpan di
`_archive_nextjs/` untuk referensi.

---

## Fitur

1. **Pembersih Metadata Massal** — Menghapus EXIF/GPS via FFmpeg (remux lossless).
2. **Peningkat Video & Normalisasi Audio** — Upscale 1080p (sumbu panjang) + penajaman AI-like (`unsharp`) + reduksi noise audio (`afftdn`).
3. **Pengunduh Video Universal** — unduh banyak link sekaligus (batch) atau ambil
   daftar video dari satu akun/halaman lalu pilih yang ingin diunduh, via `yt-dlp`
   (YouTube, TikTok, Instagram, dll). Dilengkapi **pilihan kualitas** (maks
   resolusi), **cookies browser** (untuk Facebook/Instagram yang membatasi
   unduhan anonim), dan opsi **unduh paralel** (maks 2).
4. **Pemotong Video Inline** — Potong lossless (stream copy) tanpa re-encode.
5. **Watermark & Auto-Caption** — Di roadmap (build FFmpeg saat ini tidak
   mendukung filter `drawtext`).
6. **Kompresor WhatsApp** — Target ukuran file otomatis (~16 MB) untuk berbagi via WhatsApp.
7. **Pembaruan GRATIS** — Tombol "Periksa Update" (cek rilis terbaru dari
   GitHub tanpa biaya), versi tampil di footer + halaman "Tentang & Update",
   dan perbarui resource mesin (FFmpeg/yt-dlp) via manifest `resources.json`.
   Rilis otomatis via GitHub Actions saat tag `v*` di-push.

**Dukungan Platform**: **macOS** (dmg + zip) dan **Windows** (NSIS installer +
portable `.exe`). Engine (FFmpeg/yt-dlp/System Monitor) lintas-OS; rilis
Windows diproduksi via `npm run build:win` (butuh wine di macOS, mesin
Windows, atau CI).

## Prinsip Kunci

- **NON-DESTRUKTIF**: Aplikasi **tidak pernah menimpa berkas asli**. Hasil disalin ke
  folder otomatis `[CLEANED] - YYYY-MM-DD` di samping berkas sumber.
- **Tanpa Emoji**: Semua teks antarmuka dan kode tidak memakai emoji; ikon memakai
  `lucide-react`.
- **UI Bahasa Indonesia**.
- **Estetika macOS Premium**: Light mode, `backdrop-blur`, palet slate/blue (Tailwind v4).

---

## Arsitektur

```
rs-omni/
├── electron/
│   ├── main/
│   │   ├── index.ts            # Siklus hidup aplikasi + pendaftaran IPC
│   │   └── engine/             # Mesin backend Node.js
│   │       ├── paths.ts        # Folder binary, output, unduhan
│   │       ├── net.ts          # Helper unduhan HTTPS (redirect + timeout)
│   │       ├── ffmpeg.ts       # Provisioning FFmpeg + probe + eksekusi
│   │       ├── processor.ts    # Preset pemrosesan batch
│   │       ├── trimmer.ts      # Pemotongan lossless
│   │       └── downloader.ts   # yt-dlp (unduhan universal)
│   └── preload/
│       └── index.ts            # contextBridge -> window.api
├── src/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx                 # UI utama (dimigrasi dari app/page.tsx)
│   ├── assets/main.css         # Tailwind v4 (dimigrasi dari app/globals.css)
│   ├── components/             # StatusBadge, SortableFileItem, Toasts, dll.
│   ├── lib/                    # types.ts, utils.ts
│   ├── hooks/use-mobile.ts
│   └── types/global.d.ts       # Deklarasi window.api (kontrak IPC)
├── scripts/engine-smoke-test.mjs  # Smoke test mesin (headless)
├── resources.json              # Manifest resource mesin (ffmpeg/yt-dlp)
├── .github/workflows/release.yml # CI rilis macOS + Windows (tag v*)
├── _archive_nextjs/            # Arsip ekspor Next.js lama
└── out/                        # Hasil build electron-vite
```

## Kontrak IPC (`window.api`)

Didefinisikan di `src/types/global.d.ts` dan diimplementasikan di `electron/preload/index.ts`:

```typescript
window.api = {
  checkEngine: () => void
  onEngineStatus: (cb: (status: string) => void) => void
  onAppReady: (cb: (isReady: boolean) => void) => void
  startProcessing: (payload: { files: FileItem[]; preset: PresetType }) => void
  onProcessingProgress: (cb: (data: { id; percent; status: 'processing'|'success'|'failed' }) => void) => void
  onProcessingComplete: (cb: (data: { outputFolder: string }) => void) => void
  openFolder: (folderPath: string) => void
  startDownloadBatch: (urls: string[]) => void                       // unduh banyak URL berurutan
  onDownloadProgress: (cb: (data: { id; url; percent; status }) => void) => void
  onDownloadComplete: (cb: (data: { total; success; failed }) => void) => void
  scrapeAccount: (payload: { id: string; url: string }) => void      // ambil daftar video akun/halaman
  onScrapeComplete: (cb: (data: { id; items: ScrapeItem[]; truncated?; error? }) => void) => void
  onSystemStats: (cb: (data: { cpu; ramUsedMb; ramTotalMb }) => void) => void
  // Ekstensi:
  getPathForFile: (file: File) => string   // jalur absolut file yang di-drop
  trimVideo: (payload: { id; path; start; end }) => void
  onTrimComplete: (cb: (data: { id; success; path?; error? }) => void) => void
  // Pembaruan (gratis):
  checkForUpdate: () => Promise<UpdateInfo>        // cek rilis terbaru GitHub
  openUpdatePage: (url: string) => Promise<boolean> // buka halaman rilis (unduh manual)
  checkResources: () => Promise<ResourceInfo[]>     // status ffmpeg/yt-dlp vs manifest
  updateResources: (force?: boolean) => Promise<ResourceInfo[]>
  onResourceStatus: (cb: (message: string) => void) => void
}
```

## Preset Pemrosesan (FFmpeg)

| Preset | Perintah inti |
|---|---|
| `metadata` (Hapus Metadata) | remux lossless `-map_metadata -1 -c copy -movflags +faststart` (+ fallback re-encode minimal) |
| `hd` (HD 720p) | upscale 720p + `unsharp` + `afftdn`, `libx264`, audio 192k |
| `fullhd` (Full HD 1080p) | upscale 1080p + `unsharp` + `afftdn`, `libx264`, audio 192k (default) |
| `uhd` (4K UHD) | upscale 2160p + `unsharp` + `afftdn` |
| `archive` (Kualitas Maks) | `libx264 preset slow crf 18`, audio 256k |
| `whatsapp` (Kompresi WA) | bitrate dihitung dari target 16 MB dan durasi video |

## Provisioning Binary (Pertama Kali Dijalankan)

Mesin otomatis mengunduh binary saat pertama kali dijalankan (butuh koneksi internet)
ke folder data aplikasi (`~/Library/Application Support/rs-omniclip/bin`):

1. **FFmpeg/FFprobe** via `ffbinaries` (ffbinaries.com). Jika API tidak terjangkau atau
   ekstraksi tidak lengkap, mesin **fallback ke rilis GitHub langsung**
   (`ffbinaries/ffbinaries-prebuilt` v6.1, build evermeet.cx). Semua unduhan memakai
   batas waktu agar tidak menggantung.
2. **yt-dlp** diunduh otomatis dari rilis resmi GitHub saat pertama kali digunakan.

## Menjalankan

Prasyarat: Node.js 18+.

```bash
npm install          # pasang dependensi
npm run dev          # jalankan aplikasi desktop (mode pengembangan)
```

Perintah lain:

```bash
npm run typecheck    # pemeriksaan tipe (node + web)
npm run lint         # ESLint
npm run build        # build electron-vite (out/)
npm run build:mac    # build + paket .dmg/.zip (electron-builder)
node scripts/engine-smoke-test.mjs   # smoke test mesin (verifikasi preset FFmpeg)
```

## Pembaruan (Gratis)

RS OmniClip memakai mekanisme pembaruan **tanpa biaya** (repo publik + GitHub):

- **Cek versi terbaru**: aplikasi membaca rilis terbaru dari
  `api.github.com/repos/dennsoe/rs-omniclip/releases/latest` (tanpa token).
- **Unduh manual (macOS)**: tombol "Unduh Versi Baru" membuka halaman rilis
  GitHub; user mengunduh dmg/zip dan membukanya sendiri — tidak butuh
  Developer ID/notarisasi.
- **Update resource**: `resources.json` di repo menentukan versi yang
  diharapkan (FFmpeg 6.1, yt-dlp = rilis terbaru). Halaman "Tentang & Update"
  menampilkan status dan tombol "Perbarui Resource".
- **Rilis otomatis**: push tag `v*` memicu GitHub Actions
  (`.github/workflows/release.yml`) → `electron-builder --mac --publish always`
  mengunggah dmg + zip + `latest-mac.yml` ke GitHub Release.

## Troubleshooting macOS (Gatekeeper)

Aplikasi **tidak ditandatangani Developer ID** (gratis, tanpa akun developer
berbayar). Build otomatis menandatangani ulang bundle secara adhoc
(`scripts/afterSign.js`) sehingga signature valid. Namun saat pertama kali
diunduh dari browser, macOS menambahkan atribut *quarantine* dan bisa
memblokir. Jika muncul pesan seperti *"is damaged and can't be opened"* atau
*"unidentified developer"*, lakukan salah satu:

1. **Klik kanan** pada `RS OmniClip.app` → **Open** → pilih **Open** (sekali).
2. Atau hapus atribut quarantine di Terminal:
   ```bash
   xattr -cr "/Applications/RS OmniClip.app"
   ```
   lalu buka aplikasi seperti biasa.

> Distribusi sepenuhnya mulus (tanpa langkah di atas) membutuhkan Developer ID
> + notarisasi Apple (berbayar ~$99/tahun).

## Catatan Keluaran

- Hasil batch: `[CLEANED] - YYYY-MM-DD/` di folder berkas sumber pertama.
- Hasil unduhan: `~/Downloads/RS-OmniClip/Unduhan/`.
- Folder `[CLEANED] - YYYY-MM-DD` dan `Unduhan` tidak pernah menimpa berkas asli.

## Dokumentasi

Dokumentasi lengkap tersedia di folder [`docs/`](./docs/README.md):

| Dokumen | Isi |
|---|---|
| `docs/PRD.md` | Product Requirements Document (fitur, kebutuhan, user stories) |
| `docs/TECHNICAL_SPEC.md` | Spesifikasi teknis & arsitektur |
| `docs/IPC_CONTRACT.md` | Kontrak jembatan IPC `window.api` |
| `docs/ENGINE_SPEC.md` | Spesifikasi mesin FFmpeg/yt-dlp + preset |
| `docs/IMPLEMENTATION_ROADMAP.md` | Peta jalan fitur |
| `docs/BUILD_AND_RELEASE.md` | Menjalankan, build, dan rilis macOS |
| `docs/TESTING.md` | Strategi pengujian & smoke test |
| `docs/CURRENT_STATE.md` | Kondisi terkini proyek |


