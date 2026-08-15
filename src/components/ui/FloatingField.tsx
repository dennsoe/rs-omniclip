import { useEffect, useId, useRef, useState } from 'react'
import { clsx } from 'clsx'

interface FloatingFieldBase {
  /** Label yang mengambang di atas saat terisi/fokus. */
  label: string
  icon?: React.ReactNode
  helper?: string
  error?: string
}

/**
 * Input teks dengan floating label (Material-style) — tema premium aplikasi.
 * Label di dalam saat kosong, melayang ke atas saat terisi atau difokus.
 */
export function FloatingInput({
  label,
  icon,
  helper,
  error,
  onFocus,
  onBlur,
  ...inputProps
}: FloatingFieldBase & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>): React.ReactElement {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const filled = typeof inputProps.value === 'string' && inputProps.value.length > 0
  const floated = focused || filled
  return (
    <div className="flex flex-col gap-1">
      <div
        className={clsx(
          'relative flex items-center rounded-xl border bg-white transition-all dark:bg-slate-900/60',
          error
            ? 'border-rose-400 dark:border-rose-500/60'
            : focused
              ? 'border-blue-500 shadow-sm ring-2 ring-blue-500/20'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
        )}
      >
        {icon && <span className="ml-3 shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
        <input
          id={id}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          {...inputProps}
          className="w-full bg-transparent px-3.5 pb-1.5 pt-5 text-sm text-slate-800 outline-none placeholder-transparent transition-colors dark:text-slate-100"
          placeholder=" "
        />
        <label
          htmlFor={id}
          className={clsx(
            'pointer-events-none absolute transition-all duration-200',
            icon ? 'left-9' : 'left-3.5',
            floated
              ? 'top-2 text-[10px] font-bold uppercase tracking-wider text-blue-500'
              : 'top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500'
          )}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p className="px-1 text-[11px] text-rose-500">{error}</p>
      ) : helper ? (
        <p className="px-1 text-[11px] text-slate-400 dark:text-slate-500">{helper}</p>
      ) : null}
    </div>
  )
}

/**
 * Textarea dengan floating label (gaya sama dengan FloatingInput).
 * - AUTO-RESIZE: tinggi mengikuti isi (tidak pernah scroll) — diukur via
 *   scrollHeight setiap value berubah.
 * - `pt-7` memberi ruang agar label mengambang (top-2.5) TIDAK menabrak baris
 *   teks pertama (sebelumnya pt-6 → label menimpa teks; terukur overlap).
 */
export function FloatingTextarea({
  label,
  icon,
  helper,
  error,
  onFocus,
  onBlur,
  ...textareaProps
}: FloatingFieldBase & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>): React.ReactElement {
  const [focused, setFocused] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const id = useId()
  const value = typeof textareaProps.value === 'string' ? textareaProps.value : ''
  const filled = value.length > 0
  const floated = focused || filled

  // Auto-resize: tinggi = isi (tanpa scrollbar). Jalan saat value berubah &
  // saat mount (isi awal).
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [value, filled])

  return (
    <div className="flex flex-col gap-1">
      <div
        className={clsx(
          'relative rounded-xl border bg-white transition-all dark:bg-slate-900/60',
          error
            ? 'border-rose-400 dark:border-rose-500/60'
            : focused
              ? 'border-blue-500 shadow-sm ring-2 ring-blue-500/20'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
        )}
      >
        {icon && <span className="absolute left-3 top-3.5 shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
        <textarea
          ref={taRef}
          id={id}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          {...textareaProps}
          className={clsx(
            'block w-full resize-none overflow-hidden bg-transparent pb-2 pt-7 text-sm text-slate-800 outline-none placeholder-transparent transition-colors dark:text-slate-100',
            icon ? 'pl-9 pr-3.5' : 'px-3.5'
          )}
          placeholder=" "
        />
        <label
          htmlFor={id}
          className={clsx(
            'pointer-events-none absolute transition-all duration-200',
            icon ? 'left-9' : 'left-3.5',
            floated
              ? 'top-2.5 text-[10px] font-bold uppercase tracking-wider text-blue-500'
              : 'top-4 text-sm text-slate-400 dark:text-slate-500'
          )}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p className="px-1 text-[11px] text-rose-500">{error}</p>
      ) : helper ? (
        <p className="px-1 text-[11px] text-slate-400 dark:text-slate-500">{helper}</p>
      ) : null}
    </div>
  )
}
