import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Tooltip kustom premium untuk tombol ikon (tanpa label teks).
 * - Muncul saat hover/fokus (delay kecil agar tidak mengganggu), hilang saat
 *   keluar/blur.
 * - Dirender via PORTAL ke body (z-100) → selalu di atas elemen lain, aman dari
 *   jebakan stacking context (sama seperti modal & dropdown lainnya).
 * - Posisi di bawah elemen pemicu, diklamp agar tidak keluar viewport.
 */
export default function Tooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<number>(0)

  const open = () => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = Math.min(Math.max(r.left + r.width / 2, 70), window.innerWidth - 70)
    const top = r.bottom + 8
    setPos({ top, left })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShow(true), 90)
  }
  const close = () => {
    window.clearTimeout(timer.current)
    setShow(false)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <span ref={wrapRef} className="inline-flex" onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}>
      {children}
      {show &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-100 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-lg ring-1 ring-white/10 dark:bg-slate-700 dark:text-slate-100"
            style={{ top: pos.top, left: pos.left }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  )
}
