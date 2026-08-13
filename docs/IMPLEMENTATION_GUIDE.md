# Panduan Implementasi RS OmniClip (ACUAN UTAMA)

Dokumen ini adalah **satu-satunya acuan** untuk mengimplementasikan, mengubah,
dan memverifikasi apa pun di RS OmniClip. Baca sebelum memulai pekerjaan dan
perbarui setiap ada keputusan baru.

Tanggal pembuatan: 2026-08-13.

---

## 1. Prinsip Mutlak (JANGAN PERNAH DILANGGAR)

1. **NON-DESTRUKTIF** — Aplikasi tidak pernah menimpa berkas asli. Hasil selalu
   ke folder `[CLEANED] - YYYY-MM-DD`; nama output diberi akhiran `(n)` bila sudah ada.
2. **TANPA EMOJI** — Semua teks UI dan komentar kode tanpa emoji. Ikon pakai `lucide-react`.
3. **UI BAHASA INDONESIA** — Semua teks yang terlihat pengguna dalam Bahasa Indonesia.
4. **ESTETIKA PREMIUM macOS** — Light/dark mode, `backdrop-blur`, palet slate/blue, spacing konsisten. Anti AI-slop.
5. **CANONICAL TAILWIND v4** — Jangan pakai arbitrary `[]` bila ada utility bawaan
   (mis. `z-1` bukan `z-[1]`, `h-0.5` bukan `h-[2px]`, `bg-linear-to-r` bukan `bg-gradient-to-r`).
6. **PR WORKFLOW** — Fitur di branch `feat:`/`fix:` → PR → merge commit (`gh pr merge N --merge`).
7. **PUSH WAJIB UNSANDBOXED** — `git push` di VS Code WAJIB mode unsandboxed
   (sandbox memblokir `~/.config/gh/hosts.yml` → "Missing or invalid credentials").
8. **SINKRONKAN SEMUA FILE + MEMORI** — Setiap perubahan: update kode terkait,
   docs terkait, `docs/CURRENT_STATE.md`, dan memori (`/memories/repo/rs-omniclip.md`).

---

## 2. Arsitektur Ringkas

```
Renderer (src/) ──window.api──> Preload ──ipcMain──> Main (Node.js) + engine/
```

- `electron/main/index.ts` — lifecycle + pendaftaran IPC + emitter sistem.
- `electron/main/engine/` — `paths`, `net`, `ffmpeg`, `processor`, `trimmer`, `downloader`.
- `electron/preload/index.ts` — contextBridge → `window.api`.
- `src/` — UI React (App.tsx + components + lib + hooks + types).

## 3. Peta Sinkronisasi File (WAJIB UPDATE BERSAMA)

| Jika mengubah... | Wajib juga perbarui... |
|---|---|
| Preset / engine ffmpeg | `electron/main/engine/processor.ts` ↔ `docs/ENGINE_SPEC.md` ↔ `scripts/engine-smoke-test.mjs` (argumen SAMA PERSIS) |
| Kontrak `window.api` | `electron/preload/index.ts` ↔ `src/types/global.d.ts` ↔ `docs/IPC_CONTRACT.md` ↔ pemakaian di `src/` |
| UI sidebar / halaman | `src/App.tsx` ↔ komponen terkait ↔ `docs/PRD.md` |
| Versi/stack | `package.json` ↔ `docs/TECHNICAL_SPEC.md` |
| Apa pun selesai | `docs/CURRENT_STATE.md` + `/memories/repo/rs-omniclip.md` + `README.md` |

## 4. Kontrak IPC (ringkas + cara menambah channel)

Semua komunikasi renderer↔main lewat `window.api` (contextBridge). Channel yang ada:
`engine:check/status`, `app:ready`, `processing:start/progress/complete`,
`download:start/progress`, `trim:start/complete`, `folder:open`, `system:stats`.

**Cara menambah channel baru:**
1. `electron/main/index.ts` — `ipcMain.on`/emitter di sisi main.
2. `electron/preload/index.ts` — method + `ipcRenderer.on/send` (return unsubscribe).
3. `src/types/global.d.ts` — deklarasi tipe (field opsional utk ekstensi).
4. `docs/IPC_CONTRACT.md` — dokumentasikan.
5. Renderer — daftarkan listener + bersihkan saat unmount.

## 5. Spesifikasi Implementasi (Kondisi Saat Ini + Rencana)

### 5.1 SELESAI — Audit forensik B1–B15 (commit `6133f9e`)
- Retry engine (B1/B2), anti-timpa output (B3), timeout abort (B4), guard IPC (B5),
  toast akurat (B6), fallback metadata (B7), ETA/progress/error/validasi/UX/CSP (B8–B15).
- Verifikasi saat itu: typecheck/lint/build PASS, smoke test 9/9.

### 5.2 SELESAI — Perombakan fitur & UI (2026-08-13, belum di-commit)
1. **Preset diperjelas** — `metadata` (hapus metadata, remux lossless + fallback
   encode), `hd` (720p), `fullhd` (1080p), `uhd` (4K), `archive` (CRF 18),
   `whatsapp` (target 16 MB). Default `fullhd`. Sinkron: `src/lib/types.ts`,
   `src/App.tsx`, `electron/main/engine/processor.ts` (`buildEnhance` +
   `default: throw`), `scripts/engine-smoke-test.mjs`, `docs/ENGINE_SPEC.md`,
   `docs/PRD.md`.
2. **Bug klik dialog file** — dropzone `noClick: activeMenu === 'downloader' ||
   files.length > 0`, `noDrag: activeMenu === 'downloader'`.
3. **System Monitor data nyata** — emitter `system:stats` di main (`os.cpus`
   delta + `os.totalmem/freemem`), `onSystemStats` di preload/global.d.ts,
   `src/components/SystemMonitor.tsx` konsumsi data riil (tanpa simulasi).
4. **Responsivitas super** — `h-dvh`, sidebar `overflow-y-auto`, `min-w-0`,
   teks/aksi responsif (`sm:`), jendela minimum 720x560, mobile drawer < 768px.

### 5.3 DIHAPUS — Watermark teks (`drawtext`)
- Fitur watermark teks **DIHAPUS** dari UI & mesin: build FFmpeg yang diprovisikan
  (evermeet/ffbinaries-prebuilt 6.1, macos-64) **TIDAK menyertakan filter
  `drawtext`** ("No such filter: 'drawtext'") — setiap encode yang memakainya
  pasti gagal.
- Untuk menghidupkan kembali: butuh build FFmpeg dengan `drawtext` (mis. static
  dari BtbN/Homebrew) ATAU pendekatan overlay gambar logo
  (`-i logo.png -filter_complex overlay=...`). Dicatat di
  `docs/IMPLEMENTATION_ROADMAP.md`.

### 5.4 Standar Verifikasi Setiap Selesai
```bash
npm run typecheck && npm run lint && npm run build
node scripts/engine-smoke-test.mjs   # harus 11/11 PASS
```
Plus: `get_errors` = "No errors found", dan uji boot `npm run dev`.

## 6. Konvensi Kode

- Ikon: `lucide-react` (Eraser, MonitorUp, Monitor, Tv, Archive, MessageCircle, dll).
- Utilitas: `cn()` dari `src/lib/utils.ts`.
- Responsif: breakpoint Tailwind `sm/md/lg`; mobile drawer < 768px (`useIsMobile`).
- Dark mode: class `.dark` pada wrapper terluar; gunakan varian `dark:`.
- Font/size ETA: `tabular-nums` untuk angka.
- Error handling: semua promise `catch`; pesan Indonesia; `error` dikirim lewat
  field `error?` di event IPC.

## 7. Perintah Operasional

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan aplikasi (dev) |
| `npm run typecheck` / `lint` / `build` | Verifikasi |
| `npm run build:mac` | Paket macOS (.dmg/.zip) |
| `node scripts/engine-smoke-test.mjs` | Smoke test mesin (11/11) |
| `git add -A && git commit -m "..." && git push origin main` | Commit + push (UNSANDBOXED) |
