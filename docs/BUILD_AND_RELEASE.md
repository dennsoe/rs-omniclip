# Panduan Menjalankan, Membangun, dan Merilis — RS OmniClip

## 1. Prasyarat

- Node.js 18+ (direkomendasikan 20+; dikembangkan di Node 24).
- npm (v9+).
- macOS untuk merilis paket `.dmg`/`.zip` (aplikasi target macOS).
- Koneksi internet pada **pertama kali dijalankan** untuk mengunduh binary
  FFmpeg dan yt-dlp.

## 2. Menjalankan di Mode Pengembangan

```bash
npm install        # pasang dependensi
npm run dev        # jalankan Electron (dev server + hot reload)
```

Saat pertama kali, aplikasi menampilkan layar "Menyiapkan Mesin Video..." sambil
mengunduh FFmpeg ke `~/Library/Application Support/rs-omniclip/bin/`.

### Port dev server

Electron-Vite menggunakan port **5173** untuk dev server renderer
(`http://localhost:5173/`). Pastikan port bebas.

## 3. Skrip NPM

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan aplikasi (mode dev) |
| `npm start` | Pratinjau build (`electron-vite preview`) |
| `npm run build` | Build produksi ke `out/` |
| `npm run typecheck:node` | Cek tipe proses utama + preload |
| `npm run typecheck:web` | Cek tipe renderer |
| `npm run typecheck` | Gabungan node + web |
| `npm run lint` | ESLint seluruh proyek |
| `npm run build:mac` | Build + paket macOS (`electron-builder --mac`) |
| `node scripts/engine-smoke-test.mjs` | Smoke test mesin (headless) |

## 4. Build Produksi

```bash
npm run build
```

Hasil:
- `out/main/index.js` — proses utama
- `out/preload/index.js` — preload
- `out/renderer/` — UI (index.html + assets)

## 5. Packaging macOS

```bash
npm run build:mac
```

Konfigurasi packaging ada di field `build` pada `package.json`:

- `appId`: `id.rsstudio.omniclip`
- `productName`: `RS OmniClip`
- Target: `dmg` + `zip`
- `artifactName`: `RS-OmniClip-<version>-<arch>.<ext>`
- Output: folder `dist/`
- `publish`: `{ provider: "github", owner: "dennsoe", repo: "rs-omniclip" }`
  (untuk `electron-builder --publish` mengunggah ke GitHub Release)
- `afterSign`: `scripts/afterSign.js` — menandatangani ulang bundle secara
  **adhoc** (urutan dalam-ke-luar: dylib → framework → helper .app → app)
  agar signature valid. Mencegah bug macOS 26+
  "internal error in Code Signing subsystem" / "-10810" pada app Electron
  yang tidak di-sign.

### Catatan rilis

- Untuk distribusi publik, tambahkan penandatanganan & notarisasi
  (`cscLink` / `notarize` di electron-builder). Lihat Roadmap Fase 4.
- Binary FFmpeg/yt-dlp TIDAK dibundel ke dalam `.app`; diunduh otomatis ke
  userData saat pertama kali aplikasi dijalankan.

### Gatekeeper (macOS) — panduan pengguna

Aplikasi TIDAK ditandatangani Developer ID (gratis). Saat pertama diunduh
via browser, macOS menambah atribut *quarantine* dan bisa memblokir. Solusi:

1. Klik kanan `RS OmniClip.app` → **Open** → **Open** (sekali saja).
2. Atau `xattr -cr "/Applications/RS OmniClip.app"` lalu buka kembali.

Signing yang sudah benar (setelah `scripts/afterSign.js`) memastikan error
"damaged"/"internal error" tidak muncul lagi — cukup workaround quarantine
standar di atas. Distribusi mulus penuh butuh Developer ID + notarisasi
(berbayar).

## 5b. Rilis Otomatis (GitHub Actions — gratis)

Repositori berisi `.github/workflows/release.yml` yang otomatis membangun &
mengunggah rilis macOS ketika tag `v*` di-push:

```bash
npm version 1.1.0 --no-git-tag-version   # (opsional) naikkan versi
npm run typecheck && npm run lint && npm run build   # verifikasi lokal
git add -A && git commit -m "chore: rilis v1.1.0"
git push origin main
git tag v1.1.0
git push origin v1.1.0
```

Workflow (`release.yml`) menjalankan: `npm ci` → `npm run typecheck` →
`npm run build` → `npx electron-builder --mac --publish always`, lalu
mengunggah `dmg` + `zip` + `latest-mac.yml` ke GitHub Release (memakai
`GITHUB_TOKEN` bawaan; `CSC_IDENTITY_AUTO_DISCOVERY=false` untuk melewati
signing karena aplikasi gratis tanpa Developer ID).

**Syarat**: repositori harus **public** agar aplikasi terpasang bisa memeriksa
rilis terbaru via API GitHub tanpa token.

## 5c. Mekanisme Pembaruan Aplikasi (Gratis)

- Versi lokal dibaca dari `app.getVersion()` (package.json, saat ini **1.1.0**).
- Aplikasi memeriksa `releases/latest` GitHub → bila lebih baru tampil badge
  "Update tersedia" + tombol "Unduh Versi Baru" (membuka halaman rilis;
  user mengunduh & membuka dmg/zip sendiri — strategi macOS manual, gratis).
- Update resource (FFmpeg/yt-dlp) via `resources.json` di repo; halaman
  "Tentang & Update" menampilkan status dan tombol "Perbarui Resource".
- Modul: `electron/main/engine/updater.ts`; channel IPC: `update:check`,
  `update:open`, `resource:check`, `resource:update`, event `resource:status`.

## 6. Lokasi Data Runtime

| Data | Lokasi |
|---|---|
| Binary engine (ffmpeg, ffprobe, yt-dlp) | `~/Library/Application Support/rs-omniclip/bin/` |
| Hasil batch (folder `[CLEANED] - YYYY-MM-DD`) | di samping berkas sumber |
| Hasil unduhan | `~/Downloads/RS-OmniClip/Unduhan/` |

## 7. Menghapus Data Aplikasi (Reset)

Untuk mengatur ulang (mis. memaksa unduh binary ulang):

```bash
rm -rf ~/Library/"Application Support"/rs-omniclip
```

## 8. Troubleshooting Cepat

| Gejala | Kemungkinan | Solusi |
|---|---|---|
| Layar "Menyiapkan Mesin..." lama | Binary belum ada + jaringan lambat | Tunggu; pastikan internet; cek `binDir` |
| Inisialisasi mesin gagal | `ffbinaries.com` tidak terjangkau | Engine otomatis fallback ke GitHub; pastikan GitHub dapat diakses |
| Unduhan video gagal | yt-dlp belum siap / URL tidak didukung | Cek internet; pastikan URL valid |
| Port 5173 terpakai | Proses dev lain | Hentikan proses lain lalu `npm run dev` |
| Error editor di `electron.vite.config.ts` | tsserver belum pakai TS workspace | Pastikan `.vscode/settings.json` ada (`typescript.tsdk`) lalu reload window |
| "RS OmniClip is damaged and can't be opened" | App diunduh browser (quarantine) | `xattr -cr "/Applications/RS OmniClip.app"` atau klik kanan → Open |
| `spctl`/launch error "internal error in Code Signing subsystem" | Signature adhoc tidak konsisten | Build ulang (afterSign) atau sign ulang adhoc seluruh bundle |
