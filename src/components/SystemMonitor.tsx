import { useEffect, useState } from 'react'
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
const SPARK_H = 26

/** Format kecepatan byte/dtk → "12.4 MB/s" (data nyata, bukan simulasi). */
function formatSpeed(bps: number): string {
  if (bps <= 0) return '0 B/s'
  if (bps < 1024) return `${bps} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  if (bps < 1024 * 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`
  return `${(bps / 1024 / 1024 / 1024).toFixed(2)} GB/s`
}

/** Sparkline SVG kecil dari deret nilai 0–100 (riwayat CPU/RAM/Disk). */
function Sparkline({ values, className }: { values: number[]; className?: string }): React.ReactElement | null {
  if (values.length < 2) return null
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_W
      const y = SPARK_H - (Math.min(100, v) / 100) * (SPARK_H - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
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

/** Blok metrik konsisten: label + nilai (kanan) + bar + sparkline (warna ambang). */
function MetricBlock({
  icon,
  label,
  value,
  tone,
  pct,
  spark,
  hint
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  tone: Tone
  pct: number
  spark: number[]
  hint?: string
}): React.ReactElement {
  const width = `${Math.min(100, Math.max(0, pct))}%`
  return (
    <div
      className="group -mx-1.5 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
      title={hint}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="shrink-0">{icon}</span>
          <span className="truncate text-xs font-medium">{label}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all duration-700 ${tone.bar}`} style={{ width }} />
      </div>
      {spark.length > 1 && <Sparkline values={spark} className={`mt-1.5 h-6 w-full ${tone.spark}`} />}
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

  return (
    <div className="mx-4 mb-4 flex flex-col gap-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors dark:border-slate-800/50 dark:bg-slate-900/50">
      {/* Header — ringkas, tanpa teks berlebih */}
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
          <Activity className="h-4 w-4" />
        </span>
        <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          System
        </span>
        {workers > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            ×{workers}
          </span>
        )}
      </div>

      {/* CPU */}
      <MetricBlock
        icon={<Cpu className="h-3.5 w-3.5" />}
        label="CPU"
        value={<span className={cpuT.value}>{cpu}%</span>}
        tone={cpuT}
        pct={cpu}
        spark={history}
        hint={`CPU aplikasi ${cpu}% dari kapasitas mesin`}
      />

      {/* RAM */}
      <MetricBlock
        icon={<MemoryStick className="h-3.5 w-3.5" />}
        label="RAM"
        value={
          <>
            <span className="font-medium text-slate-400 dark:text-slate-500">
              {ramUsedDisplay}/{ramTotalDisplay} GB
            </span>
            <span className={`ml-1.5 ${ramT.value}`}>{ramPercent}%</span>
          </>
        }
        tone={ramT}
        pct={ramPercent}
        spark={ramHistory}
        hint={`RAM aplikasi ${ramUsedDisplay} GB dari ${ramTotalDisplay} GB`}
      />

      <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

      {/* Disk — bar = % terpakai; "bebas" tersedia di tooltip */}
      <MetricBlock
        icon={<HardDrive className="h-3.5 w-3.5" />}
        label="Disk"
        value={
          <>
            <span className="font-medium text-slate-400 dark:text-slate-500">
              {diskUsedDisplay}/{diskTotalDisplay} GB
            </span>
            <span className={`ml-1.5 ${diskT.value}`}>{diskUsedPct}%</span>
          </>
        }
        tone={diskT}
        pct={diskUsedPct}
        spark={diskHistory}
        hint={`Disk: total ${diskTotalDisplay} GB · dipakai ${diskUsedDisplay} GB · bebas ${diskFreeDisplay} GB`}
      />

      {/* Jaringan — ↓ unduh & ↑ unggah (nyata dari OS), urutan jelas */}
      {(netRxBps > 0 || netTxBps > 0) && (
        <div
          className="group -mx-1.5 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
          title={`Jaringan sistem: unduh ${formatSpeed(netRxBps)} · unggah ${formatSpeed(netTxBps)}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Network className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs font-medium">Jaringan</span>
            </span>
            <span className="flex shrink-0 items-center gap-2.5 text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1">
                <ArrowDown className="h-3 w-3 text-sky-500" />
                {formatSpeed(netRxBps)}
              </span>
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3 text-violet-500" />
                {formatSpeed(netTxBps)}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
