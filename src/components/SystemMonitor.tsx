import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

export default function SystemMonitor({ isProcessing }: { isProcessing: boolean }): React.ReactElement {
  const [cpu, setCpu] = useState(2)
  const [ram, setRam] = useState(400)

  useEffect(() => {
    const interval = setInterval(() => {
      if (isProcessing) {
        setCpu(Math.floor(Math.random() * 40) + 55) // 55% - 94%
        setRam(Math.floor(Math.random() * 200) + 800) // +800MB - 999MB
      } else {
        setCpu(Math.floor(Math.random() * 5) + 2) // 2% - 6%
        setRam(Math.floor(Math.random() * 50) + 400) // +400MB - 449MB
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [isProcessing])

  const ramDisplay = (2.4 + ram / 1000).toFixed(1)

  return (
    <div className="mx-4 mb-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3 transition-colors">
      <div className="flex items-center gap-2 mb-1 text-slate-600 dark:text-slate-300">
        <Activity className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">System</span>
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
            style={{ width: `${Math.min((parseFloat(ramDisplay) / 8) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
