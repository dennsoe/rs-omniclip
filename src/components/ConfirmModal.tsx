import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Trash2, XCircle, RotateCcw } from 'lucide-react'

export interface ConfirmAction {
  type: 'clear' | 'remove' | 'reset' | 'clearHistory'
  id?: string
}

export default function ConfirmModal({
  confirmAction,
  onClose,
  onConfirm
}: {
  confirmAction: ConfirmAction | null
  onClose: () => void
  onConfirm: () => void
}): React.ReactElement | null {
  // Tutup dengan tombol Escape (pola sama seperti DownloadSettingsModal).
  useEffect(() => {
    if (!confirmAction) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmAction, onClose])

  // Tanpa AnimatePresence: exit motion 12 macet di StrictMode (modal tetap di DOM).
  return confirmAction ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-sm w-full relative shadow-2xl flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — ikon badge + judul + subjudul + tombol tutup */}
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div
            className={`p-2 rounded-lg shrink-0 transition-colors ${
              confirmAction.type === 'reset'
                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400'
            }`}
          >
            {confirmAction.type === 'reset' ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">
              {confirmAction.type === 'reset'
                ? 'Reset Semua Preferensi?'
                : confirmAction.type === 'clearHistory'
                  ? 'Bersihkan Riwayat?'
                  : confirmAction.type === 'clear'
                    ? 'Hapus Semua?'
                    : 'Hapus Video?'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {confirmAction.type === 'reset'
                ? 'Mengembalikan ke pengaturan default.'
                : 'Tindakan ini tidak dapat dibatalkan.'}
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

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {confirmAction.type === 'reset'
              ? 'Mode gelap, prasetel, dan pengaturan unduhan akan kembali ke nilai awal.'
              : confirmAction.type === 'clearHistory'
                ? 'Seluruh riwayat unduhan akan dihapus. Tindakan ini tidak dapat dibatalkan.'
                : confirmAction.type === 'clear'
                  ? 'Apakah Anda yakin ingin menghapus semua video dari antrean?'
                  : 'Apakah Anda yakin ingin menghapus video ini dari antrean?'}
          </p>
        </div>

        {/* Footer — tombol aksi rounded-full */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full font-medium text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 text-white px-5 py-2 rounded-full font-semibold text-sm transition-all active:scale-95 ${
              confirmAction.type === 'reset'
                ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25'
                : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/25'
            }`}
          >
            {confirmAction.type === 'reset' ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {confirmAction.type === 'reset'
              ? 'Reset'
              : confirmAction.type === 'clearHistory'
                ? 'Bersihkan'
                : confirmAction.type === 'clear'
                  ? 'Hapus Semua'
                  : 'Hapus'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  ) : null
}
