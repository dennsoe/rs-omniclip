import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  ArrowDown,
  ArrowUp,
  Loader2
} from 'lucide-react'

/** Jumlah sampel riwayat yang dirender pada sparkline. */
const HISTORY_LEN = 24
const SPARK_W = 100
const SPARK_H = 24

/** Format kecepatan byte/dtk → "12.4 MB/s" (data nyata, bukan simulasi). */
function formatSpeed(bps: number): string {
  if (bps <= 0) return '0 B/s'
  if (bps < 1024) return `${bps} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  if (bps < 1024 * 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`
  return `${(bps / 1024 / 1024 / 1024).toFixed(2)} GB/s`
}

/** Sparkline mini dengan titik "live" berdenyut di ujung (menandakan realtime). */
function Sparkline({ values, className }: { values: number[]; className?: string }): React.ReactElement | null {
  if (values.length < 2) return null
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_W
      const y = SPARK_H - (Math.min(100, v) / 100) * (SPARK_H - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const lastVal = Math.min(100, values[values.length - 1])
  const lastX = SPARK_W
  const lastY = SPARK_H - (lastVal / 100) * (SPARK_H - 2) - 1
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Titik live yang berdenyut */}
      <circle cx={lastX} cy={lastY} r="2.2" fill="currentColor">
        <animate attributeName="r" values="1.5;3;1.5" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/** Warna ambang batas per metrik — dipakai pada nilai, bar, DAN grafik. */
interface Tone {
  value: string
  bar: string
  spark: string
}
function cpuTone(v: number): Tone {
  if (v > 80) return { value: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', spark: 'text-rose-400' }
  if (v > 50) return { value: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', spark: 'text-amber-400' }
  return { value: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', spark: 'text-blue-400' }
}
function ramTone(v: number): Tone {
  if (v > 85) return { value: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', spark: 'text-rose-400' }
  if (v > 60) return { value: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', spark: 'text-amber-400' }
  return { value: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', spark: 'text-emerald-400' }
}
function diskTone(v: number): Tone {
  if (v > 90) return { value: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', spark: 'text-rose-400' }
  if (v > 75) return { value: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', spark: 'text-amber-400' }
  return { value: 'text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', spark: 'text-violet-400' }
}

/** Sel metrik kompak: label + nilai (pop saat berubah) + bar (spring) + sparkline live. */
function MetricCell({
  icon,
  label,
  value,
  sub,
  tone,
  pct,
  spark,
  danger,
  className = '',
  hint
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: React.ReactNode
  tone: Tone
  pct: number
  spark: number[]
  danger?: boolean
  className?: string
  hint?: string
}): React.ReactElement {
  return (
    <div
      title={hint}
      className={`group rounded-lg border border-slate-100 bg-white/50 px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-slate-700 ${className}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1 text-slate-500 dark:text-slate-400">
          <span className="shrink-0">{icon}</span>
          <span className="truncate text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </span>
        <motion.span
          key={value}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
          className={`shrink-0 text-[11px] font-bold tabular-nums leading-none ${tone.value} ${danger ? 'animate-pulse' : ''}`}
        >
          {value}
        </motion.span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
        <motion.div
          className={`h-full rounded-full ${tone.bar} ${danger ? 'shadow-[0_0_8px_rgba(244,63,94,0.6)]' : ''}`}
          animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      {sub && <div className="mt-1 truncate text-[9px] font-medium tabular-nums text-slate-400 dark:text-slate-500">{sub}</div>}
      {spark.length > 1 && <Sparkline values={spark} className={`mt-1 h-5 w-full ${tone.spark}`} />}
    </div>
  )
}

export default function SystemMonitor(): React.ReactElement {
  const [cpu, setCpu] = useState(0)
  const [ramUsedMb, setRamUsedMb] = useState(0)
  const [ramTotalMb, setRamTotalMb] = useState(0)
  const [workers, setWorkers] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [ramHistory, setRamHistory] = useState<number[]>([])
  const [diskHistory, setDiskHistory] = useState<number[]>([])
  const [diskFreeMb, setDiskFreeMb] = useState(0)
  const [diskTotalMb, setDiskTotalMb] = useState(0)
  const [netRxBps, setNetRxBps] = useState(0)
  const [netTxBps, setNetTxBps] = useState(0)

  // Statistik sistem NYATA dari proses utama (bukan simulasi).
  useEffect(() => {
    if (!window.api?.onSystemStats) return
    const off = window.api.onSystemStats((data) => {
      setCpu(data.cpu)
      setRamUsedMb(data.ramUsedMb)
      setRamTotalMb(data.ramTotalMb)
      setWorkers(data.workers ?? 0)
      // Riwayat untuk sparkline (maks 24 titik, terbaru di akhir).
      setHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), data.cpu])
      const ramPct = data.ramTotalMb > 0 ? Math.min(100, Math.round((data.ramUsedMb / data.ramTotalMb) * 100)) : 0
      setRamHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), ramPct])
      const diskUsed = Math.max(0, (data.diskTotalMb ?? 0) - (data.diskFreeMb ?? 0))
      const diskPct = data.diskTotalMb > 0 ? Math.min(100, Math.round((diskUsed / data.diskTotalMb) * 100)) : 0
      setDiskHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), diskPct])
      setDiskFreeMb(data.diskFreeMb ?? 0)
      setDiskTotalMb(data.diskTotalMb ?? 0)
      setNetRxBps(data.netRxBps ?? 0)
      setNetTxBps(data.netTxBps ?? 0)
    })
    return off
  }, [])

  // RAM aplikasi.
  const ramPercent = ramTotalMb > 0 ? Math.min(100, Math.round((ramUsedMb / ramTotalMb) * 100)) : 0
  const ramUsedDisplay = (ramUsedMb / 1024).toFixed(1)
  const ramTotalDisplay = ramTotalMb > 0 ? (ramTotalMb / 1024).toFixed(0) : '—'

  // Ruang disk (volume output) — bar = % TERPAKAI (konsisten dgn CPU/RAM).
  const diskUsedMb = Math.max(0, diskTotalMb - diskFreeMb)
  const diskUsedPct = diskTotalMb > 0 ? Math.min(100, Math.round((diskUsedMb / diskTotalMb) * 100)) : 0
  const diskUsedDisplay = (diskUsedMb / 1024).toFixed(1)
  const diskFreeDisplay = (diskFreeMb / 1024).toFixed(1)
  const diskTotalDisplay = diskTotalMb > 0 ? (diskTotalMb / 1024).toFixed(0) : '—'

  const cpuT = cpuTone(cpu)
  const ramT = ramTone(ramPercent)
  const diskT = diskTone(diskUsedPct)
  const networkActive = netRxBps > 0 || netTxBps > 0
  // Status bahaya (diambang batas) → animasi pulse + glow.
  const cpuDanger = cpu > 80
  const ramDanger = ramPercent > 85
  const diskDanger = diskUsedPct > 90

  return (
    <div className="mx-4 mb-4 flex flex-col gap-2.5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors dark:border-slate-800/50 dark:bg-slate-900/50">
      {/* Header — ringkas + indikator LIVE */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
          <Activity className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          System
        </span>
        {/* Indikator realtime */}
        <span className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">live</span>
        </span>
        {workers > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ×{workers}
          </span>
        )}
      </div>

      {/* Grid kompak 2 kolom: CPU|RAM · Disk|Jaringan */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCell
          icon={<Cpu className="h-3 w-3" />}
          label="CPU"
          value={`${cpu}%`}
          tone={cpuT}
          pct={cpu}
          spark={history}
          danger={cpuDanger}
          hint={`CPU aplikasi ${cpu}% dari kapasitas mesin`}
        />
        <MetricCell
          icon={<MemoryStick className="h-3 w-3" />}
          label="RAM"
          value={`${ramPercent}%`}
          tone={ramT}
          pct={ramPercent}
          spark={ramHistory}
          danger={ramDanger}
          hint={`RAM aplikasi ${ramUsedDisplay} GB dari ${ramTotalDisplay} GB`}
        />
        <MetricCell
          icon={<HardDrive className="h-3 w-3" />}
          label="Disk"
          value={`${diskUsedPct}%`}
          sub={`${diskUsedDisplay}/${diskTotalDisplay} GB`}
          tone={diskT}
          pct={diskUsedPct}
          spark={diskHistory}
          danger={diskDanger}
          className={networkActive ? '' : 'col-span-2'}
          hint={`Disk: total ${diskTotalDisplay} GB · dipakai ${diskUsedDisplay} GB · bebas ${diskFreeDisplay} GB`}
        />

        {/* Jaringan — hanya saat ada trafik */}
        {networkActive && (
          <div
            title={`Jaringan sistem: unduh ${formatSpeed(netRxBps)} · unggah ${formatSpeed(netTxBps)}`}
            className="group rounded-lg border border-slate-100 bg-white/50 px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Network className="h-3 w-3 shrink-0" />
              <span className="truncate text-[10px] font-bold uppercase tracking-wider">Jaringan</span>
            </div>
            <motion.div
              key={formatSpeed(netRxBps)}
              initial={{ opacity: 0.3, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="mt-1 flex items-center gap-1 text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200"
            >
              <ArrowDown className="h-3 w-3 text-sky-500" />
              {formatSpeed(netRxBps)}
            </motion.div>
            <motion.div
              key={formatSpeed(netTxBps)}
              initial={{ opacity: 0.3, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200"
            >
              <ArrowUp className="h-3 w-3 text-violet-500" />
              {formatSpeed(netTxBps)}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
