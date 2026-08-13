# Product Requirements Document (PRD) — RS OmniClip

Versi: 1.0
Tanggal: 2026-08-13
Status: Aktif (dipelihara)

## 1. Ringkasan Produk

**RS OmniClip** adalah aplikasi desktop (Electron) untuk pemrosesan massal video
pendek (< 1 menit) yang digunakan oleh tim internal. Aplikasi menggabungkan
beberapa alat video umum menjadi satu "Super App": pembersih metadata, peningkat
video, pengunduh universal, pemotong inline, watermark/caption, dan kompresor
WhatsApp.

Semua pemrosesan berjalan **100% lokal** menggunakan FFmpeg dan yt-dlp; tidak ada
data yang dikirim ke server.

## 2. Target Pengguna

- Tim internal yang rutin membagikan video pendek ke WhatsApp, Instagram,
  TikTok, dan YouTube.
- Pengguna yang membutuhkan video "bersih" (tanpa metadata/GPS) sebelum dibagikan.
- Pengguna yang mengunduh video dari berbagai platform untuk diolah ulang.

## 3. Persona

| Persona | Kebutuhan utama |
|---|---|
| Admin konten sosial | Membersihkan metadata + mengompresi untuk WhatsApp secara massal |
| Editor video | Upscale 1080p, penajaman, reduksi noise audio, potong cepat |
| Kreator | Mengunduh video referensi dari YouTube/TikTok/IG lalu mengolahnya |

## 4. Fitur (Prioritas)

| # | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| F1 | Pembersih Metadata Massal | Menghapus metadata (termasuk GPS/EXIF) via FFmpeg remux lossless. Prasetel `quick` | P0 |
| F2 | Peningkat Video & Normalisasi Audio | Upscale 1080p (sumbu panjang), penajaman AI-like (`unsharp`), reduksi noise audio (`afftdn`). Prasetel `standard` | P0 |
| F3 | Pengunduh Video Universal | Unduh dari YouTube, TikTok, Facebook, Instagram dll. via `yt-dlp` | P0 |
| F4 | Pemotong Video Inline | Potong lossless (stream copy) per file, tanpa re-encode | P1 |
| F5 | Watermark & Auto-Caption | Pengaturan tambahan pada sidebar (UI, backend menyusul) | P2 |
| F6 | Kompresor WhatsApp | Target ukuran file otomatis (~16 MB). Prasetel `whatsapp` | P0 |
| F7 | Arsip Kualitas Maks | Resolusi asli + CRF 18. Prasetel `archive` | P1 |

## 5. Kebutuhan Fungsional

### 5.1 Pembersih & Peningkat (Halaman "Pembersih Video")

- **RF-1** Pengguna dapat menambah satu atau banyak video `.mp4` / `.mov`
  (drag-and-drop atau pemilih file).
- **RF-2** Pengguna dapat mengurutkan antrean dengan drag-and-drop.
- **RF-3** Pengguna dapat memilih salah satu prasetel: Bagikan Cepat (`quick`),
  Standar Bersih & Jernih (`standard`), Arsip Kualitas Maks (`archive`),
  Kompresi WhatsApp (`whatsapp`).
- **RF-4** Pengguna dapat mengaktifkan "Subtitle Otomatis (AI)" dan
  "Pasang Watermark Logo" (pengaturan UI; backend disiapkan pada fase berikutnya).
- **RF-5** Pengguna dapat memfilter antrean: Semua / Menunggu / Selesai / Gagal.
- **RF-6** Pengguna dapat melihat pratinjau video (modal player) sebelum diproses.
- **RF-7** Pengguna dapat menghapus satu item atau membersihkan seluruh antrean
  (dengan konfirmasi).
- **RF-8** Pengguna dapat menekan "Proses N Video" untuk memulai batch.
- **RF-9** Sistem menampilkan kemajuan per file (persentase) dan ETA keseluruhan.
- **RF-10** Setelah selesai, sistem menampilkan tombol "Buka Folder Hasil" menuju
  folder `[CLEANED] - YYYY-MM-DD`.
- **RF-11** NON-DESTRUKTIF: berkas asli tidak pernah diubah/ditimpa.
- **RF-12** Pengguna dapat memotong video inline per item (mulai–selesai) secara lossless.

### 5.2 Pengunduh (Halaman "Pengunduh Video")

- **RF-13** Pengguna menempelkan URL video lalu menekan "Unduh".
- **RF-14** Sistem menampilkan antrean unduhan dengan persentase dan status
  (Mengunduh / Selesai / Gagal).
- **RF-15** Hasil unduhan disimpan ke `~/Downloads/RS-OmniClip/Unduhan/`.

### 5.3 Mesin & Status

- **RF-16** Saat aplikasi dibuka, sistem menginisialisasi mesin (FFmpeg) dan
  menampilkan layar "Menyiapkan Mesin Video..." sampai siap.
- **RF-17** Jika binary belum ada, sistem mengunduh otomatis (butuh internet).
- **RF-18** Sistem menampilkan monitor System (CPU/RAM simulasi) di sidebar.

## 6. Kebutuhan Non-Fungsional

| Kode | Kebutuhan | Spesifikasi |
|---|---|---|
| NFR-1 | Keamanan | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`; renderer hanya berkomunikasi lewat `window.api` (contextBridge) |
| NFR-2 | Kinerja | Pemrosesan batch berurutan; pelaporan kemajuan dari stderr FFmpeg |
| NFR-3 | Keandalan | Unduhan binary punya batas waktu (timeout) + fallback sumber cadangan agar tidak menggantung |
| NFR-4 | Portabilitas | Target macOS (arm64 & x64 via Rosetta untuk binary macos-64) |
| NFR-5 | Estetika | Light mode macOS premium, `backdrop-blur`, palet slate/blue, ikon `lucide-react` |
| NFR-6 | Bahasa | Seluruh teks antarmuka Bahasa Indonesia, tanpa emoji |
| NFR-7 | Ukuran antrean | Mendukung batch puluhan file sekaligus |

## 7. User Stories

1. Sebagai admin konten, saya ingin menghapus metadata video dalam satu batch
   agar aman dibagikan, tanpa merusak kualitas.
2. Sebagai editor, saya ingin meng-upscale video ke 1080p dan mengurangi noise
   audio agar hasil akhir lebih jernih.
3. Sebagai kreator, saya ingin mengunduh video dari YouTube/TikTok lalu
   mengolahnya langsung di aplikasi yang sama.
4. Sebagai pengguna WhatsApp, saya ingin video saya otomatis dikompresi ke
   ukuran yang pas agar cepat dikirim tanpa dipotong.
5. Sebagai pengguna, saya ingin memotong bagian video tanpa menurunkan kualitas
   dan tanpa menyentuh berkas asli.

## 8. Batasan & Keputusan Desain

- **Non-destruktif** adalah aturan mutlak: hasil selalu ke folder
  `[CLEANED] - YYYY-MM-DD`, nama file asli dipertahankan (ekstensi `.mp4`).
- Fitur "Subtitle Otomatis (AI)" dan "Watermark" saat ini berupa kontrol UI;
  implementasi backend direncanakan pada fase roadmap berikutnya.
- Monitor System (CPU/RAM) menggunakan simulasi di renderer (tidak ada kontrak IPC
  untuk statistik sistem asli).
- Target WhatsApp 16 MB (batas umum berbagi video WA).

## 9. Definisi Selesai (DoD)

- Kode lolos `npm run typecheck`, `npm run lint`, dan `npm run build`.
- Smoke test mesin (`scripts/engine-smoke-test.mjs`) lolos 9/9.
- UI memakai Bahasa Indonesia dan tanpa emoji.
- Tidak ada error editor di seluruh workspace.
