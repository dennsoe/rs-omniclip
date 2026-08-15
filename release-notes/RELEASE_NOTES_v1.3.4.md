# Catatan Rilis — RS OmniClip v1.3.4

Dokumen ini adalah **sumber catatan rilis** untuk release berikutnya. Seluruh
perubahan yang masuk ke rilis dicatat di sini; bagian "Body release" di bawah
siap disalin ke **detail release GitHub** (mis. `gh release create v1.3.4
--notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniClip v1.4 — 5 Fitur Besar: Proxy, Auto-Watcher, CSV Analytics, Hardware GPU, Preview + Riwayat

> Fitur besar untuk tim riset & operasional: anti-banned, pemantauan akun
> otomatis, data analitik ekspor CSV, akselerasi GPU saat memproses video,
> serta pratinjau inline + riwayat unduhan.

### 1. Manajemen Proxy (Sistem Anti-Banned)
- Kelola daftar proxy (HTTP/HTTPS/SOCKS5, satu per baris) di Pengaturan Unduhan.
- **Rotasi otomatis** — ganti proxy setelah N unduhan (default 5) agar IP tidak
  cepat dibanned platform.
- Proxy berlaku untuk **semua jalur**: yt-dlp, TikWM (resolver TikTok), dan CDN
  unduhan.
- Tombol **Tes** per proxy — menampilkan status sukses/gagal + latensi
  (via api.ipify.org).
- Catatan: Instagram/Facebook memblokir proxy datacenter — gunakan proxy
  residential untuk platform tersebut.

### 2. Auto-Watcher (Pemantauan Akun Otomatis)
- Pantau akun/halaman (TikTok, YouTube, Instagram, dsb.) secara otomatis
  **selama aplikasi terbuka**.
- Cek berkala tiap N jam (default 1), tambah akun dgn label, aktif/nonaktif
  sekali klik, tombol "Cek Sekarang" (semua atau per akun).
- **Deteksi posting baru**: tick pertama hanya mengatur cursor (tidak mengunduh
  video lama); video baru **diunduh otomatis**, **dibersihkan metadatanya**
  (privasi), dan memberi **notifikasi** (native + toast di aplikasi).

### 3. Pemisah Data Analitik (CSV Exporter)
- Toggle "Ekspor Data Analitik ke CSV" di kartu Akun/Halaman.
- Setelah ambil daftar, otomatis menulis **analytics-YYYY-MM-DD.csv** di folder
  Unduhan: platform, URL, ID, judul, views, likes, komentar, caption, hashtag,
  durasi (detik), tanggal unggah.
- Format **RFC 4180 + BOM** — terbuka rapi di Excel/Number (field kosong/NA
  diizinkan).

### 4. Hardware Acceleration (GPU Selector)
- **Deteksi otomatis** encoder GPU (`ffmpeg -encoders`): Apple VideoToolbox
  (Mac), NVIDIA NVENC, AMD AMF.
- Pengaturan "Pemrosesan Hardware" hanya menampilkan encoder yang **benar-benar
  tersedia** di perangkat; mode "Otomatis" memakai CPU (libx264).
- **Fallback berjenjang**: bila encode GPU gagal, otomatis turun ke CPU — hasil
  tetap sesuai prasetel (HD/FullHD/UHD/WhatsApp).

### 5. Pemutar Pratinjau Internal + Riwayat
- **Pratinjau inline**: klik "Putar" pada baris antrean unduhan → video diputar
  langsung di aplikasi (protokol `media://` lokal, dukungan seek via Range).
- **Tab Riwayat** baru: semua unduhan tersimpan (judul, platform, waktu);
  klik untuk memutar ulang, tombol "Bersihkan Riwayat".
- Riwayat & semua pengaturan baru tersimpan **di main process** (aman, bukan
  localStorage).

### Catatan teknis
- Fix: `https-proxy-agent`/`socks-proxy-agent` diturunkan ke versi CommonJS agar
  kompatibel dengan build main process (Electron).

---

## RS OmniClip v1.3.4 — Bugfix scrape 429 + Pengaturan Unduhan dalam Modal

### Perbaikan
- **Fix: "Ambil Video dari Akun / Halaman" error HTTP 429 (Too Many Requests)** —
  pengambilan daftar video kini diperkeras agar jauh lebih jarang kena
  rate-limit platform (terutama TikTok):
  - Membatasi jumlah item yang di-fetch (maks 200) sehingga jumlah request ke
    API platform berkurang drastis → kecil kemungkinan kena 429.
  - Memakai user-agent browser (Chrome) agar tidak mudah terdeteksi sebagai bot.
  - Meneruskan pengaturan **Cookies Browser** — kini berlaku juga untuk
    pengambilan daftar (sebelumnya hanya untuk unduhan).
  - Retry otomatis + rotasi endpoint cadangan (`api_hostname`) bila tetap kena
    HTTP 429 (transien).
  - Pesan error kini ramah & menuntun (tunggu beberapa menit, atau aktifkan
    Cookies Browser di Pengaturan Unduhan).
  - Short link Douyin otomatis di-resolve ke URL kanonik sebelum pengambilan.

### Perubahan UI
- **Pengaturan Unduhan kini di dalam modal popup** — tidak lagi tampil permanen
  di halaman Unduh Video. Dibuka lewat tombol gear (ikon gerigi) di kanan atas
  halaman; muncul **badge indikator** bila ada pengaturan non-default yang aktif
  (kualitas, cookies, cookie Douyin, atau unduh paralel).
- **Konsistensi desain modal** — modal konfirmasi (Hapus) dan modal pratinjau
  video kini memakai bahasa desain yang sama dengan modal Pengaturan Unduhan:
  header ber-ikon + judul + subjudul + tombol tutup, serta dapat ditutup dengan
  tombol **Escape**.
- **Responsivitas &amp; layout di layar sempit** — audit forensik seluruh halaman
  (Pilih Prasetel, Antrean Video, Antrean Unduhan, Tempel Banyak Tautan, Ambil
  Video dari Akun/Halaman, Tentang):
  - Grid prasetel adaptif: 1 kolom (&lt;420px) / 2 kolom (420–1023px) / 3 kolom (≥1024px).
  - Panel potong (trim) kini membungkus rapi di layar sempit; tombol Simpan
    full-width di mobile.
  - Baris antrean video &amp; unduhan memakai padding/jarak yang mengecil di layar
    sempit (tanpa overflow horizontal).
  - Toast tidak lagi meluber keluar layar pada viewport sangat kecil.
  - Sidebar dibatasi lebarnya (maks 80vw) dan lompatan lebarnya diperkecil.
- **Penyimpanan lokal (localStorage)** — pengaturan kini tersimpan otomatis di
  perangkat saat app ditutup &amp; dibuka lagi:
  - Mode gelap, prasetel terpilih, pengaturan unduhan (kualitas, cookies browser,
    cookie Douyin, unduh paralel), halaman terakhir &amp; mode tautan/akun.
  - Tombol **Reset Semua Preferensi** (di halaman Tentang &amp; Update) mengembalikan
    semuanya ke default.

### Desain Ulang (Redesign)

- **Font premium terpasang** — Plus Jakarta Sans (variable) kini menjadi font
  utama aplikasi, menggantikan font sistem; tampilan lebih modern &amp; profesional.
- **Video player sinematik baru** — pemutar video kustom (bukan kontrol bawaan
  browser) untuk pratinjau video:
  - Kontrol kustom: play/pause besar di tengah, progress bar (played + buffered),
    indikator waktu, volume, kecepatan putar (0.5×–2×), Picture-in-Picture, dan
    fullscreen.
  - Kontrol **auto-hide** saat idle ketika video diputar, dengan gradasi gelap
    di tepi atas/bawah untuk kesan premium.
  - State loading (spinner), error, dan kosong (belum ada video) yang jelas.
- **Semua input memakai floating label** — label di dalam saat kosong dan
  "mengambang" ke atas saat diisi/difokus (gaya Material yang halus):
  - Textarea tautan (Tempel Banyak Tautan) &amp; Cookie Douyin → floating textarea.
  - Input URL akun (Ambil Video dari Akun/Halaman) → floating input.
  - Input waktu trim (Mulai/Selesai) → floating input.
- **Select memakai dropdown kustom** — pengganti `<select>` native dengan
  floating label: **Kualitas** &amp; **Cookies Browser** di Pengaturan Unduhan
  kini berupa dropdown kustom (panel animasi, tanda centang pada opsi terpilih,
  chevron berputar, tutup via klik luar / Escape).
- **Multi-select baru** — hasil "Ambil Video dari Akun/Halaman" kini memakai
  komponen multi-select dengan floating label: pencarian di dalam panel, opsi
  ber-checkbox, dan chip tag terpilih yang bisa dihapus satu per satu.
- **Hasil "Akun / Halaman" → list/grid + thumbnail + durasi + preview (2026-08-15)**:
  - **List &amp; Grid** — hasil scrape kini tampil sebagai **grid kartu** atau
    **baris list** dengan tombol toggle Grid/List (bukan lagi dropdown
    multi-select), plus **pencarian cepat** (filter judul).
  - **Durasi** — badge durasi pada tiap kartu/baris (dari flat-playlist;
    tersedia untuk TikTok &amp; YouTube).
  - **Thumbnail** — flat-playlist tidak menyertakan thumbnail untuk TikTok
    (`NA`). Thumbnail di-resolve **otomatis untuk SEMUA item** begitu daftar
    selesai diambil (antrean 4 konkuren + retry + backoff + sweep berkala
    ~15 dtk utk yang gagal rate-limit), tanpa harus men-scroll. YouTube memakai
    URL deterministik `i.ytimg.com/vi/{id}/hqdefault.jpg` (tanpa request).
    Gagal total → placeholder.
  - **Fix CSP `media-src`** — pratinjau video remote (CDN TikTok via
    `preview:resolve`) sebelumnya TIDAK bisa diputar karena CSP `media-src
    'self' blob:` tidak mengizinkan `https:` (video `readyState 0` tanpa error).
    Kini `media-src 'self' blob: https: http:` — video preview terverifikasi
    memutar (readyState 4).
  - **Preview video** — klik kartu/baris membuka **modal pratinjau** (pola sama
    dgn antrean pembersih): judul, platform, durasi, thumbnail sebagai poster,
    lalu video diputar dengan VideoPlayer. URL media langsung di-resolve via IPC
    baru `preview:resolve` (TikTok → TikWM cepat; platform lain → yt-dlp
    `--get-url`, format tunggal agar bisa diputar `<video>`).
  - **Seleksi** — kotak centang pada tiap item (tanpa membuka preview), Pilih
    Semua, dan Unduh Terpilih tetap ada.
  - **Icon play presisi** — tombol play di kartu grid kini ter-center TEPAT di
    tengah area video (aspect-video), bukan di tengah seluruh kartu (yang
    sebelumnya mencakup judul di bawah → icon terlalu rendah).
  - **Input & tombol proporsional (2026-08-15)** — input tautan akun/halaman
    kini **full-width** (sebelumnya terjepit di samping tombol) dan tombol
    "Ambil Daftar" dibuat **ringkas & bersih** (`rounded-lg`, tanpa bayangan
    besar), rata kanan di bawah input. Tombol "Unduh Semua" disamakan gayanya
    agar konsisten & proporsional di kedua mode.
  - **Textarea auto-resize + label tidak menabrak (2026-08-15)** — semua
    textarea (`FloatingTextarea`: Tempel Banyak Tautan & Cookie Douyin) kini
    **menyesuaikan tinggi otomatis dengan isi** (`scrollHeight`, `overflow`
    hidden) — tidak pernah scroll. Padding atas ditambah (`pt-6`→`pt-7`)
    sehingga **label mengambang tidak lagi menimpa baris teks pertama**
    (sebelumnya overlap; terverifikasi `collisionPx: -3` = bebas tabrakan).  - **Redesign floating label gaya Google (outlined) (2026-08-15)** — semua
    inputan floating label (`FloatingInput`, `FloatingTextarea`,
    `FloatingSelect`, `FloatingMultiSelect`) didesain ulang meniru field Google
    login:
    - Label saat kosong duduk di tengah field sebagai placeholder; saat
      terisi/fokus **naik mengangkang di atas border** dengan efek **notch**
      (latar label senada field sehingga border tampak terpotong di belakang
      label) — bukan lagi `uppercase` kecil di dalam field.
    - Warna label: biru saat fokus, netral saat terisi (blur), merah saat error.
    - Efek & animasi: **glow biru lembut** saat fokus, **shine sweep** halus
      menyapu field sekali saat fokus, **caret biru**, ikon kiri berubah biru
      saat aktif, chevron dropdown berputar + biru saat terbuka.
    - Field dibuat **opak** (`dark:bg-slate-900`) agar patch notch label
      menyatu sempurna (terverifikasi identik di light & dark — tanpa seam).
    - Primitive bersama: `FloatingLabel`, `FieldShine`, `fieldShell`, `iconCls`
      (fungsi dipisah agar fast-refresh bersih).
  - **Fix alignment ikon–teks (2026-08-15)** — audit forensik atas screenshot
    user menemukan & memperbaiki 2 bug layout:
    - Input tautan akun/halaman (gambar 1): shell `FloatingInput` kehilangan
      `flex items-center` saat redesign → ikon & input terpisah ke dua baris →
      field sangat tinggi & berantakan. Kini shell input `flex items-center`,
      ikon `shrink-0`, input `min-w-0 flex-1` → satu baris kompak (50px).
    - Select Kualitas/Cookies & input (gambar 2): teks tidak sejajar ikon
      karena padding asimetris (`pt-5 pb-1.5`) mendorong teks ~7px ke bawah.
      Kini padding simetris `py-3.5` → teks & ikon sejajar sempurna (delta 0,
      terukur di Electron nyata).
  - **Textarea kompak + auto-resize (2026-08-15)** — semua textarea
    (`FloatingTextarea`: Tempel Banyak Tautan & Cookie Douyin) kini **mulai
    setinggi input teks biasa** (`rows={1}`, ~48px, label placeholder di tengah
    seperti input) lalu **auto-resize membesar sesuai isi** dan menyusut
    kembali saat dikosongkan — tidak pernah scroll. Padding `pt-7` → `py-3.5`
    (label gaya Google hanya ~5,5px masuk field, tak butuh ruang ekstra).
    `rows={5}`/`rows={2}` dihapus dari pemakaian.
  - **Tombol aksi di dalam field (2026-08-15)** — tombol "Unduh Semua" & "Ambil
    Daftar" kini berada DI DALAM input/textarea (bukan di bawahnya):
    - Prop baru `action` pada `FloatingInput`/`FloatingTextarea`.
    - Input: tombol di kanan, ter-center vertikal (flex child).
    - Textarea: tombol di kanan-bawah (absolute) + padding-kanan ADAPTIF
      mengikuti lebar tombol (ResizeObserver) — teks tak tertimpa; posisi tetap
      kanan-bawah saat textarea auto-resize membesar.
    - Tombol ringkas agar pas di dalam field.
  - **Konsistensi tombol primer (2026-08-15)** — "Unduh Semua" (sebelumnya
    `text-xs py-1.5` = 28px) disamakan dengan "Ambil Daftar" (`text-sm py-2
    px-3.5 gap-2 icon h-4`, = 36px) dan "Simpan" (trim) ikut disamakan — semua
    tombol primer rounded-lg identik. Terverifikasi E2E: tinggi/font/padding/
    radius/weight IDENTIK (36px / 14px / 8-14px / 8px / 600).
  - **Rasa aplikasi desktop (2026-08-15)** — tiga penyempurnaan:
    - Tanpa underline: hapus `hover:underline` dari tombol teks-link
      (Bersihkan, Pilih Semua/Kosongkan Pilihan, Buka folder) + pengaman
      `a { text-decoration: none }`.
    - Window bisa di-drag seperti aplikasi desktop: strip `-webkit-app-region:
      drag` di area atas (36px, z-30); tombol menu mobile `no-drag` + z-40.
    - Tidak bisa select text UI: `user-select: none` global; `input`/`textarea`
      tetap bisa diedit (`user-select: text`).
    - Terverifikasi E2E Electron nyata (appRegion: drag; body none, input/ta
      text; underlinedTotal 0).
  - **Fix warning CSS Tailwind v4 di editor (2026-08-15)** — VS Code tidak
    mengenali at-rule `@theme`/`@custom-variant` (warning `unknownAtRules`).
    FIX: daftarkan at-rule via `css.customData`
    (`.vscode/tailwind.css-data.json` + `settings.json`) — bukan mematikan
    semua cek unknownAtRules. Sekaligus perbarui setting TS deprecated
    (`typescript.tsdk` → `js/ts.tsdk.path`;
    `typescript.enablePromptUseWorkspaceTsdk` →
    `js/ts.tsdk.promptToUseWorkspaceVersion`).- **Switch animasi (Toggle)** — menggantikan checkbox boolean:
  - "Unduh 2 sekaligus" di Pengaturan Unduhan → toggle animasi.
  - "Mode Gelap" di halaman Tentang &amp; Update → toggle animasi (tetap sinkron
    dengan tombol di sidebar).
- **Konsistensi class Tailwind v4** — pembersihan class non-kanonik
  (`h-[2px]`→`h-0.5`, `z-[70]`→`z-70`, `bg-gradient-to-*`→`bg-linear-to-*`).
- **Perbaikan dropdown (portal)** — panel dropdown `FloatingSelect` (Kualitas,
  Cookies Browser) &amp; `FloatingMultiSelect` (hasil scrape) kini dirender via
  portal ke `document.body` dengan posisi fixed yang dihitung dari trigger:
  - Tidak lagi terpotong / menimbulkan scroll di dalam modal (daftar pendek
    seperti Kualitas kini tampil penuh tanpa scrollbar).
  - Selalu tampil rapi di atas elemen lain (latar solid + shadow, z-index
    tinggi) sehingga tidak lagi "menutupi" field di sebelahnya secara berantakan.
  - Otomatis tertutup bila kontainer di-scroll (agar tidak melenceng) dan
    direposisi saat window di-resize.
- **Fix mode gelap untuk konten portal** — kelas `dark` kini disinkronkan ke
  `<html>` (bukan hanya div root aplikasi) melalui efek di `App.tsx`. Sebelumnya
  panel dropdown yang di-portal ke `<body>` berada DI LUAR div `.dark` sehingga
  selalu berwarna putih walau aplikasi dalam mode gelap. Kini panel dropdown
  ikut gelap (slate-800, teks terang) di dark mode dan tetap putih di mode
  terang — terverifikasi kedua mode via pengukuran DOM.
- **Fix overlap label–nilai kosong (dropdown)** — dropdown dengan opsi bernilai
  kosong (mis. "Tanpa Cookies", value `''`) sebelumnya membuat label tetap di
  tengah (`floated = open || value.length > 0`) sehingga label MENIMPA teks
  nilai di tengah field (overlap ~20px, terukur). Kini label mengambang saat ada
  opsi terpilih (`floated = open || !!selected`) dan span nilai kosong saat
  label di tengah — terverifikasi `glyphOverlapPx: 0`. Perbaikan sama diterapkan
  ke `FloatingMultiSelect` (saat kosong).

### Unduhan
- **macOS (Apple Silicon)**: `RS-OmniClip-1.3.4-arm64.dmg` / `.zip` — jika
  Gatekeeper memblokir, klik kanan → Open, atau
  `xattr -cr "/Applications/RS OmniClip.app"`.
- **Windows (x64)**: `RS-OmniClip-1.3.4-x64-setup.exe` (installer NSIS) /
  `RS-OmniClip-1.3.4-x64-portable.exe` (portable).

---

## Log perubahan (referensi internal — tidak disalin ke detail release)

| Tanggal | Jenis | Perubahan | File |
|---|---|---|---|
| 2026-08-14 | Fix | Scrape akun diperkeras (batas 200 item, UA Chrome, cookies, retry+rotasi endpoint, pesan ramah, resolve short link Douyin) | `electron/main/engine/downloader.ts`, `electron/main/index.ts`, `electron/preload/index.ts`, `src/App.tsx`, `src/types/global.d.ts` |
| 2026-08-14 | UI | Pengaturan Unduhan dipindah ke modal popup + tombol gear + badge indikator | `src/App.tsx`, `src/components/DownloadSettingsModal.tsx` (baru) |
| 2026-08-14 | UI | Konsistensi desain modal hapus & pratinjau dengan modal pengaturan (header, Escape) | `src/components/ConfirmModal.tsx`, `src/components/PreviewModal.tsx` |
| 2026-08-14 | UI | Responsivitas: grid prasetel 1/2/3 kolom, panel trim flex-wrap, padding/gap responsif baris antrean, toast tidak meluber, sidebar max-w 80vw | `src/components/PresetSelector.tsx`, `src/components/SortableFileItem.tsx`, `src/components/Toasts.tsx`, `src/App.tsx` |
| 2026-08-14 | Fitur | Penyimpanan lokal preferensi (dark mode, prasetel, pengaturan unduhan, halaman/mode) + tombol Reset Semua Preferensi | `src/hooks/use-persistent-state.ts` (baru), `src/lib/preferences.ts` (baru), `src/App.tsx` |
| 2026-08-14 | Redesign | Font Plus Jakarta Sans (variable) sebagai font utama | `package.json` (+`@fontsource-variable/plus-jakarta-sans`), `src/main.tsx`, `src/assets/main.css` |
| 2026-08-14 | Redesign | Video player sinematik: kontrol kustom (progress, volume, kecepatan, PiP, fullscreen), auto-hide, state loading/error | `src/components/VideoPlayer.tsx` |
| 2026-08-14 | Redesign | Primitif form floating label: FloatingInput, FloatingTextarea, FloatingSelect, FloatingMultiSelect, Toggle | `src/components/ui/FloatingField.tsx` (baru), `FloatingSelect.tsx` (baru), `FloatingMultiSelect.tsx` (baru), `Toggle.tsx` (baru) |
| 2026-08-14 | Redesign | Terapkan floating label: textarea tautan, input URL scrape, input trim, Cookie Douyin | `src/App.tsx`, `src/components/SortableFileItem.tsx`, `src/components/DownloadSettingsModal.tsx` |
| 2026-08-14 | Redesign | Dropdown kustom (Kualitas, Cookies Browser) + Toggle paralel di Pengaturan Unduhan | `src/components/DownloadSettingsModal.tsx` |
| 2026-08-14 | Redesign | Multi-select hasil scrape (pencarian, checkbox, chip) + Toggle Mode Gelap di Tentang | `src/App.tsx` |
| 2026-08-15 | Redesign | Pembersihan class Tailwind v4 non-kanonik | `src/components/SortableFileItem.tsx`, `src/components/Toasts.tsx`, `src/components/VideoPlayer.tsx` |
| 2026-08-15 | Fix | Dropdown (select & multi-select) dirender via portal: tidak terpotong modal, tanpa scroll berlebih, latar solid, tutup saat scroll | `src/components/ui/FloatingSelect.tsx`, `src/components/ui/FloatingMultiSelect.tsx` |
| 2026-08-15 | Fix | Mode gelap untuk konten portal: sinkron kelas `.dark` ke `<html>` (dropdown tidak lagi putih di dark mode) | `src/App.tsx` |
| 2026-08-15 | Fix | Overlap label–nilai kosong pada dropdown ("Tanpa Cookies" value ''): label mengambang saat ada opsi terpilih + span kosong saat label di tengah | `src/components/ui/FloatingSelect.tsx`, `src/components/ui/FloatingMultiSelect.tsx` |
| 2026-08-15 | Redesign | Hasil "Akun/Halaman" → list/grid (toggle Grid/List) + cari + thumbnail lazy + badge durasi + modal preview; IPC `preview:resolve` baru | `src/App.tsx`, `src/components/ScrapeResultView.tsx` (baru), `ScrapePreviewModal.tsx` (baru), `src/components/VideoPlayer.tsx` (src+poster), `electron/main/engine/downloader.ts` (resolvePreviewUrl), `electron/main/index.ts`, `electron/preload/index.ts`, `src/types/global.d.ts`, `src/lib/types.ts`, `src/lib/utils.ts` (formatDuration/guessPlatform) |
| 2026-08-15 | Fix | CSP `media-src` ditambah `https: http:` — video preview remote (CDN TikTok) bisa diputar (sebelumnya diblokir, readyState 0) | `src/index.html` |
| 2026-08-15 | Fix | Thumbnail lazy via IntersectionObserver (hanya kartu terlihat) — hindari rate-limit TikWM untuk daftar besar | `src/components/ScrapeResultView.tsx`, `src/App.tsx` |
| 2026-08-15 | Fix | Thumbnail resolve SEMUA otomatis setelah scrape (bukan menunggu scroll) + retry/backoff/sweep berkala utk yang gagal rate-limit | `src/App.tsx` |
| 2026-08-15 | Fix | Icon play kartu grid di-center tepat di area video (bukan seluruh kartu) | `src/components/ScrapeResultView.tsx` |
| 2026-08-15 | UI | Input tautan akun/halaman full-width + tombol Ambil Daftar ringkas & rata kanan; tombol Unduh Semua disamakan gayanya | `src/App.tsx` |
| 2026-08-15 | Fix | Textarea auto-resize (tinggi ikut isi, tanpa scroll) + padding atas cukup agar label floating tidak menabrak teks | `src/components/ui/FloatingField.tsx` |
| 2026-08-15 | Redesign | Floating label gaya Google (outlined): label naik ke border + notch, glow fokus + shine sweep + caret/ikon biru, field opak agar patch notch menyatu | `src/components/ui/FloatingShared.tsx` (baru), `floating-classes.ts` (baru), `FloatingField.tsx`, `FloatingSelect.tsx`, `FloatingMultiSelect.tsx` |
| 2026-08-15 | Fix | Alignment ikon–teks floating field: shell input kembali `flex items-center` (field kompak 1 baris) + padding span/input simetris `py-3.5` (teks sejajar ikon, delta 0) | `src/components/ui/FloatingField.tsx`, `FloatingSelect.tsx`, `FloatingMultiSelect.tsx` |
| 2026-08-15 | UI | Textarea kompak: mulai setinggi input (rows=1, ~48px, label placeholder di tengah) + auto-resize naik/turun sesuai isi; padding py-3.5 | `src/components/ui/FloatingField.tsx`, `src/App.tsx`, `src/components/DownloadSettingsModal.tsx` |
| 2026-08-15 | UI | Tombol aksi di dalam field: "Unduh Semua" di dalam textarea (kanan-bawah, padding adaptif via ResizeObserver) + "Ambil Daftar" di dalam input (kanan, center vertikal) — prop `action` baru | `src/components/ui/FloatingField.tsx`, `src/App.tsx` |
| 2026-08-15 | Fix | Konsistensi tombol primer: "Unduh Semua" disamakan dengan "Ambil Daftar" (text-sm py-2 px-3.5 gap-2 icon h-4) + "Simpan" trim ikut disamakan — identik (E2E) | `src/App.tsx`, `src/components/SortableFileItem.tsx` |
| 2026-08-15 | UI | Rasa desktop: hapus underline tombol teks-link + `a{text-decoration:none}`; strip drag window (`-webkit-app-region:drag`, 36px, z-30) + tombol menu mobile no-drag/z-40; `user-select:none` global (input/textarea tetap text) | `src/App.tsx`, `src/assets/main.css` |
| 2026-08-15 | Fix | Warning CSS `@theme`/`@custom-variant` di editor: daftarkan at-rule Tailwind v4 via `css.customData` (`.vscode/tailwind.css-data.json`) + `settings.json`; perbarui setting TS deprecated (`js/ts.tsdk.path`, `js/ts.tsdk.promptToUseWorkspaceVersion`) | `.vscode/settings.json`, `.vscode/tailwind.css-data.json` (baru) |
