import { clearPersistedValue } from '../hooks/use-persistent-state'
import type { PresetType, ProcessingMode, QualityLevel, AudioMode } from './types'

/**
 * Preferensi pengguna yang dipersist ke localStorage (per instalasi).
 * Kunci diberi prefix `omni.` agar tidak bertabrakan dengan data lain.
 */
export const PREF_KEYS = {
  darkMode: 'omni.darkMode',
  preset: 'omni.preset',
  activeMenu: 'omni.activeMenu',
  downloaderMode: 'omni.downloaderMode',
  processingMode: 'omni.processingMode',
  cleanMetadata: 'omni.cleanMetadata',
  cleanerQuality: 'omni.cleanerQuality',
  cleanerAudio: 'omni.cleanerAudio',
  downloadMaxHeight: 'omni.download.maxHeight',
  downloadCookiesBrowser: 'omni.download.cookiesBrowser',
  downloadDouyinCookie: 'omni.download.douyinCookie',
  downloadParallel: 'omni.download.parallel',
  // Performa Kampanye (analisis Meta Ads vs Shopee Affiliate).
  campaignProfile: 'omni.campaign.profile',
  campaignMetaCsv: 'omni.campaign.metaCsv',
  campaignShopeeCsv: 'omni.campaign.shopeeCsv',
  campaignClicksCsv: 'omni.campaign.clicksCsv',
  campaignMappingRule: 'omni.campaign.mappingRule',
  campaignTaxRate: 'omni.campaign.taxRate',
  campaignStatuses: 'omni.campaign.statuses',
  campaignDateStart: 'omni.campaign.dateStart',
  campaignDateEnd: 'omni.campaign.dateEnd',
  campaignShowDashboard: 'omni.campaign.showDashboard',
  campaignDemoMode: 'omni.campaign.demoMode',
  campaignActiveWorkspace: 'omni.campaign.activeWorkspace'
} as const

/** Nilai default setiap preferensi (kembali ke ini saat reset). */
export const PREF_DEFAULTS = {
  darkMode: false,
  preset: 'fullhd' as PresetType,
  activeMenu: 'cleaner' as const,
  downloaderMode: 'links' as const,
  processingMode: 'enhance' as ProcessingMode,
  cleanMetadata: true,
  cleanerQuality: 'auto' as QualityLevel,
  cleanerAudio: 'original' as AudioMode,
  downloadMaxHeight: 0,
  downloadCookiesBrowser: '',
  downloadDouyinCookie: '',
  downloadParallel: false,
  campaignProfile: 'default',
  campaignMetaCsv: '',
  campaignShopeeCsv: '',
  campaignClicksCsv: '',
  campaignMappingRule: 'contains' as const,
  campaignTaxRate: 12,
  campaignStatuses: [],
  campaignDateStart: '',
  campaignDateEnd: '',
  campaignShowDashboard: false,
  campaignDemoMode: false,
  campaignActiveWorkspace: ''
} as const

/** Menghapus SEMUA preferensi tersimpan (kembali ke default pada render berikutnya). */
export function resetAllPreferences(): void {
  for (const key of Object.values(PREF_KEYS)) {
    clearPersistedValue(key)
  }
}
