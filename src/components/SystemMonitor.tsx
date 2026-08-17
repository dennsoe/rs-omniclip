import { useEffect, useState } from 'react'
import { Activity, Cpu, MemoryStick, Loader2 } from 'lucide-react'

/** Jumlah sampel riwayat yang dirender pada sparkline CPU. */
const HISTORY_LEN = 24
const SPARK_W = 100
const SPARK_H = 26

export default function SystemMonitor(): React.ReactElement {
  const [cpu, setCpu] = useState(0)
  const [ramUsedMb, setRamUsedMb] = useState(0)
  const [ramTotalMb, setRamTotalMb] = useState(0)
  const [workers, setWorkers] = useState(0)
  const [history, setHistory] = useState<number[]>([])

  // Statistik sistem NYATA dari proses utama (bukan simulasi).
  useEffect(() => {
    if (!window.api?.onSystemStats) return
    const off = window.api.onSystemStats((data) => {
      setCpu(data.cpu)
      setRamUsedMb(data.ramUsedMb)
      setRamTotalMb(data.ramTotalMb)
      setWorkers(data.workers ?? 0)
      // Simpan riwayat CPU untuk sparkline (maks 24 titik, terbaru di akhir).
      setHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), data.cpu])
    })
    return off
  }, [])

  const ramPercent = ramTotalMb > 0 ? Math.min(100, Math.round((ramUsedMb / ramTotalMb) * 100)) : 0
  const ramUsedDisplay = (ramUsedMb / 1024).toFixed(1)
  const ramTotalDisplay = ramTotalMb > 0 ? (ramTotalMb / 1024).toFixed(0) : '—'

  // Titik sparkline (riwayat CPU 0–100 → koordinat SVG).
  const sparkPoints =
    history.length > 1
      ? history
          .map((v, i) => {
            const x = (i / (history.length - 1)) * SPARK_W
            const y = SPARK_H - (Math.min(100, v) / 100) * (SPARK_H - 2) - 1
            return `${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(' ')
      : ''

  const cpuHot = cpu > 80

  return (
    <div className="mx-4 mb-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3 transition-colors">
      <div className="mb-1 text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">System</span>
          {workers > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Memproses ×{workers}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Pemakaian Aplikasi</p>
      </div>

      {/* CPU */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Cpu className="w-3.5 h-3.5" />
            CPU
          </span>
          <span className={`transition-colors ${cpuHot ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
            {cpu}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 rounded-full ${cpuHot ? 'bg-rose-500' : 'bg-blue-500'}`}
            style={{ width: `${cpu}%` }}
          />
        </div>
        {sparkPoints && (
          <svg
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            preserveAspectRatio="none"
            className="mt-1.5 w-full h-6 text-blue-400 dark:text-blue-500/80"
            aria-hidden
          >
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* RAM */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <MemoryStick className="w-3.5 h-3.5" />
            RAM
          </span>
          <span className="text-slate-700 dark:text-slate-200">
            {ramUsedDisplay}
            <span className="text-slate-400 dark:text-slate-500"> / {ramTotalDisplay} GB</span>
            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">{ramPercent}%</span>
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-700 rounded-full"
            style={{ width: `${ramPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
