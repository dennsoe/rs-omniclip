# Kondisi Terkini — RS OmniClip

Dokumen ini mencerminkan **kondisi proyek saat ini** dan WAJIB diperbarui setiap
ada perubahan. Tanggal terakhir diperbarui: **2026-08-13**.

## Status Rilis (2026-08-13)

- Repo **PUBLIC**: `https://github.com/dennsoe/rs-omniclip`.
- **PR #6 merged** — merge commit `7626859` (mekanisme pembaruan gratis).
- **Release `v1.1.0` LIVE**: https://github.com/dennsoe/rs-omniclip/releases/tag/v1.1.0
  - Artefak: `RS-OmniClip-1.1.0-arm64.dmg` (95 MB) + `.zip` (92 MB), Apple Silicon.
  - Dibuat manual (CI terkunci billing — lihat "Hal yang Belum Dikerjakan").
  - API `releases/latest` mengembalikan `v1.1.0` (tombol "Periksa Update" di
    aplikasi kini berfungsi; saat versi aplikasi sudah sama → status terbaru).
  - **Artefak di-re-upload (2026-08-13)** dengan app yang di-sign ulang adhoc
    menyeluruh (`scripts/afterSign.js`) — memperbaiki bug Gatekeeper macOS
    "internal error in Code Signing subsystem" / "-10810" (lihat seksi
    "Perbaikan Gatekeeper macOS" di bawah).

## Perbaikan Gatekeeper macOS (2026-08-13)

- Gejala: app hasil download menampilkan "RS OmniClip is damaged and can't be
  opened". Akar: (1) atribut `com.apple.quarantine` dari unduhan browser +
  app tidak Developer-ID signed; (2) build tanpa signing membuat binary
  Electron Framework `linker-signed` + bundle tidak ter-seal → `spctl` =
  "internal error in Code Signing subsystem" → launch `-10810`.
- Fix di build: `scripts/afterSign.js` (hook electron-builder) menandatangani
  ulang SELURUH bundle secara adhoc dengan urutan dalam-ke-luar (dylib →
  framework → helper .app → app) + verifikasi. `codesign --deep` TIDAK cukup
  (tidak rekursif penuh).
- Fix pengguna: `xattr -cr "/Applications/RS OmniClip.app"` atau klik kanan →
  Open. Terverifikasi: app hasil build berjalan; app dalam DMG baru lolos
  `codesign --verify --deep --strict` (exit 0).

## Dukungan Multi-OS — macOS & Windows (2026-08-13)

- Target rilis: **macOS** (dmg + zip) dan **Windows** (NSIS installer `.exe`
  + portable `.exe`).
- `package.json` kini punya konfigurasi `build.win` (target `nsis` +
  `portable`, `artifactName` seragam dengan macOS) + skrip `npm run build:win`.
- `.github/workflows/release.yml` kini multi-OS: job `release-mac`
  (macos-latest) + job `release-windows` (windows-latest).
- `scripts/afterSign.js` di-guard `process.platform === 'darwin'` agar tidak
  memanggil `codesign` (tidak ada di Windows) dan build Windows tidak gagal.
- Engine dibuat lintas-OS:
  - `procmon.ts`: `ps` di macOS/Linux, PowerShell `Get-Process` di Windows
    (System Monitor tetap bekerja).
  - `downloader.ts`: binary `yt-dlp.exe` + URL rilis Windows + pencari `where`
    (bukan `which`); `chmod` dilewati di Windows.
  - `ffmpeg.ts`: fallback arsip `win-64` (+ ekstensi `.exe`) di Windows;
    jalur utama ffbinaries sudah lintas-OS.
  - `paths.ts`/`net.ts`: sudah memakai API lintas-OS (`app.getPath`, `https`).
- **Status artefak**: rilis v1.1.0 masih hanya macOS. File `.exe` Windows
  belum diproduksi — lihat "Hal yang Belum Dikerjakan".

## Ringkasan

RS OmniClip telah dimigrasi penuh dari ekspor Next.js ke arsitektur desktop
**Electron-Vite (React + TypeScript)** dengan backend Node.js (FFmpeg + yt-dlp).
Aplikasi berfungsi end-to-end dan telah di-push ke GitHub.

## Repositori

- Repo: `https://github.com/dennsoe/rs-omniclip`
- Branch: `main`
- Commit: `47d3720` (inisialisasi), `c7d9a6c` (dokumentasi), `6133f9e`
  (audit B1–B15), lalu **PR #1 merged** — merge commit `fe530b5`
  (perombakan preset/monitor/responsivitas + fix kunci retry yt-dlp).
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
| Pengunduh Universal (yt-dlp) | Selesai — multi-link batch + ambil daftar akun/halaman (scrape), pilihan checkbox, ringkasan akhir |
| Pemotong Inline (lossless) | Selesai & terverifikasi |
| Monitor System (CPU/RAM) | Selesai — pemakaian aplikasi nyata & realtime (`system:stats`, via `procmon` + `ps`, termasuk FFmpeg/yt-dlp) |
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
- **Preset dipindah ke halaman Pembersih Video** — kartu prasetel kini tampil di
  area utama (komponen `src/components/PresetSelector.tsx`), bukan di sidebar;
  pilihan aktif selalu terlihat (antrean kosong maupun terisi).
- **Sidebar di-redesain premium** — brand header (emblem gradien + subtitle),
  label "Menu", item navigasi dengan chip ikon + deskripsi (aktif = gradien biru
  + indikator). Padding atas `pt-12` + tombol menu mobile `left-20` agar tidak
  menabrak tombol minimize/max/close (traffic light macOS).
- **Bug klik membuka dialog file** (dropzone menangkap semua klik di halaman
  download/prasetel) diperbaiki dengan `noClick`/`noDrag` bersyarat.
- **Pengaturan tambahan yang tidak berfungsi** dihapus dari sidebar; Monitor
  System kini menampilkan **pemakaian CPU/RAM aplikasi ini** secara nyata &
  realtime (`procmon` + `ps`, termasuk proses pekerja FFmpeg/yt-dlp), bukan
  seluruh sistem.
- **Watermark dihapus** — build FFmpeg terpasang (evermeet 6.1) tidak
  mendukung filter `drawtext` (diverifikasi: "No such filter: 'drawtext'").
- **Responsivitas super**: `h-dvh`, sidebar scroll, `min-w-0`, ukuran responsif;
  jendela minimum 720x560, mobile drawer di bawah 768px.

## Perombakan Pengunduh Video (2026-08-13)

Halaman Pengunduh di-redesign total (single link → multi-link + scrape + toggle):

- **Toggle dua mode**: segmented control "Banyak Link" / "Akun / Halaman" di
  bagian atas; hanya satu mode tampil per waktu (state `downloaderMode`).
- **Unduh dari Banyak Link**: textarea satu URL per baris → badge jumlah link →
  tombol "Unduh Semua (N)". Engine `startDownloadBatch(urls)` memproses URL
  **berurutan** (progress per URL, `id` = URL) lalu `download:complete` berisi
  `{ total, success, failed }` untuk toast ringkasan (bukan toast per URL).
- **Ambil Video dari Akun / Halaman**: masukkan tautan akun (YouTube channel/@user,
  TikTok @user, Instagram, dll) → `scrapeAccount(url)` via
  `yt-dlp --flat-playlist --print "%(id)s\t%(title)s\t%(webpage_url)s"`
  (cepat, tanpa unduh) → daftar item dengan checkbox + "Pilih Semua" +
  "Unduh Terpilih (N)". Batas 500 item (`truncated: true`).
- **Channel IPC baru**: `scrape:start` / `scrape:complete`; `download:start`
  kini menerima `{ urls }`; `download:complete` untuk ringkasan akhir.
- **Layout & desain diseragamkan dengan Pembersih Video** (hasil audit
  inkonsistensi): model flex fixed-height (`flex-1 min-h-0`, area konten scroll
  internal), header kompak "Unduh Video" + badge status mode aktif, aksen warna
  seragam biru, tombol pill biru `bg-blue-600 ... shadow-blue-500/30 active:scale-95`,
  padding `px-4 sm:px-6 md:px-8 pt-16 md:pt-8`.
- **Redesign komponen premium (audit lanjutan)**: panel input TANPA header-bar
  label ("Unduh dari Banyak Link"/"Ambil Video dari Akun / Halaman" dihapus) —
  kini memakai pola empty-state Pembersih: ikon dalam kotak `p-4 bg-blue-50
  rounded-2xl` + judul + deskripsi. Toggle mode memakai **pill animasi**
  (`motion.span layoutId` — geser spring). Konten mode memakai `motion.div`
  ber-key (entrance fade/y/scale saat berganti — HANYA satu panel di DOM,
  tanpa kebocoran; `AnimatePresence mode="wait"` DIBUANG karena macet di motion
  12). Item hasil scrape beranimasi stagger + hover `bg-blue-50/50`. Error
  scrape memakai ikon `XCircle`.
- **Polishing desain (audit final)**: header panel dikompres (ikon `p-2`+
  judul `text-xs sm:text-sm`+deskripsi `text-[11px]`, panel `p-4`); input &
  tombol **distandardisasi** (input/textarea `px-3.5 py-2.5 bg-slate-50/900-60`;
  tombol primer `rounded-full px-5 py-2 font-semibold shadow-lg shadow-blue-500/30
  active:scale-95`); **sidebar nav** memakai **pill aktif geser**
  (`motion.span layoutId="nav-active-bg"`) + `whileTap` + konten halaman
  ber-entrance (`motion.div` ber-key cleaner/downloader-page, fade/y 0.3s);
  **PresetSelector** di-redesign — kartu aktif memakai **pill geser `layoutId="preset-active-bg"`** (`motion.span` gradien meluncur antar kartu, spring — konsisten dengan sidebar) + `layout` pada kartu + badge centang `Check` pop + `whileTap scale-0.97`.
- **Fallback web**: bila `window.api` tidak tersedia (tab browser), tampil pesan
  informatif — tidak lagi menggantung spinner.
- Verifikasi: typecheck + lint + build PASS; perintah `--flat-playlist`
  diverifikasi di terminal menghasilkan `id|judul|url`; toggle mode (pill
  bergeser, badge berubah, hanya 1 panel di DOM), badge multi-link, nav pill,
  animasi pilihan preset, dan fallback web diuji via browser.

## Mekanisme Pembaruan GRATIS (2026-08-13) — versi 1.1.0

Aplikasi kini punya **mekanisme pembaruan 100% gratis** (tanpa biaya apa pun):

- **Versi dinamis**: `package.json` naik ke **1.1.0**; versi lokal diambil dari
  `app.getVersion()` dan tampil di halaman **Tentang & Update** (kartu
  "RS OmniClip v1.1.0" pada bagian "Versi, Pembaruan & Resource").
- **Cek update aplikasi**: main process memanggil
  `GET https://api.github.com/repos/dennsoe/rs-omniclip/releases/latest`
  (repo publik, **tanpa token**) → `tag_name` dibandingkan dengan versi lokal
  (`compareVersions`). Bila lebih baru → badge "Update tersedia" + tombol
  "Unduh Versi Baru" aktif. Tombol "Periksa Update" selalu tersedia.
- **Strategi macOS = unduh manual (pilihan user)**: tombol "Unduh Versi Baru"
  membuka halaman rilis GitHub (`shell.openExternal`) → user mengunduh dmg/zip
  dan membukanya sendiri. Tidak butuh Developer ID/notarisasi ($99/thn) —
  sepenuhnya gratis.
- **Update resource (ffmpeg/yt-dlp) via manifest**: repo berisi
  `resources.json` (`ffmpeg` pin `6.1`, `yt-dlp` = `latest`). Aplikasi
  membandingkan versi terpasang (`bin/versions.json`, dideteksi via
  `ffmpeg -version` / `yt-dlp --version`) dengan manifest → kartu Resource
  Mesin menampilkan status per resource (hijau = terbaru, kuning = perlu
  update). Tombol "Perbarui Resource" menghapus binary lama, reset cache
  single-flight (`resetFfmpegCache`/`resetYtdlpCache`), lalu mengunduh ulang
  (FFmpeg 6.1 via ffbinaries → fallback; yt-dlp = rilis terbaru GitHub).
- **CI GitHub Actions**: `.github/workflows/release.yml` — saat push tag `v*`
  otomatis `npm ci` → typecheck → build → `electron-builder --mac --publish
  always` (unggah dmg + zip + `latest-mac.yml` ke GitHub Release).
- **Modul**: `electron/main/engine/updater.ts` (checkForUpdate,
  getResourceStatus, updateResources, recordInstalledVersions). Kontrak IPC
  baru: `update:check`, `update:open`, `resource:check`, `resource:update`,
  event `resource:status` (lihat `docs/IPC_CONTRACT.md`).
- **Update resource hanya menghapus binary target** (`removeBinariesFor`),
  bukan semuanya — resource yang masih baik tidak perlu diunduh ulang.
- **Verifikasi**: typecheck/lint/build PASS; pola fetch ke GitHub API diuji
  (yt-dlp latest = `2026.07.04` OK, repo belum rilis → 404 ditangani graceful);
  halaman Tentang & Update + menu sidebar bawah + alur Bersihkan diuji via browser.

## Perubahan UI (2026-08-13) — menu bawah & Bersihkan Daftar di halaman

- Menu **"Tentang & Update" DIPINDAH dari nav atas ke bagian bawah sidebar**
  (tepat di posisi lama "Bersihkan Daftar", dengan `border-t`). Nav atas kini
  hanya 2 item: Pembersih Video & Pengunduh Video.
- **"Bersihkan Daftar" DIHAPUS dari sidebar** → kini menjadi tombol
  **"Bersihkan" di header "Antrean Video"** pada halaman Pembersih Video
  (hanya tampil saat ada file & tidak sedang memproses; memicu modal
  konfirmasi "Hapus Semua?").
- **Versi "RS OmniClip v1.1.0" HANYA di halaman Tentang & Update** (kartu
  "Versi Aplikasi" pada bagian "Versi, Pembaruan & Resource") — footer
  sidebar yang menampilkan versi dihapus.

## Perbaikan Bug: exit AnimatePresence macet (motion 12 + StrictMode)

Audit forensik menemukan **bug nyata**: dengan `<React.StrictMode>` + motion 12,
`AnimatePresence` TIDAK pernah menyelesaikan animasi exit → elemen (modal,
queue, toast, panel) tertinggal permanen di DOM. Terbukti di alur "Bersihkan":
setelah konfirmasi, modal "Hapus Semua?" dan panel antrean tetap menumpuk.

**Fix**: SEMUA pemakaian `AnimatePresence` dikonversi ke pola aman
(keyed `motion.div` dengan `initial`/`animate`, TANPA `exit`):
- `App.tsx`: mobile overlay, ikon mode gelap, drag overlay, dan area
  empty-state/queue (`mode="popLayout"` dibuang).
- `ConfirmModal`, `PreviewModal` (kini `React.ReactElement | null`),
  `Toasts`, dan panel trim `SortableFileItem`.
- Efek: elemen unmount instan saat kondisi berubah (entrance tetap beranimasi),
  tidak ada lagi ghost element. Terverifikasi via browser (modal/queue/toast/
  panel potong/preview semua buka-tutup bersih).

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
8. **Batch unduh berurutan per URL** (tidak paralel) agar progress & rate-limit
   yt-dlp stabil; `id` progress = URL sehingga pencocokan antrean konsisten.
9. **Scrape akun memakai `--flat-playlist --print`** (daftar cepat tanpa unduh);
   item hasil memakai kolom `%(webpage_url)s` (tautan langsung video) sehingga
   langsung bisa dikirim ke `startDownloadBatch`.

## Hal yang Belum Dikerjakan

- Watermark: butuh build FFmpeg dengan filter `drawtext` (atau pendekatan overlay
  gambar logo) — dicatat di roadmap, fitur teks dihapus dari UI & mesin.
- Subtitle Otomatis (AI): transkripsi lokal (mis. Whisper) — di roadmap.
- **Auto-update in-app (electron-updater)**: belum dipasang. Strategi saat ini
  adalah unduh manual via halaman rilis (gratis). Bila ingin instalasi otomatis
  di masa depan, butuh Developer ID + notarisasi (berbayar ~$99/thn).
- Developer ID + notarisasi Apple (berbayar ~$99/thn) untuk distribusi mulus
  tanpa langkah `xattr -cr` / klik kanan → Open.
- **CI GitHub Actions tidak berjalan** (2026-08-13): akun GitHub terkunci
  billing ("account is locked due to a billing issue" — runner berbayar).
  Release `v1.1.0` dibuat MANUAL (build lokal `electron-builder --mac` →
  `gh release create`). Workflow `.github/workflows/release.yml` (job mac +
  windows) tetap tersedia dan akan aktif otomatis bila billing dibereskan.
- **Installer Windows (.exe) belum diproduksi**: konfigurasi & engine sudah
  siap, tapi menghasilkan file NSIS `.exe` butuh salah satu: (a) CI (billing
  dibuka), (b) `brew install wine` lalu `npm run build:win` di macOS, atau
  (c) jalankan `npm run build:win` di mesin Windows.
- **Belum diuji di Windows asli**: adaptasi engine Windows (procmon/downloader/
  ffmpeg) perlu smoke test di mesin/VM Windows sebelum rilis resmi Windows.
- Pengujian di Intel Mac.
- Scrape akun privat (TikTok/IG) yang butuh cookie/login — saat ini hanya akun
  publik; akun privat menampilkan pesan error informatif.
- Lihat [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) untuk detail.
