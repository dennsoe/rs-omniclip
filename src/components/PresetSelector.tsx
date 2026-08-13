import type { LucideIcon } from 'lucide-react'
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
          <button
            key={p.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) onChange(p.id)
            }}
            disabled={disabled}
            aria-pressed={isActive}
            className={`flex items-center gap-2.5 sm:gap-3 p-3 rounded-xl border text-left transition-all ${
              isActive
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon
              className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}
            />
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="font-semibold text-xs sm:text-sm truncate">{p.title}</span>
              <span
                className={`text-[11px] sm:text-xs truncate ${
                  isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {p.desc}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
