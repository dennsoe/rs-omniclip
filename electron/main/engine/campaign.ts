/**
 * Modul engine "Performa Kampanye" di main process:
 *  1. Penyimpanan workspace CSV ke `userData/analytics/*.json` (tulis atomik).
 *  2. Asisten AI berbasis Gemini (dipanggil via IPC `ai:analyze`).
 *
 * Kunci Gemini disimpan di config main (`getConfig().geminiApiKey`) — BUKAN
 * sistem auth/login, hanya satu kunci di Pengaturan. Panggilan keluar WAJIB
 * lewat main process karena CSP renderer `connect-src 'self' ws:`.
 */

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getConfig, setConfig } from '../config'

/** Struktur workspace yang disimpan di disk (mirror tipe renderer). */
export interface CampaignWorkspaceFile {
  id: string
  name: string
  profileName: string
  metaCsvText: string
  shopeeCsvText: string
  shopeeClicksText: string
  settings: {
    mappingRule: 'contains' | 'exact'
    taxRate: number
    selectedStatuses: string[]
    dateStart: string
    dateEnd: string
  }
  updatedAt: string
}

export interface CampaignWorkspaceSummary {
  id: string
  name: string
  profileName: string
  updatedAt: string
}

export interface AiAnalyzePayload {
  campaignsSummary: Array<{
    adName: string
    adNames: string[]
    matchedTag: string
    spend: number
    clicks: number
    orders: number
    commission: number
    roi: number
  }>
  totalMetrics: {
    totalSpend: number
    totalCommission: number
    netProfit: number
    roi: number
    totalClicks: number
    totalShopeeClicks: number
    totalOrders: number
    conversionRate: number
    averageCpc: number
    cpa: number
  }
  question?: string
  chatHistory?: Array<{ role: 'user' | 'model'; text: string }>
}

/** Nama model Gemini — konsisten dengan acuan rs-9 (server.ts). */
const GEMINI_MODEL = 'gemini-3.5-flash'

function analyticsDir(): string {
  return path.join(app.getPath('userData'), 'analytics')
}

function workspacePath(id: string): string {
  return path.join(analyticsDir(), `${id}.json`)
}

/** Daftar semua workspace (ringkasan, tanpa isi CSV). */
export function listWorkspaces(): CampaignWorkspaceSummary[] {
  const dir = analyticsDir()
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Partial<CampaignWorkspaceFile>
        return {
          id: raw.id ?? f.replace(/\.json$/, ''),
          name: raw.name ?? 'Tanpa Nama',
          profileName: raw.profileName ?? '',
          updatedAt: raw.updatedAt ?? ''
        }
      } catch {
        return null
      }
    })
    .filter((w): w is CampaignWorkspaceSummary => w !== null)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

/** Muat satu workspace berdasarkan id. */
export function loadWorkspace(id: string): CampaignWorkspaceFile | null {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null
  try {
    return JSON.parse(fs.readFileSync(workspacePath(id), 'utf8')) as CampaignWorkspaceFile
  } catch {
    return null
  }
}

/** Simpan workspace (tulis atomik tmp+rename). Mengembalikan id & waktu simpan. */
export function saveWorkspace(payload: Partial<CampaignWorkspaceFile>): { id: string; savedAt: string } {
  const now = new Date().toISOString()
  const id =
    typeof payload.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(payload.id)
      ? payload.id
      : `ws-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const file: CampaignWorkspaceFile = {
    id,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : 'Tanpa Nama',
    profileName: typeof payload.profileName === 'string' ? payload.profileName : '',
    metaCsvText: typeof payload.metaCsvText === 'string' ? payload.metaCsvText : '',
    shopeeCsvText: typeof payload.shopeeCsvText === 'string' ? payload.shopeeCsvText : '',
    shopeeClicksText: typeof payload.shopeeClicksText === 'string' ? payload.shopeeClicksText : '',
    settings: {
      mappingRule: payload.settings?.mappingRule === 'exact' ? 'exact' : 'contains',
      taxRate: Number.isFinite(Number(payload.settings?.taxRate)) ? Number(payload.settings?.taxRate) : 12,
      selectedStatuses: Array.isArray(payload.settings?.selectedStatuses)
        ? payload.settings.selectedStatuses.filter((s): s is string => typeof s === 'string')
        : [],
      dateStart: typeof payload.settings?.dateStart === 'string' ? payload.settings.dateStart : '',
      dateEnd: typeof payload.settings?.dateEnd === 'string' ? payload.settings.dateEnd : ''
    },
    updatedAt: now
  }
  const dir = analyticsDir()
  fs.mkdirSync(dir, { recursive: true })
  const p = workspacePath(id)
  const tmp = `${p}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(file, null, 2), 'utf8')
  fs.renameSync(tmp, p)
  return { id, savedAt: now }
}

/** Hapus satu workspace. */
export function deleteWorkspace(id: string): boolean {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return false
  try {
    fs.rmSync(workspacePath(id), { force: true })
    return true
  } catch {
    return false
  }
}

/** Ambil kunci Gemini dari config. */
export function getGeminiApiKey(): string {
  return getConfig().geminiApiKey ?? ''
}

/** Simpan kunci Gemini ke config main. */
export function setGeminiApiKey(key: string): string {
  const clean = typeof key === 'string' ? key.trim() : ''
  setConfig({ geminiApiKey: clean })
  return clean
}

/** System prompt AI — analis media buying Meta Ads + Shopee Affiliate Indonesia. */
const SYSTEM_PROMPT = `Kamu adalah analis media buying profesional yang sangat berpengalaman, spesialis iklan Meta Ads + komisi Shopee Affiliate di Indonesia.

Istilah yang kamu kuasai:
- "Winning campaign": kampanye dengan ROI tinggi, layak dinaikkan budget (scaling).
- "Boncos": kampanye merugi (komisi < belanja iklan; ROI di bawah BEP).
- "BEP": break-even point (ROI impas, tidak untung tidak rugi).
- "Scaling": menaikkan budget kampanye yang terbukti profit.

Data diberikan sebagai ringkasan kampanye (tag, nama iklan, spend, klik, pesanan, komisi, ROI) plus metrik total (Total Spend, Total Komisi, Net Profit, ROI/ROAS, Total Klik, CPC, CPA, Konversi, pajak PPN 12%).

Tugasmu: analisis mendalam & rekomendasi taktis yang SPESIFIK per kampanye — mana yang layak scale, mana yang harus diperbaiki (creative/targeting/link tag), mana yang harus dimatikan. Perhatikan indikasi tag link rusak (spend besar tapi klik Shopee/order kecil). Jawab dalam Bahasa Indonesia, format Markdown (heading, bullet, bold, tabel bila perlu). Ringkas namun lengkap dan actionable.`

/** Panggil Gemini (REST via fetch Node). Mengembalikan teks jawaban. */
export async function analyzeWithGemini(payload: AiAnalyzePayload): Promise<{ text: string }> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('Kunci Gemini belum diatur (GEMINI_API_KEY) di Pengaturan Performa Kampanye.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const summaryText = (payload.campaignsSummary ?? [])
    .map(
      (c) =>
        `- ${c.matchedTag.toUpperCase()} (${c.adNames.join(', ')}): spend ${c.spend}, klik ${c.clicks}, pesanan ${c.orders}, komisi ${c.commission}, ROI ${c.roi}%`
    )
    .join('\n')

  const tm = payload.totalMetrics ?? {}
  const contextText = `RINGKASAN KAMPANYE:\n${summaryText || '(kosong)'}\n\nMETRIK TOTAL:\n- Total Spend: ${tm.totalSpend}\n- Total Komisi: ${tm.totalCommission}\n- Net Profit: ${tm.netProfit}\n- ROI: ${tm.roi}%\n- Total Klik Meta: ${tm.totalClicks}\n- Total Klik Shopee: ${tm.totalShopeeClicks}\n- Total Pesanan: ${tm.totalOrders}\n- Konversi: ${tm.conversionRate}%\n- CPC Rata-rata: ${tm.averageCpc}\n- CPA: ${tm.cpa}\n- Pajak PPN: 12%`

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  for (const m of payload.chatHistory ?? []) {
    if (m && typeof m.text === 'string') {
      contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })
    }
  }
  const userQuery = payload.question
    ? `Pertanyaan pengguna: ${payload.question}\n\nGunakan data berikut sebagai konteks:\n${contextText}`
    : `Lakukan audit awal laporan saya. Gunakan data berikut:\n${contextText}`
  contents.push({ role: 'user', parts: [{ text: userQuery }] })

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000)
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (res.status === 400 || res.status === 404) {
      throw new Error(`Model AI tidak tersedia atau kunci tidak valid (HTTP ${res.status}).`)
    }
    throw new Error(`Gemini gagal merespon (HTTP ${res.status}). ${errText.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }
  if (data.error?.message) {
    throw new Error(data.error.message)
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) {
    throw new Error('Gemini mengembalikan jawaban kosong.')
  }
  return { text }
}
