# Implementasi v1.4 — Referensi Teknis (Acuan Pengerjaan)

> Dokumen ini adalah **acuan pengerjaan** untuk 5 fitur besar v1.4. Baca SELURUHNYA
> sebelum menulis kode. Update dokumen ini bila ada keputusan baru selama pengerjaan.
> Tanggal: 2026-08-15. Branch: `release/v1.3.4` (fitur baru → PR ke branch ini, jangan push tanpa instruksi).
>
> **STATUS (2026-08-15): SELESAI — semua 5 fitur diimplementasi & DIVALIDASI**
> (tsc/lint/build PASS + E2E Electron+CDP). Ringkasan hasil di
> `docs/CURRENT_STATE.md` (bagian "Status Rilis v1.4").
> **Catatan penting pengerjaan**: `https-proxy-agent`/`socks-proxy-agent`
> versi terbaru (9.x/10.x) ESM-only → main process electron-vite (CommonJS)
> crash `ERR_REQUIRE_ESM`. FIX terpasang: `https-proxy-agent@7.0.6` +
> `socks-proxy-agent@8.0.5` (CommonJS).

---

## 0. Ringkasan & Keputusan Terkunci (2026-08-15)

| # | Fitur | Keputusan |
|---|---|---|
| 1 | Proxy Manager | Simpan di **file konfigurasi main process** (userData), rotasi tiap N unduhan (default 5), HTTP/SOCKS5, berlaku utk yt-dlp + TikWM + CDN. Catatan UI: IG/FB blokir datacenter proxy → butuh residential. |
| 2 | Auto-Watcher | **Hanya saat app terbuka** (interval `setInterval` di main process; berhenti saat app ditutup). TIDAK tray/auto-start. Deteksi via `scrapeAccount` (1-3 item) + cursor ID. |
| 3 | CSV Analytics | Ekspor **semua item daftar scrape** (field kosong/NA diizinkan). Engagement penuh saat unduh. CSV RFC4180 ke folder hasil. |
| 4 | Hardware Accel | **Deteksi otomatis** encoder (`ffmpeg -encoders`), UI hanya tampilkan yang tersedia, fallback berjenjang → x264. |
| 5 | Preview + Riwayat | Preview dari **klik baris antrean unduhan** + **tab Riwayat baru** (riwayat di main process). Reuse `VideoPlayer` + `PreviewModal`. |

---

## 1. Konvensi Proyek (WAJIB — pelanggaran = ditolak user)

- **PR workflow**: fitur di branch → push → PR → merge commit `gh pr merge N --merge` (BUKAN squash). Jangan push tanpa instruksi eksplisit.
- **Anti AI-slop / anti emoji**: SEMUA ikon dari `lucide-react`; teks UI Bahasa Indonesia; no emoji.
- **Tailwind v4 canonical**: `z-1` (bukan `z-[1]`), `bg-linear-to-r` (bukan `bg-gradient-to-r`), `shrink-0` (bukan `flex-shrink-0`), `h-4.5` (bukan `h-[18px]`). Hindari arbitrary `[]` bila ada utility bawaan.
- **Modal pattern**: TANPA `AnimatePresence` (motion 12 macet di StrictMode) — pakai `{open && <motion.div initial animate>}` (tanpa exit). Backdrop `fixed inset-0 z-70`, Escape menutup.
- **Floating field**: `FloatingInput`/`FloatingTextarea`/`FloatingSelect`/`FloatingMultiSelect` (gaya Google outlined, sudah ada). Tombol primer rounded-lg standar: `inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50` + icon `h-4 w-4`.
- **Dark mode**: `.dark` disinkronkan ke `<html>` di App.tsx (efek). Semua komponen harus punya `dark:`.
- **Audit forensik**: setelah SETIAP perubahan → `get_errors` + `npx eslint src/` + `npx tsc --noEmit` + `npm run build`. Update `docs/CURRENT_STATE.md` + `release-notes/RELEASE_NOTES_v1.3.4.md`.

---

## 2. Peta Arsitektur (fungsi/signature yang akan disentuh)

### electron/main/engine/paths.ts
- `getEngineBinDir()` → `userData/bin`
- `getOutputBaseDir()` → `~/Downloads/RS-OmniClip`
- `getDownloadDir()` → `.../Unduhan`
- `formatDateKey(date)` → `YYYY-MM-DD`
- `createOutputFolderForBatch(firstSourcePath)` → `[CLEANED] - YYYY-MM-DD` di folder sumber.

### electron/main/engine/net.ts
- `downloadFile(url, dest, timeoutMs=120000)` — `https.get`, redirect manual, timeout. **Perlu dukungan proxy** (agent).

### electron/main/engine/downloader.ts
- `DownloadOptions { maxHeight?, cookiesBrowser?, douyinCookie?, cookiesFile?, parallel? }` → **tambah `proxy?: string` (URL proxy aktif utk unduhan ini)**.
- `startDownloadBatch(urls, onProgress, onComplete, options)` — berurutan / paralel (maks 2).
- `downloadSingle(url, onProgress, options)` — lapisan: TikTok→TikWM (`tryTikTokDownload`), lalu yt-dlp (retry → UA Chrome → self-heal).
- `runYtdlpDownload(...)` — spawn yt-dlp; metadata via `__RSMETA__` (`--print after_move:__RSMETA__{...}`).
- `buildDownloadArgs(outputTemplate, url, options, extraArgs)` → args. **Tambah `--proxy` + perluas `--print` utk engagement**.
- `scrapeAccount(url, options)` → `ScrapeResult { items: ScrapeItem[], truncated }`; flat-playlist `--print %(id)s\t%(title)s\t%(webpage_url)s\t%(thumbnail)s\t%(duration)s`, `--playlist-items 1-200`, UA Chrome, retry+rotasi api_hostname saat 429.
- `ScrapeItem { index, id, title, url, thumbnail?, duration? }` → **tambah field engagement opsional**.
- `ResolvedPreview { url, playUrl?, thumbnail?, duration?, title?, error? }`.

### electron/main/engine/tiktok.ts
- `TIKWM_PROVIDERS` (5 key). `TikTokInfo { id, title, thumbnail, duration, sizeBytes, playUrl }` → **tambah `views?/likes?/comments?/shares?/description?`**.
- `TikTokDownloadResult { ok, filePath?, title?, thumbnail?, sizeBytes?, videoId?, error? }`.
- `getRequest(url, headers, timeoutMs)` — node https/http + redirect. **Perlu dukungan proxy**.
- `downloadTikTokVideo(url, outDir, onPhase)` — resolve via TikWM + unduh `data.play` CDN (dgn UA+Referer TikTok).

### electron/main/engine/processor.ts
- `PresetType = 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' | 'vertical'`
  (v1.4.1: `whatsapp` dihapus, ditambah `vertical` 9:16; lihat Bagian 9).
- `processBatch(files, preset, onProgress, options)` → outputFolder; `buildArgSets(preset, input, output, info, hwAccel, processingMode)` → `string[][]` (set[0] utama, sisanya fallback); `buildEnhance(common, filter, output, hwAccel)`.
- **Semua encode `libx264`** — titik sisip hardware accel ada di sini. Preset `metadata` = `-c copy` (tanpa encode, tak terpengaruh).

### electron/main/engine/ffmpeg.ts
- `ensureFfmpeg()` → `{ ffmpeg, ffprobe }`; `probe(path, ffprobe)`; `runFfmpeg({ffmpegPath,args,totalDuration,onProgress})`. `expectedFfmpegVersion()` = 9.0 (arm64) / 6.1. **Tambah `detectEncoders()`**.

### electron/main/index.ts
- Handler IPC didaftarkan dalam satu fungsi (sekitar baris 332+): `engine:check`, `processing:start`, `download:start`, `scrape:start`, `preview:resolve` (handle), `trim:start`, `folder:open`, `folder:reveal`, `update:*`, `resource:*`. **Tambah channel baru di sini**.

### electron/preload/index.ts + src/types/global.d.ts
- `contextBridge.exposeInMainWorld('api', api)`; tipe `Api` di-expose. **Tambah metode baru + tipe** di keduanya (sinkron!).

### src/App.tsx
- State download: `files` (antrean), `downloads` (progress), mode `links`/`akun`. `previewFile`/`setPreviewFile` utk PreviewModal (pembersih). **Wire preview antrean unduhan + tab Riwayat**.

### src/components/
- `VideoPlayer.tsx` — props `{file?: File, src?: string, poster?}`; local file → blob URL; remote → `src`. **Untuk hasil unduhan pakai `src={media://...}`**.
- `PreviewModal.tsx`, `ScrapePreviewModal.tsx`, `DownloadSettingsModal.tsx`, `Toasts.tsx`, `SortableFileItem.tsx`.
- **Tambahkan**: `ProxyManager.tsx`, `HistoryView.tsx`, `WatcherPanel.tsx`.

### Settings renderer (src/lib/preferences.ts)
- `PREF_KEYS`/`PREF_DEFAULTS` (localStorage `omni.*`). Hanya utk preferensi NON-sensitif (darkMode, preset, activeMenu, downloaderMode, download*). Proxy/watcher/history → config main process.

---

## 3. Fase 0 — Fondasi (PRA-SYARAT semua fitur)

### 3.1 Config store main process — `electron/main/config.ts` (BARU)
```ts
export interface AppConfig {
  proxy?: { enabled: boolean; proxies: string[]; rotationEvery: number }
  watcher?: { enabled: boolean; intervalHours: number; accounts: WatchedAccount[] }
  hwAccel?: { mode: 'auto' | 'videotoolbox' | 'nvenc' | 'amf' }
  analyticsExport?: boolean
  history?: HistoryEntry[]
}
export function getConfig(): AppConfig            // baca JSON userData/omni-config.json (default bila kosong)
export function setConfig(patch: DeepPartial<AppConfig>): AppConfig  // merge + tulis atomik (tmp+rename)
export function getConfigPath(): string
```
- Path: `path.join(app.getPath('userData'), 'omni-config.json')`.
- Tulis atomik: `fs.writeFileSync(tmp)` → `fs.renameSync(tmp, final)` agar tak korup.
- Threading: akses serial (main process single-threaded; cukup hati-hati dgn async).

IPC (index.ts):
```ts
ipcMain.handle('config:get', () => getConfig())
ipcMain.handle('config:set', (_e, patch) => setConfig(patch))
```

### 3.2 Queue manager — `electron/main/engine/queue.ts` (BARU)
- Tujuan: koordinasi unduhan (manual + watcher) agar tidak bentrok; progress event terpadu.
```ts
export interface QueueJob { id: string; url: string; options: DownloadOptions; source: 'manual' | 'watcher' | 'history' }
export function enqueueDownload(job: Omit<QueueJob, 'id'>): void
export function onQueueProgress(cb: (p: DownloadProgress) => void): () => void
export function onQueueComplete(cb: (r: DownloadBatchComplete) => void): () => void
export function queueStatus(): { active: number; pending: number }
```
- Runner: satu unduhan aktif (FIFO), atau jalankan `startDownloadBatch` dengan antrean internal. Progress diteruskan ke `download:progress` (channel lama tetap).
- Reuse `downloadSingle`/`startDownloadBatch` dari downloader.ts.

---

## 4. Fase 1 — Preview Inline + Riwayat (paling mudah; jadi fondasi watcher)

### 4.1 `media://` protocol — `electron/main/media.ts` (BARU)
- Daftarkan di `index.ts` (setelah app ready):
```ts
import { protocol, net } from 'electron'
protocol.registerSchemesAsPrivileged([{ scheme: 'media', privileges: { stream: true, supportFetchAPI: true, bypassCSP: false } }])
// setelah ready:
protocol.handle('media', (request) => mediaHandler(request))
```
- Format URL: `media://local/<encodeURIComponent(absPath)>`. Handler:
```ts
async function mediaHandler(request: Request): Promise<Response> {
  const u = new URL(request.url)
  const filePath = decodeURIComponent(u.pathname.replace(/^\//, ''))
  const stat = await fs.promises.stat(filePath)          // validasi: file ada, bukan dir
  const range = request.headers.get('Range')              // dukungan seeking
  if (range) { /* parse bytes=start-end → 206 + slice createReadStream */ }
  const stream = Readable.toWeb(fs.createReadStream(filePath))
  return new Response(stream, { headers: {
    'Content-Type': videoMime(filePath), 'Content-Length': String(stat.size),
    'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' } })
}
```
- **PENTING CSP**: `src/index.html` → `media-src 'self' blob: https: http: media:` (tambah `media:` — tanpa ini video diblokir, gejala sama dgn kasus https sebelumnya).
- `videoMime`: `.mp4→video/mp4`, `.webm→video/webm`, `.mov→video/quicktime`, default `video/mp4`.

### 4.2 Preview dari baris antrean unduhan
- `DownloadProgress` (preload) sudah punya `filePath?`. Saat item antrean unduhan sukses & punya `filePath`:
- App.tsx: baris antrean unduhan → tambah tombol/klik "putar" → `setPreviewFile({...})` ATAU modal baru yg pakai `VideoPlayer src={mediaUrl(filePath)}`.
- Helper: `const mediaUrl = (p: string) => \`media://local/\${encodeURIComponent(p)}\``.
- Saran: pakai `PreviewModal` yang ada (terima `file`/path) — perlu adaptasi agar bisa terima `src` media:// juga.

### 4.3 Tab Riwayat — `src/components/HistoryView.tsx` (BARU)
- Persist di config `history` (cap ~500, urut terbaru): `HistoryEntry { url, title?, thumbnail?, filePath, platform, ts }`.
- Catat saat unduhan sukses (di downloader/index: setelah `success` dengan filePath → append ke config).
- IPC: `history:list` (invoke → HistoryEntry[]), `history:clear` (invoke).
- UI: tab/section "Riwayat" (menu baru di sidebar "Pengunduh Video" ATAU halaman sendiri): list baris (thumbnail, judul, platform, waktu) → klik → preview `media://`. Tombol "Bersihkan Riwayat" (pakai ConfirmModal).
- Reuse pola daftar antrean (`SortableFileItem` sebagai referensi tampilan baris).

---

## 5. Fase 2 — Proxy Manager

### 5.1 `electron/main/engine/proxy.ts` (BARU)
```ts
export interface ProxyRuntime { list: string[]; rotationEvery: number; cursor: number; counter: number }
export function parseProxyLine(line: string): string | null      // validasi skema http(s):// / socks5:// ; akhiri '/' bila ada
export function rotateProxies(cfg: AppConfig): void              // tambah `proxy` ke DownloadOptions tiap N unduhan
export async function testProxy(proxyUrl: string): Promise<{ ok: boolean; latencyMs: number; error?: string }>
```
- Rotasi: main process menyimpan counter; tiap `downloadSingle` sukses/gagal memakai proxy → counter++; ganti proxy tiap `rotationEvery`.
- `testProxy`: request GET ke endpoint tepercaya (mis. `https://api.ipify.org?format=json`) via proxy → ok/latensi.
- Penyimpanan: di config (`proxy.proxies: string[]`, `enabled`, `rotationEvery`).

### 5.2 Integrasi
- **yt-dlp**: `DownloadOptions.proxy?: string` → `buildDownloadArgs` tambah `'--proxy', proxy` (setelah `--cookies*`).
- **TikWM + CDN**: 
  - `tiktok.ts getRequest` → dukung proxy via agent.
  - `net.ts downloadFile` → dukung proxy via agent (utk unduh `data.play` CDN).
  - **DEP baru** (kecil, standar): `https-proxy-agent` + `socks-proxy-agent` (npm). Tambah ke `dependencies`.
- Pilih proxy aktif: `downloadSingle` menerima `options.proxy` (dari rotasi) → diteruskan ke jalur TikTok & yt-dlp.

### 5.3 IPC + UI
- IPC (invoke): `proxy:save` ({enabled, proxies, rotationEvery}) → setConfig; `proxy:test` (proxyUrl) → hasil; `proxy:list` → getConfig().proxy.
- UI `src/components/ProxyManager.tsx` (dalam `DownloadSettingsModal` ATAU modal terpisah):
  - Textarea daftar proxy (satu per baris), Toggle aktif, `FloatingInput` interval rotasi (default 5), tombol "Tes" per baris (status ✓/✗ via lucide Check/X), tombol Simpan.
  - Catatan kecil: "Instagram/Facebook memblokir proxy datacenter — gunakan proxy residential untuk platform tersebut."

---

## 6. Fase 3 — Hardware Acceleration

### 6.1 Deteksi encoder — `electron/main/engine/ffmpeg.ts`
```ts
export type EncoderId = 'videotoolbox' | 'nvenc' | 'amf'
export async function detectEncoders(): Promise<EncoderId[]>   // spawn ffmpeg -encoders → grep h264_videotoolbox / h264_nvenc / h264_amf
```
- Cache hasil (sekali per sesi). Panggil saat app ready & saat UI butuh.

### 6.2 `processor.ts` — peta parameter per encoder + fallback
- `buildArgSets(preset, input, output, info, hwAccel: HwAccelConfig)`:
  - `metadata` → tak berubah (`-c copy`).
  - Encode presets (`hd/fullhd/uhd/archive/vertical` + fallback enhance) — ganti `-c:v libx264 ... -crf X` menjadi:
    - `videotoolbox`: `-c:v h264_videotoolbox -q:v 65` (atau `-b:v`); preset scale/unsharp tetap.
    - `nvenc`: `-c:v h264_nvenc -preset p4 -cq 20` (+ `-rc vbr` bila perlu).
    - `amf`: `-c:v h264_amf -quality speed -qp_i 20 -qp_p 20` (+ `-usage transcoding` bila perlu).
    - `auto`/CPU: `libx264` (status quo).
  - **Fallback berjenjang**: `runFfmpeg` gagal pada set hw → set fallback berikutnya (x264) — mekanisme `argSets` sudah ada (set[0] utama, set[1..] fallback). Pastikan set fallback pertama = x264.

### 6.3 IPC + UI
- IPC: `hw:detect` (invoke → EncoderId[]).
- UI: di `DownloadSettingsModal` — `FloatingSelect` "Pemrosesan Hardware": Otomatis (CPU) / Apple VideoToolbox / NVIDIA NVENC / AMD AMF; opsi **disabled** bila `detectEncoders()` tak memuatnya. Simpan ke config `hwAccel.mode`.
- Alirkan `hwAccel.mode` ke `processBatch` (payload `processing:start` tambah field, atau baca dari config di main).

---

## 7. Fase 4 — CSV Analytics

### 7.1 Capture engagement
- **Scrape (daftar)**: perluas `--print` di `scrapeAccount`:
  `%(id)s\t%(title)s\t%(webpage_url)s\t%(thumbnail)s\t%(duration)s\t%(view_count)s\t%(like_count)s\t%(comment_count)s\t%(description)s`
  (flat-playlist → banyak `NA`; itu diizinkan per keputusan). Parse `NA` → undefined.
- **Unduhan yt-dlp**: perluas `__RSMETA__` print:
  `{"title":%(title)j,"thumbnail":%(thumbnail)j,"filepath":%(filepath)j,"description":%(description)j,"view_count":%(view_count)j,"like_count":%(like_count)j,"comment_count":%(comment_count)j,"upload_date":%(upload_date)j,"uploader":%(uploader)j}`
- **TikTok (TikWM)**: map dari respons `data`: `play_count`→views, `digg_count`→likes, `comment_count`→comments, `share_count`→shares, `desc`→caption/description. Perluas `TikTokInfo`.
- Hashtag: parse dari description (`/#\w+/g`).

### 7.2 `electron/main/engine/analytics.ts` (BARU)
```ts
export interface AnalyticsRecord { platform, url, id, title, views?, likes?, comments?, caption?, hashtags?: string[], duration?, uploadedAt? }
export function csvEscape(field: unknown): string        // RFC4180: quote bila ada , " \n ; double-quote
export function writeAnalyticsCsv(dir: string, records: AnalyticsRecord[]): string  // analytics-YYYY-MM-DD.csv
```
- Kolom: `platform,url,id,title,views,likes,comments,caption,hashtags,duration_seconds,uploaded_at`.
- Tulis ke folder hasil: untuk Akun/Halaman → `getDownloadDir()` atau folder batch; nama `analytics-YYYY-MM-DD.csv` (append bila sudah ada / nama unik `(n)`).

### 7.3 IPC + UI
- IPC: `analytics:export` (invoke, payload {records} atau baca dari batch terakhir) → path file.
- UI: toggle "Ekspor Data Analitik ke CSV" di area Akun/Halaman (simpan `analyticsExport` di config). Saat batch unduh/scrape selesai & toggle ON → kumpulkan record → tulis CSV → toast path.

---

## 8. Fase 5 — Auto-Watcher

### 8.1 `electron/main/engine/watcher.ts` (BARU)
```ts
export interface WatchedAccount { url: string; label?: string; lastSeenId?: string; lastCheckedAt?: number; lastFoundAt?: number }
export function startWatcher(): void       // setInterval (intervalHours); idempotent
export function stopWatcher(): void
export async function checkAccountOnce(acc: WatchedAccount): Promise<{ newItems: ScrapeItem[] } | { error: string }>
```
- Algoritma tiap tick:
  1. Untuk tiap akun: `scrapeAccount(url, { ...opts, fetchLimit kecil })` — gunakan `--playlist-items 1-3` (bukan 200). Bisa dengan parameter baru `scrapeAccount(url, options, fetchLimit=200)`.
  2. Ambil ID item terbaru (`items[0].id`). Bandingkan dgn `acc.lastSeenId`.
  3. Bila berbeda & `lastSeenId` pernah ada → item baru (biasanya items[0]) → **enqueueDownload** (via queue.ts) → setelah sukses & ada filePath → jalankan `processBatch([{id,path,name}], 'metadata', ...)` (auto-clean) → update `lastSeenId` + `lastFoundAt`.
  4. Bila belum pernah ada `lastSeenId` → set cursor saja (inisialisasi, jangan unduh semua lama).
- **Notifikasi**: native `new Notification({ title, body }).show()` (jalan saat minimized) + `emit('watcher:notify', { title, body })` → renderer tampilkan toast (`Toasts`).
- Persist `watcher` di config (accounts, enabled, intervalHours). Saat config berubah → restart interval (`stopWatcher` → `startWatcher`).

### 8.2 IPC + UI
- IPC (invoke): `watcher:add` ({url,label}), `watcher:remove` (url), `watcher:list`, `watcher:setEnabled` (bool), `watcher:setInterval` (hours), `watcher:checkNow` (paksa cek sekali). Event (ke renderer): `watcher:notify`.
- UI `src/components/WatcherPanel.tsx`: daftar akun (label + url + status terakhir), input tambah URL (FloatingInput + tombol), Toggle aktif, input interval (jam), tombol "Cek Sekarang", badge "X video baru" per akun.

---

## 9. Rencana File

**BARU:**
- `electron/main/config.ts`
- `electron/main/media.ts`
- `electron/main/engine/queue.ts`
- `electron/main/engine/proxy.ts`
- `electron/main/engine/analytics.ts`
- `electron/main/engine/watcher.ts`
- `src/components/ProxyManager.tsx`
- `src/components/HistoryView.tsx`
- `src/components/WatcherPanel.tsx`

**MODIFIKASI:**
- `electron/main/index.ts` — register protocol `media`, handler IPC baru (config/proxy/hw/analytics/watcher/history), init watcher saat ready.
- `electron/preload/index.ts` + `src/types/global.d.ts` — metode + tipe baru (sinkron).
- `src/App.tsx` — wire preview antrean unduhan, tab Riwayat, panel Proxy/Watcher, ekspor CSV.
- `src/components/DownloadSettingsModal.tsx` — ProxyManager + Hardware select.
- `src/components/VideoPlayer.tsx` / `PreviewModal.tsx` — dukung `src=media://`.
- `electron/main/engine/downloader.ts` — `proxy` di options, `--proxy`, perluas `--print`/`__RSMETA__`, `fetchLimit` di scrape, capture engagement.
- `electron/main/engine/tiktok.ts` — field engagement + proxy di getRequest/download.
- `electron/main/engine/net.ts` — proxy di downloadFile.
- `electron/main/engine/processor.ts` — hardware accel (peta encoder + fallback).
- `electron/main/engine/ffmpeg.ts` — `detectEncoders()`.
- `electron/main/engine/paths.ts` — helper nama CSV (opsional).
- `src/index.html` — CSP `media-src` tambah `media:`.
- `package.json` — deps baru: `https-proxy-agent`, `socks-proxy-agent`.

---

## 10. Verifikasi & Gotcha

### Validasi wajib per fase (urutan tetap)
1. `get_errors` (harus bersih)
2. `npx eslint src/` (EXIT:0)
3. `npx tsc --noEmit` (OK)
4. `npm run build` (PASS)
5. E2E di instance Electron CDP (port 9222) — lihat gotcha di bawah.

### Gotcha kritis (dari memori repo)
- **STALE MAIN PROCESS**: setiap ubah `electron/main/**` ATAU tambah IPC/protocol → **restart `npm run dev`** (electron-vite TIDAK hot-reload main). Gejala: "No handler registered for X".
- **CSP**: video via `media://` TIDAK akan diputar bila `media-src` tidak punya `media:` (readyState 0 tanpa error). Sama pola dgn fix `https:` sebelumnya.
- **CUSTOM SCHEME**: `protocol.registerSchemesAsPrivileged` harus dipanggil SEBELUM `app.whenReady()`.
- **Launch Electron**: env wrapper punya `ELECTRON_RUN_AS_NODE=1` → HARUS `env -u ELECTRON_RUN_AS_NODE npx electron . --remote-debugging-port=9222 --user-data-dir="$TMPDIR/rs-omniclip-cdp"`; butuh `requestUnsandboxedExecution=true` (sandbox blokir SingletonLock/Mach).
- **Background tab**: tab browser tak terlihat TIDAK mengirim event fokus → verifikasi interaksi di window Electron nyata (CDP), bukan tab browser.
- **Mock E2E**: id/url mock harus < 2^53 (presisi JS).
- **localStorage vs config main**: JANGAN simpan kredensial proxy di localStorage. Gunakan config.ts.
- **Renderer HMR**: perubahan `src/**` (renderer) ter-HMR; perubahan main/preload butuh restart penuh.

### Smoke test per fitur
- Proxy: `testProxy` dengan proxy nyata → ok/latensi; unduh 6 video → IP berganti (verify via log proxy index).
- HW: `detectEncoders()` di Mac → `['videotoolbox']`; proses UHD → encoder VideoToolbox dipakai (log arg ffmpeg), fallback x264 saat gagal.
- CSV: scrape + unduh → `analytics-*.csv` terbuka di Excel/Number (RFC4180 benar; quote caption dgn koma).
- Watcher: akun nyata → tick pertama set cursor (tanpa unduh); posting baru → terdeteksi, terunduh, ter-clean, notifikasi muncul; interval tidak dobel (idempotent).
- Preview/Riwayat: klik baris unduhan → video putar + bisa seek; tab Riwayat tampil + persist setelah restart.

---

## 9. Perombakan Total Preset (v1.4.1) — 2 Tab + Select Detail + Toggle Metadata

### 9.1 Konsep: anti-ambigu
- Grid kartu prasetel DIHAPUS; komponen `PresetSelector.tsx` dihapus (kode mati).
- **2 tab mode** (ikon `ShieldCheck` / `Focus`) dengan **pill aktif BIRU yang
  GESER** (layoutId `cleaner-mode-pill`, spring). Desain tetap khas Pembersih:
  track `rounded-xl` mengikuti tema, tombol `rounded-lg` `text-sm`; hanya
  efek geser yang diadopsi dari tab Pengunduh (tab Pengunduh nantinya
  mengikuti desain ini). **"Privasi Cepat (Tanpa Efek)"** →
  `processingMode = 'privacy'`; **"Penjernihan Maksimal"** →
  `processingMode = 'enhance'` (default, persist `omni.processingMode`).
- Di dalamnya **beberapa select detail** (`FloatingSelect` diperluas dengan
  `description` per opsi):
  1. **Prasetel** — opsi BERUBAH sesuai tab (mode): tab Cepat → "Kualitas
     Asli (Salin)", "HD 720p (Cepat)", dst.; tab Jernih → "Kualitas Asli
     (Jernih)", "HD 720p (Jernih)", dst. Setiap opsi = judul + deskripsi rinci.
  2. **Kualitas** — `auto` Otomatis (Seimbang) / `best` Terbaik / `balanced`
     Seimbang / `compact` Kompak (File Kecil) → preset x264 + CRF.
  3. **Audio** — `original` Pertahankan Asli / `aac128` / `aac192` / `aac256`.
  4. **Toggle "Hapus Metadata & GPS"** (Ya/Tidak, default ON) — kontrol
     eksplisit `cleanMetadata`.
- Ikon petir (`Zap`) & AI (`Sparkles`) DIHAPUS dari tab.

### 9.2 State renderer (`src/App.tsx` + `src/lib/preferences.ts`)
```ts
const [processingMode, setProcessingMode] = usePersistentState<ProcessingMode>(
  PREF_KEYS.processingMode, PREF_DEFAULTS.processingMode) // 'enhance'
const [cleanMetadata, setCleanMetadata] = usePersistentState<boolean>(
  PREF_KEYS.cleanMetadata, PREF_DEFAULTS.cleanMetadata) // true
const [cleanerQuality, setCleanerQuality] = usePersistentState<QualityLevel>(
  PREF_KEYS.cleanerQuality, PREF_DEFAULTS.cleanerQuality) // 'auto'
const [cleanerAudio, setCleanerAudio] = usePersistentState<AudioMode>(
  PREF_KEYS.cleanerAudio, PREF_DEFAULTS.cleanerAudio) // 'original'
```
- Kunci: `omni.processingMode`, `omni.cleanMetadata`, `omni.cleanerQuality`,
  `omni.cleanerAudio`. Reset handler menyetel keempatnya.

### 9.3 Backend (`electron/main/engine/processor.ts`)
- Tipe: `PresetType = 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' |
  'vertical'`; `ProcessingMode`; `QualityLevel = 'auto'|'best'|'balanced'|
  'compact'`; `AudioMode = 'original'|'aac128'|'aac192'|'aac256'`.
- `ProcessOptions { hwAccel?, processingMode?, cleanMetadata?, quality?,
  audio? }`.
- `common = ['-y','-i',input, ...(cleanMetadata ? ['-map_metadata','-1'] : [])]`.
- `buildArgSets(preset, input, output, info, hwAccel, processingMode,
  cleanMetadata, quality, audio)`:
  - `metadata` → `-c copy` (remux) + fallback encode minimal (Auto-Watcher).
  - **privacy**: `archive` + audio original → `-c copy`; `archive` + audio !=
    original → `-c:v copy` + re-encode audio; resolusi → `scale(short-side)`
    + `privacyEncode(common, vf, output, quality, audio)`; `vertical` →
    pad-blur + `privacyEncode`.
  - **enhance**: pipeline `atadenoise → [scale long-side + lanczos] → cas →
    eq` via `buildEnhance(common, filter, output, hwAccel, quality, audio)`
    (hwAccel-aware, fallback x264; audio original → `-c:a copy` tanpa filter,
    selainnya AAC + `afftdn`).
- Helper baru: `crfForQuality`, `x264QualityArgs`, `audioModeArgs`.
  Helper WhatsApp dihapus. `VERTICAL_PAD_BLUR` + `scaleLongSide` +
  `privacyEncode` dipertahankan.

### 9.4 Vertikal 9:16 pad-blur
```
split=2[fg][bg];
[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5,eq=brightness=0.25:contrast=1.0[bg2];
[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg2];
[bg2][fg2]overlay=(W-w)/2:(H-h)/2
```
`crop=1080:1920` memaksa latar ke dimensi genap (kompatibel yuv420p/libx264).
Konten utama tidak dipotong; latar blur (bukan hitam).

### 9.5 IPC & preload
- `processing:start` payload: `{ files, preset, processingMode, cleanMetadata,
  quality, audio }`.
- `electron/main/index.ts` `handleProcessing` → `processBatch(..., { hwAccel,
  processingMode, cleanMetadata, quality, audio })` dengan default aman.
- `preload` + `global.d.ts` `startProcessing(payload { files, preset,
  processingMode?, cleanMetadata?, quality?, audio? })`.

### 9.6 Validasi v1.4.1 (E2E CDP 9222)
- 2 tab berikon (`iconPerTab [1,1]` — ShieldCheck/Focus); pill aktif biru
  `bg-blue-600` bergeser saat switch (`layoutId cleaner-mode-pill`); 3 select
  berikon (`selectIconCounts [2,2,2]`); toggle "Hapus Metadata & GPS" tampil;
  grid kartu hilang (`hasCardGrid false`);
  opsi Prasetel BENAR-BENAR berbeda antar tab (Jernih vs Salin/Cepat) —
  verifikasi isi dropdown di kedua tab.
- 5 job nyata PASS: privacy+archive (auto/original)→640×360 `-c copy`;
  privacy+fullhd (compact/aac128)→1920×1080; enhance+fullhd (best/original)→
  1920×1080; enhance+vertical (cleanMetadata=false/aac192)→1080×1920 **metadata
  PERTAHAN**; privacy+archive (aac256)→640×360 audio AAC.
- Dark mode: track slate-900, panel slate-800. Light mode: track terang,
  pill putih. typecheck/lint/build PASS; `get_errors` bersih.
