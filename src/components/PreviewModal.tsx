import { useEffect } from 'react'
import { motion } from 'motion/react'
import { PlayCircle, XCircle } from 'lucide-react'
import type { FileItem } from '@lib/types'
import VideoPlayer from './VideoPlayer'

export default function PreviewModal({
  previewFile,
  onClose
}: {
  previewFile: FileItem | null
  onClose: () => void
}): React.ReactElement | null {
  // Tutup dengan tombol Escape (pola sama seperti DownloadSettingsModal).
  useEffect(() => {
    if (!previewFile) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewFile, onClose])

  // Tanpa AnimatePresence: exit motion 12 macet di StrictMode (modal tetap di DOM).
  return previewFile ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-colors"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
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
              {previewFile.name}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Pratinjau video</p>
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

        {/* Body: pemutar video */}
        <div className="p-0 bg-black flex justify-center items-center">
          <VideoPlayer file={previewFile.file} />
        </div>
      </motion.div>
    </motion.div>
  ) : null
}
