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
- Commit: `47d3720` (inisialisasi), `c7d9a6c` (dokumentasi), `6133f9e`
  (perbaikan audit B1–B15). Perombakan preset/monitor/responsivitas belum di-commit.
- Jumlah file ter-track: 55

## Status Fitur

| Fitur | Status |
|---|---|
| Pembersih Metadata Massal (`metadata`) | Selesai & terverifikasi (remux lossless + fallback encode) |
| Peningkat Video HD 720p (`hd`) | Selesai & terverifikasi (upscale + penajaman + denoise) |
| Peningkat Video FullHD 1080p (`fullhd`) | Selesai & terverifikasi |
| Peningkat Video UHD 4K (`uhd`) | Selesai & terverifikasi |
| Arsip Kualitas Maks (`archive`) | Selesai & terverifikasi |
| Kompresor WhatsApp (`whatsapp`) | Selesai & terverifikasi |
| Pengunduh Universal (yt-dlp) | Selesai (provisioning + progress) |
| Pemotong Inline (lossless) | Selesai & terverifikasi |
| Monitor System (CPU/RAM) | Selesai — data nyata dari proses utama (`system:stats`) |
| Watermark teks (`drawtext`) | DIHAPUS — build FFmpeg evermeet TIDAK punya filter `drawtext` |
| Subtitle Otomatis (AI) | Diarsipkan ke roadmap (belum dikerjakan) |

## Status Kualitas

| Pemeriksaan | Hasil |
|---|---|
| `npm run typecheck` | PASS (node + web) |
| `npm run lint` | PASS |
| `npm run build` | PASS (main, preload, renderer) |
| `get_errors` (seluruh workspace) | No errors found |
| Smoke test mesin | 11/11 PASS (metadata, HD, FullHD, 4K, archive, WhatsApp, trim) |

## Audit Forensik & Perbaikan (2026-08-13)

Audit menyeluruh seluruh codebase menemukan dan memperbaiki 15 isu (B1–B15):

- **Tinggi**: kunci retry `ensureFfmpeg` (B1) & `ensureYtdlp` (B2) — hasil gagal
tidak lagi di-cache, aplikasi bisa mencoba lagi tanpa restart.
- **Sedang**: anti-timpa hasil output (B3), timeout membatalkan koneksi (B4),
guard payload IPC (B5), toast hasil akurat dengan jumlah berhasil/gagal (B6),
fallback re-encode untuk preset `metadata` (B7, sebelumnya bernama `quick`).
- **Rendah**: ETA akurat via progressRef (B8), progres indikatif saat durasi
tidak diketahui (B9), guard pemrosesan non-desktop (B10), pesan error
ditampilkan per file & per unduhan (B11, B12), validasi rentang waktu (B13),
UX panel trim (B14), dokumentasi CSP (B15).

Detail lengkap: `docs/ENGINE_SPEC.md` dan `docs/IPC_CONTRACT.md`.

## Perombakan Fitur & UI (2026-08-13)

- **Preset diperjelas** → `metadata`, `hd` (720p), `fullhd` (1080p), `uhd` (4K),
  `archive`, `whatsapp`. Default `fullhd`. Semua terverifikasi via smoke test 11/11.
- **Bug klik membuka dialog file** (dropzone menangkap semua klik di halaman
  download/prasetel) diperbaiki dengan `noClick`/`noDrag` bersyarat.
- **Pengaturan tambahan yang tidak berfungsi** dihapus dari sidebar; Monitor
  System kini menampilkan **CPU/RAM nyata** dari proses utama (`system:stats`),
  bukan simulasi.
- **Watermark dihapus** — build FFmpeg terpasang (evermeet 6.1) tidak
  mendukung filter `drawtext` (diverifikasi: "No such filter: 'drawtext'").
- **Responsivitas super**: `h-dvh`, sidebar scroll, `min-w-0`, ukuran responsif;
  jendela minimum 720x560, mobile drawer di bawah 768px.

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
6. **Build FFmpeg evermeet (6.1) TIDAK punya filter `drawtext`** — fitur
   watermark teks dihapus; bisa kembali hanya via build FFmpeg lain atau overlay.
7. **Jendela minimum 720x560**; layout responsif `h-dvh` di semua ukuran & mode.

## Hal yang Belum Dikerjakan

- Watermark: butuh build FFmpeg dengan filter `drawtext` (atau pendekatan overlay
  gambar logo) — dicatat di roadmap, fitur teks dihapus dari UI & mesin.
- Subtitle Otomatis (AI): transkripsi lokal (mis. Whisper) — di roadmap.
- Signing/notarisasi & distribusi publik.
- Pengujian di Intel Mac.
- Lihat [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) untuk detail.
