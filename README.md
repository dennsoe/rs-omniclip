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
3. **Pengunduh Video Universal** — via `yt-dlp` (YouTube, TikTok, Instagram, dll).
4. **Pemotong Video Inline** — Potong lossless (stream copy) tanpa re-encode.
5. **Watermark & Auto-Caption** — Pengaturan tambahan pada sidebar (UI).
6. **Kompresor WhatsApp** — Target ukuran file otomatis (~16 MB) untuk berbagi via WhatsApp.

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
  startDownload: (payload: { url: string; id?: string }) => void
  onDownloadProgress: (cb: (data: { id; url; percent; status: 'downloading'|'success'|'failed' }) => void) => void
  // Ekstensi:
  getPathForFile: (file: File) => string   // jalur absolut file yang di-drop
  trimVideo: (payload: { id; path; start; end }) => void
  onTrimComplete: (cb: (data: { id; success; path?; error? }) => void) => void
}
```

## Preset Pemrosesan (FFmpeg)

| Preset | Perintah inti |
|---|---|
| `quick` (Bagikan Cepat) | `-map_metadata -1 -c copy -movflags +faststart` (remux lossless) |
| `standard` (Bersih & Jernih) | upscale 1080p + `unsharp` + `afftdn`, `libx264 crf 20`, audio 192k (dengan fallback tanpa filter audio) |
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


