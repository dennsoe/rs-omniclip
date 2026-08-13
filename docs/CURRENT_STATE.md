# Kondisi Terkini — RS OmniClip

Dokumen ini mencerminkan **kondisi proyek saat ini** dan WAJIB diperbarui setiap
ada perubahan. Tanggal terakhir diperbarui: **2026-08-13**.

## Ringkasan

RS OmniClip telah dimigrasi penuh dari ekspor Next.js ke arsitektur desktop
**Electron-Vite (React + TypeScript)** dengan backend Node.js (FFmpeg + yt-dlp).
Aplikasi berfungsi end-to-end dan telah di-push ke GitHub.

## Repositori

- Repo: `https://github.com/dennsoe/rs-omniclip`
- Branch: `main`
- Commit terakhir: `47d3720` — "Inisialisasi RS OmniClip: migrasi Next.js ke
  Electron-Vite + mesin backend"
- Jumlah file ter-track: 55

## Status Fitur

| Fitur | Status |
|---|---|
| Pembersih Metadata Massal (`quick`) | Selesai & terverifikasi |
| Peningkat Video & Audio (`standard`) | Selesai & terverifikasi (termasuk fallback audio) |
| Arsip Kualitas Maks (`archive`) | Selesai & terverifikasi |
| Kompresor WhatsApp (`whatsapp`) | Selesai & terverifikasi |
| Pengunduh Universal (yt-dlp) | Selesai (provisioning + progress) |
| Pemotong Inline (lossless) | Selesai & terverifikasi |
| Watermark Logo | UI toggle ada; backend belum |
| Subtitle Otomatis (AI) | UI toggle ada; backend belum |
| Monitor System (CPU/RAM) | Simulasi di renderer |

## Status Kualitas

| Pemeriksaan | Hasil |
|---|---|
| `npm run typecheck` | PASS (node + web) |
| `npm run lint` | PASS |
| `npm run build` | PASS (main, preload, renderer) |
| `get_errors` (seluruh workspace) | No errors found |
| Smoke test mesin | 8/8 PASS |

## Status Runtime

- Aplikasi dapat dijalankan dengan `npm run dev`.
- Engine FFmpeg ter-provision end-to-end di
  `~/Library/Application Support/rs-omniclip/bin/`:
  - `ffmpeg` (~80 MB, ffmpeg 6.1-tessus, build evermeet.cx via ffbinaries-prebuilt)
  - `ffprobe` (~80 MB)
- Di lingkungan dengan akses ffbinaries.com terbatas, provisioning memakai
  fallback GitHub `ffbinaries/ffbinaries-prebuilt` v6.1 (berhasil).

## Keputusan Teknis Penting

1. **Non-destruktif**: hasil selalu ke folder `[CLEANED] - YYYY-MM-DD`.
2. **Fallback binary**: ffbinaries → verifikasi → GitHub ffbinaries-prebuilt.
   BtbN tidak punya build macOS; evermeet ffprobe rusak (kembalikan zip ffmpeg).
3. **Timeout** pada semua unduhan agar tidak menggantung.
4. **`typescript.tsdk`** di `.vscode/settings.json` agar editor memakai TS
   workspace (mencegah error palsu di `electron.vite.config.ts`).
5. **Ekspor Next.js lama** diarsipkan ke `_archive_nextjs/` (tidak dipakai).

## Hal yang Belum Dikerjakan

- Watermark & subtitle backend.
- Monitor sistem nyata (bukan simulasi).
- Signing/notarisasi & distribusi publik.
- Pengujian di Intel Mac.
- Lihat [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) untuk detail.
