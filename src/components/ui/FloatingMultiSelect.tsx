import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import { FieldShine, FloatingLabel } from './FloatingShared'
import { iconCls } from './floating-classes'

export interface MultiSelectOption {
  value: string
  label: string
}

interface PanelRect {
  top: number
  left: number
  width: number
}

/**
 * Dropdown multi-pilih dengan floating label: opsi ber-checkbox, chip tag
 * terpilih (bisa dihapus), pencarian. Panel dirender via PORTAL ke <body>
 * (position: fixed, posisi dari bounding rect trigger) agar tidak terpotong
 * kontainer overflow dan selalu rapi di atas elemen lain (z-90, latar solid).
 * Panel ditutup otomatis bila halaman/kontainer di-scroll, direposisi saat
 * resize, dan tutup via klik luar/Escape.
 */
export default function FloatingMultiSelect({
  label,
  options,
  selected,
  onChange,
  icon,
  helper,
  placeholder,
  disabled
}: {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  icon?: React.ReactNode
  helper?: string
  placeholder?: string
  disabled?: boolean
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [rect, setRect] = useState<PanelRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const floated = open || selected.length > 0
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

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

  const toggle = (value: string): void => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen((v) => !v)
            setQuery('')
          }}
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
              selected.length > 0
                ? 'text-slate-800 dark:text-slate-100'
                : 'text-slate-400 dark:text-slate-500'
            )}
          >
            {/* Saat label di tengah (tidak mengambang) span HARUS kosong agar
                tidak menimpa label. Saat mengambang tampilkan jumlah/placeholder. */}
            {selected.length > 0
              ? `${selected.length} terpilih`
              : (floated ? (placeholder ?? '') : '')}
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

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3.5 pb-2">
            {selected.map((v) => {
              const opt = options.find((o) => o.value === v)
              return (
                <span
                  key={v}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                >
                  <span className="truncate">{opt?.label ?? v}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(v)
                    }}
                    aria-label={`Hapus ${opt?.label ?? v}`}
                    className="shrink-0 hover:text-blue-800 dark:hover:text-blue-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {open &&
        rect &&
        createPortal(
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16 }}
            style={{ top: rect.top, left: rect.left, width: rect.width }}
            className="fixed z-90 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              />
            </div>
            <ul className="max-h-56 overflow-auto">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">Tidak ada hasil</li>
              )}
              {filtered.map((o) => {
                const isSel = selected.includes(o.value)
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => toggle(o.value)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span
                        className={clsx(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isSel
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        )}
                      >
                        {isSel && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate text-slate-700 dark:text-slate-200">{o.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>,
          document.body
        )}

      {helper && <p className="px-1 text-[11px] text-slate-400 dark:text-slate-500">{helper}</p>}
    </div>
  )
}
