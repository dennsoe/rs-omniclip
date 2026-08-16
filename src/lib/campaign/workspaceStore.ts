import type { CampaignSettings, CampaignWorkspace, CampaignWorkspaceSummary } from './types'

/**
 * Penyimpanan workspace "Performa Kampanye" di localStorage (renderer).
 *
 * - Index ringkas (id/name/profil/waktu) disimpan di satu key; isi lengkap tiap
 *   workspace (termasuk CSV) disimpan di key terpisah per-id → menghindari
 *   menulis semua CSV ke satu key besar (risiko melampaui kuota localStorage).
 * - Semua akses dibungkus try/catch (aman di private/read-only mode).
 * - Bekerja di Electron maupun mode browser (konsisten dgn usePersistentState).
 */

const INDEX_KEY = 'rsomni.campaign.workspaces'
const wsKey = (id: string) => `rsomni.campaign.workspace.${id}`

interface WorkspaceIndexEntry {
  id: string
  name: string
  profileName: string
  updatedAt: string
  /** Penanda isi workspace — untuk label pengenalan cepat (Meta / Shopee / Klik). */
  hasMeta: boolean
  hasShopee: boolean
  hasClicks: boolean
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* abaikan */
  }
}

function readIndex(): WorkspaceIndexEntry[] {
  return readJSON<WorkspaceIndexEntry[]>(INDEX_KEY) ?? []
}

function writeIndex(list: WorkspaceIndexEntry[]): void {
  writeJSON(INDEX_KEY, list)
}

/** Daftar ringkasan workspace (tanpa isi CSV yang besar). */
export function listWorkspaces(): CampaignWorkspaceSummary[] {
  return readIndex().map((w) => ({ ...w }))
}

/** Muat satu workspace lengkap berdasarkan id. */
export function loadWorkspace(id: string): CampaignWorkspace | null {
  return readJSON<CampaignWorkspace>(wsKey(id))
}

export interface SaveWorkspaceInput {
  name: string
  profileName: string
  metaCsvText: string
  shopeeCsvText: string
  shopeeClicksText: string
  settings: CampaignSettings
}

/**
 * Simpan workspace. Bila sudah ada workspace dengan nama yang sama → perbarui
 * yang itu (id tetap); selain itu buat baru. Melempar Error bila localStorage
 * penuh / tidak tersedia sehingga panggilan bisa memberi tahu pengguna.
 */
export function saveWorkspace(input: SaveWorkspaceInput): { id: string; savedAt: string } {
  const savedAt = new Date().toISOString()
  const index = readIndex()
  const existing = index.find((w) => w.name.trim().toLowerCase() === input.name.trim().toLowerCase())
  const flags = {
    hasMeta: Boolean(input.metaCsvText.trim()),
    hasShopee: Boolean(input.shopeeCsvText.trim()),
    hasClicks: Boolean(input.shopeeClicksText.trim()),
  }

  if (existing) {
    const ws: CampaignWorkspace = {
      id: existing.id,
      name: input.name,
      profileName: input.profileName,
      metaCsvText: input.metaCsvText,
      shopeeCsvText: input.shopeeCsvText,
      shopeeClicksText: input.shopeeClicksText,
      settings: input.settings,
      updatedAt: savedAt,
    }
    if (!writeJSON(wsKey(existing.id), ws)) throw new Error('Penyimpanan lokal penuh — workspace tidak tersimpan.')
    writeIndex(
      index.map((w) =>
        w.id === existing.id
          ? { id: existing.id, name: input.name, profileName: input.profileName, updatedAt: savedAt, ...flags }
          : w
      )
    )
    return { id: existing.id, savedAt }
  }

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const ws: CampaignWorkspace = {
    id,
    name: input.name,
    profileName: input.profileName,
    metaCsvText: input.metaCsvText,
    shopeeCsvText: input.shopeeCsvText,
    shopeeClicksText: input.shopeeClicksText,
    settings: input.settings,
    updatedAt: savedAt,
  }
  if (!writeJSON(wsKey(id), ws)) throw new Error('Penyimpanan lokal penuh — workspace tidak tersimpan.')
  writeIndex([...index, { id, name: input.name, profileName: input.profileName, updatedAt: savedAt, ...flags }])
  return { id, savedAt }
}

/** Hapus workspace (data lengkap + entri index). */
export function deleteWorkspace(id: string): boolean {
  removeKey(wsKey(id))
  writeIndex(readIndex().filter((w) => w.id !== id))
  return true
}
