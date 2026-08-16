# Catatan Rilis — RS OmniTools v2.0.0

Dokumen ini adalah **sumber catatan rilis** untuk release v2.0.0. Bagian
"Body release" di bawah siap disalin ke **detail release GitHub** (mis.
`gh release create v2.0.0 --notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniTools v2.0.0 — Rebranding + Identitas Baru

> Aplikasi kini berganti nama menjadi **RS OmniTools** (sebelumnya RS OmniClip)
> dengan brand logo baru, nama repo baru (`rs-omnitools`), ikon aplikasi kustom,
> dan migrasi data pengguna otomatis. Seluruh fitur v1.5.0 tetap tersedia.

### 1. Rebranding Total
- Nama aplikasi: **RS OmniClip → RS OmniTools** (judul window, installer, menu).
- Repo GitHub: `dennsoe/rs-omniclip` → **`dennsoe/rs-omnitools`** (URL lama
  otomatis diarahkan; seluruh riwayat, PR, dan release tetap terjaga).
- Subtitle aplikasi: **"Alat Serbaguna"**.
- appId baru: `id.rsstudio.omnitools`.

### 2. Brand Logo & Ikon
- Logo resmi **`rsomni.png`** terpasang di:
  - **Ikon aplikasi** (dock/taskbar, DMG, installer Windows) — tidak lagi
    memakai ikon default Electron.
  - **Logo sidebar** & halaman Tentang.
  - **Favicon** untuk mode pratinjau.

### 3. Migrasi Data Otomatis
- Saat pertama kali dibuka dengan identitas baru, aplikasi **menyalin otomatis**
  data penting dari userData lama (`rs-omniclip`): binary engine (ffmpeg/yt-dlp),
  konfigurasi, riwayat unduhan, dan workspace Performa Kampanye → userData baru
  (`rs-omnitools`). **Tidak ada data yang hilang.**
- Folder hasil unduhan kini `~/Downloads/RS-OmniTools` (folder lama dibiarkan).

### Termasuk seluruh fitur v1.5.0
- **Performa Kampanye**: analisis Meta Ads vs komisi Shopee Affiliate (tabel,
  KPI + PPN dinamis, grafik, diagnostik, workspace, Asisten AI via main process).
- Seluruh fitur video: pembersih metadata, peningkat (HD/FullHD/4K/vertikal),
  pengunduh universal (multi-link + akun/halaman + watcher), pemotong lossless,
  kompresor WhatsApp, proxy anti-banned, hardware acceleration, preview media,
  riwayat, dan modal notifikasi update.

### Catatan teknis
- Mekanisme pembaruan kini menunjuk repo baru `rs-omnitools`.
- Untuk pengguna lama: cukup instal v2.0.0; data diimpor otomatis.

---

## Log perubahan (referensi internal — tidak disalin ke detail release)

### v2.0.0 (2026-08-16)
- `feat: rebrand RS OmniClip → RS OmniTools` (`95ffece`, PR #32 → merge commit
  `b5e3659`).
  - Identitas: `name`/`productName`/`appId`/`artifactName`/`publish.repo`.
  - Logo & ikon dari `rsomni.png` (build icon 1024², sidebar 256², favicon 64²).
  - Repo rename `dennsoe/rs-omniclip` → `dennsoe/rs-omnitools`.
  - Migrasi userData: `electron/main/migrate-userdata.ts` (bin/config/analytics).
  - UI: sidebar 'RS OMNITOOLS' + 'Alat Serbaguna', judul window, UpdateModal,
    dropzone, halaman Tentang; updater menunjuk repo baru.
  - Docs (README + docs/) diperbarui.
  - Validasi: typecheck/lint/build PASS; E2E browser (logo 256², favicon 200,
    title 'RS OmniTools', tanpa console error).
- Bump versi `1.5.0 → 2.0.0`.
