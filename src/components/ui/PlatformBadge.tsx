import { cn } from '@lib/utils'
import { platformBadgeClass, platformIcon } from './platform-brand'

/**
 * Badge platform: ikon + label di dalam pill berwarna brand (latar lembut,
 * teks/ikon warna brand). Contoh: `[ikon TikTok] TikTok` dalam pill gelap.
 * Warna & ikon di-resolve dari `platform-brand` (lihat di sana untuk daftar).
 */
export function PlatformBadge({
  platform,
  className,
  iconClassName = 'h-3.5 w-3.5 shrink-0'
}: {
  platform: string
  className?: string
  iconClassName?: string
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1 rounded-full px-1.5 py-0.5',
        platformBadgeClass(platform),
        className
      )}
    >
      {platformIcon(platform, iconClassName)}
      <span className="truncate">{platform}</span>
    </span>
  )
}

