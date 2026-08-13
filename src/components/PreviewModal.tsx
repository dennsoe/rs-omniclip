import { motion } from 'motion/react'
import { XCircle } from 'lucide-react'
import type { FileItem } from '@lib/types'
import VideoPlayer from './VideoPlayer'

export default function PreviewModal({
  previewFile,
  onClose
}: {
  previewFile: FileItem | null
  onClose: () => void
}): React.ReactElement | null {
  // Tanpa AnimatePresence: exit motion 12 macet di StrictMode (modal tetap di DOM).
  return previewFile ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-colors"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-4xl w-full relative shadow-2xl flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold truncate pr-4 text-slate-800 dark:text-white">{previewFile.name}</h3>
              <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          <div className="p-0 bg-black flex justify-center items-center">
            <VideoPlayer file={previewFile.file} />
          </div>
        </motion.div>
      </motion.div>
  ) : null
}
