# Catatan Rilis — RS OmniTools v2.1.1

Dokumen ini adalah **sumber catatan rilis** untuk release v2.1.1. Bagian
"Body release" di bawah siap disalin ke **detail release GitHub** (mis.
`gh release create v2.1.1 --notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniTools v2.1.1 — Ekstensi Cookie Otomatis + Badge Platform + Info Unduhan Lengkap

> Rilis ini menghadirkan **ekstensi browser "RS OmniTools — Cookie Capturer"**
> yang mengambil cookie sesi Douyin/TikTok dan mengirimkannya **otomatis** ke
> aplikasi (tanpa salin manual), **badge platform berwarna brand** di seluruh
> halaman Pengunduh, serta **info unduhan yang lebih lengkap**.

### 1. Ekstensi Cookie Capturer (browser Chrome/Edge/Brave)
- **Ambil cookie otomatis**: buka douyin.com di browser → klik ikon ekstensi →
  **Ambil & Kirim Cookie** → kolom Cookie Douyin terisi otomatis di aplikasi
  (status hijau "Cookie sesi terdeteksi").
- **Jembatan lokal yang aman**: hanya mendengarkan di `127.0.0.1`, token rahasia
  per aplikasi, tanpa CORS — cookie tidak pernah dikirim ke server mana pun.
- **Satu branding**: ikon ekstensi = ikon aplikasi RS OmniTools (16/32/48/128).
- **Siapkan Ekstensi**: aplikasi membuat **ZIP ber-versi** di Downloads
  (`RS-OmniTools-Cookie-Capturer-vX.Y.Z.zip`) — ekstrak lalu Load unpacked.
- Panduan lengkap di Pengaturan Unduhan: pasang ekstensi, hubungkan kode,
  ambil otomatis, + cara manual (F12/Network).

### 2. Badge Platform Berwarna Brand
- Setiap label platform kini tampil sebagai **pill berwarna** dengan ikon brand:
  TikTok (hitam), Douyin (cyan), YouTube (merah), Instagram, Facebook, X, dan
  ikon browser di opsi "Cookies Browser" (Chrome/Edge/Safari/Firefox/Brave).
- Berlaku di: hasil scrape (grid & list), preview video, riwayat unduhan, akun
  yang dipantau, preview media, dan pengaturan.

### 3. Info Unduhan Lengkap + Preview dari Thumbnail
- Item antrean unduhan kini menampilkan **badge platform, durasi, dan nama akun**
  (pembuat video), plus judul/URL/deskripsi/ukuran/kecepatan.
- **Klik thumbnail** item unduhan → langsung membuka **preview video** (tidak
  hanya judul).
- Hasil scrape Akun/Halaman kini menampilkan **engagement** (views/likes/
  comments) di tampilan grid & list.

---

## Log perubahan (internal)

- **Ekstensi MV3** `extensions/rs-omni-cookie-capturer/` + `cookieBridge.ts`
  (loopback + token) + IPC `cookieBridge:info` / `extension:info` /
  `extension:prepare` + event `cookie:received`.
- `PlatformBadge` + `brand-icons` + `platform-brand` (pill warna brand).
- Info unduhan: `DownloadProgress.duration/uploader` + `--print after_move`
  diperluas + TikWM `author`.
- Thumbnail item unduhan → preview; engagement di hasil scrape.
- `scripts/build-extension.mjs` (ZIP ber-versi, di-bundel via extraResources).
