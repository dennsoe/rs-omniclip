import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'motion/react'
import {
  Loader2,
  UploadCloud,
  Zap,
  Settings2,
  Archive,
  PlayCircle,
  Trash2,
  Sun,
  Moon,
  Menu,
  Wand2,
  DownloadCloud,
  Link as LinkIcon,
  MessageCircle,
  Type,
  Image as ImageIcon,
  XCircle,
  FolderOpen
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
import type { FileItem, PresetType, FileStatus } from '@lib/types'
import { useIsMobile } from '@hooks/use-mobile'
import Toasts, { type ToastMessage, type ToastType } from '@components/Toasts'
import ConfirmModal, { type ConfirmAction } from '@components/ConfirmModal'
import PreviewModal from '@components/PreviewModal'
import SystemMonitor from '@components/SystemMonitor'
import SortableFileItem from '@components/SortableFileItem'

interface DownloadItem {
  id: string
  url: string
  percent: number
  status: 'downloading' | 'success' | 'failed'
  error?: string
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

  const [activeMenu, setActiveMenu] = useState<'cleaner' | 'downloader'>('cleaner')
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [urlInput, setUrlInput] = useState('')

  const [isAutoSubtitle, setIsAutoSubtitle] = useState(false)
  const [isWatermark, setIsWatermark] = useState(false)

  const [files, setFiles] = useState<FileItem[]>([])
  const [preset, setPreset] = useState<PresetType>('standard')
  const [isProcessing, setIsProcessing] = useState(false)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
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
          if (d.id === data.id) {
            return { ...d, percent: data.percent, status: data.status, error: data.error }
          }
          // Cadangan: cocokkan via URL bila id berbeda.
          if (data.url && d.url === data.url && d.status === 'downloading') {
            return { ...d, percent: data.percent, status: data.status, error: data.error }
          }
          return d
        })
      )
      if (data.status === 'success') addToast('Video berhasil diunduh', 'success')
      if (data.status === 'failed') addToast('Gagal mengunduh video', 'error')
    })

    return () => {
      offProgress()
      offComplete()
      offDownload()
    }
  }, [addToast])

  const startDownload = (): void => {
    if (!urlInput.trim()) return
    const newId = Math.random().toString(36).substring(7)
    const url = urlInput.trim()

    setDownloads((prev) => [{ id: newId, url, percent: 0, status: 'downloading' }, ...prev])
    setUrlInput('')

    if (window.api?.startDownload) {
      window.api.startDownload({ url, id: newId })
    } else {
      // Mode web/fallback: simulasi kemajuan.
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 10
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          setDownloads((prev) =>
            prev.map((d) => (d.id === newId ? { ...d, percent: 100, status: 'success' } : d))
          )
          addToast('Video berhasil diunduh', 'success')
        } else {
          setDownloads((prev) => prev.map((d) => (d.id === newId ? { ...d, percent: progress } : d)))
        }
      }, 500)
    }
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
    noClick: files.length > 0
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

  if (!isAppReady) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-500">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight mb-2">Menyiapkan Mesin Video...</h1>
              <p className="text-slate-500 dark:text-slate-400">{engineStatus}</p>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const presetsList: Array<{
    id: PresetType
    title: string
    desc: string
    icon: typeof Zap
  }> = [
    { id: 'quick', title: 'Bagikan Cepat', desc: 'HANYA Hapus Metadata.', icon: Zap },
    { id: 'standard', title: 'Standar Bersih & Jernih', desc: 'Tingkatkan ke 1080p + Audio.', icon: Settings2 },
    { id: 'archive', title: 'Arsip Kualitas Maks', desc: 'Resolusi Asli + CRF 18.', icon: Archive },
    { id: 'whatsapp', title: 'Kompresi WhatsApp', desc: 'Target ukuran file otomatis pas untuk dikirim via WA.', icon: MessageCircle }
  ]

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors duration-500">
        <Toasts toasts={toasts} />
        <ConfirmModal confirmAction={confirmAction} onClose={() => setConfirmAction(null)} onConfirm={handleConfirm} />
        <PreviewModal previewFile={previewFile} onClose={() => setPreviewFile(null)} />

        {/* MOBILE OVERLAY */}
        <AnimatePresence>
          {isMobile && isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black/40 dark:bg-black/60 z-30 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* 1. LEFT SIDEBAR */}
        <motion.div
          layout
          initial={false}
          animate={{
            x: isMobile ? (isSidebarOpen ? 0 : -280) : 0
          }}
          style={{
            width: isMobile ? 280 : files.length === 0 ? 260 : 320
          }}
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          className={`sidebar bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 transition-colors overflow-hidden ${
            isMobile ? 'absolute inset-y-0 left-0 z-40' : 'relative z-20'
          }`}
        >
          <div className="flex items-center justify-between p-6 pb-2">
            <h1 className="text-xs font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              RS OMNICLIP
            </h1>
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="px-4 space-y-1 mb-6">
            <button
              onClick={() => setActiveMenu('cleaner')}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                activeMenu === 'cleaner'
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Wand2 className="w-5 h-5 shrink-0" />
              Pembersih Video
            </button>
            <button
              onClick={() => setActiveMenu('downloader')}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                activeMenu === 'downloader'
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <DownloadCloud className="w-5 h-5 shrink-0" />
              Pengunduh Video
            </button>
          </div>

          {activeMenu === 'cleaner' && (
            <>
              <div className="px-6 pb-2">
                <h1 className="text-xs font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  PRASETEL
                </h1>
              </div>
              <div className="p-4 pt-0 space-y-2">
                {presetsList.map((p) => {
                  const Icon = p.icon
                  const isActive = preset === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isProcessing && setPreset(p.id)}
                      disabled={isProcessing}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{p.title}</span>
                        <span className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {p.desc}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="px-6 pb-2 mt-6">
                <h1 className="text-xs font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  PENGATURAN TAMBAHAN
                </h1>
              </div>
              <div className="p-4 pt-0 space-y-2">
                <button
                  onClick={() => setIsAutoSubtitle((v) => !v)}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-xl transition-all ${
                    isAutoSubtitle
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Type
                      className={`w-5 h-5 shrink-0 ${isAutoSubtitle ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                    />
                    <span className="font-medium text-sm">Subtitle Otomatis (AI)</span>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full transition-colors ${
                      isAutoSubtitle
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                </button>

                <button
                  onClick={() => setIsWatermark((v) => !v)}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-xl transition-all ${
                    isWatermark
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon
                      className={`w-5 h-5 shrink-0 ${isWatermark ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                    />
                    <span className="font-medium text-sm">Pasang Watermark Logo</span>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full transition-colors ${
                      isWatermark
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          <div className="mt-auto flex flex-col">
            <SystemMonitor isProcessing={isProcessing} />

            <button
              onClick={() => setIsDarkMode((v) => !v)}
              className="mx-4 mb-2 flex items-center justify-between p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all overflow-hidden relative"
            >
              <span className="text-sm font-medium whitespace-nowrap">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
              <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isDarkMode ? 'dark' : 'light'}
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.3 }}
                    className="absolute"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </button>
            <button
              onClick={clearList}
              disabled={isProcessing || files.length === 0}
              className="p-6 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800/50 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Bersihkan Daftar
            </button>
          </div>
        </motion.div>

        {/* 2. RIGHT MAIN AREA */}
        <motion.div
          layout
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          {...(getRootProps() as Record<string, unknown>)}
          className={`flex-1 relative flex flex-col h-full focus:outline-none transition-colors duration-500 ${
            isDragActive ? 'bg-blue-50/50 dark:bg-slate-800/50' : 'bg-slate-50 dark:bg-slate-900'
          }`}
        >
          <input {...getInputProps()} />

          {/* DRAG ACTIVE OVERLAY */}
          <AnimatePresence>
            {isDragActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                className="absolute inset-4 z-50 flex items-center justify-center bg-blue-500/5 dark:bg-blue-500/10 backdrop-blur-[2px] border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-3xl pointer-events-none"
              >
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-blue-100 dark:border-blue-900/50"
                >
                  <UploadCloud className="w-6 h-6 text-blue-500 animate-bounce" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Lepaskan file di sini...</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MOBILE MENU BUTTON */}
          {isMobile && !isSidebarOpen && (
            <div className="absolute top-4 left-4 z-10">
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
            <>
              <AnimatePresence mode="popLayout">
                {/* 3. EMPTY STATE */}
                {files.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <div className="p-6 bg-blue-50 dark:bg-slate-800/50 text-blue-500 rounded-full mb-6 transition-colors">
                      <UploadCloud className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 transition-colors">
                      Tarik & Lepas Video ke RS OmniClip
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">
                      Atau klik untuk menelusuri file .mp4, .mov
                    </p>
                  </motion.div>
                ) : (
                  /* 4. QUEUE LIST */
                  <motion.div
                    key="queue"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl m-4 mt-16 md:m-8 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] relative z-10 transition-colors"
                  >
                    {/* Filter Header */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-3 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center transition-colors">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 pl-2">Antrean Video</span>
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
              </AnimatePresence>

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
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 px-10 py-4 rounded-full font-semibold text-lg flex items-center gap-3 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </>
          ) : (
            <div className="flex-1 flex flex-col pt-16 md:pt-24 px-6 md:px-12 max-w-4xl mx-auto w-full z-10 relative">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">RS OmniClip - Pengunduh Video</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Unduh dari YouTube, TikTok, Facebook, Instagram, dan lainnya.
              </p>

              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all mb-8">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Tempel tautan (URL) video di sini..."
                  className="flex-1 bg-transparent border-none focus:outline-none px-4 text-slate-700 dark:text-slate-200 placeholder-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      startDownload()
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startDownload()
                  }}
                  disabled={!urlInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Unduh
                </button>
              </div>

              {downloads.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden flex flex-col relative z-10 transition-colors">
                  <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-3 flex items-center transition-colors">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 pl-2">Antrean Unduhan</span>
                  </div>
                  <div className="overflow-y-auto max-h-[50vh] p-0">
                    {downloads.map((dl) => (
                      <div
                        key={dl.id}
                        className="relative border-b border-slate-100 dark:border-slate-700/50 last:border-0 p-4 flex items-center justify-between transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div className="flex items-center overflow-hidden mr-4 flex-grow">
                          <div className="mr-4 text-slate-300 dark:text-slate-500 shrink-0">
                            <LinkIcon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{dl.url}</span>
                            {dl.status === 'failed' && dl.error && (
                              <span className="truncate text-xs text-rose-500 dark:text-rose-400 mt-0.5" title={dl.error}>
                                {dl.error}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 relative z-10">
                          {dl.status === 'downloading' && (
                            <span className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border border-blue-200/50 dark:border-blue-500/20 shadow-sm">
                              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                              <span className="tabular-nums w-8 text-right tracking-tight">{Math.round(dl.percent)}%</span>
                            </span>
                          )}
                          {dl.status === 'success' && (
                            <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-medium">
                              Selesai
                            </span>
                          )}
                          {dl.status === 'failed' && (
                            <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full text-xs font-medium">
                              Gagal
                            </span>
                          )}
                        </div>

                        {dl.status === 'downloading' && (
                          <motion.div
                            className="absolute bottom-0 left-0 h-[2px] bg-blue-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${dl.percent}%` }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
