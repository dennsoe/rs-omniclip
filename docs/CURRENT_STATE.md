# Kondisi Terkini — RS OmniTools

Dokumen ini mencerminkan **kondisi proyek saat ini** dan WAJIB diperbarui setiap
ada perubahan. Tanggal terakhir diperbarui: **2026-08-17**.

## Status Rilis v2.1.1 (SELESAI — RELEASE v2.1.1 DIPUBLIKASI via CI)

- **Branch**: `release/v2.1.1` (dari `main`). **Versi**: `2.1.1`.
- **PR #38** (`feat/douyin-cookie-ux`) ke `main` **MERGED** (merge commit
  `3859447`, 2026-08-17). **PR #39** (release) ke `main` **MERGED** (merge
  commit `1f9a204`, 2026-08-17).
- **Tag**: `v2.1.1` dibuat di commit merge `1f9a204` + dipush.
- **GitHub Release v2.1.1 DIBUAT OTOMATIS oleh CI** (billing GitHub Actions
  sudah aktif kembali — berbeda dgn v2.0.0/v2.1.0 yang terkunci) — workflow
  **"Release Multi-OS v2.1.1"** (push tag `v*`) build macOS + Windows, publish
  via electron-builder, lalu release **di-publish** (draft=false) dengan judul
  & catatan rilis lengkap. **Latest**.
  - Artefak: `RS-OmniTools-2.1.1-arm64.dmg`, `RS-OmniTools-2.1.1-arm64.zip`,
    `RS-OmniTools-2.1.1-x64-setup.exe`, `RS-OmniTools-2.1.1-x64-portable.exe`
    (+ blockmap, latest.yml, latest-mac.yml).
  - URL: https://github.com/dennsoe/rs-omnitools/releases/tag/v2.1.1
- **Release notes**: `release-notes/RELEASE_NOTES_v2.1.1.md` (bagian "Body
  release" dipakai sebagai notes GitHub).
- Isi v2.1.1: ekstensi browser Cookie Capturer (ambil cookie Douyin/TikTok
  otomatis, satu branding) + badge platform berwarna brand di seluruh halaman
  Pengunduh + info unduhan lengkap (platform/durasi/akun) + preview dari
  thumbnail + info engagement di hasil scrape.

## Perubahan Terbaru (2026-08-17 — SYSTEM MONITOR DIPERBAIKI: CPU NORMALISASI PER CORE + EMA + DATA BARU)

**Audit forensik**: metrik CPU lama MENJUMLAHKAN kerja lintas semua core tanpa
dibagi jumlah core (mesin 12 core) lalu dijepit 100 → tampil "100%" saat app
baru memakai sebagian core (menyesatkan); tanpa smoothing → angka meloncat liar
antar sampel (0↔100).

**Perbaikan** (`electron/main/index.ts`):
- `LOGICAL_CORES = os.cpus().length` — CPU **dinormalisasi** ÷ jumlah core:
  100% = seluruh kapasitas mesin terpakai (FFmpeg 6 core = 50%, bukan 100%).
- **EMA smoothing** (`CPU_EMA_ALPHA = 0.3`) — nilai halus, tidak meloncat.
- Payload `system:stats` kini memuat **`workers`** = jumlah pekerja aktif
  (FFmpeg/yt-dlp).

**UI** (`src/components/SystemMonitor.tsx`):
- **RAM %** + tampilan "terpakai / total GB".
- **Badge "Memproses ×N"** (amber, spinner) saat FFmpeg/yt-dlp aktif — lonjakan
  CPU jadi jelas sumbernya.
- **Sparkline CPU** (riwayat 24 sampel, SVG) — tren terbaca, bukan nilai sesaat.
- Ikon lucide profesional (Cpu/MemoryStick/Loader2).

**Redesain UI (2026-08-17, perbaikan "berantakan")** — layout bersih, konsisten,
super responsif, realtime & interaktif:
- Blok metrik seragam (`MetricBlock`): label kiri (icon+teks truncate), nilai
  kanan (tabular-nums anti-jitter), bar tipis, sparkline — semua sejajar.
- **Warna ambang batas** diterapkan pada NILAI + BAR + GRAFIK (sparkline):
  CPU >50% amber / >80% rose; RAM >60% amber / >85% rose; Disk >75% amber /
  >90% rose.
- **Disk** ringkas: "Dipakai/Total GB + %" (bar = % terpakai); rincian bebas
  tersedia di tooltip (teks layar diminimalkan).
- **Jaringan** bersih: "↓ unduh · ↑ unggah" (panah SEBELUM nilai, urutan jelas).
- **Interaktif**: hover highlight tiap baris + `title` tooltip (detail per metrik).
- **Teks berlebih dihapus**: subtitle "Pemakaian Aplikasi & Sistem" & baris
  "Unduh (App)" dihilangkan (Jaringan sudah menampilkan unduh/unggah sistem).
- Header: ikon Activity dalam kotak rounded (selaras dgn gaya nav).

**Redesain kompak + animasi (2026-08-17, lanjutan)** — hemat ruang & lebih hidup:
- **Grid 2 kolom** (CPU|RAM · Disk|Jaringan) → tinggi widget jauh berkurang;
  Disk `col-span-2` saat jaringan idle (layout tetap seimbang).
- Sel metrik kompak (`MetricCell`): label uppercase kecil + nilai besar + bar
  tipis + sub "GB" + sparkline mini — semua dalam satu kartu.
- **Animasi realtime (framer-motion)**:
  - Nilai **pop** (spring scale) setiap kali data berubah.
  - Bar **spring** (pertumbuhan halus mengikuti %).
  - **Dot "live"** berdenyut (animate-ping) di header + teks "live".
  - **Titik live di sparkline** berdenyut (SVG animate) — menandakan realtime.
  - **Hover lift** kartu (+ translate + shadow).
  - **Danger**: saat diambang batas, nilai `animate-pulse` + bar glow merah
    (CPU>80, RAM>85, Disk>90).
- Teks semakin diminimalkan: nilai = "%" besar, detail "GB" di sub kecil.

**Efek & animasi grafik/jaringan (2026-08-17, lanjutan)**:
- **Grafik HALUS (tidak patah)**: morph line via CSS `transition: d 0.7s` pada
  `<path>` (didukung penuh Chromium/Electron). CATATAN audit: animasi atribut
  `points`/`d` via framer-motion MENGHASILKAN error "undefined" → dipakai CSS
  native (robust).
- **Efek ujung grafik**: ring ekspansi (radar ping, 2 ring) + titik inti
  menyala (glow drop-shadow) — SVG `<animate>` native.
- **Jaringan — baris full-width sederhana & jelas** (bukan bar vertikal): label
  kiri + **↓ unduh (sky) · ↑ unggah (violet)** — warna & icon mengikuti
  ↓/↑ (`DownloadCloud`/`UploadCloud`), teks tabular-nums, pop animasi saat data
  berubah. CATATAN audit: versi "meter analog" (bar vertikal h-9 + teks 8px)
  dianggap jelek/tidak responsif → dikembalikan ke baris tunggal yang jelas.
  **Audit lanjutan (2026-08-17)**: baris jaringan TIDAK punya `col-span-2`
  sehingga render setengah lebar (kolom 2 kosong) → label+kecepatan berjejal &
  icon Network bentrok dengan Download/UploadCloud → **FIX**: `col-span-2`
  (sejajar Disk), hapus icon `Network` dari label (cukup icon ↓/↑).
  **FIX lanjutan (2026-08-17)**: label teks "Jaringan" DIHAPUS total (keputusan
  user — tanpa teks/icon label) → baris jaringan hanya berisi `↓ unduh (sky) ·
  ↑ unggah (violet)` rata kanan; tooltip title jadi "Unduh X · Unggah Y" (tanpa
  kata "Jaringan"); kata "Jaringan" hanya tersisa di komentar kode.
- **Grafik Disk DIHAPUS (2026-08-17)**: nilai Disk hampir statis (tidak
  berubah real-time) → sparkline cuma noise visual. `spark` di `MetricCell`
  kini opsional (`spark?: number[]`); state `diskHistory` & `setDiskHistory`
  dibuang. Grafik tetap ada untuk CPU & RAM (dinamis).
- **Lebar kontainer dimaksimalkan (2026-08-17, audit "space kiri kanan
  kosong")**: dulu container `mx-4` (16px margin tiap sisi) + `p-3` (12px
  padding) → grid cuma 201px di sidebar 260px (~29px ruang kosong tiap sisi,
  semua bagian tampak kecil). FIX: `mx-2` (8px) + `p-2` (8px) → box 243px &
  grid 225px (93.5% lebar sidebar); sel CPU/RAM 97px → 109px; Disk/Jaringan
  full width ikut lebih lebar. Verifikasi ukur DOM: sidebar 260 → box 243 →
  grid 225.
- **Animasi jaringan HALUS + icon STATIS (2026-08-17, audit "kasar & patah")**:
  versi lama memakai `key={formatSpeed(...)}` pada `motion.span` → tiap sampel
  baru (1,5 dtk) React UNMOUNT+REMOUNT seluruh elemen (icon+teks) & replay
  pop → tampak kasar/patah, icon berkedip. FIX: komponen `SpeedPill` — icon di
  LUAR elemen berubah (chip `motion.span` berdenyut halus scale 1→1.12→1 +
  opacity glow via `useAnimationControls`, tanpa remount), ANGKA digerakkan
  spring (`useSpring` stiffness 110/damping 24) → rolling number meluncur mulus
  antar nilai. Dua pill: Unduh (sky, `DownloadCloud`) · Unggah (violet,
  `UploadCloud`), rata kanan, full-width col-span-2, truncate responsif.
  Verifikasi: 2 pill title "Unduh 87.9 KB/s"/"Unggah 63.5 KB/s", row 225px,
  0 console error, typecheck/lint/build/get_errors PASS.

**Verifikasi**: typecheck/lint/build/get_errors PASS; bundle memuat
`MetricCell`/`grid-cols-2`/`animate-ping`/`animate-pulse`/glow ambang; preview
browser layout kompak terverifikasi; jendela Electron aktif dgn data realtime.
Audit: 0 console error setelah module bersih (error `points`/`d` framer-motion
teratasi pakai CSS transition + SVG native).

**Perbaikan kecil (2026-08-17)**: sub "GB" di baris RAM dihapus (nilai hanya %;
detail GB tetap di tooltip). **CATATAN realtime**: preview browser (localhost:5173)
tanpa `window.api` → tanpa data → grafik tampak statis (bukan bug). Dibuktikan:
injeksi mock realtime → CPU animasi & grafik bergerak. Di app Electron asli data
realtime 1,5 dtk (CPU datar saat idle = data nyata).

**Perluasan data nyata (2026-08-17, lanjutan)** — semua dari OS/downloader,
BUKAN dummy:
- **Ruang Disk** — bar = **% TERPAKAI** (konsisten dgn CPU/RAM), label eksplisit
  "**Dipakai X / Y GB (Z%) · bebas W GB**" sehingga total vs kosong jelas.
  Data: `fs.promises.statfs()` pada folder output (`getOutputBaseDir`, fallback
  home). (Catatan: versi lama bar = % bebas & label ambigu → diperbaiki.)
- **Jaringan** (sistem) — kecepatan **↓ unduh & ↑ unggah** nyata dari akumulator
  OS: macOS `netstat -ib`, Linux `/proc/net/dev`, Windows `netstat -e` (delta
  antar sampel).
- **Kecepatan Unduh (App)** — agregat `speedBytesPerSec` dari downloader
  (Map per URL, dihapus saat selesai).
- **Sparkline RAM app** (riwayat 24 sampel) — pola sama dengan sparkline CPU.
- **RAM Sistem DIHAPUS** (2026-08-17, keputusan user: tidak diperlukan) — baris
  UI, payload (`ramSysUsedMb/TotalMb`), helper `computeSysMem`/`readMacVmStat`
  (vm_stat) dihapus total dari kode & kontrak.
- Payload `system:stats` final: `cpu`, `ramUsedMb`, `ramTotalMb`, `workers`,
  `diskFreeMb`, `diskTotalMb`, `downloadSpeedBps`, `netRxBps`, `netTxBps`
  (kontrak preload + global.d.ts + IPC doc sinkron).
- **CATATAN dev**: perubahan `electron/main/index.ts` di electron-vite dev TIDAK
  me-restart main process otomatis (HMR hanya renderer) → perlu restart dev
  server agar data baru termuat. Di build produksi tidak terjadi.

**Verifikasi**: simulasi 12 core — OLD: FFmpeg 6 core→100%, UI aktif→100%,
idle→30%; NEW: 50%/10%/3%, 10 core penuh→83% (100% HANYA bila 12 core penuh);
EMA: spike 100→naik 3→turun 0 (halus). typecheck/lint/build/get_errors PASS.
Bundle main memuat `LOGICAL_CORES`/`CPU_EMA_ALPHA`/`smoothedCpu`/`workers`/
`statfs`/`downloadSpeeds`/`readNetworkBytes` (tanpa sisa ramSys/vm_stat).
Verifikasi data OS nyata: disk 86,1/460,4 GB bebas, jaringan 0.08↓/0.06↑ MB/s.

## Perubahan Terbaru (2026-08-17 — FITUR FRAMERATE DI PEMBERSIH VIDEO: 60/30/24 FPS)

**Fitur baru**: dropdown **Framerate** di halaman Pembersih Video (panel
pengaturan, grid 4 kolom di layar lebar). Opsi: **Pertahankan Asli** (default)
/ **60 FPS** / **30 FPS** / **24 FPS** — konversi naik/turun otomatis,
terverifikasi empiris.

**Cara kerja** (`electron/main/engine/`):
- `ffmpeg.ts` `probe()` kini membaca **`frameRate`** (parse `avg_frame_rate`
  ffprobe, dibulatkan 2 desimal; 0 bila tidak diketahui) — prasyarat engine
  tahu FPS sumber.
- `processor.ts` `buildFpsFilter()`: `source` atau target==sumber → tanpa
  konversi. **Naikkan FPS** (mis. 30→60): mode **enhance** + preset BUKAN `uhd`
  → `minterpolate=fps=60:mi_mode=mci` (interpolasi gerak halus); selainnya
  (privacy / uhd 4K / menurunkan) → `fps=60` (duplikasi/buang frame, cepat).
- Konversi FPS memaksa re-encode: jalur `-c copy` pada privacy+archive
  dilewati. Preset `metadata` (remux lossless) tidak menerapkan konversi.
- UI (`App.tsx`): state `cleanerFps` persist (`omni.cleanerFps`, default
  `'source'`), diteruskan via preload → main → `processBatch`.

**Verifikasi empiris** (video 30fps nyata, FFmpeg 9.0):
- `enhance+archive+fps60` → output `60/1` (minterpolate).
- `enhance+fullhd+fps60` → `60/1` (scale + minterpolate).
- `enhance+uhd+fps60` → `60/1` (scale + `fps=60` — interpolasi diblokir di 4K).
- `privacy+archive/fullhd/vertical+fps60` → `60/1` (`fps=60`).
- `fps30` pd sumber 30fps → tanpa filter, tetap `30/1` (tidak re-encode sia-sia).
- `fps24` → `24/1` (turunkan).
- `parseFrameRate('30000/1001')` → 29.97; nilai invalid → 0.
- **Hasil: 11/11 PASS** (matriks keputusan + ffmpeg nyata).

**Validasi**: typecheck (web+node)/lint/build/get_errors PASS; bundle main
memuat `buildFpsFilter`+`minterpolate=fps=${target}`+`fps=${target}`; bundle
renderer memuat dropdown Framerate. CATATAN lingkungan: CDP 9222 tak
terjangkau antar-namespace sandbox → E2E via harness integrasi setara (salinan
verbatim matriks + ffmpeg nyata), bukan CDP UI.

## Perubahan Terbaru (2026-08-17 — PIPELINE PENJERNIHAN MAKSIMAL DIPERBAIKI + FIX VIDEOTOOLBOX)

**Laporan user**: pilih "Kualitas Terbaik" di Pembersih Video tapi hasil tetap
buram/bernoise, hanya ukuran file yang membesar. **Audit forensik + empiris**
(klip TikTok 720p nyata, ukur energi detail & noise via ffmpeg) menemukan 4 akar:
(1) dropdown kualitas HANYA memetakan CRF/preset x264 — filter enhance SAMA untuk
semua tingkat; (2) pipeline "Penjernihan" lemah (atadenoise 0.04 + cas 0.7 →
nyaris tanpa perubahan +0.8%); (3) upscale 720→1080 malah menurunkan ketajaman
(−2.3%); (4) noise sumber tertahan (atadenoise terlalu lemah, cas menegaskan
noise). Plus **bug laten**: jalur videotoolbox memakai `-q:v 60` FIXED (dropdown
kualitas diabaikan total).

**FIX Opsi A — pipeline "Penjernihan Maksimal" baru** (`processor.ts`,
`enhanceFilter`): `atadenoise` → **`hqdn3d=2.5:2.5:12:9` (denoise spatial+temporal
diperkuat) → `deband` (hilangkan bintik/banding) → scale lanczos/pad-blur →
`cas=0.95` (penajam edge-aware, minim amplifikasi noise) →
`unsharp=7:7:0.7:5:5:0.3` (radius sedang: tepi halus + local contrast) →
`eq=saturation=1.15:contrast=1.04`**.
- Hasil uji (klip 720p, archive): detail bersih **51.139 vs 47.829 sumber
  (+6.9%)**, noise **0.036 vs 0.056 (−36%)**; pipeline lama hanya +0.8% dan noise
  0.051. FullHD upscale: **48.077 vs 46.832 lama (+2.7%)** dan kini di ATAS sumber
  (+0.5%) — upscale BENAR menajamkan, bukan melembutkan. Encode 720→1080 ~3,3
  dtk/2 dtk video (slow preset; ~0,7x realtime utk archive 720).
- **CATATAN empiris**: `cas=1.0` pd build ini justru MENURUNKAN detail (uji 2×,
  detail 45.3 vs 51.1) → batas aman **0.95**; unsharp radius 9x9/0.8 (p3) memberi
  detail sedikit lebih tinggi (+7.7%) tapi noise naik & risiko halo — pilih 7x7/0.7
  sebagai keseimbangan terbaik.

**FIX Opsi D — videotoolbox q:v benar** (`processor.ts`, `encoderCrfArgs` +
helper `videoToolboxQuality`): `h264_videotoolbox` TIDAK mendukung `-crf` (opsi
diterima tapi diabaikan); kualitas via `-q:v` yang pd build FFmpeg ini nilainya
**LEBIH TINGGI = kualitas LEBIH BAIK** (terverifikasi PSNR: q:v 75→47.4, 68→45.4,
55→41.4). Mapping: best(18)→**75**, balanced/auto(20)→**68**, compact(26)→**55**.
- E2E app: encoder `h264_videotoolbox` output q:v 75 = 27,6 Mbps (vs q:v 60 lama
  9,8 Mbps) — dropdown kualitas kini benar-benar berpengaruh di jalur HW.

**Verifikasi**: get_errors bersih, typecheck (web+node)/lint/build PASS. E2E app
nyata (build produksi + userData terpisah, CDP): enhance+best → output
`clean=51.139 noise=0.036` (IDENTIK uji ffmpeg p2), jalur videotoolbox
terverifikasi. Semua 5 preset (archive/hd/fullhd/uhd/vertical) sintaks filter
valid. Dev server aktif kembali (5173 + CDP 9222).

## Status Rilis v2.1.0 (SELESAI — RELEASE v2.1.0 DIPUBLIKASI)

- **Branch**: `release/v2.1.0` (dari `main`). **Versi**: `2.1.0`.
- **PR #36** (release) ke `main` **MERGED** (merge commit `c121af5`, 2026-08-16).
- **Tag**: `v2.1.0` dibuat di commit merge `c121af5` + dipush.
- **GitHub Release v2.1.0 DIBUAT** — **Latest**, catatan rilis lengkap + **4
  artefak** (dibangun LOKAL karena GitHub Actions terkunci billing akun):
  `RS-OmniTools-2.1.0-arm64.dmg`, `RS-OmniTools-2.1.0-arm64.zip`,
  `RS-OmniTools-2.1.0-x64-setup.exe`, `RS-OmniTools-2.1.0-x64-portable.exe`.
  URL: https://github.com/dennsoe/rs-omnitools/releases/tag/v2.1.0
- **Release notes**: `release-notes/RELEASE_NOTES_v2.1.0.md`.
- Isi: UI Performa Kampanye dirombak + Workspace + AI multi-provider + asisten
  AI bubble chat + label status Diproses + fix Ambil Daftar akun TikTok (UA
  Chrome/126) + docs rencana Winning Product.
- **Catatan**: GitHub Actions terkunci "billing issue" → build rilis ini lokal
  (`npm run build:mac` / `build:win`) lalu unggah manual via `gh release
  create`. Bila ingin build otomatis kembali, aktifkan billing GitHub Actions.

## Master Terbaru — PR #34 MERGED (2026-08-16)

- **PR #34** (`feat/campaign-ui-polish` → `main`) **MERGED** dengan **merge
  commit** `e8423cd` (BUKAN squash — pola graph bercabang dipertahankan).
- Isi: poles UI Performa Kampanye + workspace + AI multi-provider + asisten AI
  bubble chat + label status Diproses + fix Ambil Daftar akun TikTok (UA
  Chrome/126) + docs rencana Winning Product.
- Branch `feat/campaign-ui-polish` **terhapus** (lokal & remote). HEAD `main` =
  `e8423cd`.

## Status Rilis v2.0.0 (SELESAI — RELEASE v2.0.0 DIPUBLIKASI)

- **Branch**: `release/v2.0.0` (dari `main`). **Versi**: `2.0.0`.
- **REBRANDING**: RS OmniClip → **RS OmniTools** — repo `dennsoe/rs-omnitools`,
  brand logo `rsomni.png` (ikon app, sidebar, favicon), migrasi userData otomatis.
- **PR #32** (rebrand) ke `main` **MERGED** (merge commit `b5e3659`, 2026-08-16).
- **PR #33** (release) ke `main` **MERGED** (merge commit `d4a4bce`, 2026-08-16).
- **Tag**: `v2.0.0` dibuat di commit merge `d4a4bce` + dipush.
- **GitHub Release v2.0.0 DIBUAT** dengan catatan rilis lengkap + **4 artefak**:
  `RS-OmniTools-2.0.0-arm64.dmg`, `RS-OmniTools-2.0.0-arm64.zip`,
  `RS-OmniTools-2.0.0-x64-setup.exe`, `RS-OmniTools-2.0.0-x64-portable.exe`.
  URL: https://github.com/dennsoe/rs-omnitools/releases/tag/v2.0.0
- **Release notes**: `release-notes/RELEASE_NOTES_v2.0.0.md`.
- Ikon aplikasi kustom terpasang (`icon.icns` 1,5MB di bundle macOS; ikon juga
  dipakai installer Windows) — bukan lagi ikon default Electron.

## Perubahan Terbaru (2026-08-17 — UX COOKIE DOUYIN: VALIDASI LIVE + PANDUAN + BUKA DOUYIN.COM)

**Permintaan user: implementasikan rekomendasi "sekarang" jalur tengah untuk
Douyin — perbaiki UX ambil cookie + pesan error jujur + retry/UA. Validasi
bertahap & ketat.**

- **Main (`electron/main/engine/douyin.ts`)**: tambah `parseDouyinCookie(raw)` →
  `{ count, invalid, keys, hasSession }` — **satu sumber kebenaran** (aturan
  validasi SAMA dengan `writeNetscapeCookieFile`) sehingga status UI selalu
  akurat dengan yang benar-benar dipakai yt-dlp. `hasSession` = ada cookie sesi
  penting (`ttwid/msToken/odin_tt/passport_csrf_token/sid_guard`).
- **IPC (`index.ts` + `preload` + `global.d.ts`)**: `douyin:validate` →
  `window.api.validateDouyinCookie(raw)`.
- **Renderer (`DownloadSettingsModal.tsx`)**:
  - Status **validasi live** (debounce 400ms) dengan 4 kondisi: kosong / format
    tidak dikenali / valid tapi tanpa cookie sesi (warning) / cookie sesi
    terdeteksi (success hijau).
  - Tombol **"Kosongkan"** + **"Buka douyin.com"** (anchor `target=_blank` →
    `setWindowOpenHandler` → `shell.openExternal` — tanpa IPC baru).
  - Panduan **"Cara ambil cookie"** 3 langkah (buka+login → F12 → Application →
    Cookies → salin header) dalam `<details>` yang bisa dilipat.
- **Retry/UA Douyin**: di-audit — jalur sudah benar (lapisan 1 retry, lapisan 2
  UA Chrome/126, lapisan 3 self-heal yt-dlp; `friendlyDownloadError` sudah
  cocokkan pola nyata "Fresh cookies (not necessarily logged in) are needed").
  **Tidak ada perubahan spekulatif.**
- **Verifikasi CDP Electron** (restart): `validateDouyinCookie('ttwid=a; …')` →
  `{count:4, invalid:0, keys:[…], hasSession:true}`; 4 status UI ter-render
  benar (invalid / tanpa-sesi / sesi / kosong); tombol + panduan muncul;
  screenshot premium. `get_errors` bersih, typecheck (node+web)/lint/build
  PASS. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-17 — EKSTENSI COOKIE MV3 + JEMBATAN LOKAL: ISI OTOMATIS)

**Permintaan user: implementasikan & eksekusi Opsi A — ekstensi browser untuk
mengambil cookie Douyin/TikTok lalu mengirim otomatis ke aplikasi via jembatan
lokal. Dikerjakan sangat teliti.**

- **Jembatan lokal (`electron/main/engine/cookieBridge.ts`, baru)**:
  - HTTP server hanya di **loopback `127.0.0.1`**, **port dinamis** (tidak
    terbuka ke jaringan).
  - **Token** acak 48-hex dibuat sekali & disimpan di userData
    (`cookie-bridge-token`) → stabil antar-restart (paste kode sekali saja).
    Dibandingkan **constant-time** (`crypto.timingSafeEqual`).
  - Tanpa header CORS → browser tak bisa membaca respons lintas-origin; token
    mencegah penulisan dari halaman berbahaya.
  - Route: `GET /api/health` (`{ok:true}`) & `POST /api/cookies`
    `{site, cookieHeader, token}` → validasi via `parseDouyinCookie` untuk
    `douyin` (satu sumber kebenaran), situs lain dihitung jumlah cookie &
    dilaporkan `supported:false`. Respons `{ok, site, count, hasSession,
    supported}`; token salah → **401** `invalid_token`; non-loopback → **403**.
- **Main (`index.ts`)**: `startCookieBridge((d) => emit('cookie:received', d))`
  saat `app.whenReady`; IPC baru `cookieBridge:info` →
  `{active, port, code}` dengan `code = "<port>:<token>"`.
- **Preload + `global.d.ts`**: `getCookieBridgeInfo()`,
  `onCookieReceived(cb)`.
- **Renderer**:
  - `App.tsx`: subscribe `onCookieReceived` → bila `site==='douyin'` &
    `supported` & `hasSession` → `setDownloadDouyinCookie(header)` (persisted
    `omni.download.douyinCookie`) + toast sukses; tanpa sesi → toast error;
    situs tak didukung → toast info.
  - `DownloadSettingsModal.tsx`: kartu **"Isi otomatis via ekstensi browser"**
    — kode hubung (mono, selectable) + tombol **Salin** (clipboard + fallback
    `execCommand`) + tombol muat ulang + status aktif/tidak aktif.
- **Distribusi ekstensi SEBAGAI ZIP ber-versi (tanpa unduh terpisah)**:
  - **Build script `scripts/build-extension.mjs`** (+ `npm run build:extension`):
    baca versi dari `manifest.json` (SATU-SATUNYA sumber kebenaran) → buat
    `extensions/rs-omni-cookie-capturer.zip` (isi di root, tanpa `.DS_Store`/
    `__MACOSX`; `zip` CLI macOS / PowerShell Compress-Archive Windows). ZIP
    di-commit ke repo.
  - `package.json` `build.extraResources`: bundel **ZIP** +
    **folder sumber** ke dalam app (`Contents/Resources/rs-omni-cookie-capturer*`)
    → siapa pun yang menginstal aplikasi otomatis punya ekstensinya (terverifikasi
    via `electron-builder --dir`: folder 5 file + ZIP valid masuk ke bundle).
  - IPC baru **`extension:info`** → `{ version }` (baca manifest dari dalam app)
    → modal menampilkan badge **"vX.Y.Z"** di kartu ekstensi.
  - **`extension:prepare`** (main `index.ts` + preload `prepareExtension`
    + `global.d.ts`): salin ZIP dari dalam app (resources saat packaged /
    `extensions/…` saat dev) → `~/Downloads/RS-OmniTools-Extension/
    RS-OmniTools-Cookie-Capturer-v{version}.zip` lalu `shell.showItemInFolder`
    menampilkan file-nya di Finder. **HANYA ZIP — TIDAK membuat/mengekstrak
    folder** (user ekstrak manual untuk Load unpacked; `extract-zip` dihapus
    dari import). Return `{ok, zipPath, version}`.
  - Tombol **"Siapkan Ekstensi (salin ke Downloads)"** di kartu ekstensi modal
    (ikon `Download`; state `preparingExt`; toast sukses/gagal via prop `onToast`).
  - **Panduan lengkap** di modal menggantikan panduan singkat: pasang ekstensi
    (Siapkan Ekstensi → `chrome://extensions` → Developer mode → Load unpacked →
    pilih folder hasil ekstrak), hapus-versi-lama dulu, hubungkan kode hubung,
    ambil otomatis, + cara manual (F12/Network) sebagai fallback.
  - **Versi di popup ekstensi**: footer menampilkan
    `RS OmniTools Cookie Capturer · vX.Y.Z` via `chrome.runtime.getManifest()`.
  - Alur jelas end-to-end: **pasang app → Pengaturan Unduhan → Siapkan
    Ekstensi → ZIP ber-versi muncul di Downloads (dipilih di Finder) →
    ekstrak ZIP → Load unpacked pilih folder hasil ekstrak → tempel kode
    hubung → selesai.** README ekstensi diperbarui (jalur termudah + cara
    maintenance versi/ZIP).
- **Ekstensi MV3 (`extensions/rs-omni-cookie-capturer/`, baru)**:
  - `manifest.json` — permissions `cookies/clipboardWrite/storage`, host
    `*.douyin.com`, `*.iesdouyin.com`, `*.tiktok.com`, `http://127.0.0.1/*`;
    **`icons` + `action.default_icon` = ikon aplikasi RS OmniTools**.
  - `icons/icon{16,32,48,128}.png` — **ikon ekstensi = ikon app (rsomni.png),
    satu branding** (di-resize via `sips`); logo popup juga memakai
    `icons/icon128.png` (bukan lagi SVG puzzle).
  - `popup.html/js/css` — pilih situs, **Ambil & Kirim Cookie** (baca semua
    cookie, build header persis urutan browser: dedupe nama by path
    terpanjang/terlama + sort path menurun), validasi kunci sesi per situs,
    kirim via `fetch` ke `127.0.0.1` + token, Cek koneksi, Salin cookie, simpan
    kode hubung di `chrome.storage.local`. Plain JS — tanpa build.
  - `README.md` — panduan load unpacked + cara pakai + keamanan + struktur
    (termasuk `icons/`).
- **Lint**: `extensions/**` ditambahkan ke `ignores` `eslint.config.mjs`
  (skrip MV3 environment Chrome terpisah dari app).
- **Verifikasi E2E (Electron restart + CDP + curl)**:
  - `getCookieBridgeInfo()` → `{active:true, port:59934, code}`.
  - `GET /api/health` → 200 `{ok:true}`; token salah → **401**
    `invalid_token`; listener terbukti hanya `127.0.0.1:59934`.
  - `POST /api/cookies` douyin (6 cookie, ada sesi) → 200 `{count:6,
    hasSession:true, supported:true}` → **renderer ter-update otomatis**:
    `localStorage['omni.download.douyinCookie']` berisi header yang dikirim.
  - POST situs non-douyin (tiktok) → 200 `{supported:false}`.
  - `getExtensionInfo()` → `{version:"1.0.0"}`.
  - `prepareExtension()` via CDP → `{ok:true, zipPath:
    ~/Downloads/RS-OmniTools-Extension/RS-OmniTools-Cookie-Capturer-v1.0.0.zip,
    version:"1.0.0"}` (TANPA `folderPath`); ZIP valid (`unzip -t` → no errors);
    **tidak ada folder `rs-omni-cookie-capturer` dibuat** — hanya ZIP
    (folder lama dibersihkan).
  - `electron-builder --dir --mac`: extraResources terbukti masuk ke
    `Contents/Resources/rs-omni-cookie-capturer/` (5 file) + `.zip` (valid).
  - Screenshot modal: badge **v1.0.0** di kartu ekstensi + tombol Siapkan
    Ekstensi + panduan lengkap (verifikasi DOM: guideOpen, Load unpacked,
    kode hubung, hapus-versi-lama, cara manual, chrome://extensions — semua
    true). `get_errors` bersih, typecheck (node+web)/lint/build PASS. Belum
    di-commit (branch `feat/douyin-cookie-ux`).

## Perubahan Terbaru (2026-08-17 — IKON & WARNA BRAND PLATFORM DI HALAMAN PENGUNDUH)

**Permintaan user: di semua halaman Pengunduh, setiap label platform diberi
ikon + warna brand di depannya (mis. `[ikon TikTok] TikTok` pink). Konfirmasi
user: hanya label/badge (bukan kalimat error), Cookies Browser ikut diberi
ikon, TikTok/Douyin pakai SVG kustom. Audit forensik dulu, lalu eksekusi.**

- **File baru**:
  - `src/components/ui/brand-icons.tsx` — ikon SVG brand **akurat** (simple-icons,
    CC0): TikTok, Edge, Safari, Firefox, Brave. Path **diekstrak dari sumber
    resmi** (bukan mengarang) via script sekali pakai.
  - `src/components/ui/platform-brand.ts` — util (dipisah ke `.ts` agar aman
    fast-refresh): `platformColorClass`, `platformIcon`, `browserColorClass`,
    `browserIcon`. Warna: TikTok **hitam `#000000`** (brand resmi), Douyin cyan,
    YouTube `#FF0000`, Instagram `#E4405F`, Facebook `#1877F2`, X hitam; browser
    Chrome `#4285F4`, Edge `#0078D7`, Safari `#0AA5EB`, Firefox `#FF7139`,
    Brave `#FB542B`.
  - `src/components/ui/PlatformBadge.tsx` — komponen **badge/pill** `[ikon] platform`
    (rounded-full) dengan **latar lembut berwarna brand** + teks/ikon warna brand,
    aman light & dark; prop `iconClassName` untuk ukuran per konteks.
  - `platform-brand.ts` `platformBadgeClass(platform)` — kelas pill per platform
    (latar tint + warna brand).
- **Keputusan jujur + koreksi user**: Douyin TIDAK tersedia di set open-source
  (simple-icons 3307 ikon, Iconify 0 hasil, Font Awesome) — **TAPI logo Douyin
  identik dengan TikTok** (aplikasi saudara ByteDance, catatan putih + aksen
  cyan/merah di atas hitam). User menegaskan → **Douyin memakai glyph
  TikTokIcon yang sama**, dibedakan warna **cyan**. TikTok semula salah merah
  `#FE2C55` → **dikoreksi ke hitam** (hex resmi simple-icons `000000`).
- **FloatingSelect**: `SelectOption` + `icon?` (ikon per opsi) — dirender di
  nilai terpilih & tiap opsi dropdown (ikon membawa warna brand sendiri).
- **Diterapkan di 7 tempat**: ScrapeResultView (grid + list),
  ScrapePreviewModal, HistoryView (2 kolom), WatcherPanel (preview akun +
  daftar akun; pill violet diganti badge brand), MediaPreviewModal,
  DownloadSettingsModal (ikon Douyin cyan di label Cookie Douyin + tombol
  "Buka douyin.com" + ikon browser di opsi "Cookies Browser").
- **Permintaan lanjutan user**: "icon platform berada di dalam badge, warna badge
  sesuai" → PlatformBadge diubah dari label berwarna menjadi **pill berwarna brand**
  (latar lembut: Douyin cyan tint, TikTok abu/hitam tint, YouTube merah tint, dst).
  Konsisten di 7 tempat. Browser (Cookies Browser) tetap ikon+label di dropdown
  (bukan badge).
- **Verifikasi**: get_errors bersih, typecheck (node+web)/lint/build PASS.
  CDP: dropdown Cookies Browser menampilkan ikon brand berwarna (Chrome/Edge/
  Safari/Firefox/Brave); ikon Douyin cyan di kolom cookie & tombol; Riwayat
  merender 105 badge platform (TikTok pink, YouTube merah, Facebook biru).
  Belum di-commit.

## Perubahan Terbaru (2026-08-17 — INFO LENGKAP DI ANTREAN UNDUHAN: PLATFORM + DURASI + AKUN)

**Permintaan user: saat download tampilkan info lengkap — platform, durasi, info
akun, dll (sebelumnya hanya judul/URL/status). Audit & implementasi penuh.**

- **Engine (`downloader.ts`)**:
  - `DownloadProgress` + `duration?: number` & `uploader?: string`.
  - `--print after_move` JSON diperluas: `"duration":%(duration)j,
    "uploader":%(uploader)j,"channel":%(channel)j` → parser meta menangkap
    durasi + akun (uploader || channel, fallback aman).
- **TikWM (`tiktok.ts`)**: `TikTokInfo.author` + `TikTokDownloadResult.duration/
  uploader` (dari field `author` di data TikWM) → unduhan TikTok juga punya
  durasi & nama akun.
- **Kontrak**: preload `DownloadProgressData` + `src/lib/types.ts` ditambah
  `duration?` & `uploader?` (mengalir otomatis via spread di App).
- **Renderer (`DownloadQueue.tsx`)**: baris item kini menampilkan **badge
  platform** (`PlatformBadge` via `guessPlatform` URL) + **durasi**
  (`formatDuration`) + **nama akun** (uploader).
- **Verifikasi E2E (CDP + unduhan YouTube nyata "Me at the zoo")**: baris
  antrean menampilkan `YouTube · 0:19 · jawed` + judul/URL/deskripsi + status
  Selesai. `get_errors` bersih, typecheck (node+web)/lint/build PASS. Belum
  di-commit.

## Perubahan Terbaru (2026-08-17 — THUMBNAIL KLIK → PREVIEW + ENGAGEMENT DI HASIL SCRAPE)

**Permintaan user: klik thumbnail juga harus membuka modal preview video (bukan
hanya judul); terapkan perbaikan yang sama ke bagian scrape Akun/Halaman.**

- **DownloadQueue**: thumbnail item kini **tombol** (`button title="Putar video"`,
  `onClick=onPreview`) — sama seperti judul; overlay play di hover tetap ada.
  Sebelumnya hanya judul yang bisa diklik.
- **ScrapeResultView (Akun/Halaman)**: baris hasil kini menampilkan **info
  engagement** — views (`Eye`), likes (`ThumbsUp`), comments (`MessageCircle`) —
  di tampilan grid & list. `ScrapeItem` (types.ts) ditambah `views/likes/
  comments/description` (data sudah dikirim engine). Klik kartu/thumbnail →
  preview sudah berfungsi (seluruh kartu adalah tombol).
- **Verifikasi E2E (CDP + unduhan YouTube nyata)**: setelah selesai, klik
  thumbnail → modal preview terbuka dengan `<video>` (hasVideo true); screenshot
  terkonfirmasi. `get_errors` bersih, typecheck (node+web)/lint/build PASS.
  Belum di-commit.

## Perubahan Terbaru (2026-08-16 — FIX SCRAPE/AMBIL DAFTAR TIKTOK: UA CHROME/126 + RETRY + PESAN JUJUR)

**Permintaan user: audit forensik kenapa "Ambil Daftar" akun TikTok error
"TikTok memblokir pemeriksaan akun otomatis". Akar masalah = kesalahan kode
(bukan blokir global TikTok), dan user minta diterapkan + diverifikasi.**

- **Akar masalah (terbukti deterministik via CLI, bukan tebakan)**:
  - `CHROME_USER_AGENT` di `electron/main/engine/downloader.ts` memakai
    **Chrome/140 (Windows)** → TikTok kini mem-flag UA ini → profil akun gagal
    di-resolve → yt-dlp error `[tiktok:user] ... Unable to extract secondary
    user ID` → aplikasi menampilkan pesan anti-bot.
  - Uji 3× per kombinasi (yt-dlp sama, IP sama, akun `@mrbeast`):
    UA Chrome/140 + 1-3 item (watcher "scrape 1 akun") = **FAIL 3/3**;
    UA Chrome/140 + 1-200 = FAIL 2/3; **UA Chrome/126 + 1-3 & 1-200 = OK 3/3**;
    UA Chrome/124 = OK 3/3. Pembeda = VERSI Chrome di UA (140 diblokir,
    126/124 lolos) — bukan OS/jumlah item/rate-limit acak.
  - Bukan regresi commit terakhir: 4 commit kampanye/AI/workspace TIDAK
    menyentuh `downloader.ts`. UA Chrome/140 sudah ada sejak v1.3.4; TikTok
    mulai mem-flag-nya belakangan.
- **Perbaikan (3, diterapkan)**:
  1. **UA → Chrome/126** di `downloader.ts` DAN `tiktok.ts` (konsisten) →
     TikTok tidak lagi menolak.
  2. **`SCRAPE_TRANSIENT_RE`** + `Unable to extract secondary user ID` &
     `Unable to extract profile` → percobaan ke-2 (rotasi `api_hostname`) +
     sleep kini JALAN saat TikTok challenge (sebelumnya langsung `break`).
  3. **`friendlyScrapeError` jujur**: bedakan HTTP 404 ("akun tidak ditemukan"),
     429 (rate-limit), dan `[tiktok:user]/Unable to extract` ("TikTok tidak
     dapat diverifikasi — sementara dibatasi ATAU akun tidak ditemukan/privat/
     dihapus — periksa username & coba lagi"). Pesan menakutkan lama dihapus.
- **Verifikasi**:
  - Bundle `out/main/index.js`: `Chrome/126` ada (2), `Chrome/140` 0,
    pesan jujur ada, pesan lama "memblokir pemeriksaan" 0, pola transien ada.
  - E2E in-app (CDP, setelah restart Electron): scrape `@mrbeast` →
    loading → **panel "Hasil Akun / Halaman" terisi (630+ baris video)** —
    sebelumnya gagal anti-bot. `get_errors` bersih, typecheck (node+web)/lint/
    build PASS. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — BUBBLE CHAT AI: TEMA APLIKASI + LAYAR PENUH + PERSISTEN)

**Permintaan user: audit forensik bubble chat asisten AI — tampilan sesuai tema
aplikasi, inputan kanonik, bisa full 1 halaman, tanpa icon/bot/user, super
responsive, simpan percakapan di localStorage, ada hapus riwayat.**

- **Tema aplikasi** (`src/components/campaign/AiAdvisor.tsx`):
  - Header pola kanonik modal (badge Brain + judul + subtitle + tombol aksi
    ber-Tooltip); panel `bg-white dark:bg-slate-800 border rounded-2xl shadow-2xl`.
  - Input pakai **`FloatingInput`** (floating label "Tulis pesan…", aksi tombol
    Kirim di dalam field) — konsisten dgn modal Pengaturan.
- **Layar penuh (full 1 halaman)**: state `maximized` — panel kompak
  `bottom-24 right-6 h-[min(640px,calc(100dvh-9rem))] w-[min(420px,calc(100vw-2rem))]`
  ⇄ layar penuh `inset-0`; tombol Maximize2/Minimize2; saat layar penuh FAB
  disembunyikan & konten pesan/input dibatasi `max-w-3xl` (mudah dibaca).
- **Tanpa icon/bot/user**: avatar lingkaran (Bot/User) DIHAPUS dari pesan —
  bubble bersih (user kanan biru, model kiri abu-abu + Markdown + waktu);
  empty-state teks saja; FAB memakai `MessageSquare` (bukan Bot). Ikon header/
  kirim/alert tetap (fungsional, tema aplikasi).
- **Persisten localStorage**: `usePersistentState(PREF_KEYS.campaignAiChat)` =
  `omni.campaign.ai.chat` (ditambah di `preferences.ts` + `PREF_DEFAULTS`).
  Otomatis tersimpan tiap perubahan; `formatTime()` toleran Date/string ISO
  (JSON serialize Date → string).
- **Hapus riwayat**: tombol Trash2 di header → **2 langkah konfirmasi** (berubah
  merah "Yakin hapus riwayat?", auto-reset 2,5s) → klik lagi = `setMessages([])`
  → key otomatis DIHAPUS dari localStorage ([] === default).
- **Auto-audit disempurnakan**: tidak auto-audit ulang bila percakapan tersimpan
  (mis. setelah reload); setelah hapus riwayat TIDAK memicu audit ulang otomatis
  (user klik Muat Ulang bila mau) — hindari panggilan API tak terduga.
- **Verifikasi CDP Electron**: panel 420×640, FloatingInput aktif, tanpa avatar
  pesan (0 avatar; 1 elemen rounded-full = titik status provider), layar penuh
  `inset-0` + FAB sembunyi + tombol Kecilkan, clear 2 langkah → `lsAfter:null` +
  empty-state tanpa re-audit, kirim pesan → user+model ter-persist (msgCount 2),
  reload mempertahankan percakapan, buka ulang tanpa re-audit. `ai:analyze`
  resolve ~5,5s (normal). get_errors bersih, typecheck (node+web)/lint/build
  PASS. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — LABEL STATUS "TERTUNDA" → "DIPROSES")

**Permintaan user: kata "Tertunda" di frontend Performa Kampanye diganti menjadi
"Diproses". Audit semua titik agar penerapan benar & konsisten.**

- **Helper baru** (`src/lib/campaign/format.ts`): `displayOrderStatus(status)` —
  memetakan `Tertunda` (case-insensitive) → `Diproses`; status lain dikembalikan
  apa adanya. **Data mentah tidak diubah** — hanya label TAMPILAN yang berubah.
- **Titik tampilan yang dipetakan** (semua lewat `displayOrderStatus`):
  - Kartu **Filter Status Pesanan Shopee** (`CampaignView.tsx`) — label status.
  - **Pie chart** "Status Pesanan Shopee Affiliate" (`CampaignCharts.tsx`) —
    nama segmen & legend memakai label tampilan; kunci `STATUS_COLORS`
    `Tertunda` → `Diproses` (warna amber `#f59e0b` tetap) sehingga lookup warna
    cocok.
  - Tabel **Tidak Terpetakan** (`UnmappedSection.tsx`) — kolom Status.
- **Yang sengaja TIDAK diubah** (agar perhitungan/filter akurat): kunci internal
  `statusBreakdown`/`statusCounts`/`selectedStatuses` tetap `orderStatus`
  mentah; filter "Selesai Saja", default status (kecualikan Batal/Cancel/
  Refund), komisi & ROI tetap memakai data mentah. `demoData.ts`/`dataProcessor`
  tetap status mentah (mapping terjadi saat render).
- **Verifikasi CDP Electron**: kartu filter tampil `DIPROSES` (bukan TERTUNDA),
  legend pie `Diproses`, `bodyHasTertunda:false` di semua tab (Kampanye,
  Ringkasan & Grafik, Tidak Terpetakan). `get_errors` bersih, typecheck
  (node+web)/lint/build PASS. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — ASISTEN AI JADI BUBBLE CHAT MENGGAMBANG)

**Permintaan user: asisten AI tidak ditempatkan di tab — buatkan bubble chat
(FAB + panel) yang mengambang. Audit menyeluruh agar penerapan tepat & akurat.**

- **Restruktur** (`src/components/campaign/AiAdvisor.tsx`):
  - Dari chat tab full-width (grid `xl:grid-cols-4` + sidebar Quick Analysis)
    menjadi **bubble chat mengambang**: FAB (tombol bulat kanan-bawah,
    `fixed bottom-6 right-6`, h-14 w-14, ikon Bot ↔ X saat terbuka) + panel
    chat `fixed bottom-24 right-6 z-50` (380×600, `h-[min(600px,calc(100dvh-9rem))]`).
  - **Portal ke `document.body`** (`createPortal`) — bebas dari stacking context
    ancestor bertransform; `z-50` > konten & sidebar, di bawah modal (z-70/z-80).
  - Layout kompak: header (badge Brain + judul + badge provider + tombol refresh
    audit + tutup X), chip saran cepat (muncul hanya saat belum ada pesan &
    tidak loading), area pesan (user kanan/biru, model kiri/Markdown), input +
    Kirim, footer catatan. Semua logika AI dipertahankan (runAnalyze, error
    per-provider, Markdown, scroll otomatis).
  - **Auto-audit kini digate `open` + `autoAuditKey`** dengan `lastAuditedKey`
    ref → audit otomatis hanya dijalankan SATU KALI per sumber data saat chat
    DIBUKA (tidak membuang pemakaian API saat chat tertutup; tidak duplikat saat
    buka-tutup ulang).
- **Hapus tab AI** (`src/views/CampaignView.tsx`):
  - `type Tab` → `'overview' | 'campaigns' | 'unmapped'`; entri
    `{ id: 'ai', label: 'Asisten AI', Icon: Brain }` dihapus dari array tab;
    blok `{activeTab === 'ai' && <AiAdvisor .../>}` dihapus dari konten tab.
  - `AiAdvisor` dirender sebagai elemen `aiAdvisor` (portal, posisi fixed)
    di return **WIZARD dan DASHBOARD** — selalu tersedia di kedua mode.
  - `Brain` masih dipakai (ikon selector Provider AI di modal Pengaturan).
- **Verifikasi CDP Electron** (renderer HMR): FAB muncul di dashboard
  (`fabExists:true`); klik FAB → panel terbuka (`opened:true`, header
  "AI Media Buying Analyst", provider "OpenAI GPT Active", input+Kirim, tombol
  tutup, FAB berubah jadi X, panel 380×600 di kanan-bawah); auto-audit memicu
  analisis OpenAI asli ("Audit Awal Laporan Kampanye"); tutup → panel hilang &
  FAB kembali; buka ulang → pesan tetap & TANPA audit duplikat (lastAuditedKey
  bekerja). `get_errors` bersih, typecheck (node+web)/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — MODAL SETTINGS: PORTAL KE BODY + BUG WIZARD)

**Permintaan user: saat modal Pengaturan Performa Kampanye muncul, sidebar
tidak terblur/teredup. Audit forensik ketat → 2 bug ditemukan & diperbaiki.**

- **Bug 1 — sidebar tidak terblur (akar masalah stacking context)**:
  - Bukti CDP Electron: overlay modal `position:fixed inset-0` GEOMETRIS
    menutupi seluruh viewport, TAPI `elementFromPoint(150,300)` (area sidebar)
    mengembalikan menu sidebar → sidebar mengecat DI ATAS overlay.
  - Akar: shell CampaignView `z-10` membuat stacking context; modal `z-70`
    BERADA DI DALAM context itu → efektif z-10 < sidebar `z-20` (root context)
    → sidebar menang. (Modal lain — Confirm/Update/Preview — dirender di level
    App, jadi benar; hanya modal dalam-view yang kena.)
  - FIX (`CampaignView.tsx`): modal di-PORTAL ke `document.body` (`createPortal`)
    → overlay langsung di root context, `z-70` > sidebar `z-20` → sidebar kini
    terblur + teredup. Pola sama dgn `CampaignDateRange`/`FloatingSelect`.
  - Verifikasi CDP: parent overlay = BODY, `elementFromPoint` sidebar = overlay.
- **Bug 2 — tombol Settings di wizard tidak menampilkan modal**:
  - Akar: modal hanya dirender di render DASHBOARD, sementara wizard punya
    tombol `setShowSettings(true)` → klik di wizard tidak menampilkan apa-apa.
  - Bukti CDP: wizard tampil, gear ada, `modalAppearsInWizard:false`.
  - FIX: modal diekstrak jadi `const settingsModal = showSettings &&
    createPortal(...)` → dirender di return WIZARD dan DASHBOARD.
  - Verifikasi CDP: wizard `open:true coversSidebar:true`, dashboard
    `open:true coversSidebar:true`, keduanya `parentIsBody:true`.
- **Audit menyeluruh lain**: get_errors bersih, typecheck/lint/build PASS, 0
  error/warning console (reload + navigasi + buka modal), tidak ada
  TODO/FIXME/console.log/@ts-ignore/as any, hanya 1 elemen `fixed` di views
  (sudah diperbaiki), `<div>` balance 54/54. Komponen CampaignTable/
  UnmappedSection/DiagnosticsPanel/format.ts ditinjau — solid.
- Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — TABEL AUTO-RESIZE + ANIMASI ACCORDION)

**Permintaan user: tabel harus menyesuaikan (auto-resize) mengikuti isi — tidak
dikunci tinggi maksimal; tabel panjang tidak boleh "pendek". Accordion diberi
efek & animasi. Semua tabel super responsive.**

- **Hapus tinggi terkunci** (`CampaignView.tsx`): wrapper `h-[480px]`
  (CampaignTable) & `h-[520px]` (AiAdvisor) DIHAPUS → konten tab natural.
- **CampaignTable / UnmappedSection** (`CampaignTable.tsx`,
  `UnmappedSection.tsx`): hapus pola scroll-internal (`h-full` +
  `min-h-0 flex-1 overflow-y-auto`) → tabel natural-height, SEMUA baris tampil,
  halaman yang scroll (auto-resize). Hapus `sticky top-0 z-10` pada thead (agar
  tidak bentrok dengan strip tab sticky di page-scroll).
- **CampaignCharts (Laporan Kinerja Harian)**: sudah natural-height; thead
  non-sticky; row expand tanggal tetap tumbuh menyesuaikan isi.
- **AiAdvisor**: wrapper `h-[520px]` dihapus → grid `h-full` jadi natural;
  area chat tumbuh mengikuti pesan (page scroll).
- **Animasi accordion**:
  - `DiagnosticsPanel`: konten dibungkus `AnimatePresence` + `motion.div`
    `height:0 → auto` (0.3s, ease) saat buka/tutup + `overflow-hidden`;
    chevron kini `ChevronDown` dengan rotasi 0°→180°.
  - Row-expand `CampaignTable` (detail kampanye) & `CampaignCharts` (rincian
    per jam): `motion.div` fade + slide (opacity 0→1, y -4→0, 0.2s).
- **Audit CDP Electron**: CampaignTable `hasInternalScroll:false`,
  `bodyOverflow:visible`, 5 baris tampil semua, tinggi kartu alami (451px —
  tidak terkunci 480px); accordion buka 407px → tutup unmount (animasi exit);
  page scrollH 1572 (halaman tumbuh); 0 error/warning console; modal & blur
  sidebar tetap bekerja.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — KARTU FILTER STATUS SUPER RESPONSIVE)

**Permintaan user: 3 kartu filter status pesanan harus responsive — ukuran
menyesuaikan, super responsive.**

- **Akar masalah**: grid status `grid-cols-1 sm:grid-cols-2 md:grid-cols-3
  lg:grid-cols-4` → dengan 3 status di layar lebar tersisa 1 kolom kosong
  (kartu tidak mengisi lebar penuh).
- **FIX** (`CampaignView.tsx`):
  - Grid → **`grid-cols-[repeat(auto-fit,minmax(170px,1fr))]`** — kartu otomatis
    menyesuaikan lebar (isi penuh, tanpa kolom kosong) & membungkus rapi di
    semua ukuran layar (1 kolom → 3 kolom sesuai ruang).
  - Konten kartu responsif: footer `gap-2`, jumlah pesanan `shrink-0`, komisi
    `min-w-0 truncate` (angka panjang tidak meluber).
  - Baris aksi (Pilih Semua / Selesai Saja) `flex flex-wrap` — membungkus di
    layar sempit.
- **Audit CDP Electron** (viewport 400/640/900/1280): `fillsWidth:true` di
  semua lebar — kartu 323px (1 kolom) / 176px (3 kolom) / 170px / 297px, selalu
  mengisi penuh kontainer tanpa kolom kosong; baris menyesuaikan.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — SEMBUNYIKAN SPINNER INPUT ANGKA)

**Permintaan user: hilangkan tombol naik/turun (panah tambah/kurang angka)
bawaan browser pada SEMUA input angka.**

- **FIX** (`src/assets/main.css` @layer base, global):
  - `input[type='number']::-webkit-outer/inner-spin-button` →
    `-webkit-appearance: none; margin: 0` (Chromium/Electron).
  - `input[type='number']` → `-moz-appearance: textfield; appearance:
    textfield` (Firefox + jaring pengaman).
- Mencakup semua input number: `CampaignMetrics` (Pajak/Persentase),
  `ProxyManager` (port/proxy), `WatcherPanel`. Angka tetap bisa diketik manual.
- **Verifikasi CDP Electron**: input number computed `appearance: textfield`;
  screenshot saat input fokus — TANPA panah spinner.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — WORKSPACE localStorage + MODAL VALIDASI + TOOLTIP)

**Permintaan user: performa kampanye punya workspace — user bisa tambah/hapus
workspace fleksibel, disimpan di localStorage. Semua aksi destruktif diberi
modal validasi. Tombol ikon tanpa label diberi tooltip.**

- **Workspace → localStorage** (`src/lib/campaign/workspaceStore.ts` BARU):
  - Menggantikan penyimpanan Electron IPC (file di userData) dengan
    localStorage renderer (berfungsi juga di browser).
  - Index ringkas di key `rsomni.campaign.workspaces`; isi lengkap tiap
    workspace (termasuk CSV) di key `rsomni.campaign.workspace.<id>` → aman
    kuota (tidak menulis semua CSV ke satu key besar).
  - `listWorkspaces / loadWorkspace / saveWorkspace / deleteWorkspace` — semua
    dibungkus try/catch; `saveWorkspace` menimpa bila nama sama, melempar Error
    bila kuota penuh.
- **Modal Workspace khusus** (`CampaignView.tsx`, portal ke body z-70):
  - Tombol toolbar "Workspace" (ikon Database) di wizard & dashboard.
  - Simpan state saat ini dengan nama (FloatingInput + tombol Simpan), daftar
    workspace tersimpan (Muat / Ekspor JSON / Hapus), Impor dari file JSON.
  - Modal tetap terbuka setelah simpan agar user langsung melihat hasilnya.
  - Section workspace DIHAPUS dari modal Settings (kini hanya Profil + AI key).
- **Modal validasi** (portal z-80) untuk aksi destruktif:
  - Hapus workspace → "Hapus Workspace?" (nama workspace disebutkan).
  - Bersihkan Data → "Bersihkan Data?" (laporan dikosongkan, preferensi tetap).
  - Tombol Batal / konfirmasi; toast setelah aksi berhasil.
- **Tooltip kustom** (`src/components/ui/Tooltip.tsx` BARU): portal ke body
  z-100, muncul saat hover/fokus (delay 90ms), posisi di bawah pemicu + diklamp
  agar tak keluar viewport. Diterapkan ke SEMUA `ToolbarBtn` + tombol ikon
  modal Workspace (Muat/Ekspor/Hapus).
- **Verifikasi CDP Electron**: simpan → localStorage terisi (index + per-id),
  hapus → modal validasi muncul → konfirmasi → terhapus (`[]`), bersihkan data
  → modal validasi, tooltip muncul, settings modal tanpa section workspace.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — MODAL KANONIK + LABEL & WARNA WORKSPACE)

**Permintaan user: desain modal yang dibuat tidak konsisten dengan modal
halaman lain; workspace tampilkan label agar mudah dikenali + warna berbeda.**

- **Akar**: modal workspace/settings/confirm memakai shell menyimpang
  (`bg-slate-950/40`, kartu `max-w-md p-5`, badge `h-9 w-9 rounded-xl`, tutup
  `X`). Pola kanonik aplikasi (ConfirmModal/DownloadSettingsModal/UpdateModal):
  overlay `bg-black/40 dark:bg-black/60`, kartu `max-w-lg overflow-hidden
  shadow-2xl flex flex-col max-h-[85vh]`, header `px-5 pt-5 pb-3 border-b` +
  badge `p-2 rounded-lg w-4 h-4`, tutup `XCircle w-5 h-5`, body `px-5 py-4`.
- **FIX** (`CampaignView.tsx`): ketiga modal (Settings, Workspace, Confirm)
  dirombak ke pola kanonik. Tutup modal kini juga via **Escape**.
- **Label & warna workspace**:
  - `CampaignWorkspaceSummary` + index store mendapat flag `hasMeta /
    hasShopee / hasClicks` (dihitung saat simpan dari isi CSV).
  - Setiap item workspace: **avatar huruf awal dengan warna berbeda** (palet
    `WS_AVATAR_COLORS`: biru/emerald/amber/violet/rose/cyan, bergilir) + **label
    dataset berwarna**: Meta (biru), Shopee (oranye), Klik (emerald) → mudah
    dikenali sekilas.
- **Verifikasi CDP Electron**: modal `bg-black/40`, header `border-b` 1px,
  badge `p-2`, tutup `XCircle` (`lucide-circle-x`), label Meta/Shopee/Klik
  tampil dengan warna berbeda, avatar berwarna. Settings modal tanpa section
  workspace. `get_errors` bersih, typecheck/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — TOMBOL WORKSPACE BERLABEL + WARNA)

**Permintaan user: tombol Workspace tidak ada label teks & warnanya tidak
berbeda (hanya ikon).**

- **FIX** (`CampaignView.tsx`): tombol "Workspace" di toolbar wizard &
  dashboard diubah dari `ToolbarBtn` ikon-only menjadi **tombol berlabel**
  `[Database] Workspace` dengan **warna indigo** (`bg-indigo-600`, teks putih,
  `h-9` — sama tinggi dgn tombol lain), menonjol dari tombol ikon netral.
- **Verifikasi CDP Electron**: tombol ditemukan (`text:"Workspace"`,
  `hasIcon:true`, `hasLabel:true`), `bg oklch(hue 277)` = indigo-600, teks
  putih, tinggi 36px. `get_errors` bersih, typecheck/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — TOMBOL WORKSPACE OUTLINE + UKURAN KONSISTEN)

**Permintaan user: tombol Workspace dibuat OUTLINE (bukan fill penuh); tombol
"Coba Data Demo" disamakan ukurannya.**

- **FIX** (`CampaignView.tsx`):
  - Tombol Workspace: `bg-indigo-600` (fill) → **outline** — `border
    border-indigo-300 bg-white text-indigo-600` (+ dark mode), tetap `h-9`.
  - Tombol "Coba Data Demo" (wizard): `px-3 py-1.5` → **`h-9`** (sama tinggi
    dgn tombol toolbar lain) + bg putih + border biru.
- **Verifikasi CDP Electron**: Workspace bg putih + border indigo 1px + tinggi
  36px; Coba Data Demo tinggi 36px (sama), bg putih, border 1px. Kedua tombol
  konsisten. `get_errors` bersih, typecheck/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — UKURAN KONSISTEN + DEMO PERSIST + WORKSPACE AKTIF)

**Permintaan user: (1) 3 tombol toolbar tidak konsisten ukurannya; (2) mode
demo hilang saat refresh; (3) tampilkan workspace mana yang sedang aktif (anti
rancu saat banyak workspace / mode demo).**

- **Ukuran konsisten** (`CampaignView.tsx` + `CampaignDateRange.tsx`): semua
  kontrol toolbar kini `h-9` (36px) — chip Mode Demo/workspace, trigger date
  range (`px-3 py-2` → `h-9`), tombol Workspace.
- **Mode demo persist** (`preferences.ts` + `CampaignView.tsx`): `isDemoMode`
  diubah dari `useState` → `usePersistentState(PREF_KEYS.campaignDemoMode)`.
  Saat refresh, badge "Mode Demo" tetap tampil.
- **Workspace aktif** (`preferences.ts` + `CampaignView.tsx`):
  - `activeWorkspaceId` persisten (`PREF_KEYS.campaignActiveWorkspace`).
  - Chip status di toolbar: bila ada workspace aktif → `[Database] nama
    workspace` (indigo); bila mode demo → `[Sparkles] Mode Demo` (biru);
    keduanya `h-9`.
  - `handleLoadWorkspace` set active id; `handleSaveWorkspace` set id hasil
    simpan; upload/impor/demo/clear reset `activeWorkspaceId=''` &
    `isDemoMode=false`.
- **Verifikasi CDP Electron**: demoChip 36px = dateTrigger 36px = wsBtn 36px;
  `demoModeKey:"true"` + chip Mode Demo tetap tampil setelah reload; setelah
  simpan chip menampilkan nama workspace + id tersimpan. `get_errors` bersih,
  typecheck/lint/build PASS. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — TRIGGER DATE RANGE SAMA DGN TOMBOL LAIN)

**Permintaan user: ukuran date range picker masih tidak konsisten dgn tombol
lain.**

- **FIX** (`CampaignDateRange.tsx`): trigger date range `rounded-xl` →
  **`rounded-lg`** (sama dgn tombol Workspace & chip status). Tinggi sudah
  `h-9` (36px) dari perubahan sebelumnya.
- **Verifikasi CDP Electron**: SEMUA kontrol toolbar = 36px — Mode Demo chip,
  trigger date range, tombol Workspace, tombol ikon (Ekspor/Bersihkan/
  Settings). Screenshot dikonfirmasi konsisten. `get_errors` bersih,
  typecheck/lint/build PASS. Belum di-commit/branch.
- **Catatan**: bila masih terlihat tidak konsisten, kemungkinan membuka aplikasi
  terpasang `/Applications/RS OmniTools.app` (v2.0.0 — LAMA, tanpa perubahan
  ini) atau window dev yang belum di-reload. Semua perbaikan ada di window dev
  (localhost:5173); aplikasi terpasang perlu di-build ulang.

## Perubahan Terbaru (2026-08-16 — ASISTEN AI MULTI-PROVIDER: GEMINI + OPENAI GPT)

**Permintaan user: Asisten AI Performa Kampanye tidak hanya memakai kunci
Gemini — tambahkan kunci OpenAI (GPT); user bisa MEMILIH AI mana yang dipakai.**

- **Config main** (`electron/main/config.ts`): tambah `openaiApiKey` +
  `aiProvider: 'gemini' | 'openai'` (default `gemini`), dibaca/ditulis
  `getConfig`/`setConfig`.
- **Engine** (`electron/main/engine/campaign.ts`):
  - `getOpenaiApiKey/setOpenaiApiKey`, `getAiProvider/setAiProvider`,
    `getAiSettings/setAiSettings` (provider + kedua kunci).
  - Helper bersama `buildContext` + `buildUserQuery` (dipakai kedua provider).
  - `analyzeWithOpenAI` (REST `api.openai.com/v1/chat/completions`, model
    `gpt-4o-mini`, Authorization Bearer, system prompt sama) + `analyzeWithAI`
    dispatcher → jalankan provider terpilih.
- **IPC** (`electron/main/index.ts` + `preload` + `global.d.ts`): ganti
  `ai:getKey/ai:setKey` → `ai:getSettings/ai:setSettings`; `ai:analyze` →
  `analyzeWithAI`.
- **Renderer** (`CampaignView.tsx` + `AiAdvisor.tsx`):
  - State `aiProvider` + `openaiKey`; muat `getAiSettings` saat mount;
    `handleSaveAiSettings` simpan provider + kedua kunci.
  - Modal Settings: selector **"Provider AI"** (Gemini / OpenAI GPT) + input
    Kunci Gemini + Kunci OpenAI (keduanya), tombol Simpan.
  - `AiAdvisor` menerima prop `aiProvider` → header "Gemini Active"/"OpenAI GPT
    Active" + pesan error & nama kunci dinamis per provider.
- **Verifikasi CDP Electron** (restart dev agar main/preload baru termuat):
  `getAiSettings/setAiSettings` tersedia; roundtrip set provider+key OK;
  dispatcher error: Gemini → "Kunci Gemini belum diatur (GEMINI_API_KEY)",
  OpenAI → "Kunci OpenAI (GPT) belum diatur (OPENAI_API_KEY)"; header "Gemini
  Active". `get_errors` bersih, typecheck (node+web)/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — SETTINGS AI: INPUT KUNCI SESUAI PROVIDER + FOOTER SIMPAN)

**Permintaan user: yang tampil harus input API key sesuai provider terpilih
(bukan keduanya); tombol Simpan seharusnya satu, bukan menempel di input GPT.**

- **FIX** (`CampaignView.tsx`, modal Settings):
  - Hanya tampilkan input kunci provider yang dipilih — `aiProvider === 'openai'
    ? input Kunci OpenAI (GPT) : input Kunci Gemini` (kondisional).
  - Tombol Simpan dipindah ke **footer** modal (satu tombol Simpan + Batal,
    border-t, pola kanonik) — bukan menempel di input GPT.
- **Verifikasi CDP Electron**: provider Gemini → hanya "Kunci Gemini"
  (`hasOpenai:false`); provider OpenAI → hanya "Kunci OpenAI (GPT)"
  (`hasGemini:false`); tepat 1 tombol Simpan + Batal + footer border-t.
  `get_errors` bersih, typecheck (node+web)/lint/build PASS.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — Audit UI Halaman Performa Kampanye)

**Audit forensik konsistensi desain halaman "Performa Kampanye" vs halaman lain
(Pembersih/Pengunduh) → akar masalah ditemukan & diperbaiki.**

- **Akar masalah**: halaman kampanye memakai pola UI yang menyimpang dari design
  system — (1) shell halaman scroll penuh tanpa `pt-16`/`z-10`/`min-h-0`; (2) kartu
  header besar di atas; (3) tab track putih, tombol `text-xs`, rata-kiri, pill
  gradient; (4) tombol primer `rounded-xl` gradient; (5) `<input>`/`<select>`
  native (profil, workspace) alih-alih komponen Floating; (6) toolbar 5 tombol
  + select native alih-alih tombol ikon kanonik.
- **Perbaikan** (hanya renderer, `src/views/CampaignView.tsx`):
  - Shell halaman kanonik: `flex-1 flex flex-col min-h-0 relative z-10` +
    konten `pt-16 md:pt-8 px-4 sm:px-6 md:px-8 pb-4`; konten scroll INTERNAL
    (`flex-1 min-h-0 overflow-y-auto`) — halaman tidak scroll penuh lagi.
  - Header ringkas (ikon + judul + subjudul) + aksi kanan: Demo / Impor /
    Pengaturan (wizard), Date Range + Simpan / Ekspor CSV / Bersihkan /
    Pengaturan (dashboard). Kartu header besar dihapus.
  - Tab kanonik: track `bg-slate-100 dark:bg-slate-900`, tombol
    `rounded-lg px-4 py-2 text-sm sm:px-5`, pill solid `bg-blue-600
    shadow-md shadow-blue-600/30` + `layoutId="campaign-tab-pill"`, rata-tengah.
  - Tombol primer "Mulai Proses" → `rounded-lg bg-blue-600 px-3.5 py-2 text-sm`.
  - `<select>` native "Muat Workspace" dihapus → pindah ke modal Pengaturan
    via `FloatingSelect`; input native profil/gemini/workspace → `FloatingInput`
    (modal Pengaturan dirombak: header badge ikon + Profil + Kunci Gemini +
    Nama Workspace + Muat (FloatingSelect) + Ekspor).
  - `ToolbarBtn` → tombol ikon kanonik (`h-9 w-9 rounded-xl border bg-white
    shadow-sm`), konsisten dgn tombol gear Pengunduh.
- **Validasi**: `get_errors` bersih, `npm run typecheck` PASS, `npm run lint`
  PASS, `npm run build` PASS. Verifikasi E2E browser: wizard (header ringkas),
  dashboard (header + tab bar tengah + toolbar ikon), perpindahan tab, modal
  Pengaturan (FloatingInput/FloatingSelect). Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — RANGE DATE PICKER Performa Kampanye)

**Filter tanggal halaman "Performa Kampanye" dirombak menjadi RANGE DATE PICKER**
(desain mengikuti referensi gambar user: preset cepat + dua kalender bulan
berdampingan + input Dari/Sampai + bandingkan periode + Batal/Update).

- **File**: `src/components/campaign/CampaignDateRange.tsx` ditulis ulang total.
- **Trigger**: pill kanonik (ikon `Calendar` + rentang "1 Agt 2026 — 31 Agt 2026"
  atau "Pilih rentang tanggal" + chevron) + tombol ikon Reset (`RotateCcw`) saat
  rentang aktif. Popover via PORTAL ke `<body>` (`position:fixed`, `z-90`,
  right-align ke trigger + clamp viewport), tutup pada klik luar/scroll/Escape,
  reposisi saat resize.
- **Isi popover** (tema app: biru, dark mode, tanpa emoji, lucide icons):
  1. Header pill rentang draft + tombol Tutup.
  2. Daftar preset kiri: **Hari Ini / Kemarin / 7 hari terakhir / Bulan ini /
     Kustom** (aktif = `bg-blue-600`).
  3. Dua kalender bulan berdampingan (Min–Sab, navigasi chevron kiri/kanan,
     hari hari ini ber-ring, start/end `bg-blue-600`, rentang `bg-blue-500/15`).
  4. **Dari / Sampai — FloatingInput** (floating label, ikon `CalendarDays`/
     `CalendarCheck`, helper format, terima input manual DD/MM/YYYY atau
     YYYY-MM-DD dengan clamp agar start≤end; parse di blur).
  5. Checkbox **"Bandingkan dengan periode sebelumnya"** → chip periode
     pembanding (rentang sama panjang sebelum rentang aktif).
  6. Footer: catatan zona waktu + **Batal** (batal) / **Update** (terapkan).
- **Logika tanggal 100% LOKAL** (hindari pergeseran UTC): helper `toISO`/
  `parseISO`/`parseInput`/`formatDisplay`/`formatInput`, `buildMonth` (offset
  hari Minggu), `presetFor`, `previousRange`. State draft lokal, diterapkan ke
  orang tua hanya saat Update → `onChange(start,end)` (string `YYYY-MM-DD`,
  konsisten dengan `filterByDateRange`). Sinkronisasi teks input via helper
  `setDraft` (TANPA setState-in-effect — konvensi react-hooks app).
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS. E2E browser:
  popover render (preset+2 kalender+Dari/Sampai+Bandingkan+Batal/Update),
  preset "Bulan ini" (pill "1 Agt 2026 — 16 Agt 2026", Dari/Sampai terisi),
  Update → filter data diterapkan (0 kampanye utk rentang yg tak cocok),
  Reset → data kembali, pemilihan kustom kalender (1–10 Agt), Bandingkan
  ("22 Jul 2026 — 31 Jul 2026"), input manual Dari/Sampai (parse + clamp),
  dark mode (panel `slate-800`, border `slate-700`). Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — KONSISTENSI TANGGAL + HAPUS JUDUL HEADER)

**Permintaan user: (1) text tanggal tidak konsisten → diseragamkan; (2) icon &
teks "Performa Kampanye" di header dihapus.**

- **Akar masalah tanggal**: range picker memakai singkatan bulan kustom
  ("Agt"), sedangkan tabel harian (`CampaignCharts`) & `formatDateID` memakai
  `toLocaleDateString('id-ID')` yang menghasilkan "Agu" → dua format berbeda
  untuk bulan yang sama.
- **Fix konsistensi** (`src/lib/campaign/format.ts`): tambah konstanta bersama
  `MONTHS_SHORT`/`MONTHS_ID`/`WEEKDAYS_SHORT` (baku "Agt") + `formatDateID`
  (tulis ulang, parsing LOKAL tanpa Intl) + `formatDateFullID`
  ("Jum, 10 Jul 2026"). `CampaignDateRange` mengimpor konstanta tsb (hapus
  duplikasi lokal). `CampaignCharts` tabel harian kini pakai
  `formatDateFullID(row.date)`. Semua tampilan tanggal kini konsisten "Agt".
- **Hapus judul header** (`src/views/CampaignView.tsx`, wizard + dashboard):
  blok ikon `BarChart3` + judul "Performa Kampanye" + subjudul DIHAPUS →
  halaman kini mulai dengan baris aksi kanan (date picker + tombol ikon) lalu
  tab tengah (pola konsisten dgn Pembersih/Pengunduh). Info "Mode Demo"
  dipertahankan sebagai badge kecil di baris aksi dashboard.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS. E2E: judul
  header hilang (h2 kosong, "Performa Kampanye" hanya di sidebar), aksi kanan +
  tab tetap, tabel harian "Jum, 10 Jul 2026", picker pill "1 Agt 2026 —
  16 Agt 2026" tetap konsisten. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — FONT TANGGAL KONSISTEN + TANGGAL MASA DEPAN DITOLAK)

**Permintaan user: (1) font teks "Pilih rentang tanggal" & "Pilih tanggal mulai &
selesai" berbeda dari tema; (2) tanggal masa depan tidak boleh dipilih.**

- **Font**: `font-mono` dihapus dari 3 tempat di `CampaignDateRange.tsx` —
  span trigger ("Pilih rentang tanggal"/rentang), span header pill popover
  ("Pilih tanggal mulai & selesai"/rentang), dan chip periode pembanding.
  Semua tampilan tanggal kini memakai font tema (Plus Jakarta Sans Variable),
  konsisten dengan tabel harian (angka tetap `font-mono`).
- **Tanggal masa depan tidak bisa dipilih** (`CampaignDateRange.tsx`):
  - `DayCell` + `future` flag di `buildMonth` (semua sel, termasuk sel blank).
  - Tombol hari: `disabled={c.future}` + `aria-disabled` + gaya redup
    `cursor-not-allowed text-slate-300 dark:text-slate-600`.
  - Input manual Dari/Sampai: tanggal masa depan di-**clamp ke hari ini**
    saat blur (`parsed > today → today`), sehingga tidak ada rentang masa depan
    yang bisa diterapkan.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS. E2E: font trigger
  & header = `Plus Jakarta Sans Variable` (sama dgn body), 55 sel masa depan
  `[disabled]` (17–31 Agt + seluruh Sep + blank), input "01/12/2026" → clamp
  "16/08/2026" (pill "16 Agt 2026 — 16 Agt 2026"). Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — BULAN BERJALAN DI POSISI KANAN PICKER)

**Permintaan user: default bulan berjalan pada range picker harus di KANAN
(sebelumnya di kiri).**

- **Akar masalah**: `viewYear/viewMonth` picker adalah bulan KIRI, dan anchor
  default memakai bulan `dateStart` (atau hari ini) → bulan berjalan tampil di
  kiri; preset "7 hari terakhir" juga menaruh view di bulan mulai.
- **Perbaikan** (`CampaignDateRange.tsx`): `viewYear/viewMonth` kini = bulan
  KANAN (utama); bulan kiri = sebelumnya (`firstYear/firstMonth`). Anchor
  default = bulan `dateEnd` (atau hari ini). Preset "7 hari terakhir" &
  "Bulan ini" menaruh view di bulan akhir (hari ini). Navigasi chevron tetap
  menggeser pasangan bulan bersama-sama.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS. E2E: buka picker
  → kiri "Juli 2026", kanan "Agustus 2026" (bulan berjalan); preset "7 hari
  terakhir" → tetap [Juli, Agustus]; chevron berikutnya → [Agustus, September].
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — TAB KAMPANYE DI BAWAH KPI + STICKY)

**Permintaan user: kembalikan 4 tab (Ringkasan & Grafik / Kampanye / Tidak
Terpetakan / Asisten AI) ke bawah bagian KPI (Total Klik Iklan, Total Klik
Shopee), lalu jadikan STICKY — saat scroll dan tab menyentuh atas (tepat di
bawah header/baris aksi), tab menempel di sana.**

- **Perubahan** (`src/views/CampaignView.tsx`, dashboard):
  - Tab DIHAPUS dari posisi atas (setelah baris aksi) — baris aksi kini langsung
    diikuti konten scroll.
  - Tab DIPINDAHKAN ke dalam konten scroll, tepat SETELAH `CampaignMetrics` (KPI).
  - Tab dibungkus strip **`sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm
    dark:bg-slate-900/95 py-3`** (bg menyamai area konten `bg-slate-50
    dark:bg-slate-900`) → saat konten digulir, strip menempel di atas scroll
    container dan konten tab mengalir di bawahnya.
- **Catatan**: sticky aktif bila ada cukup konten di bawah tab (dengan data
  nyata/tabel harian panjang, pasti aktif; terverifikasi di viewport pendek
  → strip `top:0`).
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS. E2E: tab
  berada setelah KPI (offset awal 1452px), `position: sticky`, saat scroll
  strip menempel `top:0` (tabTopRel 0), perpindahan tab tetap berfungsi
  (tabel Kampanye tampil), bg strip dark `oklab(0.208 … / 0.95)`.
  Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — POSISI/UKURAN STICKY TAB DIKETATKAN)

**Permintaan user: saat sticky, posisi tab kurang tinggi sedikit → sesuaikan
posisi & ukuran strip sticky.**

- **Akar masalah**: strip sticky memakai padding `py-3` (12px atas/bawah) →
  saat menempel di `top:0`, pill tab berada 12px dari tepi atas (terasa rendah)
  dan strip terlalu tinggi.
- **Perbaikan** (`CampaignView.tsx`): padding strip sticky `py-3` → `py-1.5`
  (6px) → saat sticky pill kini 6px dari atas (lebih tinggi) dan strip lebih
  ramping.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS. E2E: pill
  sticky `top` 12px → **6px**, tinggi strip 70px → **58px**, natural position
  tetap (1495px), sticky tetap menempel `top:0`. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — STICKY TAB BENAR-BENAR MENEMPEL + CHECKBOX STATUS)

**Permintaan user: (1) posisi tab sticky masih kurang atas; (2) checkbox di
filter status pesanan shopee berdempetan dengan status → harus di kanan.**

- **Akar masalah sticky (audit ketat)**: strip sticky sudah `top:0` & pill 6px,
  TAPI dengan konten di bawah tab yang pendek (data demo), tab tidak pernah
  mencapai paling atas → berhenti ~91px → terlihat "kurang tinggi". FIX:
  konten tab diberi **`min-h-[calc(100dvh-6rem)]`** agar SELALU setinggi
  viewport → tab benar-benar menempel ke puncak (strip `top:0`, pill `py-1`=4px).
- **Akar masalah checkbox**: audit DOM membuktikan checkbox SUDAH di kanan
  (`justify-between`, gap ~96px) — perbaiki agar lebih tegas & jelas: tambah
  `gap-2` (jarak minimum 8px), status `min-w-0 truncate`, checkbox `shrink-0`,
  dan latar terlihat saat belum terpilih (`bg-white dark:bg-slate-800`).
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS. E2E: dengan
  data demo pun `stuckAtTop:true` (strip `top:0`, pill `4px`), scroll cukup
  (2248px); checkbox kanan 13px dari tepi kartu, gap 116px dari status,
  `gap:8px` terpasang. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — AKAR MASALAH CHECKBOX: UA `align-items` BUTTON)

**Permintaan user: checkbox status masih berdampingan status & tab masih kurang
atas; user melihat perbedaan antara localhost (benar) vs Electron (tidak).

- **Inspeksi CDP renderer Electron asli membuktikan**:
  - Browser (Chromium baru): `<button>` computed `align-items: normal` (→ stretch)
    → header row full-width → checkbox di kanan.
  - Electron (Chromium UA lama): `<button>` computed `align-items: flex-start`
    → header row **shrink-to-fit** (86px vs 230px) → `justify-between` tanpa
    ruang → checkbox berdampingan status.
- **Akar masalah**: UA Chromium/Electron menetapkan `align-items: flex-start`
  pada elemen `<button>`. Button status card (`flex flex-col`) tidak punya
  `items-*` eksplisit → row menyusut.
- **Fix root-cause** (`src/assets/main.css` @layer base): tambah
  `button { align-items: stretch }` → semua tombol flex berperilaku standar
  (stretch), konsisten di browser & Electron.
- **Tab sticky**: diverifikasi via CDP Electron `stripTop:0` & `pillTop:4`
  (menempel puncak) — sebelumnya user melihat window Electron STALE (belum
  direstart). Setelah restart fresh, semua perubahan termuat.
- **Validasi**: typecheck/lint/build PASS; CDP Electron — checkbox kanan
  (13px dari tepi, gap 126px), `align-items:stretch`, row 204px; tab sticky
  `pillTop:4`. Belum di-commit/branch.

## Perubahan Terbaru (2026-08-16 — KONTEN TAB RESPONSIF: HAPUS RUANG KOSONG)

**Permintaan user: scrollbar sampai bawah tapi ada area kosong yang sangat
banyak; halaman harus mengikuti fundamental aplikasi = SUPER RESPONSIF (tanpa
ruang kosong artifisial).**

- **Akar masalah**: fix sticky sebelumnya memberi konten tab
  `min-h-[calc(100dvh-6rem)]` (agar tab selalu menempel puncak) → blok konten
  DIPAKSA setinggi viewport (761px) padahal isi asli (tabel) hanya 480px →
  muncul area kosong besar (±281px) di bawah konten → scrollbar turun jauh
  melewati akhir konten.
- **Perbaikan** (`src/views/CampaignView.tsx`): konten tab
  `min-h-[calc(100dvh-6rem)]` → **`min-h-0`** (tinggi konten tab mengikuti isi,
  TANPA area kosong artifisial). Tidak menambah min-height viewport.
- **Audit CDP renderer Electron (ketat)**:
  - Overview: konten 628px, `min-height:0px`, gap dalam tab 0 → natural.
  - Kampanye: tabel `h-[480px]` (container scroll internal), struktur natural
    berakhir tepat di 2008px.
  - Asisten AI: konten 520px, `min-height:0px`, gap 0 → natural.
  - Scrollbar berakhir TEPAT di akhir konten — tidak ada ruang kosong.
- **Trade-off sticky (disengaja)**: sticky tab hanya aktif bila konten di bawah
  tab ≥ tinggi viewport (data nyata / tabel panjang). Dengan data demo pendek,
  tab berhenti ~307px (tidak sampai top-0) — TANPA memaksa ruang kosong. Ini
  sesuai prioritas user (responsif > sticky). JANGAN kembalikan min-height
  viewport.
- **Validasi**: `get_errors` bersih, typecheck/lint/build PASS; CDP Electron
  semua tab natural tanpa celah. Belum di-commit/branch.

## Status Rilis v1.5.0 (SELESAI — LIVE 2026-08-16)

- **PR #30** ke `main` **MERGED** (merge commit `53ce562`) — fitur Performa
  Kampanye lengkap. Tag `v1.5.0` + GitHub Release + 4 artefak (nama lama
  `RS-OmniClip-1.5.0-*`) sudah live.
- **PR #31** (release v1.5.0) **MERGED** (merge commit `b8a73ba`).

## FITUR BARU: Performa Kampanye (SELESAI — MERGED via PR #30)

- **Acuan pengerjaan**: `docs/IMPLEMENTATION_PERFORMA_KAMPANYE.md` (9 fase).
- **Menu sidebar baru "Performa Kampanye"** (`activeMenu: 'performa'`, ikon
  `BarChart3`) — analisis Meta Ads vs komisi Shopee Affiliate: pencocokan tag
  otomatis (contains/exact), tabel kampanye (search/sort/badge Winning-BEP-Boncos),
  KPI + PPN dinamis, grafik recharts, diagnostik kolom, data tidak terpetakan,
  AI advisor (via main process). TANPA auth/login.
- **Status validasi**: `get_errors` bersih, `eslint src/ electron/` PASS,
  `npm run typecheck` PASS, `npm run build` PASS, verifikasi E2E browser
  (wizard, demo data, dashboard, tabel+search+badge, unmapped, AI UI).
- **File baru (renderer)**: `src/lib/campaign/{types,csv,dataProcessor,demoData,format}.ts`,
  `src/views/CampaignView.tsx`, `src/components/campaign/{CampaignTable,CampaignMetrics,
  CampaignCharts,CampaignDateRange,DiagnosticsPanel,UnmappedSection,AiAdvisor}.tsx`.
- **File baru (main)**: `electron/main/engine/campaign.ts` (workspace store
  `userData/analytics/*.json` + Gemini `ai:analyze`).
- **File diubah**: `src/App.tsx`, `src/lib/preferences.ts`, `src/types/global.d.ts`,
  `electron/main/config.ts` (+`geminiApiKey`), `electron/main/index.ts`,
  `electron/preload/index.ts`. Deps baru: `papaparse`, `recharts`.
- **Catatan**: AI memakai `GEMINI_API_KEY` di Pengaturan (config main, bukan login);
  tanpa kunci, seluruh tabel/grafik tetap berfungsi (AI graceful error).
- **Status**: MERGED ke `main` (PR #30, merge commit `53ce562`); rilis v1.5.0 sedang diproses.

## Status Rilis v1.4.2 (SELESAI — RELEASE v1.4.2 DIPUBLIKASI)

- **Branch**: `release/v1.4.2` (dari `main`). **Versi**: `1.4.2`.
- **PR #29** ke `main` **MERGED** (merge commit `32f319f`, 2026-08-16).
- **Tag**: `v1.4.2` dibuat di commit merge `32f319f` + dipush.
- **GitHub Release v1.4.2 DIBUAT** dengan catatan rilis lengkap + **4 artefak**:
  `RS-OmniTools-1.4.2-arm64.dmg`, `RS-OmniTools-1.4.2-arm64.zip`,
  `RS-OmniTools-1.4.2-x64-setup.exe`, `RS-OmniTools-1.4.2-x64-portable.exe`.
- **Isi baru vs v1.4.1**: modal notifikasi update otomatis (`UpdateModal.tsx`)
  + catatan rilis Markdown. Alasan bump: artefak v1.4.1 dibuat sebelum modal
  update; agar modal update terpicu, versi harus lebih tinggi dari 1.4.1.
- **Catatan rilis**: `release-notes/RELEASE_NOTES_v1.4.2.md`.

## Perubahan Terbaru (2026-08-16)

### Modal Notifikasi Update (branch `feat/update-modal`, belum commit)
- Komponen baru `src/components/UpdateModal.tsx` — muncul **sekali per sesi** saat
  ada versi baru (`hasUpdate`), setelah app siap. Isi: versi `v{current} → v{latest}`,
  **catatan rilis dirender Markdown**, tombol **"Unduh Sekarang"** (buka halaman
  rilis GitHub) & **"Nanti"**. Pola modal konsisten (AnimatePresence + exit halus).
- Wiring di `App.tsx`: state `hasPromptedUpdate` + nilai turunan `updateModalOpen`
  (tanpa effect → bebas warning react-hooks). tsc/lint/build PASS.

## Perubahan Terbaru (2026-08-15, SUDAH COMMIT + RILIS v1.4.1)

### Catatan Rilis dirender sebagai Markdown
- Bagian **Catatan Rilis** di halaman Tentang & Update kini dirender sebagai
  **Markdown** (bukan `<pre>` mentah): dependensi baru `react-markdown` +
  `remark-gfm`, komponen `src/components/Markdown.tsx` (gaya konsisten tema:
  heading, list, bold, kode, link, kutipan, tabel, task list). E2E: h2/li/strong
  ter-render sebagai elemen HTML, tanpa `##`/`**` mentah. tsc/lint/build PASS.

### Desain & Animasi (commit `295c831`)
- Tabel super responsif & konsisten (body tabel scroll internal, header sticky,
  halaman tidak scroll); komponen antrean per tab (`DownloadQueue` /
  `ScrapeDownloadProgress`) + pelacakan asal unduhan; exit animation halus
  (AnimatePresence) untuk modal, toast, tabel, overlay; perbaikan select portal.

## Status Rilis v1.4.1 (SELESAI — RELEASE v1.4.1 DIPUBLIKASI) — 5 Fitur Besar

- **Branch**: `release/v1.4.1` (dari `release/v1.3.4`). **Sudah di-push** ke
  origin (`93cf0dd..b50e3b8`).
- **Versi**: `1.4.1`.
- **PR #26** ke `main` **MERGED** (merge commit `9b000e2`, 2026-08-15) — bukan
  squash.
- **Tag**: `v1.4.1` dibuat di commit merge `9b000e2` + dipush.
- **GitHub Release v1.4.1 DIBUAT** dengan catatan rilis lengkap + **4 artefak**:
  `RS-OmniTools-1.4.1-arm64.dmg`, `RS-OmniTools-1.4.1-arm64.zip`,
  `RS-OmniTools-1.4.1-x64-setup.exe`, `RS-OmniTools-1.4.1-x64-portable.exe`.
- **Catatan rilis**: `release-notes/RELEASE_NOTES_v1.4.1.md`.
- **Referensi pengerjaan**: `docs/IMPLEMENTATION_v1.4.md` (semua keputusan teknis).
- **Semua 5 fitur SELESAI diimplementasi & DIVALIDASI** (tsc/lint/build PASS +
  E2E Electron+CDP nyata). File baru: `electron/main/config.ts`, `media.ts`,
  `engine/queue.ts`, `engine/proxy.ts`, `engine/analytics.ts`, `engine/watcher.ts`,
  `src/components/ProxyManager.tsx`, `HistoryView.tsx`, `WatcherPanel.tsx`,
  `MediaPreviewModal.tsx`.

### Fase 0 — Fondasi
- **Config store main process** (`config.ts`): `AppConfig` lengkap (proxy,
  watcher, hwAccel, analyticsExport, history) tersimpan di
  `userData/omni-config.json`; tulis ATOMIK (tmp+rename); `getConfig()/setConfig()/
  appendHistory()/clearHistory()` (cap 500). IPC `config:get`/`config:set`.
- **Queue manager** (`engine/queue.ts`): `enqueueBatch()` — batch unduhan FIFO
  serial (manual + watcher tidak bentrok); `source: 'manual'|'watcher'`.

### Fase 1 — Preview Inline + Riwayat
- **`media://` protocol** (`media.ts`): `registerSchemesAsPrivileged` SEBELUM
  ready; handler dgn dukungan **Range (206)** utk seek; helper
  `mediaUrlForFile()`. CSP `media-src` ditambah `media:` di `src/index.html`.
- **Preview baris antrean unduhan**: baris sukses punya tombol "Putar" →
  `MediaPreviewModal` (`src={media://...}`) — terverifikasi putar + seek.
- **Tab Riwayat** (`HistoryView.tsx`): list entri (judul/platform/waktu) +
  tombol "Putar" (media://) + "Bersihkan Riwayat" (ConfirmModal `clearHistory`).
  Riwayat dicatat otomatis saat unduhan sukses (`appendHistory` di main).

### Fase 2 — Proxy Manager (Anti-Banned)
- **`engine/proxy.ts`**: `normalizeProxy()`, `proxyAgentFor()` (HttpsProxyAgent/
  SocksProxyAgent), `validProxies()`, `currentProxy()/nextProxy()` (rotasi
  counter), `resetRotation()`, `testProxy()` (api.ipify.org, latensi).
- **Integrasi**: `DownloadOptions.proxy` → `buildDownloadArgs` (`--proxy`),
  `getDirectUrl`, TikWM `getRequest`/`resolveTikTokInfo`/`downloadVideoUrl`,
  `downloadSingle` memakai `nextProxy()` saat proxy aktif. E2E: proxy save/test
  jalan; UI di modal Pengaturan (textarea daftar proxy, toggle, rotasi tiap N,
  tombol tes per baris, catatan IG/FB butuh residential).
- **⚠️ FIX KRITIS (2026-08-15)**: `https-proxy-agent@9` & `socks-proxy-agent@10`
  adalah ESM-only → main process electron-vite (CommonJS) crash
  `ERR_REQUIRE_ESM`. FIX: turunkan ke **`https-proxy-agent@7.0.6`** &
  **`socks-proxy-agent@8.0.5`** (CommonJS) — verifikasi `require()` jalan.

### Fase 3 — Hardware Acceleration (GPU)
- **`detectEncoders()`** (`ffmpeg.ts`): spawn `ffmpeg -encoders` → grep
  h264_videotoolbox/nvenc/amf (cache per sesi). IPC `hw:detect`.
- **`processor.ts`**: `processBatch(files, preset, onProgress, hwAccel='auto')`;
  `buildArgSets`/`buildEnhance` + helper `encoderCrfArgs`/`encoderBitrateArgs`
  (videotoolbox `-q:v 60`, nvenc `-cq`, amf `-qp_i/-qp_p`). Set HW dicoba dulu,
  fallback berjenjang ke `libx264`. Preset `metadata` (`-c copy`) tak terpengaruh.
- UI modal Pengaturan: dropdown "Pemrosesan Hardware" hanya menampilkan encoder
  TERDETEKSI. E2E: `detectEncoders()` → `['videotoolbox']` di Mac; dropdown
  menampilkan "Apple VideoToolbox (Mac)".

### Fase 4 — Pemisah Data Analitik (CSV Exporter)
- **`engine/analytics.ts`**: `AnalyticsRecord`, `csvEscape()` (RFC 4180),
  `parseHashtags()`, `writeAnalyticsCsv()` (BOM utk Excel, nama unik),
  `exportScrapeToCsv()`. Kolom: platform,url,id,title,views,likes,comments,
  caption,hashtags,duration_seconds,uploaded_at.
- **Capture engagement**: `--print` scrape diperluas dgn
  `%(view_count)s\t%(like_count)s\t%(comment_count)s\t%(description)s` (parse
  `NA`→undefined); `ScrapeItem` + `views/likes/comments/description`.
- IPC `analytics:export` → tulis `analytics-YYYY-MM-DD.csv` di folder Unduhan.
- UI: toggle "Ekspor Data Analitik ke CSV" di kartu Akun/Halaman (persist di
  config `analyticsExport`); otomatis mengekspor setelah "Ambil Daftar" + toast
  path. E2E: roundtrip config true/false, toggle+hint render.

### Fase 5 — Auto-Watcher
- **`engine/watcher.ts`**: `WatchedAccount` (url,label,lastSeenId,
  lastCheckedAt,lastFoundAt); `startWatcher()/stopWatcher()` (setInterval
  intervalHours, IDEMPOTENT — hanya saat app terbuka, tidak ada tray/auto-start);
  `checkAccountOnce()` — `scrapeAccount(url, {}, 3)` (fetchLimit kecil),
  bandingkan `items[0].id` vs `lastSeenId`; tick pertama = set cursor saja
  (tanpa unduh lama); posting baru → `enqueueBatch(source:'watcher')` →
  auto-clean `processBatch(...,'metadata')` → native `Notification` +
  emit `watcher:notify` (toast).
- `scrapeAccount` mendapat param **`fetchLimit`** (default 200; watcher pakai 3).
- IPC: `watcher:add/remove/list/setEnabled/setInterval/checkNow`; event
  `watcher:notify`. Config berubah → `startWatcher()` (restart interval).
- UI `WatcherPanel.tsx` di mode Akun/Halaman: toggle aktif, input interval (jam),
  tambah akun (URL+label), daftar akun (label/platform/url/status waktu + badge),
  tombol "Cek Sekarang" (semua/per akun), hapus akun. E2E: add→list→remove
  roundtrip OK; panel + semua kontrol render (tanpa overflow).

### Validasi & E2E (2026-08-15)
- `npm run typecheck` (node+web) PASS; `npx eslint src/ electron/` EXIT:0;
  `npm run build` PASS.
- E2E via CDP ke window Electron nyata (port 9222): seluruh `window.api` +
  metode baru (config/history/proxy/hw/analytics/watcher) ada; config roundtrip;
  `detectEncoders`→`['videotoolbox']`; watcher add/list/remove; UI mode
  Akun/Halaman merender WatcherPanel + toggle CSV + kartu; modal Pengaturan
  menampilkan Hardware (VideoToolbox) + Proxy (Manajer/Rotasi); **tanpa
  overflow horizontal & tanpa emoji** (anti AI-slop dipertahankan).
- **Operasional**: dev server dijalankan dgn `env -u ELECTRON_RUN_AS_NODE npm
  run dev` (env sandbox menyuntik `ELECTRON_RUN_AS_NODE=1` → electron jalan sbg
  node → `protocol` undefined). Launch Electron CDP: `npx electron .
  --remote-debugging-port=9222 --user-data-dir="$TMPDIR/rs-omnitools-cdp"`
  (unsandboxed).

### Penyempurnaan Auto-Watcher + CSV (2026-08-15, belum commit)
1. **Auto-Watcher pindah ke TAB ke-3 "Pantau Akun"** di halaman Pengunduh (sebelum
   Riwayat; urutan: Banyak Link / Akun·Halaman / Pantau Akun / Riwayat). Badge
   header menampilkan jumlah akun.
2. **Toast toggle CSV** — toggle "Ekspor Data Analitik" kini memberi notifikasi
   saat diaktifkan/dimatikan.
3. **Konfirmasi hapus akun** — tombol hapus di daftar akun membuka modal
   `ConfirmModal` type `removeAccount` ("Hapus Akun dari Auto-Watcher?").
4. **Validasi akun + detail profil** — tombol "Periksa" memanggil IPC baru
   `watcher:resolve` (via `resolveAccount`): duplikat → toast "sudah dipantau";
   ada → kartu profil (avatar, nama, @username, pengikut, bio, platform) +
   tombol "Pantau Akun Ini"; tidak ada/tak terverifikasi → pesan jujur.
   Resolver: yt-dlp `--dump-single-json` (`resolveAccountInfo` di downloader.ts)
   + SSR profil TikTok (`resolveTikTokProfile` di tiktok.ts, best-effort).
5. **Deteksi duplikat** — `watcher:add`/`watcher:resolve` mendeteksi URL yang
   sudah dipantau → toast akurat (sebelumnya toast "ditambahkan" selalu muncul).
   `WatchedAccount` diperluas: name/username/avatar/followers/bio/platform.
- E2E terverifikasi: tab ke-3 urut benar; toast CSV muncul; modal hapus + akun
  benar-benar terhapus; resolve akun fiktif → exists:false; resolve `@YouTube`
  → exists:true + detail (46 Jt pengikut); duplikat terdeteksi; profil tersimpan.
  typecheck/eslint/build PASS.

### Perbaikan lanjutan Auto-Watcher + CSV (2026-08-15, belum commit)
1. **Toggle CSV diletakkan DI SAMPING KANAN judul** "Ambil Video dari Akun /
   Halaman" (satu baris, `flex-wrap` + `ml-auto`), label ringkas **"Ekspor
   analitik"** — tidak memakan tempat terpisah. (E2E: sameRow:true, toRight:true.)
2. **Panel "Pantau Akun" terkunci saat nonaktif** — bila Auto-Watcher OFF, hanya
   header + toggle + notice terkunci (Lock) yang tampil; SEMUA aksi (interval,
   tambah akun, Periksa, Cek Sekarang, hapus) disembunyikan sampai diaktifkan.
3. **Error cek akun TikTok kini ramah** — akar masalah teraudit: extractor
   yt-dlp TikTok rusak GLOBAL (bot-detection, isu #17403) → `scrapeAccount`
   gagal `[tiktok:user] Unable to extract secondary user ID`. `friendlyScrapeError`
   kini mendeteksi pola ini → pesan jujur Bahasa Indonesia ("TikTok memblokir
   pemeriksaan akun otomatis... gunakan YouTube/platform lain"). `checkAccountOnce`
   juga mencatat `lastCheckedAt` walau gagal (status "Terakhir cek" akurat).
- **BATASAN JUJUR**: Auto-Watcher TIDAK dapat memantau akun TikTok sampai
  extractor yt-dlp diperbaiki (di luar kendali app); YouTube/platform lain
  berfungsi. TikWM hanya melayani video per-URL, bukan feed profil.
- E2E terverifikasi: toggle CSV di atas input (y 207 < 240); panel terkunci saat
  off (Periksa/Cek/tambah form tersembunyi); error TikTok kini pesan ramah
  (bukan kriptik). typecheck/eslint/build PASS.

### Perombakan Total Preset — 2 Tab + Beberapa Select Detail + Toggle Metadata (2026-08-15, belum commit)
- **UI baru (anti-ambigu)**: grid kartu prasetel DIHAPUS. Kini ada **2 tab
  mode** ("Privasi Cepat (Tanpa Efek)" ikon `ShieldCheck` / "Penjernihan
  Maksimal" ikon `Focus`) dengan **pill aktif BIRU yang GESER** (layoutId
  `cleaner-mode-pill`, spring) — desain TETAP khas Pembersih (track
  `rounded-xl` mengikuti tema, tombol `rounded-lg` `text-sm`), hanya EFEK
  GESER yang diadopsi dari tab Pengunduh. Tab Pengunduh nantinya akan
  mengikuti desain tab Pembersih ini. Di dalamnya **beberapa select detail**
  (semua berikon sesuai: Prasetel `MonitorUp`, Kualitas `Gem`, Audio
  `AudioLines`):
  1. **Prasetel** — opsi berubah sesuai tab (mode): tab Cepat → "Kualitas
     Asli (Salin)", "HD 720p (Cepat)", dst. (deskripsi: tanpa efek/cepat);
     tab Jernih → "Kualitas Asli (Jernih)", "HD 720p (Jernih)", dst.
     (deskripsi: penajaman & perbaikan warna). Semua opsi menampilkan
     **judul + deskripsi rinci** (FloatingSelect diperluas: `description`).
  2. **Kualitas** — Otomatis (Seimbang) / Kualitas Terbaik / Seimbang /
     Kompak (File Kecil) → memetakan preset x264 + CRF.
  3. **Audio** — Pertahankan Asli / AAC 128 / 192 / 256 kbps.
  4. **Toggle "Hapus Metadata & GPS"** (Ya/Tidak, default ON) — opsi eksplisit
     buang metadata/GPS (sebelumnya selalu dibuang tanpa kontrol).
- **Ikon petir (`Zap`) & AI (`Sparkles`) DIHAPUS** dari tab; komponen kartu
  `PresetSelector.tsx` dihapus (kode mati).
- **Backend**: `ProcessOptions { hwAccel, processingMode, cleanMetadata,
  quality, audio }` di `processBatch`; `buildArgSets(preset, input, output,
  info, hwAccel, processingMode, cleanMetadata, quality, audio)`.
  `common = -y -i <in> [+ -map_metadata -1 bila cleanMetadata]`. Helper baru:
  `crfForQuality`, `x264QualityArgs`, `audioModeArgs`. Kualitas Asli privacy +
  audio original → `-c copy`; audio diubah → re-encode audio saja (`-c:v copy`).
  Helper WhatsApp dihapus. Preferensi baru: `omni.processingMode`,
  `omni.cleanMetadata`, `omni.cleanerQuality`, `omni.cleanerAudio`.
- **Mode `privacy`** (cepat, tanpa filter berat): Kualitas Asli → `-c copy`
  (instan); HD/FullHD/4K → `scale` (short-side=target, contoh 720p→1280×720)
  + `libx264 veryfast`; Vertikal → pad-blur 9:16 + `libx264 veryfast`.
- **Mode `enhance`** (wajib re-encode, pipeline jernih):
  `atadenoise=0a=0.04:0b=0.04 → [scale long-side + lanczos] → cas=0.7 →
  eq(saturation=1.15:contrast=1.04)`; encoder CRF (hwAccel-aware, fallback
  x264), kualitas/audio ikut select.
- **Vertikal 9:16 pad-blur** (`VERTICAL_PAD_BLUR`): konten utuh di tengah,
  latar blur (bukan hitam). Termasuk `crop=1080:1920` agar dimensi genap
  (libx264 yuv420p) — diverifikasi langsung dgn ffmpeg.
- **E2E terverifikasi (CDP 9222)**: 2 tab berikon (`iconPerTab [1,1]` —
  ShieldCheck/Focus, bukan Zap/Sparkles), pill aktif biru `bg-blue-600`
  bergeser antar tab (`layoutId cleaner-mode-pill`, verifikasi posisi pill
  pindah saat switch), 3 select berikon (`selectIconCounts [2,2,2]` =
  ikon+chevron), toggle Hapus Metadata tampil, grid kartu hilang;
  opsi Prasetel BENAR-BENAR berbeda antar tab (Jernih vs Salin/Cepat); dark
  mode: track slate-900 + panel slate-800. 5 job nyata PASS: privacy+archive
  (auto/original)→640×360 copy, privacy+fullhd (compact/aac128)→1920×1080,
  enhance+fullhd (best/original)→1920×1080, enhance+vertical
  (cleanMetadata=false/aac192)→1080×1920 **metadata PERTAHAN**, privacy+archive
  (aac256)→640×360 audio aac. typecheck/eslint/build PASS.

### Konsistensi UI Halaman Pengunduh (2026-08-15, belum commit)
- Header teks **"Unduh Video" + badge jumlah DIHAPUS** — halaman Pengunduh kini
  konsisten dgn Pembersih (tanpa header teks; dimulai langsung dari tab).
- Tab mode Pengunduh (Banyak Link / Akun·Halaman / Pantau Akun / Riwayat)
  dirombak mengikuti **desain tab Pembersih**: track `rounded-xl` mengikuti
  tema (`bg-slate-100 dark:bg-slate-900`), tombol `rounded-lg` `text-sm`,
  pill aktif **biru `bg-blue-600` geser** (`layoutId downloader-mode-pill`),
  ikon `h-4 w-4`.
- Tombol **Pengaturan Unduhan** (gear) dipindah ke pojok kanan atas, sejajar
  tab (tetap berfungsi + badge).
- State `watcherAccountCount` + chain `getWatcherConfig` dihapus (hanya dipakai
  badge lama yang dibuang). E2E CDP: `hasTitle false`, `badgeText false`,
  tab `rounded-xl`/`text-sm`/ikon `[1,1,1,1]`, pill geser (`moved true`),
  `hasGear true`. typecheck/eslint/build PASS.

### Fokus Proses Halaman Pengunduh (2026-08-15, belum commit)
- Saat **download / ambil data (scrape) diproses**, bagian input disembunyikan —
  hanya tampilan proses yang terlihat:
  - **Tab Banyak Link**: kartu "Tempel Banyak Tautan" disembunyikan saat
    `isDownloading || downloads.length > 0` (fokus ke "Antrean Unduhan").
  - **Tab Akun / Halaman**: header + input "Ambil Video dari Akun" disembunyikan
    saat `isScraping || scrapeItems`; diganti header ringkas "Mengambil daftar
    video..." / "Hasil Akun / Halaman" + tombol **Bersihkan**.
- **Tombol "Bersihkan"** (ikon `Trash2`) mengosongkan hasil dan mengembalikan
  bagian input: `clearDownloads()` (antrean) & `clearScrape()` (hasil scrape +
  antrean + error + query). Nonaktif saat proses masih berjalan (`isDownloading`/
  `isScraping`).
- **E2E**: fresh state → input links & scrape tampil; saat download → input
  tersembunyi + antrean + Bersihkan tampil (terverifikasi). typecheck/eslint/
  build PASS.

### UI Antrean Unduhan + Scrollbar Ramping (2026-08-15, belum commit)
- **Aksi antrean (Putar, Buka folder) jadi icon-only horizontal** — tombol teks
  diganti ikon (`PlayCircle`/`FolderOpen`) dengan tooltip (`title` + `aria-label`),
  disusun sejajar (flex row) di kanan kartu. 
- **Klik judul = putar otomatis** — judul item sukses kini `<button>` (hover
  biru); klik membuka `MediaPreviewModal` (`setPreviewLocal`) yang auto-play
  (`VideoPlayer` sudah `autoPlay`). 
- **Scrollbar global didesain ulang** (`src/assets/main.css`, `@layer base`):
  `scrollbar-width: thin` (Firefox) + `::-webkit-scrollbar` 8px, thumb rounded
  (`border-radius 9999px`, `background-clip: content-box`), warna mengikuti
  tema: light `rgb(148 163 184 / .55)` (slate-400), dark `.dark ::-webkit-
  scrollbar-thumb` `rgb(71 85 105 / .7)` (slate-600), + hover.
- **E2E**: scrollbar tervalidasi via computed style (lebar 8px, thumb slate-400
  light / slate-600 dark); unduhan YouTube nyata sukses dgn kode baru
  (download flow OK); typecheck/eslint/build PASS. (Verifikasi DOM item antrean
  dibatasi CDP flaky + HMR reset state in-memory.)

### Redesain Tabel/Daftar Premium + Responsif (2026-08-15, belum commit)
- Semua daftar baris ("tabel") dibuat konsisten & premium, responsif thd ukuran
  aplikasi: **Antrean Unduhan** (App.tsx), **Riwayat** (HistoryView),
  **Hasil Akun list** (ScrapeResultView), **Pantau Akun** (WatcherPanel).
- Pola: header ber-**icon chip + judul + jumlah** (`bg-slate-50/80` +
  `dark:bg-slate-900/40`, `px-4 py-3`); baris `px-4 py-3` + hover
  (`hover:bg-slate-50 dark:hover:bg-slate-700/40`); **thumbnail responsif**
  (`h-12 w-12 sm:h-14 sm:w-14`, `hidden min-[420px]:block` = sembunyi di layar
  sangat sempit) + **overlay play saat hover** (named group `group/thumb`);
  judul hover biru; progress gradien (`bg-linear-to-r from-blue-500 to-blue-600`);
  aksi icon-only horizontal.
- **E2E**: Riwayat header premium tampil; **tanpa overflow horizontal di lebar
  480px** (`scrollWidth == innerWidth`). typecheck/eslint/build PASS.

### Perbaikan Audit Forensik (2026-08-15)
0. **Batasan klik-import dropzone** — sebelumnya `getRootProps()` dipasang di
   SELURUH area utama kanan + `noClick: activeMenu!=='cleaner' || files.length>0`
   → klik di mana pun di halaman Pembersih (termasuk tab, select, toggle) membuka
   dialog import. FIX: `noClick: true` SELALU (root tidak pernah membuka dialog),
   dialog file hanya dari **area drop-zone (empty state)** via `open()`
   (role=button, cursor-pointer, onClick → open). Drag tetap di seluruh area
   utama (noDrag hanya di halaman lain). E2E: klik drop-zone → file input click=1;
   klik tab/select/switch/panel/area → click=0.
1. **CSP `font-src 'self' data:`** (`src/index.html`) — subset Cyrillic font
   Plus Jakarta Sans di-inline Vite sbg `data:font/woff2` → font-src default
   (`default-src 'self'`) memblokirnya → error konsol. Kini font termuat; error
   konsol hilang (E2E diverifikasi).
2. **`tiktok.ts` `getRequest` redirect** — redirect kini meneruskan `agent`
   (proxy aktif), sebelumnya redirect jalan tanpa proxy.
3. **`media.ts` suffix range** — `bytes=-N` (N byte terakhir) ditangani benar
   (`start=size-N`), sebelumnya dibaca sbg `0..N`. Range `0-N`/open-ended tetap
   benar. E2E: <video> media:// readyState 4 + seek 1.5s berhasil (Range 206
   end-to-end).

## Status Rilis v1.3.4 (SEDANG DIKERJAKAN) — redesign UI + prior fixes

- **Branch**: `release/v1.3.4` (BELUM di-push ke remote; menunggu persetujuan
  commit/push dari user).
- **Sudah di-commit lokal** (5 commit):
  - `1bad086` — Fix scrape 429 + Pengaturan Unduhan modal + konsistensi modal.
  - `d3a03a5` — Pindah release note ke folder `release-notes/`.
  - `8afae46` — Responsivitas (grid prasetel 1/2/3, trim flex-wrap, toast, sidebar).
  - `3aacb32` — Penyimpanan lokal preferensi + modal konfirmasi reset.
  - `2b510ad` — Redesign UI v1.3.4 (semua fitur daftar di bawah ini).
- **Redesign v1.3.4** (terkomit di `2b510ad`; rincian di bawah):
  - **Font premium**: Plus Jakarta Sans (variable) via
    `@fontsource-variable/plus-jakarta-sans`; import di `src/main.tsx` + `@theme`
    di `src/assets/main.css`. Build terverifikasi meng-bundle 3 file woff2.
  - **Video player sinematik** (`src/components/VideoPlayer.tsx`): kontrol
    kustom (play/pause, progress played+buffered, waktu, volume, kecepatan
    0.5×–2×, PiP, fullscreen), auto-hide idle, gradasi premium, state
    loading/error/kosong. (Tanpa AnimatePresence — pola proyek.)
  - **Primitif form** (`src/components/ui/`): `FloatingField.tsx`
    (FloatingInput/FloatingTextarea), `FloatingSelect.tsx` (dropdown kustom),
    `FloatingMultiSelect.tsx` (multi-pilih + pencarian + chip), `Toggle.tsx`
    (switch animasi).
  - **Penerapan**: modal Pengaturan Unduhan (FloatingSelect Kualitas/Cookies +
    Toggle paralel + FloatingTextarea Cookie Douyin); App.tsx (FloatingTextarea
    tautan, FloatingInput URL scrape, FloatingMultiSelect hasil scrape, Toggle
    Mode Gelap di Tentang); SortableFileItem (FloatingInput trim Mulai/Selesai).
  - **Pembersihan class Tailwind v4 non-kanonik** (`h-[2px]`→`h-0.5`,
    `z-[70]`→`z-70`, `bg-gradient-to-*`→`bg-linear-to-*`).
  - **Fix dropdown via portal (2026-08-15)**: panel `FloatingSelect` &
    `FloatingMultiSelect` dirender via portal ke `document.body` (position
    fixed, posisi dari bounding rect trigger). Mengatasi: (1) scrollbar jelek
    pada dropdown Kualitas (daftar pendek kini tampil penuh, tanpa `max-h-64`);
    (2) dropdown yang menutupi field Cookies Browser secara berantakan (kini
    latar solid + shadow + z-90, selalu di atas modal). Panel tertutup otomatis
    saat kontainer di-scroll & direposisi saat resize.
  - **Fix mode gelap portal (2026-08-15)**: efek baru di `App.tsx` menyinkronkan
    kelas `dark` ke `document.documentElement` (`<html>`). Sebelumnya `.dark`
    hanya di div root aplikasi, sehingga panel dropdown yang di-portal ke
    `<body>` berada di luar `.dark` dan selalu PUTIH di dark mode. Kini panel
    dropdown ikut gelap di dark mode & putih di mode terang — diverifikasi via
    pengukuran DOM (bg panel dark=`slate-800`/oklch(0.279...), light=`rgb(255,
    255,255)`, teks opsi `slate-200` di dark / `slate-700` di light, tanpa
    scroll, tanpa overlap geometris dengan field Cookies).
  - **Fix overlap label–nilai kosong (2026-08-15)**: dropdown dengan opsi value
    `''` ("Tanpa Cookies") — `floated = open || value.length > 0` membuat label
    tetap di tengah saat nilai kosong → label menimpa teks nilai (overlap ~20px
    terukur via DOM). FIX: `floated = open || !!selected` (label mengambang saat
    ada opsi terpilih) + span nilai kosong saat label di tengah. Terverifikasi
    `glyphOverlapPx: 0`. Sama diterapkan ke `FloatingMultiSelect` (saat kosong).
  - **List/grid hasil "Akun/Halaman" + thumbnail + durasi + preview (2026-08-15)**:
    - Hasil scrape kini **grid kartu / baris list** dengan **toggle Grid/List** +
      pencarian judul (menggantikan dropdown multi-select).
    - **Durasi** dari flat-playlist (tersedia TikTok & YouTube).
    - **Thumbnail lazy**: flat-playlist TikTok = `NA` → resolve per item via IPC
      baru `preview:resolve` (TikWM ~0,5 s, antrean 4 konkuren + cache);
      YouTube = URL deterministik `i.ytimg.com/vi/{id}/hqdefault.jpg`; gagal →
      placeholder.
    - **Modal preview** (pola sama PreviewModal antrean pembersih): klik
      kartu/baris → resolve URL media langsung (`preview:resolve`; TikTok →
      TikWM, lain → yt-dlp `--get-url` format tunggal) → VideoPlayer
      (`src`+`poster` baru).
    - `ScrapeItem` diperluas `thumbnail?`/`duration?`; engine `--print` tambah
      `%(thumbnail)s\t%(duration)s` (parse `NA`).
    - **Fix CSP `media-src` (2026-08-15)**: `media-src 'self' blob:` TIDAK
      mengizinkan `https:` → `<video src="https://...tiktokcdn...">` diblokir
      (readyState 0, tanpa error). Ditambah `https: http:` → preview remote
      memutar (E2E: readyState 4, dur 13,7 s).
    - **Thumbnail lazy via IntersectionObserver (2026-08-15)**: resolve
      thumbnail HANYA untuk kartu yang terlihat (rootMargin 300px) + cache,
      bukan semua item sekaligus — terhindar rate-limit TikWM untuk daftar
      besar (E2E: 7→22 ter-load saat scroll). Sebelumnya resolve 49 item
      sekaligus → banyak gagal rate-limit (hanya ~5-15/49 termuat).
    - **Thumbnail otomatis SEMUA (2026-08-15)**: resolve thumbnail untuk
      SEMUA item begitu daftar selesai diambil — tanpa menunggu scroll (antrean
      4 konkuren + retry/backoff + sweep berkala ~15 dtk utk yang gagal
      rate-limit; YouTube deterministik). E2E: 49/49 kartu dapat elemen img;
      kecepatan muat tergantung TikWM (segar ~0,5s/panggil → semua ~6-12s;
      saat TikWM throttling karena kuota IP, sebagian butuh sweep). Play icon
      kartu grid kini ter-center TEPAT di area video (dx:0, dy:0 terukur),
      bukan seluruh kartu.
    - **Input & tombol proporsional (2026-08-15)**: input tautan akun/halaman
      full-width (sebelumnya terjepit di samping tombol) + tombol "Ambil Daftar"
      ringkas (`rounded-lg`, tanpa shadow besar) rata kanan di bawah input;
      tombol "Unduh Semua" disamakan gayanya (terverifikasi DOM: input 2258px,
      tombol 137×35, rata kanan diff 1px).
    - **Textarea auto-resize + label aman (2026-08-15)**: `FloatingTextarea`
      kini auto-resize (tinggi = `scrollHeight`, `overflow-hidden`) utk SEMUA
      textarea (Tempel Banyak Tautan & Cookie Douyin) — tidak pernah scroll.
      Padding atas `pt-6`→`pt-7` (28px) agar label floating (top-2.5, 10px)
      TIDAK menabrak baris teks pertama (sebelumnya overlap ~11px terukur;
      kini `collisionPx: -3` = 3px jarak bebas, terverifikasi di Electron
      nyata: 12 baris → 276px tanpa scroll; dikosongkan → 76px).
    - **Validasi**: tsc/lint/build PASS; E2E Electron+CDP nyata — scrape 49
      item, durasi tampil, thumbnail otomatis, preview memutar video.
      CATATAN MOCK: id/url mock harus < 2^53 (angka besar runtuh presisi → semua
      URL identik → seleksi tampak "semua terpilih" — artefak mock, bukan bug).
- **BELUM di-commit (2026-08-15, sesudah `2b510ad`)** — Redesign floating label
  gaya Google (outlined text field), meniru field Google login:
  - Semua inputan floating label (`FloatingInput`, `FloatingTextarea`,
    `FloatingSelect`, `FloatingMultiSelect`) kini: label saat kosong duduk di
    tengah field sebagai placeholder; saat terisi/fokus **naik mengangkang di
    atas border** dengan efek **notch** — latar label senada field sehingga
    border tampak terpotong di belakang label (sebelumnya label kecil
    `uppercase` di dalam field).
  - Warna label: biru saat fokus, netral saat terisi (blur), merah saat error.
  - Efek & animasi: **glow biru lembut** saat fokus (ring 3px + bayangan
    `0_12px_32px`), **shine sweep** halus menyapu field sekali saat fokus,
    **caret biru**, ikon kiri berubah biru saat aktif, chevron dropdown
    berputar + biru saat terbuka.
  - Field dibuat **opak** (`dark:bg-slate-900`) agar patch notch label menyatu
    sempurna (terverifikasi: light `rgb(255,255,255)`, dark `oklch(0.208...)`
    identik dengan bg field — tanpa seam).
  - File baru: `src/components/ui/FloatingShared.tsx` (komponen `FloatingLabel`
    & `FieldShine`) + `floating-classes.ts` (fungsi `fieldShell` & `iconCls` —
    dipisah agar fast-refresh bersih). Diperbarui: `FloatingField.tsx`,
    `FloatingSelect.tsx`, `FloatingMultiSelect.tsx`.
  - Terverifikasi E2E Electron+CDP nyata: textarea fokus → label delta 1px
    (mengangkang border, patch putih), blur terisi → netral; select
    Kualitas/Cookies Browser → delta 0 + glow + panel portal tetap terbuka;
    dark mode → patch identik bg field. tsc/lint/build PASS (0 warning).
  - **Fix alignment ikon–teks (2026-08-15)** — audit forensik atas screenshot
    user menemukan & memperbaiki 2 bug layout:
    (1) Shell `FloatingInput` kehilangan `flex items-center` saat redesign →
    ikon + input terpisah ke dua baris → field SANGAT TINGGI & berantakan
    (gambar 1). FIX: shell input `flex items-center`, ikon `ml-3 shrink-0`,
    input `min-w-0 flex-1` (textarea tetap block).
    (2) Span nilai select & teks input memakai padding asimetris `pt-5 pb-1.5`
    → teks turun ~7px di bawah pusat ikon (`items-center` men-center ikon;
    gambar 2). FIX: padding simetris `py-3.5` → teks sejajar ikon.
    Terverifikasi E2E Electron nyata: `display:flex`, tinggi field 50px
    kompak, `iconVsText: 0`, `textVsField: 0` untuk input & semua select.
  - **Textarea kompak + auto-resize (2026-08-15)**: `FloatingTextarea` kini
    mulai SETINGGI INPUT biasa (`rows={1}`, ~48px, label placeholder di tengah
    seperti input) lalu **auto-resize membesar sesuai isi** & menyusut saat
    dikosongkan — tidak pernah scroll. Padding `pt-7` → `py-3.5` (label gaya
    Google hanya ~5,5px masuk field, tak butuh ruang ekstra). `rows={5}`/
    `rows={2}` dihapus dari pemakaian (App.tsx & modal pengaturan).
    Terverifikasi E2E Electron nyata: 48→108px utk 4 baris, kembali 48px saat
    dikosongkan; Cookie Douyin 48→88px; tanpa scroll.
  - **Tombol aksi di dalam field (2026-08-15)**: tombol "Unduh Semua" kini
    berada DI DALAM textarea (kanan-bawah, `absolute bottom-1.5 right-1.5 z-10`)
    dan "Ambil Daftar" DI DALAM input (kanan, ter-center vertikal via flex).
    - Prop baru `action?: React.ReactNode` pada FloatingInput/FloatingTextarea.
    - Textarea: padding-kanan ADAPTIF mengikuti lebar tombol (ResizeObserver
      mengukur `actionRef` → `paddingRight = actionW + 18`) sehingga teks tidak
      tertimpa & menyesuaikan bila jumlah link berubah ("Unduh Semua (N)").
      Tombol tetap di kanan-bawah saat textarea membesar.
    - Input: tombol sebagai anak flex (`relative z-10 shrink-0`) → otomatis
      kanan & center vertikal (E2E `btnCenterVsField: 0`).
    - Tombol aksi DISAMAKAN (konsisten): "Unduh Semua" & "Ambil Daftar"
      identik (`text-sm px-3.5 py-2 gap-2 icon h-4 font-semibold shadow-sm`,
      tinggi 36px); "Simpan" (trim) ikut disamakan. Terverifikasi E2E: kedua
      tombol IDENTIK (h 36, fs 14px, padding 8/14px, radius 8px, fw 600).
    - Terverifikasi E2E Electron nyata: tombol di dalam (`btnInside`), gap
      kanan/bawah ~7px, `taPaddingRight` 160px ≈ btnW+18, field tumbuh 50→110px
      saat 4 baris dengan tombol tetap kanan-bawah.
  - **Rasa aplikasi desktop (2026-08-15)**:
    - **Tanpa underline** — dihapus `hover:underline` dari tombol teks-link
      (Bersihkan, Pilih Semua/Kosongkan Pilihan, Buka folder) + pengaman global
      `a { text-decoration: none }` di main.css.
    - **Window bisa di-drag** — strip drag `fixed inset-x-0 top-0 z-30 h-9`
      dengan `-webkit-app-region: drag` (area atas 36px kosong, aman); tombol
      menu mobile diberi `.app-no-drag` + `z-40` agar tetap bisa diklik.
      Utility `.app-drag`/`.app-no-drag` di main.css (@layer utilities).
    - **Tidak bisa select text** — `* { user-select: none }` global; `input` &
      `textarea` tetap `user-select: text` (untuk mengedit).
    - Terverifikasi E2E Electron nyata: strip `appRegion: drag` (fixed, 36px,
      z-30); user-select body/button `none`, input/textarea `text`;
      `underlinedTotal: 0`.
  - **Fix warning CSS `@theme`/`@custom-variant` (2026-08-15)**: VS Code CSS
    language server tidak mengenal at-rule Tailwind v4 → warning
    `unknownAtRules`. FIX: deklarasikan at-rule via `css.customData` →
    `.vscode/tailwind.css-data.json` (berisi @tailwind, @apply, @theme,
    @custom-variant, @variant, @source, @utility) + tautkan di
    `.vscode/settings.json`. Bukan mematikan semua `unknownAtRules` (tetap
    mendeteksi at-rule benar-benar asing). Sekaligus perbarui setting TS
    deprecated (`typescript.tsdk` → `js/ts.tsdk.path`,
    `typescript.enablePromptUseWorkspaceTsdk` →
    `js/ts.tsdk.promptToUseWorkspaceVersion`). Terverifikasi: get_errors
    bersih, JSON valid, build PASS.
    - **PELAJARAN OPERASIONAL (2026-08-15)**: error `No handler registered for
      preview:resolve` + thumbnail tidak muncul = **main process STALE**
      (electron-vite dev TIDAK hot-reload main). Renderer & preload baru dari
      disk, tapi main di memori lama → `ipcMain.handle` tidak ada. FIX: restart
      `npm run dev` (atau rebuild + relaunch) setelah mengubah `electron/main/**`
      ATAU menambah IPC baru. Gejala khas: UI baru muncul tapi handler IPC lama
      tidak ada.
- **Validasi**: `tsc --noEmit` PASS, `eslint src` 0 error, `npm run build` PASS
  (font ter-bundle). E2E via CDP (dev 5173): textarea/input floating tampil,
  dropdown kustom Kualitas/Cookies terbuka + opsi render, toggle paralel &
  Mode Gelap berfungsi (sinkron dengan sidebar), badge indikator pengaturan
  non-default muncul, persistensi localStorage terverifikasi.
- **Version bump 1.3.4 di package.json belum dilakukan** (menunggu commit/PR).

## Status Rilis v1.3.3 (2026-08-14) — Dukungan unduh Douyin, LIVE

- **Release `v1.3.3` LIVE**:
  https://github.com/dennsoe/rs-omnitools/releases/tag/v1.3.3
  - macOS: `RS-OmniTools-1.3.3-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniTools-1.3.3-x64-setup.exe` (NSIS, 82 MB) +
    `RS-OmniTools-1.3.3-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
  - API `releases/latest` = `v1.3.3`.
- **PR #23** (`db8649cd`, fitur Douyin) + **PR #24** (`1d4c31e0`, bump 1.3.3) —
  merge commit.

## Fitur: unduh Douyin via cookie sesi + resolve short link (2026-08-14)

Audit forensik menyeluruh + uji lapangan:
- **Short link `v.douyin.com/xxx` MASIH resolve** (ikut redirect → aweme_id di
  URL akhir) — tanpa login.
- **Semua endpoint publik tanpa cookie MATI**: `iesdouyin.com/iteminfo` → 200
  body kosong; `douyin.com/aweme/v1/web/aweme/detail` → 200 body kosong (butuh
  X-Bogus + cookie sesi); yt-dlp → `Fresh cookies ... are needed`.
- **Kesimpulan**: Douyin WAJIB cookie sesi (anti-bot ketat). Solusi = beri
  cookie lalu serahkan ke yt-dlp (extractor terus diperbarui).
- **Implementasi**:
  - Modul baru `electron/main/engine/douyin.ts`: `isDouyinUrl`, `extractAwemeId`,
    `normalizeDouyinUrl` (resolve short link → `https://www.douyin.com/video/{id}`),
    `writeNetscapeCookieFile` (header Cookie → file Netscape untuk `--cookies`).
  - `downloader.ts`: opsi `douyinCookie` + internal `cookiesFile`; `--cookies`
    diprioritaskan atas `--cookies-from-browser`; routing Douyin (resolve +
    tulis cookie) sebelum jalur yt-dlp; pesan error Douyin diperjelas.
  - UI: kolom **"Cookie Douyin (opsional)"** di Pengaturan Unduhan (tempel header
    Cookie dari sesi douyin.com yang sudah login).
  - IPC/preload/types: `douyinCookie` di-pass renderer → main → engine.
- **Validasi**: typecheck+lint+build PASS; unit test douyin 14/14; E2E
  (Electron+CDP) — field tampil, short link ter-resolve ke aweme_id, yt-dlp
  dipanggil dgn URL kanonik, file cookie Netscape tertulis & dibaca yt-dlp
  (bukti `--cookies` dikirim), pesan error ramah muncul. Unduhan sukses nyata
  tetap butuh cookie sesi valid milik pengguna (inheren Douyin, bukan bug).

## Status Rilis v1.3.2 (2026-08-14) — Bugfix UI block + Douyin, LIVE

- **Release `v1.3.2` LIVE**:
  https://github.com/dennsoe/rs-omnitools/releases/tag/v1.3.2
  - macOS: `RS-OmniTools-1.3.2-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniTools-1.3.2-x64-setup.exe` (NSIS, 82 MB) +
    `RS-OmniTools-1.3.2-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
  - API `releases/latest` = `v1.3.2`.
- **PR #20** (`a260a1f`, fix UI block + Douyin) + **PR #21** (`44591d0`, bump
  1.3.2) — merge commit.

## Fix: app terkunci "Menyiapkan Mesin Video" + error Douyin (2026-08-14)

Laporan (perangkat baru): (1) app terus di layar "Menyiapkan Mesin Video...",
tidak masuk aplikasi; (2) tidak bisa unduh Douyin.

- **Issue 1 (kritis)**: `App.tsx` menampilkan LAYAR PENUH yang di-gate
  `isAppReady` — bila provisioning FFmpeg lambat/gagal (mis. sumber arm64 tak
  terjangkau), app tidak pernah masuk ke halaman utama. **Fix**: hapus gate
  layar penuh — app SELALU menampilkan UI; mesin diprovisoning lazy saat
  benar-benar dipakai; status mesin jadi **banner non-blocking** di atas
  aplikasi (spinner + pesan + tombol "Coba Lagi" → `engine:check` →
  `initEngine`).
- **Issue 2 (Douyin)**: audit menyeluruh — tidak ada metode gratis yang andal
  (diuji: TikWM → "Url parsing is failed"; douyin.wtf/qjqq/yujn/xxapi →
  mati/404/502; iesdouyin iteminfo/share → kosong/302; yt-dlp → "Fresh cookies
  are needed"; yt-dlp + ttwid otomatis → tetap gagal; yt-dlp + cookies Chrome →
  tetap gagal karena butuh cookie sesi Douyin penuh). Douyin kini mewajibkan
  cookie browser (anti-bot ketat). **Fix**: error Douyin kini jelas & menuntun
  pengguna mengaktifkan "Cookies Browser" (buka douyin.com di Chrome/Firefox
  lalu pilih browser tsb di Pengaturan Unduhan).
- **Verifikasi**: E2E (Electron+CDP, userData terisolasi) — UI utama tampil
  segera, layar "Menyiapkan" tidak memblokir. typecheck/lint/build PASS.
- File berubah: `src/App.tsx`, `electron/main/engine/downloader.ts`.

## Status Rilis v1.3.1 (2026-08-14) — Bugfix kritis FFmpeg arm64, LIVE

- **Release `v1.3.1` LIVE**:
  https://github.com/dennsoe/rs-omnitools/releases/tag/v1.3.1
  - macOS: `RS-OmniTools-1.3.1-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniTools-1.3.1-x64-setup.exe` (NSIS, 82 MB) +
    `RS-OmniTools-1.3.1-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
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
  https://github.com/dennsoe/rs-omnitools/releases/tag/v1.3.0
  - macOS: `RS-OmniTools-1.3.0-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniTools-1.3.0-x64-setup.exe` (NSIS installer, 82 MB) +
    `RS-OmniTools-1.3.0-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
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
    `~/Downloads/RS-OmniTools/Unduhan/`.
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
  (`~/Library/Application Support/rs-omnitools/bin/`) KOSONG → `ensureYtdlp`
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
  https://github.com/dennsoe/rs-omnitools/releases/tag/v1.2.0
  - macOS: `RS-OmniTools-1.2.0-arm64.dmg` (94 MB) + `.zip` (91 MB).
  - Windows: `RS-OmniTools-1.2.0-x64-setup.exe` (NSIS installer, 79 MB) +
    `RS-OmniTools-1.2.0-x64-portable.exe` (portable, 79 MB) + `latest.yml`.
  - API `releases/latest` kini mengembalikan `v1.2.0` → tombol "Periksa Update"
    di aplikasi menunjukkan update tersedia dari v1.1.0.
  - Dibuat manual lokal (CI terkunci billing): build macOS + Windows dari mesin
    dev (wine terpasang), lalu `gh release create` + unggah artefak.
- **PR #9 merged** `df1e5dc` (dukungan multi-OS Windows) & **PR #10 merged**
  `4406dfa` (fix build Windows: afterSign target-guard + `--x64` + nama artefak).

## Status Rilis (2026-08-13)

- Repo **PUBLIC**: `https://github.com/dennsoe/rs-omnitools`.
- **PR #6 merged** — merge commit `7626859` (mekanisme pembaruan gratis).
- **Release `v1.1.0` LIVE**: https://github.com/dennsoe/rs-omnitools/releases/tag/v1.1.0
  - Artefak: `RS-OmniTools-1.1.0-arm64.dmg` (95 MB) + `.zip` (92 MB), Apple Silicon.
  - Dibuat manual (CI terkunci billing — lihat "Hal yang Belum Dikerjakan").
  - API `releases/latest` mengembalikan `v1.1.0` (tombol "Periksa Update" di
    aplikasi kini berfungsi; saat versi aplikasi sudah sama → status terbaru).
  - **Artefak di-re-upload (2026-08-13)** dengan app yang di-sign ulang adhoc
    menyeluruh (`scripts/afterSign.js`) — memperbaiki bug Gatekeeper macOS
    "internal error in Code Signing subsystem" / "-10810" (lihat seksi
    "Perbaikan Gatekeeper macOS" di bawah).

## Perbaikan Gatekeeper macOS (2026-08-13)

- Gejala: app hasil download menampilkan "RS OmniTools is damaged and can't be
  opened". Akar: (1) atribut `com.apple.quarantine` dari unduhan browser +
  app tidak Developer-ID signed; (2) build tanpa signing membuat binary
  Electron Framework `linker-signed` + bundle tidak ter-seal → `spctl` =
  "internal error in Code Signing subsystem" → launch `-10810`.
- Fix di build: `scripts/afterSign.js` (hook electron-builder) menandatangani
  ulang SELURUH bundle secara adhoc dengan urutan dalam-ke-luar (dylib →
  framework → helper .app → app) + verifikasi. `codesign --deep` TIDAK cukup
  (tidak rekursif penuh).
- Fix pengguna: `xattr -cr "/Applications/RS OmniTools.app"` atau klik kanan →
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
  (`--x64`) → `dist/RS-OmniTools-1.2.0-x64-setup.exe` (NSIS) +
  `...-portable.exe` (portable) + `latest.yml`. Tervalidasi `file`: PE32
  Nullsoft Installer. Sudah diunggah ke release **v1.2.0**.

## Ringkasan

RS OmniTools telah dimigrasi penuh dari ekspor Next.js ke arsitektur desktop
**Electron-Vite (React + TypeScript)** dengan backend Node.js (FFmpeg + yt-dlp).
Aplikasi berfungsi end-to-end dan telah di-push ke GitHub.

## Repositori

- Repo: `https://github.com/dennsoe/rs-omnitools`
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
| Arsip Kualitas Maks (`archive`) | Selesai & terverifikasi (mode privacy = `-c copy` instan; mode enhance = CRF 18 + jernih) |
| Vertikal 9:16 Story/Shorts/Reels (`vertical`) | Selesai & terverifikasi (pad-blur 1080×1920; menggantikan Kompresor WhatsApp) |
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
| Smoke test mesin | 11/11 PASS (metadata, HD, FullHD, 4K, archive, vertical, trim) |

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

- **Preset diperjelas** → `metadata` (khusus Auto-Watcher auto-clean),
  `hd` (720p), `fullhd` (1080p), `uhd` (4K), `archive`, `vertical` 9:16.
  Default `fullhd`. Mode `privacy`/`enhance` via Segmented Control
  (lihat bagian perombakan preset di atas).
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
  "RS OmniTools v1.1.0" pada bagian "Versi, Pembaruan & Resource").
- **Cek update aplikasi**: main process memanggil
  `GET https://api.github.com/repos/dennsoe/rs-omnitools/releases/latest`
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
- **Versi "RS OmniTools v1.1.0" HANYA di halaman Tentang & Update** (kartu
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
  `~/Library/Application Support/rs-omnitools/bin/`:
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
