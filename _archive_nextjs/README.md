# Arsip Ekspor Next.js (Tidak Dipakai)

Folder ini berisi **ekspor Next.js lama** dari AI Studio UI builder yang menjadi dasar
migrasi ke arsitektur **Electron-Vite (React + TypeScript)** desktop.

Semua konten di sini **tidak lagi dipakai** oleh aplikasi. Kode aktif berada di:

- `src/` - Renderer React (UI)
- `electron/` - Proses utama Node.js (mesin backend) + preload (jembatan IPC `window.api`)

## Isi arsip

| Path | Keterangan |
|---|---|
| `app/page.tsx` | UI monolitik lama (sumber migrasi ke `src/App.tsx`) |
| `app/layout.tsx` | Root layout Next.js |
| `app/globals.css` | Gaya Tailwind v4 (dimigrasi ke `src/assets/main.css`) |
| `app/api/init-ffmpeg/route.ts` | API unduh FFmpeg lama (digantikan mesin di `electron/main/engine/ffmpeg.ts`) |
| `lib/` | `types.ts`, `utils.ts` (dimigrasi ke `src/lib/`) |
| `hooks/use-mobile.ts` | Dimigrasi ke `src/hooks/use-mobile.ts` |
| `types/` | Deklarasi `window.api` lama (dimigrasi ke `src/types/global.d.ts`) |
| `next.config.ts`, `next-env.d.ts`, `metadata.json`, `.env.example`, `bun.lock`, `.eslintrc.json` | Berkas konfigurasi Next.js/bun lama |
| `assets/.aistudio/` | Metadata AI Studio |

Arsip ini sengaja dipertahankan (tidak dihapus) demi referensi dan jejak audit.
`tsconfig.json` lokal disertakan agar berkas di folder ini tetap terbaca editor
tanpa error.
