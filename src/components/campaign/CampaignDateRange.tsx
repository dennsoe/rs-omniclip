import { Calendar, RotateCcw } from 'lucide-react'

/** Preset rentang tanggal: 7 hari, 30 hari, bulan ini. */
function presetRange(preset: '7d' | '30d' | 'month'): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  if (preset === '7d') start.setDate(end.getDate() - 6)
  else if (preset === '30d') start.setDate(end.getDate() - 29)
  else start.setDate(1)
  // Format tanggal LOKAL (bukan toISOString/UTC) agar tidak bergeser satu hari
  // di zona waktu positif (mis. Indonesia) saat malam hari.
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: iso(start), end: iso(end) }
}

/**
 * Filter rentang tanggal performa kampanye — dua input tanggal + preset
 * cepat + reset. Gaya mengikuti design system rs-omni.
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
  const inputCls =
    'rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200'
  const chipCls =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:text-blue-400'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
          <Calendar className="h-4 w-4" />
        </span>
        <input type="date" value={dateStart} onChange={(e) => onChange(e.target.value, dateEnd)} className={inputCls} aria-label="Tanggal mulai" />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" value={dateEnd} onChange={(e) => onChange(dateStart, e.target.value)} className={inputCls} aria-label="Tanggal akhir" />
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className={chipCls} onClick={() => { const r = presetRange('7d'); onChange(r.start, r.end) }}>
          7 Hari
        </button>
        <button type="button" className={chipCls} onClick={() => { const r = presetRange('30d'); onChange(r.start, r.end) }}>
          30 Hari
        </button>
        <button type="button" className={chipCls} onClick={() => { const r = presetRange('month'); onChange(r.start, r.end) }}>
          Bulan Ini
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 ${chipCls}`}
          onClick={onReset}
          aria-label="Reset rentang tanggal"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>
    </div>
  )
}
