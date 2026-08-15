import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { ChevronDown, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { FieldShine, FloatingLabel } from './FloatingShared'
import { iconCls } from './floating-classes'

export interface SelectOption {
  value: string
  label: string
  /** Deskripsi opsional — ditampilkan sebagai baris kedua pada opsi dropdown. */
  description?: string
}

interface PanelRect {
  top: number
  left: number
  width: number
}

/**
 * Dropdown kustom dengan floating label — menggantikan <select> native.
 * Panel opsi dirender via PORTAL ke <body> (position: fixed) yang posisinya
 * dihitung dari bounding rect trigger. Ini membuat panel tidak pernah
 * terpotong oleh kontainer ber-overflow (mis. body modal yang scroll) dan
 * selalu tampil rapi di atas elemen lain (z-90, latar solid). Panel ditutup
 * otomatis bila halaman/kontainer di-scroll agar tidak melenceng, dan
 * direposisi saat window di-resize. Centang pada opsi terpilih, chevron
 * berputar, tutup via klik luar / Escape.
 */
export default function FloatingSelect({
  label,
  value,
  options,
  onChange,
  icon,
  helper,
  placeholder,
  disabled
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  icon?: React.ReactNode
  helper?: string
  placeholder?: string
  disabled?: boolean
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<PanelRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  // Label mengambang saat ada opsi terpilih (termasuk opsi "kosong" seperti
  // "Tanpa Cookies" yang bernilai ''). Sebelumnya `floated = open ||
  // value.length > 0` membuat label TIDAK mengambang untuk nilai '' → label
  // di tengah MENIMPA teks nilai → tumpang tindih.
  const floated = open || !!selected

  const measure = (): void => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  useEffect(() => {
    if (!open) return
    measure()
    const onResize = (): void => measure()
    const onScroll = (): void => setOpen(false)
    const onDoc = (e: MouseEvent): void => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={clsx(
            'relative flex w-full items-center rounded-xl border bg-white text-left transition-all duration-200 dark:bg-slate-900',
            open
              ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_12px_32px_-12px_rgba(59,130,246,0.45)] dark:border-blue-400'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {icon && <span className={clsx('ml-3 shrink-0', iconCls(open))}>{icon}</span>}
          <span
            className={clsx(
              'flex-1 truncate px-3.5 py-3.5 text-sm',
              selected && floated ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
            )}
          >
            {/* Saat label di tengah (tidak mengambang) span HARUS kosong agar
                tidak menimpa label. Saat mengambang tampilkan nilai/placeholder. */}
            {floated ? (selected ? selected.label : (placeholder ?? '')) : ''}
          </span>
          <ChevronDown
            className={clsx(
              'mr-3 h-4 w-4 shrink-0 transition-all duration-200',
              open ? 'rotate-180 text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
            )}
          />
          {open && <FieldShine />}
        </button>
        <FloatingLabel floated={floated} focused={open} icon={icon}>
          {label}
        </FloatingLabel>
      </div>

      {open &&
        rect &&
        createPortal(
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16 }}
            role="listbox"
            style={{ top: rect.top, left: rect.left, width: rect.width }}
            className="fixed z-90 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            {options.map((o) => (
              <div key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={clsx(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    o.value === value
                      ? 'bg-blue-50 font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  <span className="flex min-w-0 flex-col items-start">
                    <span className="truncate">{o.label}</span>
                    {o.description && (
                      <span
                        className={clsx(
                          'mt-0.5 w-full truncate text-[11px] font-normal leading-tight',
                          o.value === value
                            ? 'text-blue-500/80 dark:text-blue-300/80'
                            : 'text-slate-400 dark:text-slate-400'
                        )}
                      >
                        {o.description}
                      </span>
                    )}
                  </span>
                  {o.value === value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </div>
            ))}
          </motion.div>,
          document.body
        )}

      {helper && <p className="px-1 text-[11px] text-slate-400 dark:text-slate-500">{helper}</p>}
    </div>
  )
}
