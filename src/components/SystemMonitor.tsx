import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

export default function SystemMonitor(): React.ReactElement {
  const [cpu, setCpu] = useState(0)
  const [ramUsedMb, setRamUsedMb] = useState(0)
  const [ramTotalMb, setRamTotalMb] = useState(0)

  // Statistik sistem NYATA dari proses utama (bukan simulasi).
  useEffect(() => {
    if (!window.api?.onSystemStats) return
    const off = window.api.onSystemStats((data) => {
      setCpu(data.cpu)
      setRamUsedMb(data.ramUsedMb)
      setRamTotalMb(data.ramTotalMb)
    })
    return off
  }, [])

  const ramPercent = ramTotalMb > 0 ? Math.min(100, Math.round((ramUsedMb / ramTotalMb) * 100)) : 0
  const ramDisplay = (ramUsedMb / 1024).toFixed(1)

  return (
    <div className="mx-4 mb-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3 transition-colors">
      <div className="mb-1 text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">System</span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Pemakaian Aplikasi</p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="text-slate-500 dark:text-slate-400">CPU</span>
          <span className={`transition-colors ${cpu > 80 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
            {cpu}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${cpu > 80 ? 'bg-rose-500' : 'bg-blue-500'}`}
            style={{ width: `${cpu}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="text-slate-500 dark:text-slate-400">RAM</span>
          <span className="text-slate-700 dark:text-slate-200">{ramDisplay} GB</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-1000 rounded-full"
            style={{ width: `${ramPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
