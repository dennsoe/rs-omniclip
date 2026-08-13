import { motion } from 'motion/react'
import type { FileStatus } from '@lib/types'

export default function StatusBadge({
  status,
  progress
}: {
  status: FileStatus
  progress: number
}): React.ReactElement {
  switch (status) {
    case 'pending':
      return (
        <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-medium transition-colors">
          Menunggu
        </span>
      )
    case 'processing': {
      const radius = 6
      const circumference = 2 * Math.PI * radius
      const strokeDashoffset = circumference - (progress / 100) * circumference

      return (
        <span className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border border-blue-200/50 dark:border-blue-500/20 shadow-sm">
          <div className="relative flex items-center justify-center w-4 h-4">
            <svg className="w-4 h-4 -rotate-90 absolute inset-0">
              <circle
                cx="8"
                cy="8"
                r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-blue-200 dark:text-blue-900/50"
              />
              <motion.circle
                cx="8"
                cy="8"
                r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={circumference}
                strokeLinecap="round"
                className="text-blue-600 dark:text-blue-400"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </svg>
          </div>
          <span className="tabular-nums w-8 text-right tracking-tight">{Math.round(progress)}%</span>
        </span>
      )
    }
    case 'success':
      return (
        <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-medium transition-colors">
          Selesai
        </span>
      )
    case 'failed':
      return (
        <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full text-xs font-medium transition-colors">
          Gagal
        </span>
      )
  }
}
