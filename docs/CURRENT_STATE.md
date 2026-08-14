# Kondisi Terkini — RS OmniClip

Dokumen ini mencerminkan **kondisi proyek saat ini** dan WAJIB diperbarui setiap
ada perubahan. Tanggal terakhir diperbarui: **2026-08-14**.

## Status Rilis v1.3.1 (2026-08-14) — Bugfix kritis FFmpeg arm64, LIVE

- **Release `v1.3.1` LIVE**:
  https://github.com/dennsoe/rs-omniclip/releases/tag/v1.3.1
  - macOS: `RS-OmniClip-1.3.1-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniClip-1.3.1-x64-setup.exe` (NSIS, 82 MB) +
    `RS-OmniClip-1.3.1-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
  - `latest-mac.yml` + `latest.yml` ikut diunggah. API `releases/latest` =
    `v1.3.1`.
- **PR #17** (`4d04c83`, fix FFmpeg arm64) + **PR #18** (`139b511`, bump 1.3.1) —
  merge commit.

## Fix FFmpeg di Apple Silicon — EBADARCH -86 (2026-08-14) — audit forensik

Laporan pengguna (perangkat baru): (1) pemrosesan video gagal `spawn Unknown
system error -86`; (2) FFmpeg tidak bisa diunduh/diperbarui (Terpasang: —).
Audit forensik menemukan akar masalah NYATA (bukan asumsi):

- **Akar**: ffbinaries 1.1.6 hanya menyediakan build FFmpeg macOS **x86_64**
  (`osx-64`); `detectPlatform()` selalu `osx-64` di Mac mana pun. Binary yang
  terpasang = `Mach-O x86_64` (diverifikasi `lipo -archs`). Di **Apple Silicon
  tanpa Rosetta**, spawn binary x86_64 → **errno -86 (EBADARCH)** =
  `spawn Unknown system error -86`. Mesin dengan Rosetta tidak terpengaruh
  (jalan via emulasi) → bug hanya muncul di perangkat baru tanpa Rosetta.
- **Gap kode**: `isExecutable()` hanya cek bit X_OK, TIDAK memverifikasi binary
  bisa dijalankan → binary arsitektur salah dianggap "terpasang".
- **Fix (`electron/main/engine/ffmpeg.ts`)**:
  - Provisioning **arch-aware**: Apple Silicon → unduh build **native arm64
    (FFmpeg 9.0)** dari osxexperts.net (`ffmpeg9arm.zip`/`ffprobe9arm.zip` —
    terverifikasi berjalan tanpa Rosetta, memuat semua filter preset:
    unsharp/afftdn/drawtext/scale + libx264/aac). Intel/Windows/Linux → jalur
    lama (ffbinaries → fallback) tidak berubah.
  - **Verifikasi binary benar-benar bisa dijalankan** (`readBinaryVersion` =
    spawn `-version`, bukan cek bit). Binary lama salah-arsitektur/korup dihapus
    lalu diunduh ulang. Gagal tetap → error jelas.
  - `expectedFfmpegVersion()` per-arsitektur (9.0 arm64 / 6.1 lainnya).
- **Fix (`electron/main/engine/updater.ts`)**: `getResourceStatus` memakai
  `expectedFfmpegVersion()` untuk ffmpeg di Apple Silicon agar status tidak
  salah "Perlu update".
- **Verifikasi nyata** (Electron+CDP, userData terisolasi, Apple Silicon):
  `checkResources` → ffmpeg `current=9.0 expected=9.0 outdated=false`; binary
  arm64 jalan native; `versions.json` = `{ffmpeg: "9.0", yt-dlp: "2026.07.04"}`;
  typecheck/lint/build PASS, get_errors bersih.
- **Catatan**: app v1.3.0 lama TIDAK bisa self-heal (kode lama tetap unduh x64);
  pengguna harus pasang v1.3.1. FFmpeg arm64 diunduh otomatis saat app pertama
  dibuka / Perbarui Resource.

## Status Rilis v1.3.0 (2026-08-14) — LIVE (macOS + Windows)

- **Release `v1.3.0` LIVE**:
  https://github.com/dennsoe/rs-omniclip/releases/tag/v1.3.0
  - macOS: `RS-OmniClip-1.3.0-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniClip-1.3.0-x64-setup.exe` (NSIS installer, 82 MB) +
    `RS-OmniClip-1.3.0-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
  - `latest-mac.yml` + `latest.yml` ikut diunggah.
  - API `releases/latest` kini mengembalikan `v1.3.0` → tombol "Periksa Update"
    di aplikasi menunjukkan update tersedia dari v1.2.0.
- **Isi rilis**: TikTok via TikWM (5 key failover), badge update sidebar,
  perbaikan pengunduh mendalam (0ae5df3), guard rejection.
- **PR yang digabung**: #13 (`4c8dcb7`, TikWM) → #14 (`99dd2b0`, badge) →
  #15 (`ba08bc53`, bump 1.3.0) — semuanya merge commit (bukan squash).
- Tag `v1.3.0` = `ba08bc53`. Dibuat manual lokal (CI billing terkunci).

## Badge Update di Sidebar "Tentang & Update" (2026-08-14) — otomatis & akurat

Laporan: ingin notif/badge update di menu sidebar saat ada pembaruan baru
(entah dari resource/yt-dlp atau versi aplikasi). Audit forensik sebelumnya:
- **Update resource (ffmpeg/yt-dlp) SUDAH auto-install** saat runtime (tombol
  "Perbarui Resource" → hapus + unduh ulang + deteksi versi, tanpa restart).
- **Update versi app TIDAK bisa auto-install** pada strategi gratis (tanpa
  Developer ID/notarisasi — electron-updater wajib signing). Tetap manual:
  tombol membuka halaman rilis GitHub (keputusan user: tidak ingin berbayar).
- Badge sidebar belum ada; data (app + resource) sudah di-cek saat mount.

Implementasi:
- **Sidebar badge** (`src/App.tsx`): badge angka (pill) di tombol "Tentang &
  Update" saat `updateBadgeCount > 0`, dengan `appHasUpdate =
  updateInfo?.hasUpdate` ATAU ada resource `outdated` (ffmpeg/yt-dlp). Warna
  **biru** bila ada update app, **amber** bila hanya resource. Saat tidak ada
  update, kembali ke dot aktif biasa.
- **Akurasi (anti badge palsu)**: state `resourcesReady` baru. Cek resource
  saat mount TIDAK mengaktifkan badge (versions.json masih kosong saat boot
  yt-dlp ~11 dtk). Badge resource hanya aktif dari:
  1. **Push main `resource:changed`** (`electron/main/index.ts`): setelah
     `recordInstalledVersions()` selesai, main mengirim `ResourceInfo[]` segar
     ke renderer (kanal baru, kontrak di preload `onResourceChanged` +
     `src/types/global.d.ts`).
  2. Tombol manual "Periksa Resource" / auto re-check berkala.
- **Auto re-check berkala**: interval 30 menit + saat window focus — menangkap
  rilis/resource baru tanpa membuka ulang app (jauh di bawah rate limit
  GitHub API 60/jam).
- **Fix minor**: fallback versi `'1.1.0'` hardcoded dihapus → memakai
  `updateInfo?.current` dinamis (mencegah tampilan versi salah saat app sudah
  1.2.0).
- **Verifikasi**: typecheck (node+web)/lint/build PASS, `get_errors` bersih,
  renderer di dev (5173) tampil normal. Catatan: perubahan `electron/main/**`
  & preload butuh restart dev agar `resource:changed` aktif (dev tidak
  hot-reload main).
- File berubah: `src/App.tsx`, `electron/main/index.ts`,
  `electron/preload/index.ts`, `src/types/global.d.ts` + docs
  (`docs/IPC_CONTRACT.md` kanal `resource:changed`).

## Solusi TikTok via API TikWM — multi-key failover (2026-08-14)

TikTok kini **BERFUNGSI** (sebelumnya rusak total di level yt-dlp — lihat
"Audit Forensik TikTok" di bawah). Solusi: integrasi **API TikWM**
(`https://www.tikwm.com/api`) dengan **5 api_key** milik user, disimpan di
codebase (tanpa UI tambah key), failover berurutan otomatis.

- **Akar**: bot-detection baru TikTok (Agustus 2026) memutus SEMUA pengunduh
  berbasis yt-dlp (issue yt-dlp #17403); workaround UA/cookies/mobile API gagal.
  TikWM memakai emulasi perangkat mobile di sisi server sehingga tetap bisa
  mengunduh.
- **Implementasi** — `electron/main/engine/tiktok.ts` (modul baru, murni
  Node builtins, tanpa dependensi Electron):
  1. `TIKWM_PROVIDERS` — array 5 provider `{ id: 'k1'..'k5', baseUrl, apiKey }`
     (5 key user, hardcoded di codebase; tanpa UI tambah key).
  2. `isTikTokUrl(url)` — deteksi host `tiktok.com` / `tiktokv.com`
     (termasuk `vt.`/`vm.` short-link).
  3. `resolveTikTokInfo(url)` — failover berurutan k1→k5; sukses bila
     `code === 0` dan `data.play` ada; gagal → lanjut provider berikutnya;
     semua gagal → Error jelas.
  4. `downloadTikTokVideo(url, destDir, onProgress)` — resolve + unduh
     `data.play` via **GET dengan header browser** (User-Agent Chrome +
     `Referer: https://www.tiktok.com/`; HEAD dari CDN = 503, GET = MP4 valid),
     progress byte 0→100, redirect ditangani, nama file `[judul] [id].mp4`
     (sanitasi lintas-OS + dedupe ` (2)`), metadata (title/thumbnail/sizeBytes)
     di-return untuk event sukses.
- **Integrasi** — `electron/main/engine/downloader.ts`: `downloadSingle` kini
  punya **Lapisan 0 — TikTok via TikWM** di depan lapisan yt-dlp (retry →
  Chrome UA → self-heal). `isTikTokUrl(url)` true → coba TikWM dulu; sukses →
  event `success` dengan metadata (`description: "TikTok · via TikWM"`); gagal
  → jatuh ke jalur yt-dlp seperti biasa. Platform lain tidak berubah.
- **Catatan audit**: parameter `api_key` diterima endpoint TikWM namun saat ini
  **tidak di-enforce** (key invalid pun `code:0`). Failover tetap diterapkan
  atas dasar kegagalan nyata (HTTP error / `code != 0` / `play` kosong / unduhan
  CDN gagal). Semua 5 key terverifikasi berfungsi.
- **Verifikasi E2E (Electron + CDP, build produksi)**:
  - TikTok URL 1 (`vt.tiktok.com/ZS4c1gE2r/`) → `success` 100%, judul/thumbnail/
    filePath/sizeBytes 7.643.096 B, `description "TikTok · via TikWM"`,
    `complete {total:1, success:1, failed:0}`; MP4 tersimpan di
    `~/Downloads/RS-OmniClip/Unduhan/`.
  - TikTok URL 2 (`vt.tiktok.com/ZS4c1gxy2/`) → sukses 5.133.237 B (via UI app).
  - **Failover**: unit-test 4 provider pertama dimatikan (baseUrl invalid) →
    resolve jatuh ke provider k5 & sukses.
  - **Regresi YouTube** (`jNQXAC9IVRw`) → tetap `success` (jalur yt-dlp utuh).
- typecheck/lint/build PASS, `get_errors` bersih.
- File berubah: `electron/main/engine/tiktok.ts` (baru), `electron/main/engine/
  downloader.ts` (Lapisan 0 TikWM), `electron/main/index.ts` (guard `.catch`
  pada `startDownloadBatch` — mencegah unhandled rejection di main).

## Fix "Perbarui Resource yt-dlp tidak terupdate" (2026-08-14) — deteksi versi

Laporan: panel "Tentang & Update" selalu menampilkan `yt-dlp Terpasang: — ·
Perlu update` walau sudah diklik "Perbarui Resource" / yt-dlp sudah versi terbaru.

- **Akar masalah**: `detectVersion()` di `electron/main/engine/updater.ts`
  memakai **`execFile` dengan timeout 10 detik**. Binary yt-dlp macOS adalah
  PyInstaller "onefile" yang **boot ~11 detik** untuk `--version` (self-extract
  tiap run; diverifikasi: spawn exit 0 = `2026.07.04` dalam ~11,2 detik, execFile
  10 s selalu timeout). Akibatnya `recordInstalledVersions()` selalu menulis
  `"yt-dlp": null` ke `bin/versions.json` → `getResourceStatus` menganggap yt-dlp
  "belum terpasang" (outdated) → badge "Perlu update" abadi, tombol Perbarui
  tidak pernah "berhasil".
- **Perbaikan** (`updater.ts`): `detectVersion` ditulis ulang memakai **`spawn`**
  (kompatibel dengan binary PyInstaller), timeout **60 detik**, menangkap
  stdout+stderr (fallback ke stderr bila exit != 0). `execFile` dihapus dari
  import.
- **Verifikasi**: `versions.json` kini berisi `{ "ffmpeg": "6.1-tessus",
  "yt-dlp": "2026.07.04" }`; UI panel Resource via CDP menampilkan
  `yt-dlp — Terpasang: 2026.07.04 · Diharapkan: 2026.07.04` (hijau, tanpa badge
  "Perlu update"). typecheck/lint/build PASS, get_errors bersih.
- **Catatan**: "TERBARU: —" pada panel versi = GitHub API lambat/rate-limit
  sesaat (graceful degradation, bisa dicoba ulang via tombol Periksa Update);
  bukan bug kode. Kecepatan boot yt-dlp ~11 dtk bersifat inheren pada binary
  macOS (PyInstaller onefile) — timeout deteksi kini 60 dtk menanganinya.

## Audit Forensik TikTok (2026-08-14) — bot-detection global + self-heal yt-dlp

Laporan: "semua video TikTok gagal; kemarin bisa tanpa cookie". Audit menyeluruh:

- **Akar (upstream)**: TikTok meluncurkan **bot-detection baru (11–12 Agustus
  2026)** yang merusak extractor TikTok yt-dlp di SELURUH dunia — isu terbuka
  yt-dlp #17403 (27 komentar, AS/Eropa/Brasil; "was still working 2 days ago").
  Error `Unexpected response from webpage request` terjadi karena TikTok kini
  menyajikan halaman challenge baru yang tidak dikenali extractor
  (`_extract_web_data_and_status` → `_solve_challenge_and_set_cookies`).
  **Terbukti bukan bug app**: versi resmi 2026.07.04 (latest) DAN nightly
  2026.08.04 sama-sama gagal; workaround `--user-agent` Chrome, `--impersonate
  chrome`, mobile API `app_info`, cookies browser, URL kanonik/tiktokv/share —
  SEMUA gagal dari jaringan ini. Tidak ada perbaikan yt-dlp yang tersedia saat
  ini; begitu rilis, app akan auto-sembuh.
- **Akar (bug APP — wajib diperbaiki)**: folder binary app
  (`~/Library/Application Support/rs-omniclip/bin/`) KOSONG → `ensureYtdlp`
  lama **diam-diam jatuh ke yt-dlp SISTEM `2025.06.25`** (setahun lebih tua,
  tidak sanggup menangani TikTok/Facebook modern). Ini bug nyata yang
  memengaruhi SEMUA platform, bukan hanya TikTok.
- **Perbaikan (downloader.ts)**:
  1. **Urutan provisioning diubah**: lokal → **unduh rilis terbaru dari
     GitHub** → yt-dlp sistem HANYA sebagai cadangan terakhir (bila jaringan
     gagal). App tidak lagi memakai yt-dlp sistem yang bisa saja lawas.
  2. **Self-heal otomatis**: saat error extractor/situs (`EXTRACTOR_ISSUE_RE`:
     "report this issue on github", "Confirm you are on the latest version",
     "Cannot parse data", "Unexpected response", dll), download dijalankan
     berjenjang: (a) retry transien biasa (backoff), (b) **workaround dengan
     Chrome user-agent** (`CHROME_USER_AGENT`), (c) **`ensureLatestYtdlp()`**
     — hapus binary lama, unduh rilis terbaru, retry sekali per sesi. Bila
     yt-dlp menerbitkan perbaikan TikTok, unduhan pulih otomatis tanpa campur
     tangan pengguna.
  3. **Pesan error akurat**: bukan lagi "kegagalan extractor... aktifkan
     cookies" yang menyesatkan, melainkan "Platform (TikTok/Facebook)
     memperketat proteksi anti-bot; ini memengaruhi semua pengunduh. Sudah
     dicoba ulang otomatis dengan user-agent browser & yt-dlp terbaru. Bila
     masih gagal, coba lagi nanti (perbaikan yt-dlp), atau aktifkan Cookies
     Browser sebagai alternatif."
- **Verifikasi E2E (Electron + CDP)**: TikTok → 5 percobaan (retry + workaround
  + self-heal), fase `retrying`, error baru tampil; **YouTube tetap sukses**
  (metadata lengkap) — tidak ada regresi. Provisioning: binDir terisi ulang
  yt-dlp **2026.07.04** (latest) saat app start.
- **Catatan jujur**: karena TikTok rusak di level yt-dlp GLOBAL, jalur yt-dlp
  untuk TikTok masih bisa gagal — TETAPI app kini punya **jalur utama TikTok via
  API TikWM (5 key, failover otomatis)** yang sudah terverifikasi berfungsi
  (lihat seksi "Solusi TikTok via API TikWM" di atas). yt-dlp tetap di-update &
  auto-sembuh sebagai cadangan.

## Perbaikan Mendalam Pengunduh (2026-08-14) — progress realtime, metadata, retry

Menindaklanjuti 7 bug laporan pengguna (TikTok semua gagal, Facebook error,
download lambat, progress tidak realtime, tanpa estimasi waktu, tanpa
thumbnail/judul/deskripsi setelah selesai, UI jelek). Akar masalah & perbaikan:

- **TikTok semua gagal & Facebook error**: yt-dlp memblokir permintaan anonim
  (TikTok: "Unexpected response from webpage request"; Facebook: "Cannot parse
  data" intermiten). Fix: (1) **retry otomatis** — pola error transien
  (`Cannot parse data`, `Unexpected response`, `HTTP Error [45]xx`,
  `Sign in to confirm`, dll) DAN belum ada unduhan → ulang hingga 2× dengan
  jeda mundur, fase `retrying` di UI; (2) **Cookies Browser** (
  `--cookies-from-browser`) untuk TikTok/Facebook/Instagram; (3) pesan error
  ramah + saran.
- **Download lambat**: kualitas default "Terbaik" memilih format sangat besar
  (diverifikasi 229 MB). Fix: opsi **Kualitas** (Terbaik/2160/1440/1080/720/480/
  360) via `-f bv*[height<=H]+ba/b[height<=H]` + cookies untuk throttle.
- **Progress tidak realtime**: parser lama hanya ambil match pertama per potongan
  (~20 baris/detik burst) → tersendat. Fix: stdout **di-buffer per baris**
  (`--newline`), tiap baris `[download] NN% of X at Y/s ETA MM:SS` diurai penuh,
  dikirim dengan **throttle 300 ms** (koalesen lalu flush).
- **Tanpa estimasi waktu**: kini `speedBytesPerSec`, `etaSeconds`, `sizeBytes`
  diurai & ditampilkan (kecepatan, ETA "X mnt Y dtk", ukuran).
- **Tanpa thumbnail/judul/deskripsi**: ditangkap via `--print after_move` sebagai
  **satu objek JSON** (`__RSMETA__{"title":%(title)j,...}`) — setiap field
  JSON-encoded (aman dari newline/tab/emoji; `\t` literal TIDAK dipakai sebagai
  pemisah). Disertakan pada event sukses; renderer menampilkan thumbnail (`img`
  remote — CSP `img-src ... https: http:`), judul, deskripsi (line-clamp-2), dan
  tombol **"Buka folder"** (`showItemInFolder` → `folder:reveal`).
- **UI kartu antrean di-redesign**: header "X selesai · Y gagal", thumbnail atau
  placeholder ikon, judul, URL subtitle, deskripsi, bar progress + persen +
  kecepatan + ETA + ukuran + label fase (Menggabungkan…/Mencoba ulang…), badge
  status, tombol "Buka folder".
- **Verifikasi end-to-end (produksi)**: typecheck/lint/build PASS, `get_errors`
  bersih. Unduhan nyata via Electron (CDP): YouTube → `success:1`, metadata
  lengkap (judul, thumbnail `maxresdefault` termuat 1280x720, deskripsi 1000
  char, filePath `.webm`), kartu antrean menampilkan judul/deskripsi/badge
  "Selesai"/tombol "Buka folder". Argumen `--print after_move` JSON + parser
  baris progress diverifikasi langsung di terminal (download nyata).
- File berubah: `electron/main/engine/downloader.ts`, `electron/main/index.ts`
  (IPC `folder:reveal`), `electron/preload/index.ts`, `src/lib/types.ts`,
  `src/types/global.d.ts`, `src/App.tsx`, `src/index.html` (CSP img-src).

## Status Rilis v1.2.0 (2026-08-13) — MULTI-OS

- **Release `v1.2.0` LIVE** (macOS + Windows):
  https://github.com/dennsoe/rs-omniclip/releases/tag/v1.2.0
  - macOS: `RS-OmniClip-1.2.0-arm64.dmg` (94 MB) + `.zip` (91 MB).
  - Windows: `RS-OmniClip-1.2.0-x64-setup.exe` (NSIS installer, 79 MB) +
    `RS-OmniClip-1.2.0-x64-portable.exe` (portable, 79 MB) + `latest.yml`.
  - API `releases/latest` kini mengembalikan `v1.2.0` → tombol "Periksa Update"
    di aplikasi menunjukkan update tersedia dari v1.1.0.
  - Dibuat manual lokal (CI terkunci billing): build macOS + Windows dari mesin
    dev (wine terpasang), lalu `gh release create` + unggah artefak.
- **PR #9 merged** `df1e5dc` (dukungan multi-OS Windows) & **PR #10 merged**
  `4406dfa` (fix build Windows: afterSign target-guard + `--x64` + nama artefak).

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
- `package.json`: `build.win` (target `nsis` + `portable`), `nsis.artifactName`
  `...-setup.${ext}`, `portable.artifactName` `...-portable.${ext}` (nama
  terpisah agar tidak bentrok) + skrip `npm run build:win` (pakai `--x64`).
- `.github/workflows/release.yml` kini multi-OS: job `release-mac`
  (macos-latest) + job `release-windows` (windows-latest).
- `scripts/afterSign.js` di-guard `context.electronPlatformName !== 'darwin'`
  (cek platform TARGET, bukan host) — build Windows dari macOS tidak memanggil
  `codesign` dan tidak gagal mencari `.app`.
- Engine dibuat lintas-OS:
  - `procmon.ts`: `ps` di macOS/Linux, PowerShell `Get-Process` di Windows
    (System Monitor tetap bekerja).
  - `downloader.ts`: binary `yt-dlp.exe` + URL rilis Windows + pencari `where`
    (bukan `which`); `chmod` dilewati di Windows.
  - `ffmpeg.ts`: fallback arsip `win-64` (+ ekstensi `.exe`) di Windows;
    jalur utama ffbinaries sudah lintas-OS.
  - `paths.ts`/`net.ts`: sudah memakai API lintas-OS (`app.getPath`, `https`).
- **Windows artifact DIPRODUKSI & DIUNGGAH (2026-08-13)**: `npm run build:win`
  (`--x64`) → `dist/RS-OmniClip-1.2.0-x64-setup.exe` (NSIS) +
  `...-portable.exe` (portable) + `latest.yml`. Tervalidasi `file`: PE32
  Nullsoft Installer. Sudah diunggah ke release **v1.2.0**.

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
| Pengunduh Universal (yt-dlp) | Selesai — multi-link batch + ambil daftar akun/halaman (scrape), kualitas/cookies/paralel, progress realtime + ETA + metadata video, retry otomatis, tombol buka folder |
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

## Perbaikan Pengunduh (2026-08-14) — kualitas, cookies, paralel, error jelas

Menindaklanjuti audit download lambat + error Facebook:
- **Error Facebook "Cannot parse data"**: yt-dlp terpasang sudah terbaru
  (2026.07.04) — bug extractor upstream yang intermiten (bukan karena yt-dlp
  usang, bukan bug app). App kini menampilkan pesan error yang lebih jelas +
  saran (coba lagi, cookies browser, perbarui resource).
- **Kualitas/Batas Resolusi** (UI "Pengaturan Unduhan" → `-f
  bv*[height<=H]+ba/b[height<=H]`): Terbaik / 2160p / 1440p / 1080p / 720p /
  480p / 360p — mempercepat unduhan & mengecilkan file.
- **Cookies Browser** (UI → `--cookies-from-browser`): Chrome / Edge / Safari /
  Firefox / Brave — menghindari throttle Facebook/Instagram pada unduhan anonim.
- **Unduh Paralel** (opsional, maks 2 sekaligus): checkbox "Unduh 2 sekaligus"
  (default berurutan agar stabil).
- Kontrak: `startDownloadBatch(urls, options?)` → `download:start` payload
  `{ urls, options }`. Verifikasi: typecheck/lint/build PASS, get_errors
  kosong, UI Pengaturan Unduhan tampil & berfungsi di browser.

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
- **Artefak Windows sudah diproduksi & DIUNGGAH ke release v1.2.0** (wine
  terpasang 2026-08-13, `npm run build:win --x64` → setup + portable .exe,
  tervalidasi PE32). Rilis v1.1.0 tetap hanya macOS (historis).
- **Belum diuji di Windows asli**: engine Windows (procmon/downloader/ffmpeg)
  perlu smoke test di mesin/VM Windows sebelum rilis resmi Windows.
- Pengujian di Intel Mac.
- Scrape akun privat (TikTok/IG) yang butuh cookie/login — saat ini hanya akun
  publik; akun privat menampilkan pesan error informatif.
- Lihat [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) untuk detail.
