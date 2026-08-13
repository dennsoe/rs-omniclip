# Dokumentasi RS OmniClip

Pusat dokumentasi lengkap untuk aplikasi desktop **RS OmniClip** — Super App
pemrosesan massal video pendek berbasis Electron-Vite (React + TypeScript).

## Daftar Dokumen

| Dokumen | Isi |
|---|---|
| [PRD.md](./PRD.md) | Product Requirements Document: visi, fitur, kebutuhan pengguna, user stories, kebutuhan non-fungsional |
| [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) | Spesifikasi teknis: arsitektur, stack, struktur folder, alur proses, keamanan |
| [IPC_CONTRACT.md](./IPC_CONTRACT.md) | Kontrak jembatan IPC `window.api` lengkap (channel, payload, event) |
| [ENGINE_SPEC.md](./ENGINE_SPEC.md) | Spesifikasi mesin backend: preset FFmpeg, provisioning binary, trimmer, yt-dlp |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Peta jalan fitur (sudah / sedang / belum dikerjakan) |
| [BUILD_AND_RELEASE.md](./BUILD_AND_RELEASE.md) | Panduan menjalankan, membangun, dan merilis aplikasi macOS |
| [TESTING.md](./TESTING.md) | Strategi pengujian, smoke test mesin, dan daftar verifikasi |
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Kondisi terkini proyek (dipelihara setiap ada perubahan) |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | **Acuan utama** implementasi, sinkronisasi file & verifikasi |

## Prinsip Kunci Aplikasi

1. **NON-DESTRUKTIF** — Aplikasi tidak pernah menimpa berkas asli. Semua hasil
   disalin ke folder otomatis `[CLEANED] - YYYY-MM-DD`.
2. **Tanpa Emoji** — Semua teks antarmuka dan kode tidak memakai emoji; ikon
   memakai `lucide-react`.
3. **UI Bahasa Indonesia**.
4. **Estetika macOS Premium** — Light mode, `backdrop-blur`, palet slate/blue
   (Tailwind v4).

## Referensi Cepat

- Menjalankan aplikasi: `npm run dev`
- Build produksi: `npm run build`
- Paket macOS: `npm run build:mac`
- Smoke test mesin: `node scripts/engine-smoke-test.mjs`
- Repo: `https://github.com/dennsoe/rs-omniclip` (branch `main`)
