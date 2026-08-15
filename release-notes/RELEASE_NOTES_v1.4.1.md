# Catatan Rilis — RS OmniClip v1.4.1

Dokumen ini adalah **sumber catatan rilis** untuk release v1.4.1. Bagian
"Body release" di bawah siap disalin ke **detail release GitHub** (mis.
`gh release create v1.4.1 --notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniClip v1.4.1 — 5 Fitur Besar: Proxy, Auto-Watcher, CSV Analytics, Hardware GPU, Preview + Riwayat

> Update besar untuk tim riset & operasional: sistem anti-banned, pemantauan
> akun otomatis, data analitik ekspor CSV, akselerasi GPU saat memproses video,
> serta pratinjau inline + riwayat unduhan. Termasuk seluruh penyempurnaan
> desain v1.3.4 (floating field gaya Google, hasil akun grid/list, pratinjau
> video, dsb.).

### 1. Manajemen Proxy (Sistem Anti-Banned)
- Kelola daftar proxy (HTTP/HTTPS/SOCKS5, satu per baris) di Pengaturan Unduhan.
- **Rotasi otomatis** — ganti proxy setelah N unduhan (default 5) agar IP tidak
  cepat dibanned platform.
- Proxy berlaku untuk **semua jalur**: yt-dlp, TikWM (resolver TikTok), dan CDN
  unduhan.
- Tombol **Tes** per proxy — menampilkan status sukses/gagal + latensi.
- Catatan: Instagram/Facebook memblokir proxy datacenter — gunakan proxy
  residential untuk platform tersebut.

### 2. Auto-Watcher (Pemantauan Akun Otomatis)
- Pantau akun/halaman (TikTok, YouTube, Instagram, dsb.) secara otomatis
  **selama aplikasi terbuka**.
- Cek berkala tiap N jam (default 1), tambah akun dengan label, aktif/nonaktif
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
  tetap sesuai prasetel (HD/FullHD/UHD/Vertikal).

### 5. Pemutar Pratinjau Internal + Riwayat
- **Pratinjau inline**: klik "Putar" pada baris antrean unduhan → video diputar
  langsung di aplikasi (protokol `media://` lokal, dukungan seek).
- **Tab Riwayat** baru: semua unduhan tersimpan (judul, platform, waktu); klik
  untuk memutar ulang, tombol "Bersihkan Riwayat".
- Riwayat & semua pengaturan baru tersimpan **di main process** (aman, bukan
  localStorage).

### 6. Perombakan Total Preset — 2 Tab + Select Detail + Toggle Metadata
- Grid kartu prasetel dihapus. Kini **2 tab mode tanpa ikon** ("Privasi Cepat
  (Tanpa Efek)" / "Penjernihan Maksimal") dan di dalamnya **beberapa select
  detail**: **Prasetel** (opsi berubah sesuai tab, judul + deskripsi rinci),
  **Kualitas** (Otomatis/Terbaik/Seimbang/Kompak), **Audio** (Pertahankan
  Asli/AAC 128/192/256), plus **Toggle "Hapus Metadata & GPS"** (Ya/Tidak).
- Ikon petir & AI dihapus; mode kini independen dari resolusi.
- **Mode Privasi** (cepat): Kualitas Asli → salin instan; resolusi → skala
  cepat; vertikal → format 9:16 cepat.
- **Mode Penjernihan** (default): pipeline `atadenoise → scale(lanczos) →
  cas → eq` untuk video lebih tajam, bersih, warna hidup.
- Prasetel: Kualitas Asli, HD 720p, Full HD 1080p, 4K UHD, **Vertikal 9:16**
  (Story/Shorts/Reels, 1080×1920, latar blur — bukan hitam).
- Preset **Kompresi WhatsApp dihapus**; preset "Hapus Metadata" di belakang
  (tetap dipakai Auto-Watcher).

### Penyempurnaan v1.3.4 (termasuk dalam rilis ini)
- Floating field gaya Google (label outlined + notch), video player sinematik,
  hasil akun dalam grid/list + thumbnail otomatis + pratinjau video, textarea
  auto-resize, tombol aksi di dalam field, rasa aplikasi desktop (drag window,
  tanpa underline, tanpa seleksi teks), perbaikan scrape 429, dan Pengaturan
  Unduhan dalam modal.

### Catatan teknis
- Fix: `https-proxy-agent`/`socks-proxy-agent` diturunkan ke versi CommonJS agar
  kompatibel dengan build main process (Electron).

---

## Log perubahan (referensi internal — tidak disalin ke detail release)

### v1.4.1 (2026-08-15) — 5 Fitur Besar
- **Fase 0**: Config store main process (`config.ts` — proxy/watcher/hwAccel/
  analyticsExport/history, tulis atomik) + Queue manager (`queue.ts` — unduhan
  FIFO serial, manual + watcher tidak bentrok).
- **Fase 1**: Protokol `media://` (streaming lokal + Range/seek), preview baris
  antrean unduhan, tab Riwayat (persist main process, cap 500).
- **Fase 2**: Manajer Proxy (`proxy.ts`) — rotasi IP, tes latensi, integrasi
  yt-dlp + TikWM + CDN; UI di Pengaturan Unduhan.
- **Fase 3**: Hardware Acceleration — `detectEncoders()`, dropdown
  "Pemrosesan Hardware" (hanya encoder tersedia), fallback berjenjang ke x264.
- **Fase 4**: CSV Analytics (`analytics.ts`) — RFC 4180 + BOM, capture
  engagement (views/likes/comments/caption) saat scrape, toggle ekspor otomatis.
- **Fase 5**: Auto-Watcher (`watcher.ts`) — cek berkala, deteksi posting baru,
  unduh otomatis + auto-clean metadata + notifikasi.
- **Fix kritis**: `https-proxy-agent@7.0.6` + `socks-proxy-agent@8.0.5`
  (CommonJS) menggantikan v9/v10 (ESM-only) yang crash `ERR_REQUIRE_ESM`.
- Validasi: typecheck/lint/build PASS; E2E Electron+CDP (config roundtrip,
  watcher IPC, deteksi encoder, render UI, tanpa overflow & tanpa emoji).
