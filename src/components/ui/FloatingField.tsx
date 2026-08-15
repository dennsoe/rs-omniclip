import { useEffect, useId, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { FieldShine, FloatingLabel } from './FloatingShared'
import { fieldShell, iconCls } from './floating-classes'

interface FloatingFieldBase {
  /** Label yang mengambang di atas saat terisi/fokus. */
  label: string
  icon?: React.ReactNode
  helper?: string
  error?: string
  /** Aksi (tombol) yang dirender DI DALAM field: input → kanan (tengah vertikal);
   *  textarea → kanan bawah (padding-kanan menyesuaikan lebar tombol secara adaptif). */
  action?: React.ReactNode
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
  action,
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
      <div className={clsx(fieldShell({ error, active: focused }), 'flex items-center')}>
        {icon && <span className={clsx('ml-3 shrink-0', iconCls(focused))}>{icon}</span>}
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
          className={clsx(
            'min-w-0 flex-1 bg-transparent py-3.5 text-sm text-slate-800 caret-blue-500 outline-none placeholder-transparent transition-colors dark:text-slate-100',
            action ? 'pl-3.5 pr-1' : 'px-3.5'
          )}
          placeholder=" "
        />
        <FloatingLabel floated={floated} focused={focused} error={error} icon={icon} htmlFor={id}>
          {label}
        </FloatingLabel>
        {action && <span className="relative z-10 shrink-0 pl-1 pr-2">{action}</span>}
        {focused && <FieldShine />}
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
 * - KOMPAK: mulai setinggi input teks biasa (1 baris, `rows={1}`) lalu
 *   AUTO-RESIZE mengikuti isi (tinggi = scrollHeight, tidak pernah scroll).
 * - Label mengambang di atas border (notch, gaya Google) — padding `py-3.5`
 *   cukup memberi jarak dari label floated.
 */
export function FloatingTextarea({
  label,
  icon,
  helper,
  error,
  action,
  onFocus,
  onBlur,
  ...textareaProps
}: FloatingFieldBase & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>): React.ReactElement {
  const [focused, setFocused] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const actionRef = useRef<HTMLDivElement>(null)
  const [actionW, setActionW] = useState(0)
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

  // Lebar tombol aksi → padding-kanan textarea MENYESUAIKAN lebar tombol
  // (adaptif, mis. "Unduh Semua (N)" berubah saat jumlah link berubah).
  useEffect(() => {
    const el = actionRef.current
    if (!el) return
    const update = (): void => setActionW(el.offsetWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [action])

  return (
    <div className="flex flex-col gap-1">
      <div className={fieldShell({ error, active: focused })}>
        {icon && <span className={clsx('absolute left-3 top-4', iconCls(focused))}>{icon}</span>}
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
          rows={1}
          className={clsx(
            'block w-full resize-none overflow-hidden bg-transparent py-3.5 pr-3.5 text-sm text-slate-800 caret-blue-500 outline-none placeholder-transparent transition-colors dark:text-slate-100',
            icon ? 'pl-9' : 'pl-3.5'
          )}
          style={action ? { paddingRight: `${actionW + 18}px` } : undefined}
          placeholder=" "
        />
        <FloatingLabel floated={floated} focused={focused} error={error} icon={icon} htmlFor={id}>
          {label}
        </FloatingLabel>
        {action && (
          <div ref={actionRef} className="absolute bottom-1.5 right-1.5 z-10">
            {action}
          </div>
        )}
        {focused && <FieldShine />}
      </div>
      {error ? (
        <p className="px-1 text-[11px] text-rose-500">{error}</p>
      ) : helper ? (
        <p className="px-1 text-[11px] text-slate-400 dark:text-slate-500">{helper}</p>
      ) : null}
    </div>
  )
}
