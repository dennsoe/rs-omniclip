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
dipakai untuk menghitung persentase kemajuan dan bitrate kompresor WhatsApp.

## 5. Eksekusi FFmpeg — `runFfmpeg(options)`

- Spawn FFmpeg dengan `stdio: ['ignore','ignore','pipe']`.
- Membaca stderr, mencocokkan `time=HH:MM:SS.xx` untuk menghitung persentase
  terhadap `totalDuration`.
- Jika `totalDuration` tidak diketahui (0), mengirim progres indikatif
  (maks 90%) agar UI tidak membeku di 0%; 100% dikirim saat selesai.
- Kirim `onProgress(percent)` (dedupe jika persen sama).
- Resolve saat kode keluar 0; reject dengan cuplikan stderr bila gagal.

## 6. Preset Pemrosesan (`processor.ts`)

`processBatch(files, preset, onProgress)` memproses file berurutan, non-destruktif,
ke folder `[CLEANED] - YYYY-MM-DD`, nama file dipertahankan (ekstensi `.mp4`).
Setiap preset menghasilkan `outputPath = <outputFolder>/<nama-asli>.mp4`.

**Anti-timpa hasil**: jika nama output sudah ada di folder (mis. diproses ulang
hari yang sama), engine otomatis menambahkan akhiran `(n)` — hasil lama tidak
pernah ditimpa, berkas asli dan hasil sebelumnya tetap aman.

Semua preset memakai `-map_metadata -1` (hapus metadata) dan
`-movflags +faststart` (siap streaming).

### 6.1 `metadata` — Hapus Metadata (lossless)

Set utama (remux lossless):
```
ffmpeg -y -i <in> -map_metadata -1 -c copy -movflags +faststart <out>
```

Remux tanpa re-encode — sangat cepat, kualitas tidak berubah.

**Fallback**: jika codec tidak dapat diremux ke `.mp4` (mis. audio PCM, ProRes,
HEVC dengan parameter tertentu), engine otomatis mencoba ulang dengan encode
minimal agar preset tetap berhasil (metadata tetap dihapus):
```
libx264 -preset veryfast -crf 23 -pix_fmt yuv420p, audio aac 128k
```

### 6.2 `hd` (720p), `fullhd` (1080p), `uhd` (4K) — Peningkat Video

`buildEnhance(common, target, output)` dengan `target` = 720 / 1080 / 2160.

Filter video:
```
scale='if(gt(iw,ih),<target>,-2)':'if(gt(iw,ih),-2,<target>)':flags=lanczos,
unsharp=5:5:0.6:5:5:0.0
```

- Upscale sumbu panjang ke target (landscape → lebar target; portrait → tinggi
  target), menjaga rasio aspek.
- `unsharp` untuk penajaman AI-like.
- Filter audio `afftdn=nr=12:nf=-30` (reduksi noise).
- Encode: `libx264 -preset veryfast -crf 20 -pix_fmt yuv420p`, audio `aac 192k`.
- **Fallback**: jika set utama gagal (mis. codec audio tidak kompatibel dengan
  filter), otomatis mencoba ulang tanpa filter audio.

### 6.3 `archive` — Arsip Kualitas Maks

```
libx264 -preset slow -crf 18 -pix_fmt yuv420p, audio aac 256k
```

Resolusi asli, kualitas terbaik.

### 6.4 `whatsapp` — Kompresi WhatsApp

Bitrate video dihitung agar ukuran akhir mendekati **target 16 MB**:

```
duration = probe.duration (default 60 jika tidak diketahui)
totalBits      = 16 * 8 * 1024 * 1024
audioBits      = 128 * 1024 * duration
videoBits      = max(totalBits - audioBits, 256 * 1024 * duration)
videoBitrate_k = round(videoBits / 1024 / duration)
```

Command:
```
libx264 -preset medium -b:v <vb>k -maxrate <vb*1.5>k -bufsize <vb*2>k
-pix_fmt yuv420p, audio aac 128k
```

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
  Firefox/Brave). Menghindari throttle Facebook/Instagram pada unduhan anonim
  dan mengurangi kegagalan parse.
- `parallel` → maks 2 unduhan bersamaan (worker berbagi indeks antrean).

- Parse baris `[download] NN%` dari stdout → event `download:progress` per URL
  (`id` = URL).
- `--no-playlist` hanya mengambil satu video per URL.
- Selesai per URL (exit 0) → `success`; selain itu → `failed` dengan pesan
  `error`. Bila stderr mengandung tanda kegagalan extractor (mis. Facebook
  "Cannot parse data"), pesan diberi keterangan ramah + saran.
- Setelah seluruh antrean → event `download:complete` berisi ringkasan
  `{ total, success, failed }`.
- Output ke `~/Downloads/RS-OmniClip/Unduhan/`.

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
