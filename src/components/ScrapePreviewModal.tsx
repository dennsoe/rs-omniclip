import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PlayCircle, XCircle, Loader2, CircleAlert, Clock } from 'lucide-react'
import type { ScrapeItem, ResolvedPreview } from '@lib/types'
import { formatDuration, guessPlatform } from '@lib/utils'
import { PlatformBadge } from '@components/ui/PlatformBadge'
import VideoPlayer from './VideoPlayer'

/**
 * Modal pratinjau video hasil scrape akun/halaman — pola sama dengan
 * PreviewModal antrean pembersih (header badge + judul + tombol tutup + Escape).
 * Karena hasil scrape hanya punya URL (bukan file lokal), modal meresolusi URL
 * media langsung via IPC `preview:resolve` (TikTok → TikWM; lain → yt-dlp
 * --get-url) lalu memutarnya dengan VideoPlayer (poster = thumbnail).
 */
export default function ScrapePreviewModal({
  item,
  onClose
}: {
  item: ScrapeItem | null
  onClose: () => void
}): React.ReactElement | null {
  const [preview, setPreview] = useState<ResolvedPreview | null>(null)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    // Reset state saat item berubah (buka pratinjau lain) — pola sama VideoPlayer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolving(true)
    setError(null)
    setPreview(null)
    if (!window.api?.resolvePreview) {
      setResolving(false)
      setError('Pratinjau hanya berjalan pada aplikasi desktop (Electron).')
      return
    }
    let active = true
    window.api
      .resolvePreview({ url: item.url })
      .then((res) => {
        if (!active) return
        setPreview(res)
        if (res.error) setError(res.error)
        else setError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Gagal memuat pratinjau video.')
      })
      .finally(() => {
        if (active) setResolving(false)
      })
    return () => {
      active = false
    }
  }, [item])

  // Tutup dengan Escape (pola sama seperti PreviewModal / DownloadSettingsModal).
  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  const duration = preview?.duration ?? item?.duration
  const platform = item ? guessPlatform(item.url) : ''

  return (
    <AnimatePresence>
    {item && (
    <motion.div
      key="scrape-preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-colors"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-4xl w-full relative shadow-2xl flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — ikon badge + judul + subjudul + tombol tutup (konsisten) */}
        <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
            <PlayCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">
              {preview?.title ?? item.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <PlatformBadge platform={platform} /> · Pratinjau video
              {duration != null && duration > 0 && (
                <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                  · <Clock className="w-3 h-3" /> {formatDuration(duration)}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body: loading / error / pemutar */}
        <div className="bg-black flex justify-center items-center">
          {resolving && (
            <div className="flex h-72 w-full flex-col items-center justify-center gap-2 text-slate-300">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-xs">Memuat pratinjau...</p>
            </div>
          )}
          {!resolving && error && (
            <div className="flex h-72 w-full flex-col items-center justify-center gap-2 px-6 text-center">
              <CircleAlert className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-white">Tidak dapat memuat pratinjau</p>
              <p className="max-w-md text-xs text-slate-300/70">{error}</p>
            </div>
          )}
          {!resolving && !error && preview?.playUrl && (
            <VideoPlayer src={preview.playUrl} poster={preview.thumbnail ?? item.thumbnail} />
          )}
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  )
}
