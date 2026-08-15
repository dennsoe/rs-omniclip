import { clearPersistedValue } from '../hooks/use-persistent-state'
import type { PresetType } from './types'

/**
 * Preferensi pengguna yang dipersist ke localStorage (per instalasi).
 * Kunci diberi prefix `omni.` agar tidak bertabrakan dengan data lain.
 */
export const PREF_KEYS = {
  darkMode: 'omni.darkMode',
  preset: 'omni.preset',
  activeMenu: 'omni.activeMenu',
  downloaderMode: 'omni.downloaderMode',
  cleanMetadata: 'omni.cleanMetadata',
  enhanceQuality: 'omni.enhanceQuality',
  downloadMaxHeight: 'omni.download.maxHeight',
  downloadCookiesBrowser: 'omni.download.cookiesBrowser',
  downloadDouyinCookie: 'omni.download.douyinCookie',
  downloadParallel: 'omni.download.parallel'
} as const

/** Nilai default setiap preferensi (kembali ke ini saat reset). */
export const PREF_DEFAULTS = {
  darkMode: false,
  preset: 'fullhd' as PresetType,
  activeMenu: 'cleaner' as const,
  downloaderMode: 'links' as const,
  cleanMetadata: true,
  enhanceQuality: true,
  downloadMaxHeight: 0,
  downloadCookiesBrowser: '',
  downloadDouyinCookie: '',
  downloadParallel: false
} as const

/** Menghapus SEMUA preferensi tersimpan (kembali ke default pada render berikutnya). */
export function resetAllPreferences(): void {
  for (const key of Object.values(PREF_KEYS)) {
    clearPersistedValue(key)
  }
}
