# Peta Jalan Implementasi (Roadmap) — RS OmniClip

Versi: 1.0
Tanggal: 2026-08-13
Status: Hidup (diperbarui seiring perkembangan)

Legenda status: `[x]` selesai, `[ ]` belum.

## Fase 1 — Fondasi & Migrasi (SELESAI)

- [x] Migrasi UI dari ekspor Next.js ke arsitektur Electron-Vite
  (React + TypeScript).
- [x] Setup Electron main process + preload + renderer.
- [x] Kontrak IPC `window.api` lengkap (inti + ekstensi trim & getPathForFile).
- [x] Mesin FFmpeg: provisioning (ffbinaries + fallback GitHub), probe,
  eksekusi dengan progress.
- [x] Preset pemrosesan: `metadata`, `hd`, `fullhd`, `uhd`, `archive`, `whatsapp`
  (dirombak pada Fase 2b).
- [x] Folder output non-destruktif `[CLEANED] - YYYY-MM-DD`.
- [x] Pengunduh universal via yt-dlp (provisioning + progress).
- [x] Pemotongan lossless inline.
- [x] Smoke test mesin (8/8 lolos).
- [x] Dokumentasi lengkap di `docs/`.
- [x] Push ke GitHub (`dennsoe/rs-omniclip`, branch `main`).

## Fase 2 — Penyempurnaan Engine (SEBAGIAN)

- [x] Fallback unduhan FFmpeg ke GitHub (ffbinaries-prebuilt) agar tidak
  bergantung pada ffbinaries.com.
- [x] Timeout pada semua unduhan binary.
- [x] Fallback preset `hd`/`fullhd`/`uhd` tanpa filter audio.
- [x] Monitor System nyata (CPU/RAM via `os.cpus` delta di proses utama,
  channel `system:stats`) — menggantikan simulasi.
- [ ] Multi-inti / antrean paralel (opsional, saat ini berurutan).
- [ ] Resume batch dari file yang gagal (tombol "Proses ulang yang gagal").
- [ ] Validasi lebih ketat: cek resolusi/rasio sebelum upscale.

## Fase 2b — Perombakan UX & Fitur (SELESAI, belum di-commit)

- [x] Preset diperjelas: `metadata`, `hd` (720p), `fullhd` (1080p), `uhd` (4K),
  `archive`, `whatsapp` (default `fullhd`); verifikasi smoke 11/11.
- [x] Perbaikan bug dropzone (klik membuka dialog file di halaman lain).
- [x] Monitor System data nyata (`system:stats`).
- [x] Kontrol mati (subtitle/watermark) dihapus dari sidebar.
- [x] Responsivitas super: `h-dvh`, sidebar scroll, jendela min 720x560, drawer mobile.
- [x] Watermark teks dihapus (FFmpeg tanpa `drawtext`).

## Fase 3 — Fitur Lanjutan (BELUM)

- [ ] **Watermark** — membutuhkan build FFmpeg dengan filter `drawtext` ATAU
  overlay gambar logo (`-filter_complex overlay`). CATATAN: build evermeet
  (6.1, macos-64) yang diprovisikan TIDAK punya `drawtext` — fitur teks dihapus.
- [ ] **Subtitle Otomatis (AI)** — transkripsi lokal (mis. Whisper) lalu burn-in
  atau sidecar `.srt`.
- [ ] Pengaturan target ukuran WhatsApp yang dapat dikonfigurasi pengguna.
- [ ] Riwayat pemrosesan (log batch) di UI.
- [ ] Mode gelap/terang mengikuti sistem (nativeTheme).

## Fase 4 — Kualitas & Rilis (BELUM)

- [ ] Pengujian paket `.dmg`/`.zip` di mesin bersih (fresh install).
- [ ] Penandatanganan & notarisasi (codesign + notarize) untuk distribusi macOS.
- [ ] Auto-update (electron-updater) atau proses rilis manual yang terdokumentasi.
- [ ] Pengujian pada Intel Mac (x64) dan Apple Silicon (arm64).
- [ ] Umpan balik pengguna tim internal → prioritas ulang fitur.

## Prioritas Umum

1. Stabilkan fondasi (Fase 2) sebelum fitur baru (Fase 3).
2. Fitur P0 (pembersih, enhancer, pengunduh, kompresor) sudah berfungsi.
3. Watermark (perlu FFmpeg dengan drawtext/overlay) & subtitle AI adalah nilai
   tambah terbesar berikutnya.
