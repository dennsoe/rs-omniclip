# Catatan Rilis — RS OmniTools v2.1.0

Dokumen ini adalah **sumber catatan rilis** untuk release v2.1.0. Bagian
"Body release" di bawah siap disalin ke **detail release GitHub** (mis.
`gh release create v2.1.0 --notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniTools v2.1.0 — Performa Kampanye Dirombak + Asisten AI Bubble Chat

> Rilis ini fokus pada **Performa Kampanye**: UI dibangun ulang agar premium &
> konsisten, muncul **Workspace**, **Asisten AI** kini bisa memakai Gemini ATAU
> OpenAI GPT dalam **bubble chat mengambang** yang tersimpan otomatis, label
> status diperbaiki, dan **Ambil Daftar akun TikTok** diperbaiki dari error
> anti-bot.

### 1. Performa Kampanye — UI & Workspace
- **UI dibangun ulang**: tab sticky, date range picker penuh (perbandingan
  periode, tanggal masa depan diblokir), tabel auto-resize sesuai isi, animasi
  accordion, kartu filter status super responsif, dan konsistensi kontrol
  toolbar (semua 36px) + tooltip untuk tombol ikon.
- **Workspace**: simpan/muat/hapus profil analisis di localStorage, label warna
  per sumber (Meta / Shopee / Klik), tombol berlabel, mode demo tersimpan.
- **Label status**: "Tertunda" kini ditampilkan sebagai **"Diproses"** di kartu
  filter status, pie chart, dan tabel Tidak Terpetakan (data mentah tidak
  berubah).

### 2. Asisten AI — Multi-Provider + Bubble Chat
- **Pilih AI**: Google Gemini **atau** OpenAI GPT (kunci API disimpan aman di
  perangkat, tanpa login; input kunci mengikuti provider yang dipilih).
- **Bubble chat mengambang** (bukan tab): FAB kanan-bawah, bisa **layar penuh**,
  tampilan sesuai tema aplikasi, **tanpa avatar** bot/user, **percakapan
  disimpan di localStorage**, dan tombol **hapus riwayat** (2 langkah
  konfirmasi). Auto-audit data hanya berjalan saat chat dibuka (hemat kuota).

### 3. Perbaikan — Ambil Daftar Akun TikTok
- Akar masalah: User-Agent hardcoded Chrome/140 kini diblokir bot-detection
  TikTok → error anti-bot pada akun valid sekalipun.
- **Fix**: UA → Chrome/126, retry + rotasi endpoint otomatis berjalan saat
  TikTok challenge, dan pesan error kini jujur & jelas (akun tidak ditemukan /
  rate-limit / dibatasi sementara).

### Termasuk seluruh fitur v2.0.0
- Seluruh fitur video (pembersih, peningkat, pengunduh universal + watcher,
  pemotong, kompresor, proxy, hardware acceleration, preview, riwayat) dan
  Performa Kampanye dasar tetap tersedia.

### Catatan teknis
- Pembaruan gratis via halaman Rilis GitHub (repo `rs-omnitools`).

---

## Log perubahan (referensi internal — tidak disalin ke detail release)

### v2.1.0 (2026-08-16)
- `feat: poles & perbaiki UI halaman Performa Kampanye` (`02d9256`).
- `feat: workspace localStorage, modal kanonik, & konsistensi toolbar kampanye`
  (`a63cd09`).
- `feat: Asisten AI multi-provider — Gemini + OpenAI GPT` (`2a656ac`).
- `feat: asisten AI jadi bubble chat mengambang + label status Tertunda →
  Diproses` (`83a761c`).
- `fix: perbaiki Ambil Daftar akun TikTok — UA Chrome/126 + retry transien +
  pesan error jujur` (`17543b7`).
- `docs: simpan rencana deteksi Winning Product di Performa Kampanye`
  (`ae2e3bc`).
- Merge: PR #34 (`e8423cd`), PR #35 (`3eb67ef`).
