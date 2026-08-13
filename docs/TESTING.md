# Strategi Pengujian — RS OmniClip

## 1. Tingkatan Pengujian

| Tingkat | Alat | Cakupan |
|---|---|---|
| Statis | `npm run typecheck` | Tipe proses utama + preload + renderer |
| Lint | `npm run lint` | ESLint (react-hooks, typescript-eslint, no-undef) |
| Build | `npm run build` | Kompilasi main, preload, renderer berhasil |
| Mesin (engine) | `scripts/engine-smoke-test.mjs` | Rantai perintah FFmpeg nyata |
| Manual | Pengguna | Alur UI end-to-end di window Electron |

## 2. Smoke Test Mesin

Jalankan:

```bash
node scripts/engine-smoke-test.mjs
```

Skrip ini (headless) memverifikasi:

1. Binary FFmpeg + FFprobe tersedia (ffbinaries, lalu fallback ekstraksi dari
   cache lokal bila API tidak terjangkau).
2. Pembuatan video uji (5 detik, 640x360, audio) berhasil.
3. `probe` mengembalikan durasi + resolusi yang benar.
4. **Setiap preset** berhasil menghasilkan output yang valid:
   - `metadata` (hapus metadata, lossless remux)
   - `metadata-fallback` (encode minimal untuk codec tak kompatibel remux)
   - `hd` (upscale 720p) — **memverifikasi lebar/tinggi >= 720**
   - `fullhd` (upscale 1080p) — **memverifikasi >= 1080**
   - `uhd` (upscale 4K) — **memverifikasi >= 2160**
   - `archive` (CRF 18)
   - `whatsapp` (kompresi target ukuran)
5. Pemotongan lossless 1s–3s (stream copy) berhasil.

Keluaran sukses: `Total: 11 PASS, 0 FAIL`.

### Catatan untuk pengembang

Skrip meniru argumen persis dari `electron/main/engine/processor.ts` dan
`trimmer.ts`. Jika preset diubah di source, update juga argumen di skrip ini
agar tetap sinkron.

## 3. Verifikasi Rutin (Checklist Audit Forensik)

Setelah setiap perubahan kode, jalankan:

```bash
npm run typecheck
npm run lint
npm run build
node scripts/engine-smoke-test.mjs   # jika engine/ffmpeg berubah
```

Dan pastikan panel Problems di VS Code tidak menunjukkan error
(`get_errors` = "No errors found").

## 4. Skenario Uji Manual (UI)

### 4.1 Inisialisasi mesin
- [ ] Buka aplikasi → layar "Menyiapkan Mesin Video..." tampil.
- [ ] Setelah binary siap → masuk ke UI utama.
- [ ] Tanpa internet pada first-run → muncul status gagal yang informatif.

### 4.2 Pembersih video
- [ ] Drag-and-drop beberapa `.mp4`/`.mov` → masuk antrean.
- [ ] Ubah urutan antrean (drag).
- [ ] Pilih tiap preset → proses → status per file berubah (processing → success/failed).
- [ ] ETA tampil saat memproses.
- [ ] Selesai → tombol "Buka Folder Hasil" membuka folder `[CLEANED] - YYYY-MM-DD`.
- [ ] Berkas asli tidak berubah (cek ukuran/timestamp).
- [ ] Filter Semua/Menunggu/Selesai/Gagal berfungsi.
- [ ] Preview video (klik nama file) berfungsi.
- [ ] Hapus item / bersihkan daftar dengan konfirmasi.

### 4.3 Pemotongan inline
- [ ] Klik ikon gunting pada item.
- [ ] Isi Mulai/Selesai (HH:MM:SS) → Simpan.
- [ ] Muncul toast sukses; hasil di folder `[CLEANED]`.
- [ ] Format waktu salah / end <= start → toast error.

### 4.4 Pengunduh
- [ ] Tempel URL YouTube → Unduh → progress tampil.
- [ ] Selesai → status "Selesai"; file ada di `~/Downloads/RS-OmniClip/Unduhan/`.
- [ ] URL tidak valid → status "Gagal".

### 4.5 Estetika & bahasa
- [ ] Semua teks Bahasa Indonesia, tanpa emoji.
- [ ] Toggle Mode Gelap/Terang.
- [ ] Sidebar (mobile) & layout tidak rusak.
- [ ] Traffic light macOS (minimize/max/close) tidak tertutup konten sidebar/brand;
  tombol menu mobile berada di kanan traffic light.

### 4.6 Perombakan UX (dropzone, preset, monitor, responsivitas)
- [ ] Klik preset / tombol lain di halaman mana pun TIDAK membuka dialog file.
- [ ] Preset tampil di halaman Pembersih Video (bukan sidebar), tetap terlihat
  saat antrean kosong & terisi.
- [ ] Pilih tiap preset baru (metadata/hd/fullhd/uhd/archive/whatsapp) → proses.
- [ ] Monitor sidebar menampilkan pemakaian CPU/RAM APLIKASI ini (bukan seluruh sistem), berubah realtime.
- [ ] Resize jendela ke 720x560 → layout tidak rusak; sidebar mobile jadi drawer.
- [ ] Tidak ada kontrol mati (subtitle/watermark) di sidebar.

## 5. Lingkungan Uji

| Parameter | Nilai |
|---|---|
| OS | macOS (arm64 utama; x64 via Rosetta) |
| Aplikasi | Electron 33 |
| Video uji | `.mp4`/`.mov` pendek (< 1 menit) |
| Jaringan | dibutuhkan untuk unduh binary pertama kali |
