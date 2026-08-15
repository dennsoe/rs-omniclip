# Kondisi Terkini — RS OmniClip

Dokumen ini mencerminkan **kondisi proyek saat ini** dan WAJIB diperbarui setiap
ada perubahan. Tanggal terakhir diperbarui: **2026-08-15**.

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
  `RS-OmniClip-1.4.1-arm64.dmg`, `RS-OmniClip-1.4.1-arm64.zip`,
  `RS-OmniClip-1.4.1-x64-setup.exe`, `RS-OmniClip-1.4.1-x64-portable.exe`.
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
  --remote-debugging-port=9222 --user-data-dir="$TMPDIR/rs-omniclip-cdp"`
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
  https://github.com/dennsoe/rs-omniclip/releases/tag/v1.3.3
  - macOS: `RS-OmniClip-1.3.3-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniClip-1.3.3-x64-setup.exe` (NSIS, 82 MB) +
    `RS-OmniClip-1.3.3-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
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
  https://github.com/dennsoe/rs-omniclip/releases/tag/v1.3.2
  - macOS: `RS-OmniClip-1.3.2-arm64.dmg` (99 MB) + `.zip` (95 MB).
  - Windows: `RS-OmniClip-1.3.2-x64-setup.exe` (NSIS, 82 MB) +
    `RS-OmniClip-1.3.2-x64-portable.exe` (portable, 82 MB) + `latest.yml`.
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
