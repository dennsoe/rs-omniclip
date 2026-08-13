# Kontrak Jembatan IPC — `window.api`

Dokumen ini adalah referensi resmi kontrak antara renderer React dan backend
Node.js (proses utama) melalui preload script.

- Implementasi preload: `electron/preload/index.ts`
- Deklarasi tipe renderer: `src/types/global.d.ts`

## 1. Gambaran Umum

Preload mengekspos objek `window.api` melalui `contextBridge.exposeInMainWorld`.
Semua metode `on*` mengembalikan fungsi pembatalan (unsubscribe) agar renderer
dapat membersihkan listener saat unmount.

## 2. Daftar Channel IPC

| Arah | Channel | Tujuan |
|---|---|---|
| R → M | `engine:check` | Meminta inisialisasi/pemeriksaan mesin |
| M → R | `engine:status` | Status teks inisialisasi mesin |
| M → R | `app:ready` | Boolean: mesin siap digunakan |
| R → M | `processing:start` | Memulai batch pemrosesan |
| M → R | `processing:progress` | Kemajuan per file |
| M → R | `processing:complete` | Selesai batch (folder output) |
| R → M | `folder:open` | Membuka folder di Finder |
| R → M | `download:start` | Memulai unduhan URL |
| M → R | `download:progress` | Kemajuan unduhan |
| R → M | `trim:start` | Memotong video (lossless) |
| M → R | `trim:complete` | Hasil pemotongan |

## 3. Signature Lengkap `window.api`

```typescript
interface Window {
  api?: {
    // --- Kontrak inti ---
    checkEngine: () => void
    onEngineStatus: (cb: (status: string) => void) => () => void
    onAppReady: (cb: (isReady: boolean) => void) => () => void

    startProcessing: (payload: {
      files: FileItem[]
      preset: 'quick' | 'standard' | 'archive' | 'whatsapp'
    }) => void

    onProcessingProgress: (
      cb: (data: {
        id: string
        percent: number
        status: 'processing' | 'success' | 'failed'
      }) => void
    ) => () => void

    onProcessingComplete: (
      cb: (data: { outputFolder: string }) => void
    ) => () => void

    openFolder: (folderPath: string) => void

    startDownload: (payload: { url: string; id?: string }) => void

    onDownloadProgress: (
      cb: (data: {
        id: string
        url: string
        percent: number
        status: 'downloading' | 'success' | 'failed'
      }) => void
    ) => () => void

    // --- Ekstensi (tidak mengubah kontrak inti) ---
    getPathForFile: (file: File) => string
    trimVideo: (payload: {
      id: string
      path: string
      start: string
      end: string
    }) => void
    onTrimComplete: (
      cb: (data: {
        id: string
        success: boolean
        path?: string
        error?: string
      }) => void
    ) => () => void
  }
}
```

## 4. Detail Payload

### 4.1 `FileItem` (payload `startProcessing`)

```typescript
interface FileItem {
  id: string        // id unik di renderer (dipakai mencocokkan progress)
  path: string      // jalur absolut berkas sumber
  name: string      // nama berkas
  size: number      // ukuran byte
  status: 'pending' | 'processing' | 'success' | 'failed'
  progress: number  // 0 - 100
  errorMessage?: string
  file?: File       // referensi File asli untuk preview (renderer only)
}
```

Catatan: `file` (objek `File`) tidak dikirim ke proses utama — hanya
`id/path/name/size/status/progress` yang relevan bagi engine.

### 4.2 Kemajuan Processing (`processing:progress`)

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string | id file (sama dengan `FileItem.id`) |
| `percent` | number | 0–100 (dihitung dari `time=` stderr FFmpeg ÷ durasi) |
| `status` | 'processing' \| 'success' \| 'failed' | status saat ini |

`success` dikirim dengan `percent: 100`; `failed` dikirim dengan `percent: 100`
(batch tetap melanjutkan file berikutnya).

### 4.3 Selesai Processing (`processing:complete`)

| Field | Tipe | Keterangan |
|---|---|---|
| `outputFolder` | string | Folder `[CLEANED] - YYYY-MM-DD`. String kosong jika gagal total (mis. mesin belum siap). |

### 4.4 Unduhan (`download:start` / `download:progress`)

- `startDownload` menerima `{ url, id? }`. `id` opsional agar renderer bisa
  mengirim id-nya sendiri; engine memakainya untuk event progress sehingga
  pencocokan baris antrean konsisten.
- `download:progress` membawa `{ id, url, percent, status }` dengan status
  `'downloading' | 'success' | 'failed'`.

### 4.5 Pemotongan (`trim:start` / `trim:complete`)

- `start` / `end` format waktu: `HH:MM:SS`, `MM:SS`, atau detik.
- `trim:complete` membawa `{ id, success, path?, error? }`:
  - `success: true` → `path` = berkas hasil potongan.
  - `success: false` → `error` = pesan kegagalan (format waktu, waktu tidak
    valid, berkas tidak ditemukan, error FFmpeg).

### 4.6 `getPathForFile`

Memakai `webUtils.getPathForFile(file)` di preload untuk mendapatkan jalur
absolut dari objek `File` yang di-drop renderer. Mengembalikan `''` jika file
tidak punya jalur nyata.

## 5. Aturan Penggunaan di Renderer

1. Selalu panggil metode lewat optional chaining (`window.api?.method`) karena
   `api` bertipe opsional (mode web/demo tanpa Electron).
2. Bersihkan listener: simpan nilai kembalian `on*` lalu panggil saat unmount.
3. Panggil `checkEngine()` sekali saat mount setelah mendaftarkan
   `onEngineStatus` dan `onAppReady`.
4. Jangan kirim objek non-serializable (fungsi, class instance) lewat IPC.

## 6. Contoh Pola Renderer

```typescript
useEffect(() => {
  if (!window.api?.checkEngine) return
  const offStatus = window.api.onEngineStatus((s) => setEngineStatus(s))
  const offReady = window.api.onAppReady((r) => setIsAppReady(r))
  window.api.checkEngine()
  return () => {
    offStatus()
    offReady()
  }
}, [])
```
