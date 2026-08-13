import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import type { PresetType } from '@lib/types'

export interface PresetOption {
  id: PresetType
  title: string
  desc: string
  icon: LucideIcon
}

interface PresetSelectorProps {
  /** Daftar prasetel yang ditampilkan. */
  presets: PresetOption[]
  /** Prasetel yang sedang aktif. */
  value: PresetType
  /** Dipanggil saat pengguna memilih prasetel lain. */
  onChange: (id: PresetType) => void
  /** Nonaktifkan pemilihan saat batch sedang diproses. */
  disabled?: boolean
}

/**
 * Pemilih prasetel untuk halaman Pembersih Video.
 * Berhenti menyebarkan klik agar tidak memicu dialog file dropzone di sekitarnya.
 */
export default function PresetSelector({
  presets,
  value,
  onChange,
  disabled
}: PresetSelectorProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
      {presets.map((p) => {
        const Icon = p.icon
        const isActive = value === p.id
        return (
          <motion.button
            key={p.id}
            type="button"
            layout
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) onChange(p.id)
            }}
            disabled={disabled}
            aria-pressed={isActive}
            whileTap={{ scale: 0.97 }}
            className={`relative flex items-center gap-2.5 sm:gap-3 p-3 rounded-xl border text-left transition-colors duration-200 ${
              isActive
                ? 'text-white'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isActive && (
              <motion.span
                layoutId="preset-active-bg"
                className="absolute inset-0 bg-linear-to-r from-blue-600 to-blue-500 rounded-xl shadow-lg shadow-blue-600/30"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Icon
              className={`relative z-10 w-5 h-5 shrink-0 ${
                isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'
              }`}
            />
            <div className="relative z-10 flex flex-col overflow-hidden min-w-0">
              <span className="font-semibold text-xs sm:text-sm truncate">{p.title}</span>
              <span
                className={`text-[11px] sm:text-xs truncate ${
                  isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {p.desc}
              </span>
            </div>
            {isActive && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.4 }}
                className="relative z-10 ml-auto w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0"
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
