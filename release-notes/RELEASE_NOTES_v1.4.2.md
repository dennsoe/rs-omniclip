# Catatan Rilis — RS OmniClip v1.4.2

Dokumen ini adalah **sumber catatan rilis** untuk release v1.4.2. Bagian
"Body release" di bawah siap disalin ke **detail release GitHub** (mis.
`gh release create v1.4.2 --notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniClip v1.4.2 — Modal Notifikasi Update

> Pembaruan yang menambahkan modal pemberitahuan versi baru otomatis + catatan
> rilis yang dirender sebagai Markdown. Termasuk seluruh fitur v1.4.1.

### 1. Modal Notifikasi Update (Otomatis)
- Muncul **otomatis SEKALI PER SESI** saat aplikasi mendeteksi versi baru
  (`v{terpasang} → v{terbaru}`), setelah aplikasi siap digunakan.
- Menampilkan **catatan rilis** versi terbaru yang dirender rapi sebagai
  **Markdown** (heading, list, bold, tabel).
- Tombol **"Unduh Sekarang"** — membuka halaman rilis GitHub untuk mengunduh
  dmg/zip (macOS) atau installer (Windows) secara manual & gratis.
- Tombol **"Nanti"** — menutup modal; akan muncul kembali di sesi berikutnya.

### 2. Catatan Rilis Markdown
- Halaman Tentang & Update: bagian "Catatan Rilis" kini dirender sebagai
  Markdown (bukan teks mentah) — lebih mudah dibaca.

### Termasuk seluruh fitur v1.4.1
- **Proxy (Sistem Anti-Banned)**: rotasi otomatis, tes latensi, berlaku untuk
  yt-dlp + TikWM + CDN.
- **Auto-Watcher**: pantau akun otomatis, deteksi posting baru, unduh +
  auto-clean metadata + notifikasi.
- **CSV Analytics**: ekspor data analitik (RFC 4180 + BOM) saat ambil daftar.
- **Hardware Acceleration**: deteksi encoder GPU (VideoToolbox/NVENC/AMF) +
  fallback ke CPU.
- **Preview + Riwayat**: pemutar internal `media://`, tab Riwayat tersimpan di
  main process.
- **Perombakan Preset**: 2 tab (Privasi Cepat / Penjernihan Maksimal) + select
  detail + toggle metadata.
- **Desain & Animasi**: tabel super responsif (scroll internal, header sticky),
  komponen antrean per tab, exit animation halus di seluruh UI.

### Catatan teknis
- Fix: `https-proxy-agent`/`socks-proxy-agent` diturunkan ke versi CommonJS agar
  kompatibel dengan build main process (Electron).

---

## Log perubahan (referensi internal — tidak disalin ke detail release)

### v1.4.2 (2026-08-16)
- `feat: modal notifikasi update otomatis (sekali per sesi)` (`7ec2701`,
  PR #28 → merge commit `351c921`).
- `docs: status rilis v1.4.1 SELESAI` (PR #27 → merge commit `784158f`).

### v1.4.1 (2026-08-15)
- 5 fitur besar (Proxy, Auto-Watcher, CSV Analytics, Hardware GPU, Preview +
  Riwayat) + perombakan preset + penyempurnaan desain v1.3.4.
- Validasi: typecheck/lint/build PASS; E2E Electron+CDP.
