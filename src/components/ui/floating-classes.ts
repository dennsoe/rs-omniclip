import { clsx } from 'clsx'

/** Kelas shell field (outlined) sesuai status — dipakai semua floating field. */
export function fieldShell({ error, active }: { error?: string; active: boolean }): string {
  return clsx(
    'relative rounded-xl border bg-white transition-all duration-200 dark:bg-slate-900',
    error
      ? 'border-rose-400 shadow-[0_0_0_3px_rgba(244,63,94,0.10)] dark:border-rose-500/60'
      : active
        ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_12px_32px_-12px_rgba(59,130,246,0.45)] dark:border-blue-400'
        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
  )
}

/** Warna ikon kiri: biru saat field aktif, netral saat idle. */
export function iconCls(active: boolean): string {
  return clsx(
    'shrink-0 transition-colors duration-200',
    active ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
  )
}
