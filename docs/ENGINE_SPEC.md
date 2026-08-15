# Spesifikasi Mesin Backend — FFmpeg & yt-dlp

Dokumen ini menjelaskan mesin backend Node.js yang berjalan di proses utama
Electron. Kode: `electron/main/engine/`.

## 1. Modul Engine

| Modul | Tanggung jawab |
|---|---|
| `paths.ts` | Lokasi binary, folder output, folder unduhan |
| `net.ts` | Helper unduhan HTTPS (redirect + timeout) |
| `ffmpeg.ts` | Provisioning FFmpeg/FFprobe, probe, eksekusi dengan progress |
| `processor.ts` | Preset pemrosesan batch |
| `trimmer.ts` | Pemotongan lossless |
| `downloader.ts` | Provisioning yt-dlp + unduhan universal |

## 2. Lokasi Folder

| Fungsi | Lokasi |
|---|---|
| `getEngineBinDir()` | `~/Library/Application Support/rs-omniclip/bin` (userData) |
| `getOutputBaseDir()` | `~/Downloads/RS-OmniClip` |
| `getDownloadDir()` | `~/Downloads/RS-OmniClip/Unduhan` |
| `createOutputFolderForBatch(src)` | `<folder berkas sumber>/[CLEANED] - YYYY-MM-DD` |

Semua binary (ffmpeg, ffprobe, yt-dlp) disimpan di `getEngineBinDir()`, bukan di
folder proyek.

## 3. Provisioning Binary FFmpeg

Proses di `ensureFfmpeg()` (single-flight, dipanggil saat inisialisasi mesin):

1. Cek keberadaan `ffmpeg` + `ffprobe` yang dapat dieksekusi di `binDir`.
   Jika sudah ada → siap.
2. Jika belum: coba unduh via **ffbinaries** (`ffbinaries.com`), batas waktu 90 detik.
3. **Verifikasi hasil**: ffbinaries kadang selesai tanpa mengekstrak binary.
   Jika `ffmpeg`/`ffprobe` tidak ditemukan setelah unduhan → lanjut ke fallback.
4. **Fallback**: unduh langsung dari rilis GitHub
   `ffbinaries/ffbinaries-prebuilt` v6.1 (build evermeet.cx, macos-64):
   - `ffmpeg-6.1-macos-64.zip`
   - `ffprobe-6.1-macos-64.zip`
   Setiap zip berisi satu binary di akar arsip; diekstrak dengan `extract-zip`,
   lalu di-`chmod 755`.

Batas waktu unduhan: 90 detik per operasi (via `net.ts` `downloadFile`).
Build macos-64 berjalan di arm64 melalui Rosetta 2.

**Retry setelah gagal**: `ensureFfmpeg()` (dan `ensureYtdlp()`) TIDAK
menyimpan hasil yang gagal. Jika unduhan gagal, percobaan berikutnya
(`checkEngine` / unduhan berikutnya) akan mencoba lagi — tidak terkunci
permanen tanpa restart.

### Alasan Fallback

- API `ffbinaries.com` dapat tidak terjangkau (mis. koneksi terbatas).
- BtbN/FFmpeg-Builds **tidak menyediakan build macOS** (jangan dipakai).
- evermeet.cx endpoint `ffprobe` mengembalikan zip ffmpeg (rusak) — gunakan
  ffbinaries-prebuilt yang sudah berisi ffmpeg + ffprobe terpisah.

## 4. FFprobe — `probe(filePath, ffprobePath)`

Menjalankan:

```
ffprobe -v error -print_format json -show_format -show_streams <file>
```

Menghasilkan `{ duration, width, height, hasVideo, hasAudio }`. `duration`
dipakai untuk menghitung persentase kemajuan.

## 5. Eksekusi FFmpeg — `runFfmpeg(options)`

- Spawn FFmpeg dengan `stdio: ['ignore','ignore','pipe']`.
- Membaca stderr, mencocokkan `time=HH:MM:SS.xx` untuk menghitung persentase
  terhadap `totalDuration`.
- Jika `totalDuration` tidak diketahui (0), mengirim progres indikatif
  (maks 90%) agar UI tidak membeku di 0%; 100% dikirim saat selesai.
- Kirim `onProgress(percent)` (dedupe jika persen sama).
- Resolve saat kode keluar 0; reject dengan cuplikan stderr bila gagal.

## 6. Preset Pemrosesan (`processor.ts`)

`processBatch(files, preset, onProgress, options)` memproses file berurutan,
non-destruktif, ke folder `[CLEANED] - YYYY-MM-DD`, nama file dipertahankan
(ekstensi `.mp4`). Setiap preset menghasilkan
`outputPath = <outputFolder>/<nama-asli>.mp4`.

**Anti-timpa hasil**: jika nama output sudah ada di folder (mis. diproses ulang
hari yang sama), engine otomatis menambahkan akhiran `(n)` — hasil lama tidak
pernah ditimpa, berkas asli dan hasil sebelumnya tetap aman.

`options: ProcessOptions { hwAccel?, processingMode?: 'privacy' | 'enhance',
cleanMetadata?, quality?: 'auto'|'best'|'balanced'|'compact',
audio?: 'original'|'aac128'|'aac192'|'aac256' }`.
Metadata dibuang bila `cleanMetadata` (default true) → `-map_metadata -1`;
selalu `-movflags +faststart` (siap streaming). `quality` memetakan preset
x264 + CRF (`crfForQuality`/`x264QualityArgs`); `audio` memetakan
`audioModeArgs` (original = `-c:a copy`).

### 6.1 `metadata` — Hapus Metadata (lossless, khusus Auto-Watcher auto-clean)

Set utama (remux lossless):
```
ffmpeg -y -i <in> -map_metadata -1 -c copy -movflags +faststart <out>
```
Remux tanpa re-encode — sangat cepat, kualitas tidak berubah.

**Fallback**: jika codec tidak dapat diremux ke `.mp4`, engine mencoba ulang
dengan encode minimal (metadata tetap dihapus):
```
libx264 -preset veryfast -crf 23 -pix_fmt yuv420p, audio aac 128k
```

### 6.2 Mode `privacy` — Privasi Cepat (Tanpa Efek)

Mode dipilih via tab di UI (ikon `ShieldCheck`; pill aktif biru geser). Tanpa
filter berat (denoise/CAS/eq); encode mengikuti `quality` (default `auto` =
`libx264 -preset veryfast -crf 20`):

- `archive` (Kualitas Asli) → `-c copy` (audio original) / `-c:v copy` +
  re-encode audio (audio != original) — instan, tanpa re-encode video.
- `hd`/`fullhd`/`uhd` → `scale='if(gt(iw,ih),-2,T)':'if(gt(iw,ih),T,-2)'`
  (short-side = target: 720p→1280×720, 1080p→1920×1080, 2160p→3840×2160;
  otomatis genap via `-2`) + `libx264 veryfast`.
- `vertical` → `VERTICAL_PAD_BLUR` (lihat 6.4) + `libx264 veryfast`.

### 6.3 Mode `enhance` — Penjernihan Maksimal (default)

Mode dipilih via tab di UI (ikon `Focus`; pill aktif biru geser). Wajib
re-encode + pipeline jernih:
```
atadenoise=0a=0.04:0b=0.04 → [scale long-side + flags=lanczos] → cas=0.7 → eq(saturation=1.15:contrast=1.04)
```
- `archive` → pipeline tanpa scale, encoder mengikuti `quality`.
- `hd`/`fullhd`/`uhd` → `buildEnhance` (pipeline + scale lanczos), encoder
  mengikuti `quality` (hwAccel-aware: videotoolbox/nvenc/amf, fallback x264).
- `vertical` → `buildEnhance` (pipeline + pad-blur 9:16).
- Audio mengikuti `audio` (original → `-c:a copy` tanpa filter; selainnya
  AAC + `afftdn=nr=12:nf=-30`, dgn fallback tanpa filter audio).

### 6.4 `vertical` — Vertikal 9:16 Story/Shorts/Reels

Output 1080×1920. Transformasi "pad-blur" (konten utuh di tengah, latar blur
bukan hitam):
```
split=2[fg][bg];
[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5,eq=brightness=0.25:contrast=1.0[bg2];
[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg2];
[bg2][fg2]overlay=(W-w)/2:(H-h)/2
```
`crop=1080:1920` memaksa latar ke dimensi genap agar kompatibel dengan
libx264 yuv420p. Tidak memotong konten utama. Mode privacy: `libx264 veryfast`;
mode enhance: pipeline jernih + encoder CRF.

### 6.5 Catatan Watermark (`drawtext`) — TIDAK TERSEDIA

Fitur watermark teks **dihapus**. Build FFmpeg yang diprovisikan
(evermeet/ffbinaries-prebuilt 6.1, macos-64) **tidak menyertakan filter
`drawtext`** — diverifikasi: `[AVFilterGraph] No such filter: 'drawtext'`.
Setiap encode yang memakai `drawtext` pasti gagal. Untuk menghidupkan kembali
fitur ini, dibutuhkan build FFmpeg lain yang menyertakan `drawtext` atau
pendekatan overlay gambar logo (lihat roadmap).

## 7. Pemotongan Lossless (`trimmer.ts`)

- `parseTimeToSeconds(value)` mendukung `HH:MM:SS`, `MM:SS`, atau detik,
  dengan validasi rentang: menit/detik maks 59, nilai negatif ditolak.
- Validasi: format valid, `end > start`, berkas sumber ada, payload lengkap.
- Command:

```
ffmpeg -y -i <in> -ss <start> -to <end> -c copy -map_metadata -1 -movflags +faststart <out>
```

- `-ss` setelah `-i` + `-c copy` = potong akurat tanpa re-encode (decoding ke
  titik mulai lalu salin stream).
- Hasil: `<nama> - Potongan <start>-<end>.mp4` di folder `[CLEANED] - YYYY-MM-DD`.
- Nama hasil dibuat unik (akhiran `(n)`) agar tidak menimpa potongan sebelumnya.

## 8. Pengunduh Universal (`downloader.ts`)

### 8.1 Provisioning yt-dlp (`ensureYtdlp`)

Prioritas lokasi binary:
1. `binDir/yt-dlp` (lokal; `yt-dlp.exe` di Windows).
2. Perintah sistem `yt-dlp` (via `which`/`where`).
3. Unduh dari rilis resmi GitHub sesuai platform (`yt-dlp_macos` di macOS,
   `yt-dlp.exe` di Windows), disimpan di `binDir`, lalu `chmod 755`
   (kecuali Windows).

### 8.2 Unduhan Banyak Link (`startDownloadBatch`)

Menerima array URL dan memprosesnya **berurutan** (satu per satu) agar
progress & rate-limit yt-dlp stabil — kecuali `options.parallel` true
(unduh maks 2 sekaligus). Setiap URL:

```
yt-dlp --newline --no-playlist --progress \
  [-f bv*[height<=H]+ba/b[height<=H]] \
  [--cookies-from-browser <browser>] \
  -o "<downloadDir>/%(title).80B [%(id)s].%(ext)s" <url>
```

Opsi (dari UI "Pengaturan Unduhan"):
- `maxHeight` → `-f bv*[height<=H]+ba/b[height<=H]` (batas resolusi; tanpa =
  kualitas terbaik). Mempercepat unduhan & mengecilkan file.
- `cookiesBrowser` → `--cookies-from-browser <browser>` (Chrome/Edge/Safari/
  Firefox/Brave). Menghindari throttle Facebook/Instagram/TikTok pada unduhan
  anonim dan mengurangi kegagalan parse.
- `parallel` → maks 2 unduhan bersamaan (worker berbagi indeks antrean).

**Progress realtime** (stdout di-buffer per baris, bukan per potongan):
- `--newline` membuat tiap baris progress terpisah; buffer stdout dipecah per
  `\n` lalu `handleLine`. Tiap baris `[download] NN% of X at Y/s ETA MM:SS`
  diurai menjadi `{ percent, speedBytesPerSec, etaSeconds, sizeBytes }`.
- **Throttle 300 ms**: event dikirim maks 1×/300 ms; update antara di-koales
  ke variabel `coalesced` lalu di-`flush` saat proses tutup — UI tidak
  dibanjiri ribuan event, tapi tetap realtime.
- Fase (`phase`): `extracting` → `downloading` (baris `Destination:` atau
  `percent > 0`) → `merging` (`Merging formats into`/`[Merger]`) → `done`.

**Retry otomatis extractor** (mis. Facebook "Cannot parse data" / TikTok):
- Pola error transien `TRANSIENT_ERROR_RE` (`Cannot parse data`, `Unexpected
  response`, `HTTP Error [45]xx`, `Sign in to confirm`, dll) DAN belum ada
  unduhan (`!sawDownloadStart`) → ulang hingga 2× dengan jeda `2000 * attempt`
  ms. Fase `retrying` dikirim ke UI saat mencoba ulang.
- **Lapisan pemulihan (self-heal)**: bila masih gagal dengan error
  extractor/situs (`EXTRACTOR_ISSUE_RE`), download dijalankan berjenjang:
  1. **Workaround Chrome user-agent** — `--user-agent` Chrome modern. TikTok
     mulai menolak permintaan non-browser (bot-detection baru, yt-dlp #17403);
     sebagian besar unduhan pulih dengan ini.
  2. **Auto-update yt-dlp** (`ensureLatestYtdlp`, sekali per sesi) — hapus
     binary lokal, unduh rilis terbaru dari GitHub, lalu retry. Bila yt-dlp
     menerbitkan perbaikan extractor, unduhan pulih otomatis tanpa campur
     tangan pengguna.
- **Provisioning `ensureYtdlp`**: prioritas **folder lokal → unduh rilis
  terbaru GitHub → yt-dlp sistem (cadangan terakhir, hanya bila unduhan
  gagal)**. Tidak lagi memakai yt-dlp sistem secara diam-diam (yang bisa
  berusia >1 tahun dan gagal menangani situs modern).

**Jalur TikTok via API TikWM (Lapisan 0)** — `electron/main/engine/tiktok.ts`:
- `downloadSingle` memeriksa `isTikTokUrl(url)` lebih dulu. Bila TikTok → coba
  **API TikWM** sebelum yt-dlp (bot-detection TikTok 2026 memutus yt-dlp global;
  TikWM emulasi mobile di server tetap bekerja). Gagal → jatuh ke lapisan
  yt-dlp di bawah.
- `TIKWM_PROVIDERS`: 5 provider `{ id: k1..k5, baseUrl: 'https://www.tikwm.com/api',
  apiKey }` (key user, hardcoded di codebase, tanpa UI). **Failover berurutan**
  k1→k5 pada kegagalan nyata (HTTP error, `code != 0`, `data.play` kosong,
  unduhan CDN gagal).
- `resolveTikTokInfo(url)`: GET `/api/?url=<url>&api_key=<key>` (UA Chrome) →
  `{ code: 0, data: { id, title, cover, duration, size, play, ... } }`. Sukses
  bila `code === 0` dan `play` ada.
- `downloadTikTokVideo(url, destDir, onProgress)`: unduh `data.play` via **GET**
  dengan UA Chrome + `Referer: https://www.tiktok.com/` (HEAD CDN = 503; GET =
  MP4 valid), redirect ditangani, progress byte 0→100 (dari `content-length`),
  nama `[judul] [id].mp4` (sanitasi lintas-OS + dedupe ` (2)`), return
  `{ ok, filePath, title, thumbnail, sizeBytes }`.
- **Catatan**: `api_key` tidak di-enforce endpoint (key invalid tetap `code:0`);
  failover berbasis kegagalan nyata. Metadata sukses disertakan pada event
  `success` (`description: "TikTok · via TikWM"`).
- `--no-playlist` hanya mengambil satu video per URL.

**Metadata video** (thumbnail, judul, deskripsi, filePath):
- Ditangkap via `--print after_move` sebagai **satu objek JSON valid**:
  `after_move:__RSMETA__{"title":%(title)j,"thumbnail":%(thumbnail)j,"filepath":%(filepath)j,"description":%(description)j}`.
  Setiap field di-encode `%(field)j` (aman dari newline/tab/emoji).
- Baris `__RSMETA__` di-`JSON.parse` setelah prefix di-slice; hasil disertakan
  pada event sukses (`percent: 100, status: 'success'`) dan dipakai renderer
  untuk menampilkan thumbnail (`img` remote — diizinkan CSP `img-src ... https:
  http:`), judul, deskripsi (line-clamp-2), dan tombol "Buka folder".

- Selesai per URL (exit 0) → `success`; selain itu → `failed` dengan pesan
  `error`. Bila stderr mengandung tanda kegagalan extractor (mis. Facebook
  "Cannot parse data"), pesan diberi keterangan ramah + saran.
- Setelah seluruh antrean → event `download:complete` berisi ringkasan
  `{ total, success, failed }`.
- Output ke `~/Downloads/RS-OmniClip/Unduhan/`; tombol "Buka folder" memakai
  channel `folder:reveal` (`shell.showItemInFolder`).

### 8.3 Ambil Daftar Akun / Halaman (`scrapeAccount`)

Menampilkan daftar video dari satu akun/halaman (YouTube channel/@user, TikTok
`@user`, Instagram username, dll) **tanpa mengunduh**:

```
yt-dlp --flat-playlist --no-warnings --print "%(id)s\t%(title)s\t%(webpage_url)s" <url>
```

- Parse output tab-separated menjadi `ScrapeItem[]` `{ index, id, title, url }`
  (dedupe per URL).
- Hasil dibatasi `MAX_SCRAPE_ITEMS = 500` agar UI tetap responsif; flag
  `truncated: true` menandakan daftar dipotong.
- URL yang dipakai untuk unduhan adalah kolom `%(webpage_url)s` (URL langsung
  video), sehingga item terpilih bisa langsung dikirim ke `startDownloadBatch`.
- Akun privat / gagal → error informatif dikirim lewat `scrape:complete`.

## 9. Batas Waktu & Keandalan

| Operasi | Timeout |
|---|---|
| Unduhan ffbinaries | 90 detik |
| Unduhan fallback GitHub / yt-dlp | 120 detik (default `downloadFile`) |
| Eksekusi FFmpeg | tidak dibatasi (proses batch bisa lama) |

Saat timeout, koneksi HTTP **dibatalkan** (`req.destroy()`) dan file parsial
dihapus — tidak ada operasi yang menggantung di background.

Semua kegagalan per-file ditangkap dan dilaporkan sebagai `failed` tanpa
menghentikan batch (kecuali mesin itu sendiri yang gagal).
