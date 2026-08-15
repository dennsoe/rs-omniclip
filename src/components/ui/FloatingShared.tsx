import { motion } from 'motion/react'
import { clsx } from 'clsx'

/**
 * Lapisan kilau halus (shine sweep) yang menyapu field SATU KALI saat fokus.
 * Efek premium ala Material — halus, tidak mengganggu, aman dipakai di modal.
 */
export function FieldShine(): React.ReactElement {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <motion.span
        initial={{ x: '-160%' }}
        animate={{ x: '280%' }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent dark:via-blue-400/10"
      />
    </span>
  )
}

/**
 * Label mengambang gaya Google (outlined text field):
 * - Saat kosong: duduk di tengah field sebagai placeholder.
 * - Saat terisi/fokus: naik ke ATAS border dengan latar senada field sehingga
 *   membentuk "notch" (border tampak terpotong di belakang label).
 * - Warna: biru saat fokus, netral saat terisi (blur), merah saat error.
 */
export function FloatingLabel({
  floated,
  focused,
  error,
  icon,
  multiline,
  htmlFor,
  children
}: {
  floated: boolean
  focused: boolean
  error?: string
  icon?: React.ReactNode
  /** Mode textarea: saat kosong label duduk di `top-4` (bukan di tengah). */
  multiline?: boolean
  htmlFor?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        'pointer-events-none absolute z-10 whitespace-nowrap leading-none transition-all duration-200 ease-out',
        icon ? 'left-9' : 'left-3.5',
        floated
          ? clsx(
              'top-0 -translate-y-1/2 rounded-md px-1.5 text-[11px] font-medium',
              error
                ? 'bg-white text-rose-500 dark:bg-slate-900 dark:text-rose-400'
                : focused
                  ? 'bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400'
                  : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
            )
          : clsx(
              'text-sm text-slate-400 dark:text-slate-500',
              multiline ? 'top-4' : 'top-1/2 -translate-y-1/2'
            )
      )}
    >
      {children}
    </label>
  )
}

