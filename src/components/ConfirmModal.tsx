import { AnimatePresence, motion } from 'motion/react'

export interface ConfirmAction {
  type: 'clear' | 'remove'
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
}): React.ReactElement {
  return (
    <AnimatePresence>
      {confirmAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-sm w-full relative shadow-2xl p-6 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
              {confirmAction.type === 'clear' ? 'Hapus Semua?' : 'Hapus Video?'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              {confirmAction.type === 'clear'
                ? 'Apakah Anda yakin ingin menghapus semua video dari antrean? Tindakan ini tidak dapat dibatalkan.'
                : 'Apakah Anda yakin ingin menghapus video ini dari antrean?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-lg shadow-rose-500/20"
              >
                Hapus
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
