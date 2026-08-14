# Catatan Rilis — RS OmniClip v1.3.4

Dokumen ini adalah **sumber catatan rilis** untuk release berikutnya. Seluruh
perubahan yang masuk ke rilis dicatat di sini; bagian "Body release" di bawah
siap disalin ke **detail release GitHub** (mis. `gh release create v1.3.4
--notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

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
