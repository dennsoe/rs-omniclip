import { createElement } from 'react'
import { Youtube, Instagram, Facebook, Twitter, Chrome, Video } from 'lucide-react'
import { TikTokIcon, EdgeIcon, SafariIcon, FirefoxIcon, BraveIcon } from './brand-icons'
import type { ReactElement } from 'react'

/**
 * Util ikon & warna brand per platform/browser (dipakai PlatformBadge dan
 * opsi "Cookies Browser"). Dipisah dari komponen agar aman untuk fast-refresh.
 *
 * - TikTok/Edge/Safari/Firefox/Brave: SVG akurat (simple-icons).
 * - Douyin: logo identik dengan TikTok (aplikasi saudara ByteDance) → pakai
 *   glyph TikTokIcon yang sama, dibedakan dengan warna cyan khas Douyin.
 * - YouTube/Instagram/Facebook/X: ikon lucide bawaan.
 */

/**
 * Kelas badge platform (pill): latar lembut + teks/ikon warna brand.
 * Mencakup light & dark mode. Dipakai PlatformBadge.
 */
const PLATFORM_BADGE: Record<string, string> = {
  TikTok: 'bg-slate-100 text-slate-900 dark:bg-slate-700/60 dark:text-slate-100',
  Douyin: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  YouTube: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  Instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  Facebook: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'X / Twitter': 'bg-slate-100 text-slate-900 dark:bg-slate-700/60 dark:text-slate-100',
  Video: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
}

const BROWSER_COLORS: Record<string, string> = {
  Chrome: 'text-[#4285F4]',
  Edge: 'text-[#0078D7]',
  Safari: 'text-[#0AA5EB]',
  Firefox: 'text-[#FF7139]',
  Brave: 'text-[#FB542B]'
}

/** Kelas badge platform (latar + warna brand) untuk pill PlatformBadge. */
export function platformBadgeClass(platform: string): string {
  return PLATFORM_BADGE[platform] ?? PLATFORM_BADGE.Video
}

/** Elemen ikon (fill=currentColor) untuk nama platform. */
export function platformIcon(platform: string, cls = 'h-3.5 w-3.5 shrink-0'): ReactElement {
  switch (platform) {
    case 'TikTok':
    case 'Douyin':
      // Logo Douyin identik dengan TikTok → glyph yang sama, warna dibedakan.
      return createElement(TikTokIcon, { className: cls })
    case 'YouTube':
      return createElement(Youtube, { className: cls })
    case 'Instagram':
      return createElement(Instagram, { className: cls })
    case 'Facebook':
      return createElement(Facebook, { className: cls })
    case 'X / Twitter':
      return createElement(Twitter, { className: cls })
    default:
      return createElement(Video, { className: cls })
  }
}

/** Warna untuk opsi "Cookies Browser" (Chrome/Edge/Safari/Firefox/Brave). */
export function browserColorClass(name: string): string {
  return BROWSER_COLORS[name] ?? 'text-slate-400 dark:text-slate-500'
}

/** Ikon browser (16px) untuk opsi "Cookies Browser". */
export function browserIcon(name: string): ReactElement {
  const cls = 'h-4 w-4 shrink-0'
  switch (name) {
    case 'Chrome':
      return createElement(Chrome, { className: cls })
    case 'Edge':
      return createElement(EdgeIcon, { className: cls })
    case 'Safari':
      return createElement(SafariIcon, { className: cls })
    case 'Firefox':
      return createElement(FirefoxIcon, { className: cls })
    case 'Brave':
      return createElement(BraveIcon, { className: cls })
    default:
      return createElement(Chrome, { className: cls })
  }
}
