import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'motion/react'
import {
  Loader2,
  UploadCloud,
  Eraser,
  MonitorUp,
  Monitor,
  Tv,
  Archive,
  Clapperboard,
  PlayCircle,
  Trash2,
  Sun,
  Moon,
  Menu,
  Wand2,
  DownloadCloud,
  Link as LinkIcon,
  MessageCircle,
  XCircle,
  FolderOpen,
  ListVideo,
  Search,
  Info,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  BadgeCheck,
  CircleAlert,
  Settings,
  type LucideIcon
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import type {
  FileItem,
  PresetType,
  FileStatus,
  ScrapeItem,
  UpdateInfo,
  ResourceInfo,
  DownloadProgress
} from '@lib/types'
import { useIsMobile } from '@hooks/use-mobile'
import { usePersistentState } from '@hooks/use-persistent-state'
import { PREF_KEYS, PREF_DEFAULTS, resetAllPreferences } from '@lib/preferences'
import Toasts, { type ToastMessage, type ToastType } from '@components/Toasts'
import ConfirmModal, { type ConfirmAction } from '@components/ConfirmModal'
import PreviewModal from '@components/PreviewModal'
import DownloadSettingsModal from '@components/DownloadSettingsModal'
import SystemMonitor from '@components/SystemMonitor'
import SortableFileItem from '@components/SortableFileItem'
import PresetSelector from '@components/PresetSelector'

/** Satu item antrean unduhan (kontrak window.api.onDownloadProgress). */
type DownloadItem = DownloadProgress

/** Memformat byte menjadi teks ringkas (mis. "12.3 MB"). */
function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

/** Memformat kecepatan unduh (byte/detik) menjadi teks. */
function formatSpeed(bytesPerSec?: number): string {
  return bytesPerSec && bytesPerSec > 0 ? `${formatBytes(bytesPerSec)}/dtk` : ''
}

/** Memformat estimasi sisa waktu (detik) menjadi teks. */
function formatEta(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return ''
  const s = Math.round(seconds)
  if (s < 60) return `${s} dtk`
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m < 60) return `${m} mnt ${sec} dtk`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h} jam ${mm} mnt`
}

export default function App(): React.ReactElement {
  const [isAppReady, setIsAppReady] = useState(() => !window.api?.checkEngine)
  const [engineStatus, setEngineStatus] = useState(() =>
    window.api?.checkEngine
      ? 'Menginisialisasi jembatan IPC...'
      : 'Mesin tidak tersedia. Jalankan aplikasi sebagai aplikasi desktop (Electron).'
  )

  const isMobile = useIsMobile()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [activeMenu, setActiveMenu] = usePersistentState<'cleaner' | 'downloader' | 'about'>(
    PREF_KEYS.activeMenu,
    PREF_DEFAULTS.activeMenu
  )
  const [downloaderMode, setDownloaderMode] = usePersistentState<'links' | 'scrape'>(
    PREF_KEYS.downloaderMode,
    PREF_DEFAULTS.downloaderMode
  )
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [resources, setResources] = useState<ResourceInfo[] | null>(null)
  // true setelah status resource terverifikasi (push main / cek manual) —
  // basis badge update sidebar agar tidak muncul palsu sebelum versi terdeteksi.
  const [resourcesReady, setResourcesReady] = useState(false)
  const [resourceStatus, setResourceStatus] = useState<string | null>(null)
  const [isUpdatingResources, setIsUpdatingResources] = useState(false)
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [linksText, setLinksText] = useState('')
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scrapeItems, setScrapeItems] = useState<ScrapeItem[] | null>(null)
  const [scrapeTruncated, setScrapeTruncated] = useState(false)
  const [scrapeSelected, setScrapeSelected] = useState<Record<string, boolean>>({})
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  // Pengaturan unduhan (kualitas, cookies browser, paralel) — dipersist ke localStorage.
  const [downloadMaxHeight, setDownloadMaxHeight] = usePersistentState<number>(
    PREF_KEYS.downloadMaxHeight,
    PREF_DEFAULTS.downloadMaxHeight
  )
  const [downloadCookiesBrowser, setDownloadCookiesBrowser] = usePersistentState<string>(
    PREF_KEYS.downloadCookiesBrowser,
    PREF_DEFAULTS.downloadCookiesBrowser
  )
  const [downloadDouyinCookie, setDownloadDouyinCookie] = usePersistentState<string>(
    PREF_KEYS.downloadDouyinCookie,
    PREF_DEFAULTS.downloadDouyinCookie
  )
  const [downloadParallel, setDownloadParallel] = usePersistentState<boolean>(
    PREF_KEYS.downloadParallel,
    PREF_DEFAULTS.downloadParallel
  )
  // Modal pengaturan unduhan (dibuka dari tombol gear di header halaman Pengunduh).
  const [isDownloadSettingsOpen, setIsDownloadSettingsOpen] = useState(false)

  const [files, setFiles] = useState<FileItem[]>([])
  const [preset, setPreset] = usePersistentState<PresetType>(PREF_KEYS.preset, PREF_DEFAULTS.preset)
  const [isProcessing, setIsProcessing] = useState(false)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [isDarkMode, setIsDarkMode] = usePersistentState<boolean>(PREF_KEYS.darkMode, PREF_DEFAULTS.darkMode)
  const [filter, setFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all')
  const [outputFolder, setOutputFolder] = useState<string | null>(null)

  // Ref untuk perhitungan ETA berdasarkan kemajuan engine yang sebenarnya.
  const filesRef = useRef<FileItem[]>([])
  const batchStartRef = useRef(0)
  const totalBytesRef = useRef(0)
  const progressRef = useRef<Record<string, number>>({})

  useEffect(() => {
    filesRef.current = files
  }, [files])

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (filter === 'all') return true
      if (filter === 'pending') return f.status === 'pending' || f.status === 'processing'
      return f.status === filter
    })
  }, [files, filter])

  // URL valid hasil parse textarea multi-link (dedupe, hanya http/https).
  const validLinks = useMemo(() => {
    return Array.from(
      new Set(
        linksText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && /^https?:\/\//i.test(l))
      )
    )
  }, [linksText])

  // URL terpilih dari hasil scrape akun.
  const selectedUrls = useMemo(
    () => (scrapeItems ?? []).filter((it) => scrapeSelected[it.url]).map((it) => it.url),
    [scrapeItems, scrapeSelected]
  )

  // PERIKSA UPDATE APLIKASI (via GitHub Releases API, gratis, tanpa token)
  const checkUpdate = useCallback(async (): Promise<void> => {
    if (!window.api?.checkForUpdate) return
    setIsCheckingUpdate(true)
    try {
      setUpdateInfo(await window.api.checkForUpdate())
    } finally {
      setIsCheckingUpdate(false)
    }
  }, [])

  // Periksa update aplikasi sekali saat aplikasi dibuka (setState di callback .then).
  useEffect(() => {
    if (!window.api?.checkForUpdate) return
    let active = true
    window.api
      .checkForUpdate()
      .then((info) => {
        if (active) setUpdateInfo(info)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // PERIKSA STATUS RESOURCE (ffmpeg / yt-dlp vs manifest repo)
  // Dipakai tombol "Periksa Resource" & auto re-check berkala — hasilnya
  // dianggap terverifikasi sehingga badge update sidebar ikut aktif.
  const checkResources = useCallback(async (): Promise<void> => {
    if (!window.api?.checkResources) return
    try {
      const list = await window.api.checkResources()
      setResources(list)
      setResourcesReady(true)
    } catch {
      setResources(null)
      setResourcesReady(false)
    }
  }, [])

  // Cek awal saat mount: tampilkan data di halaman About, TAPI jangan aktifkan
  // badge dulu (versi resource mungkin belum terdeteksi — versions.json kosong
  // saat boot yt-dlp ~11 detik). Badge diaktifkan oleh push `resource:changed`
  // dari main atau aksi manual di atas.
  useEffect(() => {
    if (!window.api?.checkResources) return
    let active = true
    window.api
      .checkResources()
      .then((list) => {
        if (active) setResources(list)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Status resource SEGAR dari proses utama (setelah versi terdeteksi) —
  // sumber akurat badge update sidebar.
  useEffect(() => {
    if (!window.api?.onResourceChanged) return
    return window.api.onResourceChanged((list) => {
      setResources(list)
      setResourcesReady(true)
    })
  }, [])

  // Auto re-check berkala (30 mnt) + saat window fokus: menangkap rilis /
  // resource baru tanpa membuka ulang app. Jauh di bawah batas rate limit
  // GitHub API publik (60/jam).
  useEffect(() => {
    const refresh = (): void => {
      void checkUpdate()
      void checkResources()
    }
    const interval = window.setInterval(refresh, 30 * 60 * 1000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [checkUpdate, checkResources])

  // Badge update sidebar "Tentang & Update": update aplikasi ATAU resource
  // yang outdated (ffmpeg/yt-dlp). Biru bila ada update app, amber bila hanya
  // resource.
  const appHasUpdate = updateInfo?.hasUpdate === true
  const outdatedResources = resourcesReady ? (resources ?? []).filter((r) => r.outdated) : []
  const updateBadgeCount = (appHasUpdate ? 1 : 0) + outdatedResources.length
  const showUpdateBadge = updateBadgeCount > 0

  // Jumlah pengaturan unduhan non-default (badge indikator pada tombol modal).
  const downloadSettingsCount =
    (downloadMaxHeight > 0 ? 1 : 0) +
    (downloadCookiesBrowser ? 1 : 0) +
    (downloadDouyinCookie ? 1 : 0) +
    (downloadParallel ? 1 : 0)

  // BUKA HALAMAN RILIS GITHUB (strategi unduh manual macOS — 100% gratis)
  const handleOpenUpdate = (): void => {
    if (window.api?.openUpdatePage && updateInfo?.url) {
      void window.api.openUpdatePage(updateInfo.url)
    }
  }

  // PERBARUI RESOURCE yang outdated (unduh ulang ffmpeg/yt-dlp)
  const handleUpdateResources = async (): Promise<void> => {
    if (!window.api?.updateResources || isUpdatingResources) return
    setIsUpdatingResources(true)
    setResourceStatus('Memeriksa status resource...')
    const off = window.api.onResourceStatus((msg) => setResourceStatus(msg))
    try {
      const list = await window.api.updateResources()
      setResources(list)
      setResourcesReady(true)
      setResourceStatus('Resource berhasil diperbarui.')
    } catch {
      setResourceStatus('Gagal memperbarui resource. Periksa koneksi internet.')
    } finally {
      off()
      setIsUpdatingResources(false)
    }
  }

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  // INISIALISASI MESIN (via jembatan IPC, bukan fetch HTTP)
  useEffect(() => {
    if (!window.api?.checkEngine) return
    let isMounted = true
    const offStatus = window.api.onEngineStatus((status) => {
      if (isMounted) setEngineStatus(status)
    })
    const offReady = window.api.onAppReady((ready) => {
      if (isMounted) setIsAppReady(ready)
    })
    window.api.checkEngine()
    return () => {
      isMounted = false
      offStatus()
      offReady()
    }
  }, [])

  // PENDENGAR KEMAJUAN DARI MESIN
  useEffect(() => {
    if (!window.api?.onProcessingProgress) return

    const offProgress = window.api.onProcessingProgress((data) => {
      progressRef.current[data.id] = data.percent

      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== data.id) return f
          if (data.status === 'success') return { ...f, status: 'success', progress: 100 }
          if (data.status === 'failed')
            return { ...f, status: 'failed', progress: data.percent, errorMessage: data.error }
          return { ...f, status: 'processing', progress: data.percent }
        })
      )

      // Perkiraan ETA berdasarkan kemajuan terbaru (progressRef, bukan state yang tertinggal).
      const current = filesRef.current
      let processedBytes = 0
      for (const f of current) {
        const pct = progressRef.current[f.id] ?? f.progress
        processedBytes += (pct / 100) * f.size
      }
      const elapsed = (Date.now() - batchStartRef.current) / 1000
      if (elapsed > 1 && totalBytesRef.current > 0) {
        const speed = processedBytes / elapsed
        const remaining = totalBytesRef.current - processedBytes
        setEtaSeconds(speed > 0 ? Math.max(0, Math.ceil(remaining / speed)) : null)
      }
    })

    const offComplete = window.api.onProcessingComplete((data) => {
      setIsProcessing(false)
      setEtaSeconds(null)
      const all = filesRef.current
      const failedCount = all.filter((f) => f.status === 'failed').length
      const successCount = all.filter((f) => f.status === 'success').length
      if (data.outputFolder) {
        setOutputFolder(data.outputFolder)
        if (failedCount > 0 && successCount === 0) {
          addToast('Semua video gagal diproses.', 'error')
        } else if (failedCount > 0) {
          addToast(`Pemrosesan selesai: ${successCount} berhasil, ${failedCount} gagal.`, 'success')
        } else {
          addToast('Semua video berhasil diproses!', 'success')
        }
      } else {
        addToast('Terjadi kesalahan saat memproses batch.', 'error')
      }
    })

    const offDownload = window.api.onDownloadProgress((data) => {
      setDownloads((prev) =>
        prev.map((d) => {
          // Cocokkan via id atau (cadangan) via URL saat item masih mengunduh.
          if (d.id === data.id || (data.url && d.url === data.url && d.status === 'downloading')) {
            return { ...d, ...data }
          }
          return d
        })
      )
      // Ringkasan keseluruhan dilaporkan lewat onDownloadComplete; di sini hanya
      // peringatkan kegagalan agar antrean besar tidak membanjiri toast.
      if (data.status === 'failed') addToast('Gagal mengunduh video', 'error')
    })

    const offDownloadComplete = window.api.onDownloadComplete((data) => {
      setIsDownloading(false)
      if (data.failed > 0) {
        addToast(`Unduhan selesai: ${data.success} berhasil, ${data.failed} gagal.`, 'error')
      } else {
        addToast(`Semua ${data.success} video berhasil diunduh.`, 'success')
      }
    })

    const offScrape = window.api.onScrapeComplete((data) => {
      setIsScraping(false)
      if (data.error || !data.items) {
        setScrapeError(data.error ?? 'Gagal mengambil daftar video.')
        setScrapeItems(null)
        setScrapeSelected({})
        return
      }
      setScrapeItems(data.items)
      setScrapeTruncated(!!data.truncated)
      setScrapeSelected({})
      if (data.items.length === 0) {
        setScrapeError('Tidak ada video yang ditemukan pada akun/halaman ini.')
      } else {
        setScrapeError(null)
      }
    })

    return () => {
      offProgress()
      offComplete()
      offDownload()
      offDownloadComplete()
      offScrape()
    }
  }, [addToast])

  const startBatchDownload = (urls: string[]): void => {
    if (urls.length === 0 || isDownloading) return
    setIsDownloading(true)
    setDownloads((prev) => [
      ...urls.map((url) => ({ id: url, url, percent: 0, status: 'downloading' as const })),
      ...prev
    ])
    if (window.api?.startDownloadBatch) {
      window.api.startDownloadBatch(urls, {
        maxHeight: downloadMaxHeight > 0 ? downloadMaxHeight : undefined,
        cookiesBrowser: downloadCookiesBrowser || undefined,
        douyinCookie: downloadDouyinCookie || undefined,
        parallel: downloadParallel
      })
    } else {
      // Mode web/fallback: mesin tidak tersedia di browser biasa.
      setIsDownloading(false)
      setDownloads((prev) =>
        prev.map((d) =>
          urls.includes(d.url) && d.status === 'downloading'
            ? { ...d, status: 'failed' as const, error: 'Hanya berjalan di aplikasi desktop (Electron).' }
            : d
        )
      )
      addToast('Unduhan hanya berjalan pada aplikasi desktop (Electron).', 'error')
    }
  }

  const handleScrape = (): void => {
    const url = scrapeUrl.trim()
    if (!url || isScraping) return
    setIsScraping(true)
    setScrapeError(null)
    setScrapeItems(null)
    setScrapeSelected({})
    if (window.api?.scrapeAccount) {
      window.api.scrapeAccount({
        id: Math.random().toString(36).substring(7),
        url,
        options: { cookiesBrowser: downloadCookiesBrowser || undefined }
      })
    } else {
      setIsScraping(false)
      setScrapeError('Ambil daftar hanya berjalan pada aplikasi desktop (Electron).')
    }
  }

  const toggleScrapeItem = (url: string): void => {
    setScrapeSelected((prev) => ({ ...prev, [url]: !prev[url] }))
  }

  const toggleScrapeAll = (): void => {
    if (!scrapeItems) return
    const allSelected = scrapeItems.every((it) => scrapeSelected[it.url])
    setScrapeSelected(allSelected ? {} : Object.fromEntries(scrapeItems.map((it) => [it.url, true])))
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (isProcessing) return

      const newFiles: FileItem[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        path: window.api?.getPathForFile ? window.api.getPathForFile(file) : file.name,
        name: file.name,
        size: file.size,
        status: 'pending' as FileStatus,
        progress: 0,
        file
      }))

      setFiles((prev) => [...prev, ...newFiles])
      if (acceptedFiles.length > 0) {
        addToast(`${acceptedFiles.length} video berhasil ditambahkan ke antrean`, 'success')
      }
    },
    [isProcessing, addToast]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov']
    },
    disabled: isProcessing,
    // Klik & drag hanya aktif di halaman Pembersih (saat antrean kosong).
    // Di halaman Pengunduh, klik TIDAK boleh membuka dialog file — input URL
    // dan tombol harus tetap berfungsi normal.
    noClick: activeMenu !== 'cleaner' || files.length > 0,
    noDrag: activeMenu !== 'cleaner'
  })

  const clearList = (): void => {
    if (!isProcessing) {
      setConfirmAction({ type: 'clear' })
    }
  }

  const removeFile = (id: string): void => {
    if (!isProcessing) {
      setConfirmAction({ type: 'remove', id })
    }
  }

  const handleConfirm = (): void => {
    if (!confirmAction) return
    if (confirmAction.type === 'clear') {
      setFiles([])
      setOutputFolder(null)
      addToast('Semua video berhasil dihapus dari antrean', 'info')
    } else if (confirmAction.type === 'remove' && confirmAction.id) {
      setFiles((prev) => prev.filter((f) => f.id !== confirmAction.id))
      addToast('Video dihapus dari antrean', 'info')
    } else if (confirmAction.type === 'reset') {
      // Reset semua preferensi ke default (setelah konfirmasi modal).
      resetAllPreferences()
      setActiveMenu(PREF_DEFAULTS.activeMenu)
      setDownloaderMode(PREF_DEFAULTS.downloaderMode)
      setDownloadMaxHeight(PREF_DEFAULTS.downloadMaxHeight)
      setDownloadCookiesBrowser(PREF_DEFAULTS.downloadCookiesBrowser)
      setDownloadDouyinCookie(PREF_DEFAULTS.downloadDouyinCookie)
      setDownloadParallel(PREF_DEFAULTS.downloadParallel)
      setPreset(PREF_DEFAULTS.preset)
      setIsDarkMode(PREF_DEFAULTS.darkMode)
      addToast('Semua preferensi direset ke default.', 'info')
    }
    setConfirmAction(null)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const startProcessing = (): void => {
    if (files.length === 0 || isProcessing) return
    if (!window.api?.startProcessing) {
      addToast('Pemrosesan hanya tersedia di aplikasi desktop.', 'error')
      return
    }

    setIsProcessing(true)
    setEtaSeconds(null)
    setOutputFolder(null)

    progressRef.current = {}
    batchStartRef.current = Date.now()
    totalBytesRef.current = files.reduce((acc, f) => acc + f.size, 0)

    window.api.startProcessing({ files, preset })
  }

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return 'Menghitung...'
    if (seconds < 60) return `${seconds} dtk`
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m} mnt ${s} dtk`
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Mesin (FFmpeg/yt-dlp) diprovisoning SAAT DIBUTUHKAN (lazy) — tidak lagi
  // memblokir seluruh aplikasi di layar "Menyiapkan Mesin Video". Status mesin
  // ditampilkan sebagai banner non-blocking (lihat di bawah) sehingga aplikasi
  // tetap bisa dipakai meski provisioning masih berjalan / sempat gagal.
  const presetsList: Array<{
    id: PresetType
    title: string
    desc: string
    icon: LucideIcon
  }> = [
    { id: 'metadata', title: 'Hapus Metadata', desc: 'Bersihkan metadata/GPS, kualitas asli.', icon: Eraser },
    { id: 'hd', title: 'HD 720p', desc: 'Tingkatkan ke HD 720p + penajaman + audio.', icon: MonitorUp },
    { id: 'fullhd', title: 'Full HD 1080p', desc: 'Tingkatkan ke Full HD 1080p + penajaman + audio.', icon: Monitor },
    { id: 'uhd', title: '4K UHD', desc: 'Tingkatkan ke 4K (2160p) + penajaman + audio.', icon: Tv },
    { id: 'archive', title: 'Kualitas Asli', desc: 'Resolusi asli, CRF 18.', icon: Archive },
    { id: 'whatsapp', title: 'Kompresi WhatsApp', desc: 'Ukuran pas untuk dikirim via WA.', icon: MessageCircle }
  ]

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-dvh flex flex-col overflow-hidden`}>
      {/* BANNER STATUS MESIN — non-blocking: app tetap bisa dipakai. "Coba Lagi"
          memicu ulang provisioning (engine:check -> initEngine). */}
      {window.api?.checkEngine && !isAppReady && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-slate-800/90 border-b border-blue-100 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 transition-colors">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="truncate">{engineStatus}</span>
          <button
            type="button"
            onClick={() => window.api?.checkEngine()}
            className="ml-auto shrink-0 text-[11px] font-semibold bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-full px-2.5 py-1 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0 bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors duration-500">
        <Toasts toasts={toasts} />
        <ConfirmModal confirmAction={confirmAction} onClose={() => setConfirmAction(null)} onConfirm={handleConfirm} />
        <PreviewModal previewFile={previewFile} onClose={() => setPreviewFile(null)} />
        <DownloadSettingsModal
          open={isDownloadSettingsOpen}
          onClose={() => setIsDownloadSettingsOpen(false)}
          settings={{
            maxHeight: downloadMaxHeight,
            cookiesBrowser: downloadCookiesBrowser,
            douyinCookie: downloadDouyinCookie,
            parallel: downloadParallel
          }}
          onChange={(patch) => {
            if (patch.maxHeight !== undefined) setDownloadMaxHeight(patch.maxHeight)
            if (patch.cookiesBrowser !== undefined) setDownloadCookiesBrowser(patch.cookiesBrowser)
            if (patch.douyinCookie !== undefined) setDownloadDouyinCookie(patch.douyinCookie)
            if (patch.parallel !== undefined) setDownloadParallel(patch.parallel)
          }}
        />

        {/* MOBILE OVERLAY — tanpa AnimatePresence: exit motion 12 macet di StrictMode */}
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 z-30 backdrop-blur-sm"
          />
        )}

        {/* 1. LEFT SIDEBAR */}
        <motion.div
          layout
          initial={false}
          animate={{
            x: isMobile ? (isSidebarOpen ? 0 : -280) : 0
          }}
          style={{
            width: isMobile ? 280 : files.length === 0 ? 260 : 300
          }}
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          className={`sidebar bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 transition-colors overflow-y-auto max-w-[80vw] ${
            isMobile ? 'absolute inset-y-0 left-0 z-40' : 'relative z-20'
          }`}
        >
          {/* Brand header — pt-12 agar tidak menabrak traffic light macOS (x16-68, y16-28) */}
          <div className="flex items-center justify-between pt-12 px-5 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-100 truncate">
                  RS OMNICLIP
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  Video Processing Studio
                </span>
              </div>
            </div>
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Label seksi menu */}
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase px-2">
              Menu
            </span>
          </div>

          {/* Menu navigasi (redesain: pill aktif geser via layoutId + tap feedback) */}
          <nav className="px-3 space-y-1 mb-6">
            {[
              { id: 'cleaner', label: 'Pembersih Video', desc: 'Bersihkan, tingkatkan & potong', Icon: Wand2 },
              { id: 'downloader', label: 'Pengunduh Video', desc: 'Unduh video dari berbagai platform', Icon: DownloadCloud }
            ].map((item) => {
              const isActive = activeMenu === item.id
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMenu(item.id as 'cleaner' | 'downloader' | 'about')}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-bg"
                      className="absolute inset-0 bg-linear-to-r from-blue-600 to-blue-500 rounded-xl shadow-lg shadow-blue-600/25"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span
                    className={`relative z-10 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/15'
                        : 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <item.Icon className="w-4.5 h-4.5" />
                  </span>
                  <span className="relative z-10 flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate">{item.label}</span>
                    <span
                      className={`text-[11px] truncate ${
                        isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {item.desc}
                    </span>
                  </span>
                  {isActive && (
                    <span className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" />
                  )}
                </motion.button>
              )
            })}
          </nav>

          <div className="mt-auto flex flex-col">
            <SystemMonitor />

            <button
              onClick={() => setIsDarkMode((v) => !v)}
              className="mx-4 mb-2 flex items-center justify-between p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all overflow-hidden relative"
            >
              <span className="text-sm font-medium whitespace-nowrap">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
              <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
                <motion.div
                  key={isDarkMode ? 'dark' : 'light'}
                  initial={{ y: -20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.div>
              </div>
            </button>
            {/* Tentang & Update — dipindah ke bagian bawah sidebar (tempat Bersihkan Daftar) */}
            <button
              type="button"
              onClick={() => {
                setActiveMenu('about')
                setIsSidebarOpen(false)
              }}
              className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-t border-slate-100 dark:border-slate-800/50 ${
                activeMenu === 'about'
                  ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeMenu === 'about'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                }`}
              >
                <Info className="w-4.5 h-4.5" />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-semibold text-sm truncate">Tentang &amp; Update</span>
                <span
                  className={`text-[11px] truncate ${
                    activeMenu === 'about'
                      ? 'text-blue-500/90 dark:text-blue-300/90'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Versi, pembaruan &amp; resource
                </span>
              </span>
              {showUpdateBadge ? (
                <span
                  className={`ml-auto min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 shadow ${
                    appHasUpdate ? 'bg-blue-600 shadow-blue-600/30' : 'bg-amber-500 shadow-amber-500/30'
                  }`}
                >
                  {updateBadgeCount}
                </span>
              ) : (
                activeMenu === 'about' && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                )
              )}
            </button>
          </div>
        </motion.div>

        {/* 2. RIGHT MAIN AREA */}
        <motion.div
          layout
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          {...(getRootProps() as Record<string, unknown>)}
          className={`flex-1 relative flex flex-col h-full min-w-0 focus:outline-none transition-colors duration-500 ${
            isDragActive ? 'bg-blue-50/50 dark:bg-slate-800/50' : 'bg-slate-50 dark:bg-slate-900'
          }`}
        >
          <input {...getInputProps()} />

          {/* DRAG ACTIVE OVERLAY — tanpa AnimatePresence: exit motion 12 macet di StrictMode */}
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              className="absolute inset-4 z-50 flex items-center justify-center bg-blue-500/5 dark:bg-blue-500/10 backdrop-blur-[2px] border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-3xl pointer-events-none"
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-blue-100 dark:border-blue-900/50"
              >
                <UploadCloud className="w-6 h-6 text-blue-500 animate-bounce" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">Lepaskan file di sini...</span>
              </motion.div>
            </motion.div>
          )}

          {/* MOBILE MENU BUTTON — left-20 (80px) agar tidak menimpa traffic light macOS (berakhir ±68px) */}
          {isMobile && !isSidebarOpen && (
            <div className="absolute top-4 left-20 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsSidebarOpen(true)
                }}
                className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}

          {activeMenu === 'cleaner' ? (
            <motion.div
              key="cleaner-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col min-h-0 relative"
            >
              {/* 3. PRASETEL — berada di halaman Pembersih Video (bukan sidebar) */}
              <div className="relative z-10 pt-16 md:pt-8 px-4 sm:px-6 md:px-8 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">
                    Pilih Prasetel
                  </h2>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {presetsList.find((p) => p.id === preset)?.title ?? ''}
                  </span>
                </div>
                <PresetSelector
                  presets={presetsList}
                  value={preset}
                  onChange={setPreset}
                  disabled={isProcessing}
                />
              </div>

              {/* 4. KONTEN UTAMA (state kosong ATAU antrean) */}
              <div className="flex-1 min-h-0 relative z-10 px-4 sm:px-6 md:px-8 pb-24">
                {/* 4a. EMPTY STATE — tanpa AnimatePresence: exit motion 12 macet di StrictMode */}
                {files.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col items-center justify-center pointer-events-none"
                  >
                      <div className="p-6 bg-blue-50 dark:bg-slate-800/50 text-blue-500 rounded-full mb-6 transition-colors">
                        <UploadCloud className="w-12 h-12" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 transition-colors text-center px-4">
                        Tarik &amp; Lepas Video ke RS OmniClip
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">
                        Atau klik untuk menelusuri file .mp4, .mov
                      </p>
                    </motion.div>
                  ) : (
                  /* 4b. QUEUE LIST */
                  <motion.div
                    key="queue"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden flex flex-col h-full min-h-0 transition-colors"
                    >
                      {/* Filter Header */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-3 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center transition-colors">
                        <div className="flex items-center gap-2 pl-2">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Antrean Video</span>
                          {files.length > 0 && !isProcessing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                clearList()
                              }}
                              className="text-xs font-medium text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-500 hover:underline flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Bersihkan
                            </button>
                          )}
                        </div>
                        <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1 rounded-lg gap-1 transition-colors overflow-x-auto no-scrollbar">
                          {[
                            { id: 'all', label: 'Semua' },
                            { id: 'pending', label: 'Menunggu' },
                            { id: 'success', label: 'Selesai' },
                            { id: 'failed', label: 'Gagal' }
                          ].map((f) => (
                            <button
                              key={f.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setFilter(f.id as 'all' | 'pending' | 'success' | 'failed')
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                filter === f.id
                                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-y-auto flex-grow p-0">
                        {filteredFiles.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            Tidak ada video dengan status ini.
                          </div>
                        ) : (
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={filteredFiles.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                              {filteredFiles.map((file) => (
                                <SortableFileItem
                                  key={file.id}
                                  file={file}
                                  isProcessing={isProcessing}
                                  isFiltered={filter !== 'all'}
                                  onRemove={removeFile}
                                  formatSize={formatSize}
                                  onPreview={setPreviewFile}
                                  onToast={addToast}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                  </motion.div>
                )}
              </div>

              {/* 5. ACTION BUTTON */}
              <div
                className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 transition-all duration-300 ${
                  files.length === 0 ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startProcessing()
                  }}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 px-8 py-3.5 sm:px-10 sm:py-4 rounded-full font-semibold text-base sm:text-lg flex items-center gap-3 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>Memproses...</span>
                        {etaSeconds !== null && (
                          <span className="text-xs text-blue-200 font-medium tracking-wide">
                            ETA: {formatTime(etaSeconds)}
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-6 h-6 shrink-0" />
                      Proses {files.length} Video
                    </>
                  )}
                </button>

                {outputFolder && !isProcessing && files.some((f) => f.status === 'success') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.api?.openFolder(outputFolder)
                    }}
                    className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Buka Folder Hasil
                  </button>
                )}
              </div>
            </motion.div>
          ) : activeMenu === 'downloader' ? (
            <motion.div
              key="downloader-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col min-h-0 relative z-10"
            >
              {/* Header: judul + badge + toggle mode animasi */}
              <div className="relative z-10 pt-16 md:pt-8 px-4 sm:px-6 md:px-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">
                    Unduh Video
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {downloaderMode === 'links'
                        ? `${validLinks.length} link`
                        : `${scrapeItems?.length ?? 0} video`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsDownloadSettingsOpen(true)
                      }}
                      aria-label="Pengaturan Unduhan"
                      title="Pengaturan Unduhan"
                      className="relative p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      {downloadSettingsCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow shadow-blue-600/40">
                          {downloadSettingsCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="relative inline-flex bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full p-1 transition-colors">
                  {[
                    { id: 'links', label: 'Banyak Link', Icon: LinkIcon },
                    { id: 'scrape', label: 'Akun / Halaman', Icon: ListVideo }
                  ].map((m) => {
                    const isActive = downloaderMode === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDownloaderMode(m.id as 'links' | 'scrape')
                        }}
                        className={`relative px-4 py-2 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="downloader-mode-pill"
                            className="absolute inset-0 bg-blue-600 rounded-full shadow-md shadow-blue-600/25"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                          />
                        )}
                        <m.Icon className="w-3.5 h-3.5 relative z-10" />
                        <span className="relative z-10">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Konten mode (animasi) + antrean unduhan */}
              <div className="flex-1 min-h-0 relative z-10 px-4 sm:px-6 md:px-8 pb-24 overflow-y-auto">
                {downloaderMode === 'links' ? (
                  <motion.div
                    key="links-mode"
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    className="mb-4"
                  >
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 flex flex-col gap-3 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                            <LinkIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
                              Tempel Banyak Tautan
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                              Satu tautan per baris — diunduh berurutan.
                            </p>
                          </div>
                        </div>
                        <textarea
                          value={linksText}
                          onChange={(e) => setLinksText(e.target.value)}
                          rows={5}
                          placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.tiktok.com/@user/video/...'}
                          className="w-full resize-none bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              startBatchDownload(validLinks)
                            }}
                            disabled={validLinks.length === 0 || isDownloading}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <DownloadCloud className="w-4 h-4" />
                            )}
                            Unduh Semua ({validLinks.length})
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="scrape-mode"
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      className="mb-4"
                    >
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 flex flex-col gap-3 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                            <ListVideo className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
                              Ambil Video dari Akun / Halaman
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                              Masukkan tautan akun — daftar dimuat untuk dipilih.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={scrapeUrl}
                            onChange={(e) => setScrapeUrl(e.target.value)}
                            placeholder="mis. https://www.tiktok.com/@username"
                            className="flex-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleScrape()
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleScrape()
                            }}
                            disabled={!scrapeUrl.trim() || isScraping}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                          >
                            {isScraping ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                            Ambil Daftar
                          </button>
                        </div>

                        {scrapeError && (
                          <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            {scrapeError}
                          </p>
                        )}

                        {scrapeItems && scrapeItems.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                {scrapeItems.length} video ditemukan
                                {scrapeTruncated ? ' (menampilkan sebagian)' : ''}
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    toggleScrapeAll()
                                  }}
                                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {scrapeItems.every((it) => scrapeSelected[it.url])
                                    ? 'Kosongkan Pilihan'
                                    : 'Pilih Semua'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    startBatchDownload(selectedUrls)
                                  }}
                                  disabled={selectedUrls.length === 0 || isDownloading}
                                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                  <DownloadCloud className="w-3.5 h-3.5" />
                                  Unduh Terpilih ({selectedUrls.length})
                                </button>
                              </div>
                            </div>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                              {scrapeItems.map((item, idx) => (
                                <motion.label
                                  key={item.url}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.25 }}
                                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!scrapeSelected[item.url]}
                                    onChange={() => toggleScrapeItem(item.url)}
                                    className="accent-blue-600 w-4 h-4 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                      {item.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                      {item.url}
                                    </p>
                                  </div>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-600 shrink-0">
                                    #{item.index + 1}
                                  </span>
                                </motion.label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

              {downloads.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden flex flex-col relative z-10 transition-colors">
                  <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-3 flex items-center transition-colors">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 pl-2">Antrean Unduhan</span>
                    <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500 pr-2">
                      {downloads.filter((d) => d.status === 'success').length} selesai ·{' '}
                      {downloads.filter((d) => d.status === 'failed').length} gagal
                    </span>
                  </div>
                  <div className="overflow-y-auto max-h-[50vh] p-0">
                    {downloads.map((dl) => (
                      <div
                        key={dl.id}
                        className="relative border-b border-slate-100 dark:border-slate-700/50 last:border-0 p-3 sm:p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          {dl.status === 'success' && dl.thumbnail ? (
                            <img
                              src={dl.thumbnail}
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-slate-900/60"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center bg-blue-50 dark:bg-slate-900/60 text-blue-600 dark:text-blue-400">
                              <LinkIcon className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {dl.title || dl.url}
                            </p>
                            {dl.title && dl.url !== dl.title && (
                              <p className="truncate text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {dl.url}
                              </p>
                            )}
                            {dl.description && dl.status === 'success' && (
                              <p className="line-clamp-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {dl.description}
                              </p>
                            )}
                            {dl.status === 'failed' && dl.error && (
                              <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 leading-snug" title={dl.error}>
                                {dl.error}
                              </p>
                            )}

                            {dl.status === 'downloading' && (
                              <>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-900/60 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                                      style={{ width: `${Math.max(2, Math.min(100, dl.percent))}%` }}
                                    />
                                  </div>
                                  <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300 shrink-0 w-10 text-right">
                                    {Math.round(dl.percent)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex-wrap">
                                  {dl.phase === 'merging' && <span>Menggabungkan...</span>}
                                  {dl.phase === 'retrying' && <span>Mencoba ulang...</span>}
                                  {dl.speedBytesPerSec && dl.speedBytesPerSec > 0 && (
                                    <span>{formatSpeed(dl.speedBytesPerSec)}</span>
                                  )}
                                  {dl.etaSeconds !== undefined && <span>± {formatEta(dl.etaSeconds)}</span>}
                                  {dl.sizeBytes ? <span>{formatBytes(dl.sizeBytes)}</span> : null}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {dl.status === 'downloading' && (
                              <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-[11px] font-medium border border-blue-200/50 dark:border-blue-500/20">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Mengunduh
                              </span>
                            )}
                            {dl.status === 'success' && (
                              <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full text-[11px] font-medium">
                                Selesai
                              </span>
                            )}
                            {dl.status === 'failed' && (
                              <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-full text-[11px] font-medium">
                                Gagal
                              </span>
                            )}
                            {dl.status === 'success' && dl.filePath && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.api?.showItemInFolder?.(dl.filePath ?? '')
                                }}
                                title="Buka di folder"
                                className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                Buka folder
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="about-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col min-h-0 relative z-10 overflow-y-auto"
            >
              <div className="relative z-10 pt-16 md:pt-8 px-4 sm:px-6 md:px-8 pb-24">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors mb-4">
                  Tentang &amp; Update
                </h2>

                {/* KARTU VERSI APLIKASI */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col gap-4 transition-colors mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
                        RS OmniClip{' '}
                        <span className="text-blue-600 dark:text-blue-400">v{updateInfo?.current ?? ''}</span>
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                        Versi, pembaruan &amp; resource — periksa rilis terbaru dari GitHub, gratis.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-4 py-3 transition-colors">
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Terpasang
                      </p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        v{updateInfo?.current ?? ''}
                      </p>
                    </div>
                    <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-4 py-3 transition-colors">
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Terbaru
                      </p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                        {isCheckingUpdate ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : updateInfo?.latest ? (
                          <>v{updateInfo.latest}</>
                        ) : (
                          '—'
                        )}
                        {updateInfo?.hasUpdate && (
                          <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">
                            Update tersedia
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void checkUpdate()
                      }}
                      disabled={isCheckingUpdate || !window.api?.checkForUpdate}
                      className="flex-1 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-full font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                      Periksa Update
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleOpenUpdate()
                      }}
                      disabled={!updateInfo?.hasUpdate || !updateInfo?.url}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Unduh Versi Baru
                    </button>
                  </div>

                  {updateInfo?.notes && (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-4 py-3 transition-colors">
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2">
                        Catatan Rilis
                      </p>
                      <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed max-h-40 overflow-y-auto">
                        {updateInfo.notes}
                      </pre>
                    </div>
                  )}
                </div>

                {/* KARTU RESOURCE MESIN */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col gap-4 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
                        Resource Mesin
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                        FFmpeg &amp; yt-dlp — versi diharapkan dibandingkan dengan manifest repo.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {(resources ?? []).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-4 py-3 transition-colors"
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                            r.outdated
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {r.outdated ? <CircleAlert className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.label}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            Terpasang: {r.current ?? '—'} · Diharapkan: {r.expected ?? '—'}
                          </p>
                        </div>
                        {r.outdated && (
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 whitespace-nowrap">
                            Perlu update
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {resourceStatus && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      {isUpdatingResources && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />}
                      {resourceStatus}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void checkResources()
                      }}
                      disabled={!window.api?.checkResources}
                      className="flex-1 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-full font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Periksa Resource
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleUpdateResources()
                      }}
                      disabled={
                        isUpdatingResources ||
                        !window.api?.updateResources ||
                        !resources?.some((r) => r.outdated)
                      }
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {isUpdatingResources ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Perbarui Resource
                    </button>
                  </div>
                </div>

                {/* KARTU PREFERENSI & PENYIMPANAN — reset semua preferensi ke default */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col gap-4 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
                        Preferensi &amp; Penyimpanan
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        Mode gelap, prasetel &amp; pengaturan unduhan tersimpan otomatis di perangkat Anda.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setConfirmAction({ type: 'reset' })
                    }}
                    className="self-start inline-flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-full font-medium text-sm shadow-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Semua Preferensi
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
