import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { clsx } from 'clsx'
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react'
import { FloatingInput } from '@components/ui/FloatingField'

// ---------------------------------------------------------------------------
// Helper tanggal LOKAL (hindari pergeseran UTC — zona waktu positif seperti
// Indonesia tidak boleh menggeser tanggal satu hari).
// ---------------------------------------------------------------------------
import { MONTHS_SHORT, MONTHS_ID, WEEKDAYS_SHORT as WEEKDAYS } from '@lib/campaign/format'

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseISO(iso: string): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return Number.isNaN(d.getTime()) ? null : d
}

/** Terima "DD/MM/YYYY" atau "YYYY-MM-DD" → "YYYY-MM-DD"; null bila tidak valid. */
function parseInput(s: string): string | null {
  const t = s.trim()
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  let y = 0
  let mo = 0
  let da = 0
  if (m) {
    y = +m[3]
    mo = +m[2]
    da = +m[1]
  } else {
    const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
    if (!m2) return null
    y = +m2[1]
    mo = +m2[2]
    da = +m2[3]
  }
  const d = new Date(y, mo - 1, da)
  if (Number.isNaN(d.getTime())) return null
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null
  return toISO(d)
}

/** "2026-08-01" → "1 Agt 2026". */
function formatDisplay(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** "2026-08-01" → "01/08/2026". */
function formatInput(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

interface DayCell {
  iso: string
  day: number
  inMonth: boolean
  today: boolean
  /** Tanggal di MASA DEPAN — tidak boleh dipilih. */
  future: boolean
}

function buildMonth(year: number, monthIndex: number): DayCell[] {
  const first = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const startOffset = first.getDay() // 0 = Minggu
  const prevDays = new Date(year, monthIndex, 0).getDate()
  const todayISO = toISO(new Date())
  const cells: DayCell[] = []
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex - 1, prevDays - i)
    const iso = toISO(d)
    cells.push({ iso, day: prevDays - i, inMonth: false, today: false, future: iso > todayISO })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day)
    const iso = toISO(d)
    cells.push({ iso, day, inMonth: true, today: iso === todayISO, future: iso > todayISO })
  }
  const remaining = cells.length % 7
  if (remaining) {
    for (let day = 1; day <= 7 - remaining; day++) {
      const d = new Date(year, monthIndex + 1, day)
      const iso = toISO(d)
      cells.push({ iso, day, inMonth: false, today: false, future: iso > todayISO })
    }
  }
  return cells
}

type PresetId = 'today' | 'yesterday' | '7d' | 'month' | 'custom'

const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'today', label: 'Hari Ini' },
  { id: 'yesterday', label: 'Kemarin' },
  { id: '7d', label: '7 hari terakhir' },
  { id: 'month', label: 'Bulan ini' },
  { id: 'custom', label: 'Kustom' },
]

function presetFor(start: string, end: string): PresetId {
  if (!start || !end) return 'custom'
  const t = new Date()
  const ti = toISO(t)
  if (start === end && start === ti) return 'today'
  const y = new Date(t)
  y.setDate(y.getDate() - 1)
  if (start === end && start === toISO(y)) return 'yesterday'
  const s7 = new Date(t)
  s7.setDate(t.getDate() - 6)
  if (start === toISO(s7) && end === ti) return '7d'
  const f = new Date(t.getFullYear(), t.getMonth(), 1)
  if (start === toISO(f) && end === ti) return 'month'
  return 'custom'
}

/** Rentang periode SEBELUMNYA dengan panjang sama (untuk perbandingan). */
function previousRange(start: string, end: string): { start: string; end: string } {
  const s = parseISO(start)
  const e = parseISO(end)
  if (!s || !e) return { start: '', end: '' }
  const len = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevEnd = new Date(s)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - len + 1)
  return { start: toISO(prevStart), end: toISO(prevEnd) }
}

/**
 * Range date picker performa kampanye — popover dengan preset cepat, dua
 * kalender bulan berdampingan, input Dari/Sampai (floating label), opsi
 * bandingkan periode sebelumnya, serta Batal/Update. Semua input mengikuti
 * komponen floating label aplikasi; tanggal diproses sebagai string lokal
 * "YYYY-MM-DD" (konsisten dengan filterByDateRange).
 */
export default function CampaignDateRange({
  dateStart,
  dateEnd,
  onChange,
  onReset,
}: {
  dateStart: string
  dateEnd: string
  onChange: (start: string, end: string) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Draft lokal — diterapkan ke orang tua hanya saat "Update" ditekan.
  const [draftStart, setDraftStart] = useState(dateStart)
  const [draftEnd, setDraftEnd] = useState(dateEnd)
  const [dariText, setDariText] = useState(formatInput(dateStart))
  const [sampaiText, setSampaiText] = useState(formatInput(dateEnd))
  const [viewYear, setViewYear] = useState(0)
  const [viewMonth, setViewMonth] = useState(0)
  const [compare, setCompare] = useState(false)

  /** Set draft + sinkronkan teks input sekaligus (tanpa effect — hindari react-hooks). */
  const setDraft = (start: string, end: string) => {
    setDraftStart(start)
    setDraftEnd(end)
    setDariText(formatInput(start))
    setSampaiText(formatInput(end))
  }

  const openPicker = () => {
    setDraft(dateStart, dateEnd)
    setCompare(false)
    // Bulan berjalan (default) atau bulan akhir rentang selalu di KANAN.
    const anchor = parseISO(dateEnd) || new Date()
    setViewYear(anchor.getFullYear())
    setViewMonth(anchor.getMonth())
    setOpen(true)
  }

  // Ukur posisi popover (right-align ke trigger, clamp dalam viewport) +
  // tutup pada klik luar / scroll / Escape / reposisi saat resize.
  // LEBAR panel diketahui dari CSS (w-[min(760px,calc(100vw-16px))]) sehingga
  // pengukuran TIDAK bergantung panel sudah ter-render (hindari deadlock
  // rect→portal→panel→rect).
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth
      const pw = Math.min(760, vw - 16)
      const left = Math.max(8, Math.min(r.right - pw, vw - pw - 8))
      setRect({ top: r.bottom + 6, left })
    }
    measure()
    const onResize = () => measure()
    const onScroll = () => setOpen(false)
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
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

  const pick = (iso: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraft(iso, '')
    } else if (iso < draftStart) {
      setDraft(iso, draftStart)
    } else {
      setDraft(draftStart, iso)
    }
  }

  const applyPreset = (id: PresetId) => {
    const t = new Date()
    if (id === 'today') {
      setDraft(toISO(t), toISO(t))
      setViewYear(t.getFullYear())
      setViewMonth(t.getMonth())
      return
    }
    if (id === 'yesterday') {
      const y = new Date(t)
      y.setDate(y.getDate() - 1)
      setDraft(toISO(y), toISO(y))
      setViewYear(y.getFullYear())
      setViewMonth(y.getMonth())
      return
    }
    if (id === '7d') {
      const s = new Date(t)
      s.setDate(t.getDate() - 6)
      setDraft(toISO(s), toISO(t))
      // Bulan berjalan (end = hari ini) diletakkan di KANAN.
      setViewYear(t.getFullYear())
      setViewMonth(t.getMonth())
      return
    }
    if (id === 'month') {
      const f = new Date(t.getFullYear(), t.getMonth(), 1)
      setDraft(toISO(f), toISO(t))
      // Bulan berjalan (end = hari ini) diletakkan di KANAN.
      setViewYear(t.getFullYear())
      setViewMonth(t.getMonth())
    }
    // "Kustom": biarkan draft apa adanya.
  }

  const commitDari = () => {
    const parsed = parseInput(dariText)
    if (!parsed) {
      setDariText(formatInput(draftStart))
      return
    }
    const today = toISO(new Date())
    // Tanggal masa depan tidak bisa dipilih — clamp ke hari ini.
    const clamped = parsed > today ? today : parsed
    // End tidak boleh lebih kecil dari start — clamp agar rentang selalu valid.
    const ne = draftEnd && draftEnd >= clamped ? draftEnd : clamped
    setDraft(clamped, ne)
  }
  const commitSampai = () => {
    const parsed = parseInput(sampaiText)
    if (!parsed) {
      setSampaiText(formatInput(draftEnd))
      return
    }
    const today = toISO(new Date())
    // Tanggal masa depan tidak bisa dipilih — clamp ke hari ini.
    const clamped = parsed > today ? today : parsed
    // Start tidak boleh lebih besar dari end — clamp agar rentang selalu valid.
    const ns = draftStart && draftStart <= clamped ? draftStart : clamped
    setDraft(ns, clamped)
  }

  const apply = () => {
    onChange(draftStart, draftEnd)
    setOpen(false)
  }
  const cancel = () => setOpen(false)

  const activePreset = presetFor(draftStart, draftEnd)
  const rangeActive = !!(draftStart && draftEnd)
  const prev = rangeActive ? previousRange(draftStart, draftEnd) : null
  // viewYear/viewMonth = bulan KANAN (utama); kiri = bulan sebelumnya.
  const firstYear = viewMonth === 0 ? viewYear - 1 : viewYear
  const firstMonth = (viewMonth + 11) % 12
  const cellsA = buildMonth(firstYear, firstMonth)
  const cellsB = buildMonth(viewYear, viewMonth)
  const hasApplied = !!(dateStart || dateEnd)
  const appliedLabel =
    dateStart && dateEnd
      ? `${formatDisplay(dateStart)} — ${formatDisplay(dateEnd)}`
      : dateStart
        ? formatDisplay(dateStart)
        : ''

  const shiftPair = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  return (
    <>
      <div className="relative flex items-center gap-1.5">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold shadow-sm transition-all dark:bg-slate-800',
            open
              ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-600/50 dark:hover:text-blue-400'
          )}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">{appliedLabel || 'Pilih rentang tanggal'}</span>
          <ChevronDown className={clsx('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
        {hasApplied && (
          <button
            type="button"
            title="Reset rentang tanggal"
            aria-label="Reset rentang tanggal"
            onClick={onReset}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-300 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: rect.top, left: rect.left, zIndex: 90 }}
            className="w-[min(760px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-800"
          >
            <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.15 }}>
              {/* Header rentang draft */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <div className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {draftStart && draftEnd ? `${formatDisplay(draftStart)} — ${formatDisplay(draftEnd)}` : 'Pilih tanggal mulai & selesai'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancel}
                  aria-label="Tutup"
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4 p-4 md:flex-row">
                {/* Daftar preset kiri */}
                <div className="flex shrink-0 flex-col gap-1 md:w-40">
                  <span className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Pilih Rentang
                  </span>
                  {PRESETS.map((p) => {
                    const active = activePreset === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={clsx(
                          'flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors',
                          active
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
                        )}
                      >
                        {p.label}
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </button>
                    )
                  })}
                </div>

                {/* Dua kalender bulan berdampingan — bulan berjalan di KANAN */}
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { y: firstYear, m: firstMonth },
                    { y: viewYear, m: viewMonth },
                  ].map(({ y, m }, idx) => (
                    <div key={`${y}-${m}`}>
                      <div className="flex items-center justify-between px-1">
                        {idx === 0 ? (
                          <button
                            type="button"
                            onClick={() => shiftPair(-1)}
                            aria-label="Bulan sebelumnya"
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="w-6" />
                        )}
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {MONTHS_ID[m]} {y}
                        </span>
                        {idx === 1 ? (
                          <button
                            type="button"
                            onClick={() => shiftPair(1)}
                            aria-label="Bulan berikutnya"
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="w-6" />
                        )}
                      </div>
                      <div className="mt-1.5 grid grid-cols-7 gap-0.5">
                        {WEEKDAYS.map((d) => (
                          <div key={d} className="py-1 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                            {d}
                          </div>
                        ))}
                        {(idx === 0 ? cellsA : cellsB).map((c) => {
                          const isStart = c.iso === draftStart
                          const isEnd = c.iso === draftEnd
                          const inRange = rangeActive && c.iso > draftStart && c.iso < draftEnd
                          return (
                            <button
                              key={c.iso}
                              type="button"
                              disabled={c.future}
                              onClick={() => pick(c.iso)}
                              aria-disabled={c.future}
                              className={clsx(
                                'flex h-8 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                                c.future
                                  ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                                  : isStart || isEnd
                                    ? 'bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/30'
                                    : inRange
                                      ? 'bg-blue-500/15 font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
                                      : c.inMonth
                                        ? c.today
                                          ? 'ring-1 ring-inset ring-blue-500/60 hover:bg-blue-50 dark:hover:bg-slate-700/60'
                                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                                        : 'text-slate-300 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-700/60'
                              )}
                            >
                              {c.day}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dari / Sampai — floating label */}
              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 px-4 pt-4 sm:grid-cols-2 dark:border-slate-700">
                <FloatingInput
                  label="Dari"
                  icon={<CalendarDays className="h-4 w-4" />}
                  value={dariText}
                  onChange={(e) => setDariText(e.target.value)}
                  onBlur={commitDari}
                  helper="Format: 01/08/2026"
                />
                <FloatingInput
                  label="Sampai"
                  icon={<CalendarCheck className="h-4 w-4" />}
                  value={sampaiText}
                  onChange={(e) => setSampaiText(e.target.value)}
                  onBlur={commitSampai}
                  helper="Format: 31/08/2026"
                />
              </div>

              {/* Bandingkan periode sebelumnya */}
              <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
                <button type="button" onClick={() => setCompare((v) => !v)} className="group flex items-center gap-2.5">
                  <span
                    className={clsx(
                      'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                      compare
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 group-hover:border-slate-400 dark:border-slate-600 dark:group-hover:border-slate-500'
                    )}
                  >
                    {compare && <Check className="h-3 w-3" />}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Bandingkan dengan periode sebelumnya
                  </span>
                </button>
                {compare && prev && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
                    {formatDisplay(prev.start)} — {formatDisplay(prev.end)}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Tanggal mengikuti zona waktu perangkat.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancel}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={apply}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
                  >
                    Update
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </>
  )
}
