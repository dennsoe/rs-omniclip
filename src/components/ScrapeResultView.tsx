import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Check, Play, Clock, Image as ImageIcon, SearchX } from 'lucide-react'
import type { ScrapeItem } from '@lib/types'
import { formatDuration, guessPlatform } from '@lib/utils'
import { cn } from '@lib/utils'

interface ScrapeResultViewProps {
  items: ScrapeItem[]
  view: 'grid' | 'list'
  /** Peta url → terpilih. */
  selected: Record<string, boolean>
  /** Peta url → URL thumbnail (hasil resolve lazy). */
  thumbs: Record<string, string>
  onToggle: (url: string) => void
  onPreview: (item: ScrapeItem) => void
  /** Dipanggil saat kartu terlihat & thumbnailnya belum ada → resolve lazy. */
  onThumbVisible?: (url: string) => void
}

/** Thumbnail + badge durasi + overlay play (dipakai kartu grid & baris list).
 *  Overlay play DI-CENTER tepat di dalam area video (aspect-video) — bukan
 *  seluruh kartu (yang mencakup judul di bawah) agar posisinya presisi. */
function Thumb({
  item,
  src,
  showPlay = false
}: {
  item: ScrapeItem
  src?: string
  showPlay?: boolean
}): React.ReactElement {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
        </div>
      )}
      {item.duration != null && item.duration > 0 && (
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
          <Clock className="h-3 w-3" />
          {formatDuration(item.duration)}
        </span>
      )}
      {showPlay && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg">
            <Play className="ml-0.5 h-4 w-4" />
          </span>
        </span>
      )}
    </div>
  )
}

/** Kotak centang kecil (toggle seleksi tanpa membuka preview). */
function CheckBox({
  checked,
  onToggle
}: {
  checked: boolean
  onToggle: () => void
}): React.ReactElement {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      tabIndex={-1}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
        checked
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-300 bg-black/25 text-transparent dark:border-slate-600'
      )}
    >
      <Check className="h-3.5 w-3.5" />
    </span>
  )
}

/**
 * Hasil scrape akun/halaman dalam dua tampilan: GRID (kartu) atau LIST (baris),
 * dengan thumbnail (resolve lazy saat terlihat), badge durasi, kotak centang,
 * dan klik → modal preview. Tanpa AnimatePresence (pola proyek).
 *
 * Resolve thumbnail LAZY: IntersectionObserver memantau kartu ber-`data-url`;
 * saat kartu masuk viewport (rootMargin 300px) dan thumbnail-nya belum ada,
 * `onThumbVisible(url)` dipanggil → App meresolve via IPC. Ini mencegah puluhan
 * panggilan TikWM sekaligus (rate-limit) untuk daftar besar.
 */
export default function ScrapeResultView({
  items,
  view,
  selected,
  thumbs,
  onToggle,
  onPreview,
  onThumbVisible
}: ScrapeResultViewProps): React.ReactElement {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onThumbVisible) return
    const root = rootRef.current
    if (!root) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const url = (e.target as HTMLElement).dataset.url
            if (url) onThumbVisible(url)
          }
        }
      },
      { rootMargin: '300px 0px' }
    )
    const cards = root.querySelectorAll('[data-url]')
    cards.forEach((c) => obs.observe(c))
    return () => obs.disconnect()
  }, [onThumbVisible, items])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-10 text-slate-400 dark:text-slate-500">
        <SearchX className="h-6 w-6" />
        <p className="text-xs">Tidak ada video yang cocok dengan pencarian.</p>
      </div>
    )
  }

  if (view === 'grid') {
    return (
      <div
        ref={rootRef}
        className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {items.map((item) => (
          <motion.button
            key={item.url}
            type="button"
            data-url={item.url}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(item.index * 0.02, 0.3), duration: 0.25 }}
            onClick={() => onPreview(item)}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-700"
          >
            <span className="absolute left-2 top-2 z-10">
              <CheckBox checked={!!selected[item.url]} onToggle={() => onToggle(item.url)} />
            </span>
            <Thumb item={item} src={thumbs[item.url] ?? item.thumbnail} showPlay />
            <div className="flex flex-1 flex-col gap-0.5 p-2.5">
              <p className="line-clamp-2 text-xs font-medium leading-snug text-slate-700 dark:text-slate-200">
                {item.title}
              </p>
              <p className="mt-auto text-[10px] text-slate-400 dark:text-slate-500">
                {guessPlatform(item.url)}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      {items.map((item) => (
        <motion.button
          key={item.url}
          type="button"
          data-url={item.url}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(item.index * 0.01, 0.3), duration: 0.2 }}
          onClick={() => onPreview(item)}
          className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 pr-3 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-700"
        >
          <div className="w-24 shrink-0 min-[480px]:w-28 sm:w-32">
            <Thumb item={item} src={thumbs[item.url] ?? item.thumbnail} showPlay />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400">{item.title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              {guessPlatform(item.url)}
              {item.duration != null && item.duration > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Clock className="h-3 w-3" />
                    {formatDuration(item.duration)}
                  </span>
                </>
              )}
            </p>
          </div>
          <CheckBox checked={!!selected[item.url]} onToggle={() => onToggle(item.url)} />
        </motion.button>
      ))}
    </div>
  )
}
