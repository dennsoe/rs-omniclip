# RS OmniTools — Cookie Capturer (Ekstensi Chrome MV3)

Ekstensi ini mengambil cookie sesi dari **Douyin** / **TikTok** di browser lalu
mengirimkannya otomatis ke aplikasi desktop **RS OmniTools** melalui jembatan
lokal (`127.0.0.1`) — jadi Anda tidak perlu menyalin cookie secara manual.

- Versi ekstensi: **baca `version` di `manifest.json`** (satu-satunya sumber
  kebenaran; ZIP distribusi dinamai `RS-OmniTools-Cookie-Capturer-vX.Y.Z.zip`).
- Cookie **tidak** pernah dikirim ke server mana pun. Hanya ke aplikasi desktop
  yang sedang terbuka di komputer Anda.
- Wajib ada **kode hubung** (`port:token`) yang ditampilkan aplikasi — ditempel
  sekali dan disimpan lokal di ekstensi.

---

## Cara Pasang (Load Unpacked)

**Cara termudah (disarankan — ZIP otomatis):**
1. Buka aplikasi **RS OmniTools** → **Pengaturan Unduhan** → bagian
   **"Isi otomatis via ekstensi browser"**.
2. Klik **"Siapkan Ekstensi (salin ke Downloads)"** — aplikasi menyalin
   **ZIP ber-versi** ke `~/Downloads/RS-OmniTools-Extension/`, mengekstraknya
   ke folder `rs-omni-cookie-capturer`, lalu membuka folder itu.
3. Buka Chrome → `chrome://extensions` → aktifkan **Developer mode** →
   **Load unpacked** → pilih folder `rs-omni-cookie-capturer` hasil ekstrak.
4. **Sudah pernah pasang versi lama?** Hapus dulu ekstensi lama, lalu Load
   unpacked folder baru (agar tidak memakai versi lama).

**Cara manual (dari ZIP repo):**
1. Ekstrak `extensions/rs-omni-cookie-capturer.zip` ke suatu folder.
2. Buka Chrome (atau Edge/Brave/Chromium).
3. Buka halaman ekstensi:
   - Chrome/Edge: buka `chrome://extensions`
   - Brave: buka `brave://extensions`
4. Nyalakan **Developer mode** (pojok kanan atas).
5. Klik **Load unpacked** → pilih folder hasil ekstrak.
6. Ekstensi "RS OmniTools — Cookie Capturer" muncul — sematkan (pin) bila mau.

> Di Brave/Edge mungkin muncul konfirmasi "buka paksa ekstensi ini?" → pilih
> **OK** agar bisa membaca cookie douyin.com.

---

## Cara Pakai

1. Buka aplikasi **RS OmniTools**.
2. Buka **Pengaturan Unduhan** → bagian **"Isi otomatis via ekstensi browser"**.
3. Salin **kode hubung** (`port:token`) lalu **Simpan** di popup ekstensi.
4. Buka **douyin.com** (atau tiktok.com) di tab browser dan **login**.
5. Klik ikon ekstensi → pilih situs → klik **Ambil & Kirim Cookie**.
6. Cookie terisi otomatis di aplikasi (toast hijau "Cookie Douyin terisi
   otomatis"). Kolom juga menampilkan status "Cookie sesi terdeteksi".

Tombol lain di popup:
- **Cek koneksi** — memastikan aplikasi sedang menerima koneksi.
- **Salin cookie** — menyalin header cookie ke clipboard (fallback manual).
- **Simpan** — menyimpan kode hubung `port:token`.

---

## Maintenance (versi & ZIP)

- Ubah versi **hanya di `manifest.json`** (`version: "X.Y.Z"`).
- Regenerasi ZIP: `node scripts/build-extension.mjs` (atau
  `npm run build:extension`) — membaca versi dari manifest, menulis
  `extensions/rs-omni-cookie-capturer.zip` (tanpa `.DS_Store`/`__MACOSX`).
- ZIP ini dibundel ke dalam aplikasi (`build.extraResources`) sehingga tombol
  "Siapkan Ekstensi" di aplikasi selalu menyalin versi terbaru.
- Versi juga ditampilkan di footer popup ekstensi dan di aplikasi.

---

## Keamanan

- Jembatan aplikasi hanya mendengarkan di **127.0.0.1** (loopback) pada port
  dinamis — tidak bisa diakses dari jaringan.
- Setiap pengiriman wajib menyertakan **token** (dibandingkan dengan
  *constant-time* di aplikasi) → halaman web berbahaya tidak bisa memanfaatkan
  jembatan ini.
- Tidak ada header CORS → browser tidak bisa membaca respons lintas-origin.
- Cookie dihapus dari memori setelah dikirim; tidak disimpan oleh ekstensi
  (kecuali yang Anda simpan sendiri).

---

## Struktur

```
rs-omni-cookie-capturer/
├── manifest.json   # MV3 — izin cookies + host douyin/tiktok/127.0.0.1 + versi
├── popup.html      # Antarmuka popup
├── popup.js        # Logika ambil cookie + kirim ke jembatan lokal
└── styles.css      # Gaya popup
```

