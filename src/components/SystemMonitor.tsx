import { useEffect, useState } from 'react'
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Download,
  Network,
  ArrowDown,
  ArrowUp,
  Loader2
} from 'lucide-react'

/** Jumlah sampel riwayat yang dirender pada sparkline CPU/RAM. */
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

/** Sparkline SVG kecil dari deret nilai 0–100 (riwayat CPU/RAM). */
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

export default function SystemMonitor(): React.ReactElement {
  const [cpu, setCpu] = useState(0)
  const [ramUsedMb, setRamUsedMb] = useState(0)
  const [ramTotalMb, setRamTotalMb] = useState(0)
  const [workers, setWorkers] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [ramHistory, setRamHistory] = useState<number[]>([])
  const [diskFreeMb, setDiskFreeMb] = useState(0)
  const [diskTotalMb, setDiskTotalMb] = useState(0)
  const [downloadSpeedBps, setDownloadSpeedBps] = useState(0)
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
      // Riwayat CPU untuk sparkline (maks 24 titik, terbaru di akhir).
      setHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), data.cpu])
      // Riwayat RAM app (%) untuk sparkline.
      const ramPct = data.ramTotalMb > 0 ? Math.min(100, Math.round((data.ramUsedMb / data.ramTotalMb) * 100)) : 0
      setRamHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), ramPct])
      setDiskFreeMb(data.diskFreeMb ?? 0)
      setDiskTotalMb(data.diskTotalMb ?? 0)
      setDownloadSpeedBps(data.downloadSpeedBps ?? 0)
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
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Pemakaian Aplikasi &amp; Sistem</p>
      </div>

      {/* CPU (aplikasi) */}
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
        <Sparkline values={history} className="mt-1.5 w-full h-6 text-blue-400 dark:text-blue-500/80" />
      </div>

      {/* RAM (aplikasi) */}
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
        <Sparkline values={ramHistory} className="mt-1.5 w-full h-6 text-emerald-400 dark:text-emerald-500/80" />
      </div>

      {/* Pemisah seksi aplikasi → sistem */}
      <div className="my-0.5 h-px bg-slate-100 dark:bg-slate-800/70" />

      {/* Ruang disk (volume output) — bar = % terpakai; label eksplisit dipakai/bebas */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <HardDrive className="w-3.5 h-3.5" />
            Disk
          </span>
          <span className="text-slate-700 dark:text-slate-200">
            Dipakai {diskUsedDisplay}
            <span className="text-slate-400 dark:text-slate-500"> / {diskTotalDisplay} GB</span>
            <span className="ml-1.5 text-violet-600 dark:text-violet-400">{diskUsedPct}%</span>
            <span className="text-slate-400 dark:text-slate-500"> · bebas {diskFreeDisplay} GB</span>
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-700 rounded-full"
            style={{ width: `${diskUsedPct}%` }}
          />
        </div>
      </div>

      {/* Jaringan sistem — kecepatan unduh/unggah nyata dari OS */}
      {(netRxBps > 0 || netTxBps > 0) && (
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Network className="w-3.5 h-3.5" />
            Jaringan
          </span>
          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200 tabular-nums">
            <span className="flex items-center gap-0.5">
              <ArrowDown className="w-3 h-3 text-sky-500" />
              {formatSpeed(netRxBps)}
            </span>
            <span className="flex items-center gap-0.5">
              <ArrowUp className="w-3 h-3 text-violet-500" />
              {formatSpeed(netTxBps)}
            </span>
          </span>
        </div>
      )}

      {/* Kecepatan unduh app aktif (kondisional — hanya saat mengunduh) */}
      {downloadSpeedBps > 0 && (
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Download className="w-3.5 h-3.5" />
            Unduh (App)
          </span>
          <span className="text-sky-600 dark:text-sky-400 font-semibold tabular-nums">{formatSpeed(downloadSpeedBps)}</span>
        </div>
      )}
    </div>
  )
}
