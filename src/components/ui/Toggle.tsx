import { motion } from 'motion/react'
import { clsx } from 'clsx'

/**
 * Switch animasi (menggantikan checkbox boolean) — gaya profesional, sesuai tema app.
 */
export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
  hint
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label?: string
  hint?: string
}): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx('group flex items-center gap-3 text-left', disabled && 'cursor-not-allowed opacity-50')}
    >
      <span
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300',
          checked ? 'bg-blue-600 shadow-inner shadow-blue-600/30' : 'bg-slate-200 dark:bg-slate-700'
        )}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
        />
      </span>
      {(label || hint) && (
        <span className="flex min-w-0 flex-col">
          {label && (
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
          )}
          {hint && <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>}
        </span>
      )}
    </button>
  )
}
