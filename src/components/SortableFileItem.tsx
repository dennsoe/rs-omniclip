import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, FileVideo, Scissors, Trash2 } from 'lucide-react'
import type { FileItem } from '@lib/types'
import StatusBadge from './StatusBadge'

interface SortableFileItemProps {
  file: FileItem
  isProcessing: boolean
  isFiltered?: boolean
  onRemove: (id: string) => void
  formatSize: (bytes: number) => string
  onPreview: (file: FileItem) => void
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

export default function SortableFileItem({
  file,
  isProcessing,
  isFiltered,
  onRemove,
  formatSize,
  onPreview,
  onToast
}: SortableFileItemProps): React.ReactElement {
  const [isTrimming, setIsTrimming] = useState(false)
  const [isTrimmingPending, setIsTrimmingPending] = useState(false)
  const [startTime, setStartTime] = useState('00:00:00')
  const [endTime, setEndTime] = useState('00:00:00')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
    disabled: isProcessing || isFiltered
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 1
  }

  // Mendengarkan hasil pemotongan untuk item ini.
  useEffect(() => {
    if (!window.api?.onTrimComplete) return
    const off = window.api.onTrimComplete((data) => {
      if (data.id !== file.id) return
      setIsTrimmingPending(false)
      if (data.success) {
        setIsTrimming(false)
        onToast('Pemotongan selesai. Hasil tersimpan di folder [CLEANED].', 'success')
      } else {
        // Panel tetap terbuka agar pengguna bisa memperbaiki waktu.
        onToast(data.error ?? 'Pemotongan video gagal.', 'error')
      }
    })
    return off
  }, [file.id, onToast])

  const handleSaveTrim = (): void => {
    if (isTrimmingPending) return
    if (!startTime.trim() || !endTime.trim()) {
      onToast('Isi waktu mulai dan selesai terlebih dahulu.', 'error')
      return
    }
    if (!window.api?.trimVideo) {
      onToast('Fitur pemotongan hanya tersedia di aplikasi desktop.', 'error')
      return
    }
    setIsTrimmingPending(true)
    window.api.trimVideo({ id: file.id, path: file.path, start: startTime, end: endTime })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors bg-white dark:bg-slate-800 flex flex-col ${
        isDragging
          ? 'shadow-xl dark:shadow-2xl rounded-2xl border-none ring-1 ring-slate-200 dark:ring-slate-600'
          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center overflow-hidden mr-4 flex-grow">
          <div
            {...attributes}
            {...listeners}
            className={`mr-4 text-slate-300 dark:text-slate-500 transition-colors ${
              isProcessing || isFiltered
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'hover:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing'
            }`}
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <div
            className="flex items-center overflow-hidden cursor-pointer flex-grow group"
            onClick={(e) => {
              e.stopPropagation()
              onPreview(file)
            }}
          >
            <FileVideo className="w-8 h-8 text-slate-300 dark:text-slate-500 mr-3 shrink-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            <div className="flex flex-col overflow-hidden">
              <span
                className="truncate font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                title={file.name}
              >
                {file.name}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{formatSize(file.size)}</span>
              {file.errorMessage && file.status === 'failed' && (
                <span className="truncate text-xs text-rose-500 dark:text-rose-400 mt-0.5" title={file.errorMessage}>
                  {file.errorMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 relative z-10">
          {!isProcessing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsTrimming((v) => !v)
              }}
              disabled={isTrimmingPending}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isTrimming
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Potong video"
            >
              <Scissors className="w-4 h-4" />
            </button>
          )}
          <StatusBadge status={file.status} progress={file.progress} />
          {!isProcessing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(file.id)
              }}
              className="text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
              title="Hapus dari antrean"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tanpa AnimatePresence: exit motion 12 macet di StrictMode */}
      {isTrimming && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden"
        >
            <div className="px-14 pb-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Mulai</span>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="HH:MM:SS"
                  className="w-20 text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Selesai</span>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="HH:MM:SS"
                  className="w-20 text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveTrim()
                }}
                disabled={isTrimmingPending}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTrimmingPending ? 'Memotong...' : 'Simpan'}
              </button>
          </div>
        </motion.div>
      )}

      {isProcessing && file.status === 'processing' && (
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${file.progress}%` }}
        />
      )}
    </div>
  )
}
