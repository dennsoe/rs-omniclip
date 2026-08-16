import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import {
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle,
  Sparkles,
  BarChart3,
  Layers,
  Brain,
  Save,
  Upload,
  Download,
  Trash2,
  Settings,
  Users,
  FileSpreadsheet,
  ShoppingBag,
  FolderOpen,
  KeyRound,
  XCircle,
  Package,
  Database,
  RotateCcw,
} from 'lucide-react'
import { FloatingInput } from '@components/ui/FloatingField'
import FloatingSelect from '@components/ui/FloatingSelect'
import Tooltip from '@components/ui/Tooltip'
import {
  parseMetaAds,
  parseShopeeAffiliate,
  parseShopeeClicks,
  processAndMatchData,
  calculateDailyPerformance,
  filterByDateRange,
} from '@lib/campaign/dataProcessor'
import { DEMO_META_ADS_CSV, DEMO_SHOPEE_AFFILIATE_CSV, DEMO_SHOPEE_CLICKS_CSV } from '@lib/campaign/demoData'
import type {
  MetaAdRow,
  ShopeeAffiliateRow,
  ShopeeClickRow,
  CampaignWorkspaceSummary,
} from '@lib/campaign/types'
import { formatIDR } from '@lib/campaign/format'
import {
  listWorkspaces,
  loadWorkspace,
  saveWorkspace as storeSaveWorkspace,
  deleteWorkspace as storeDeleteWorkspace,
} from '@lib/campaign/workspaceStore'
import { usePersistentState } from '@hooks/use-persistent-state'
import { PREF_KEYS, PREF_DEFAULTS } from '@lib/preferences'
import DiagnosticsPanel from '@components/campaign/DiagnosticsPanel'
import CampaignMetrics from '@components/campaign/CampaignMetrics'
import CampaignTable from '@components/campaign/CampaignTable'
import CampaignCharts from '@components/campaign/CampaignCharts'
import UnmappedSection from '@components/campaign/UnmappedSection'
import CampaignDateRange from '@components/campaign/CampaignDateRange'
import AiAdvisor from '@components/campaign/AiAdvisor'

type Tab = 'overview' | 'campaigns' | 'unmapped' | 'ai'

/** Palet warna avatar workspace (berbeda per workspace agar mudah dikenali). */
const WS_AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
]

/**
 * Halaman "Performa Kampanye" — analisis Meta Ads vs komisi Shopee Affiliate.
 * Mengandung wizard unggah CSV (3 langkah) + dashboard lengkap. Gaya 100%
 * mengikuti design system rs-omni. Tanpa auth/login; AI via main process.
 */
export default function CampaignView({
  onToast,
}: {
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void
}) {
  // --- Preferensi terpersist (per instalasi) ---
  const [profileName, setProfileName] = usePersistentState<string>(PREF_KEYS.campaignProfile, PREF_DEFAULTS.campaignProfile)
  const [metaCsvText, setMetaCsvText] = usePersistentState<string>(PREF_KEYS.campaignMetaCsv, PREF_DEFAULTS.campaignMetaCsv)
  const [shopeeCsvText, setShopeeCsvText] = usePersistentState<string>(PREF_KEYS.campaignShopeeCsv, PREF_DEFAULTS.campaignShopeeCsv)
  const [shopeeClicksText, setShopeeClicksText] = usePersistentState<string>(PREF_KEYS.campaignClicksCsv, PREF_DEFAULTS.campaignClicksCsv)
  const [mappingRule, setMappingRule] = usePersistentState<'contains' | 'exact'>(PREF_KEYS.campaignMappingRule, PREF_DEFAULTS.campaignMappingRule)
  const [taxRate, setTaxRate] = usePersistentState<number>(PREF_KEYS.campaignTaxRate, PREF_DEFAULTS.campaignTaxRate)
  const [selectedStatuses, setSelectedStatuses] = usePersistentState<string[]>(PREF_KEYS.campaignStatuses, [])
  const [dateStart, setDateStart] = usePersistentState<string>(PREF_KEYS.campaignDateStart, PREF_DEFAULTS.campaignDateStart)
  const [dateEnd, setDateEnd] = usePersistentState<string>(PREF_KEYS.campaignDateEnd, PREF_DEFAULTS.campaignDateEnd)
  const [showDashboard, setShowDashboard] = usePersistentState<boolean>(PREF_KEYS.campaignShowDashboard, PREF_DEFAULTS.campaignShowDashboard)

  // --- State non-persisten ---
  const [metaAds, setMetaAds] = useState<MetaAdRow[]>([])
  const [shopeeOrders, setShopeeOrders] = useState<ShopeeAffiliateRow[]>([])
  const [shopeeClicks, setShopeeClicks] = useState<ShopeeClickRow[]>([])
  const [parsingError, setParsingError] = useState<string | null>(null)
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1)
  const [isDemoMode, setIsDemoMode] = usePersistentState<boolean>(PREF_KEYS.campaignDemoMode, PREF_DEFAULTS.campaignDemoMode)
  const [activeWorkspaceId, setActiveWorkspaceId] = usePersistentState<string>(PREF_KEYS.campaignActiveWorkspace, PREF_DEFAULTS.campaignActiveWorkspace)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [fileName, setFileName] = useState<{ meta: string; shopee: string; clicks: string }>({ meta: '', shopee: '', clicks: '' })

  // --- Workspace (localStorage store) + AI key + konfirmasi aksi ---
  const [workspaces, setWorkspaces] = useState<CampaignWorkspaceSummary[]>(() => listWorkspaces())
  const [workspaceName, setWorkspaceName] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini')
  const [confirm, setConfirm] = useState<{ type: 'deleteWorkspace' | 'clearData'; id?: string; name?: string } | null>(null)

  /** Nama workspace yang sedang aktif (dari id tersimpan) — untuk chip status toolbar. */
  const activeWorkspaceName = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId)?.name,
    [workspaces, activeWorkspaceId]
  )

  // --- Parse CSV saat teks berubah ---
  useEffect(() => {
    async function parseData() {
      if (!metaCsvText || !shopeeCsvText) return
      setParsingError(null)
      try {
        const parsedMeta = await parseMetaAds(metaCsvText)
        const parsedShopee = await parseShopeeAffiliate(shopeeCsvText)
        if (parsedMeta.length === 0) throw new Error('Laporan Meta Ads kosong atau formatnya tidak sesuai.')
        if (parsedShopee.length === 0) throw new Error('Laporan Shopee Affiliate kosong atau formatnya tidak sesuai.')
        setMetaAds(parsedMeta)
        setShopeeOrders(parsedShopee)
        if (shopeeClicksText) {
          setShopeeClicks(await parseShopeeClicks(shopeeClicksText))
        } else {
          setShopeeClicks([])
        }
      } catch (err) {
        console.error('Error parsing reports:', err)
        setParsingError(err instanceof Error ? err.message : 'Gagal mengurai file CSV. Periksa format file.')
      }
    }
    void parseData()
  }, [metaCsvText, shopeeCsvText, shopeeClicksText])

  // --- Default status pesanan (kecualikan Batal/Cancel/Refund) saat data baru ---
  useEffect(() => {
    if (shopeeOrders.length > 0 && selectedStatuses.length === 0) {
      const statuses = Array.from(new Set(shopeeOrders.map((o) => o.orderStatus).filter(Boolean)))
      const defaults = statuses.filter((s) => {
        const l = s.toLowerCase()
        return !l.includes('batal') && !l.includes('cancel') && !l.includes('refund') && !l.includes('tolak') && !l.includes('ditolak')
      })
      setSelectedStatuses(defaults.length > 0 ? defaults : statuses)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopeeOrders])

  // --- Muat pengaturan AI (provider + kedua kunci) saat mount ---
  useEffect(() => {
    if (window.api?.getAiSettings) {
      window.api
        .getAiSettings()
        .then((s) => {
          setAiProvider(s.provider)
          setGeminiKey(s.geminiKey)
          setOpenaiKey(s.openaiKey)
        })
        .catch(() => undefined)
    }
  }, [])

  // --- Tutup modal dengan Escape (pola kanonik modal aplikasi) ---
  useEffect(() => {
    if (!showSettings && !showWorkspace && !confirm) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false)
        setShowWorkspace(false)
        setConfirm(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSettings, showWorkspace, confirm])

  // --- Filter + perhitungan ---
  const filteredShopeeOrders = useMemo(
    () =>
      filterByDateRange(
        shopeeOrders.filter((o) => selectedStatuses.includes(o.orderStatus)),
        dateStart || null,
        dateEnd || null,
        'orderTime'
      ),
    [shopeeOrders, selectedStatuses, dateStart, dateEnd]
  )
  const filteredMetaAds = useMemo(
    () => filterByDateRange(metaAds, dateStart || null, dateEnd || null, 'date'),
    [metaAds, dateStart, dateEnd]
  )
  const filteredShopeeClicks = useMemo(
    () => filterByDateRange(shopeeClicks, dateStart || null, dateEnd || null, 'clickTime'),
    [shopeeClicks, dateStart, dateEnd]
  )

  const { mappedCampaigns, unmappedAds, unmappedOrders, totalMetrics: rawTotalMetrics } = useMemo(
    () => processAndMatchData(filteredMetaAds, filteredShopeeOrders, mappingRule, filteredShopeeClicks),
    [filteredMetaAds, filteredShopeeOrders, mappingRule, filteredShopeeClicks]
  )

  const totalMetrics = useMemo(() => {
    const taxAmount = rawTotalMetrics.totalSpend * (taxRate / 100)
    const totalSpendWithTax = rawTotalMetrics.totalSpend + taxAmount
    const netProfitWithTax = rawTotalMetrics.totalCommission - totalSpendWithTax
    const roiWithTax = totalSpendWithTax > 0 ? (rawTotalMetrics.totalCommission / totalSpendWithTax) * 100 : 0
    return { ...rawTotalMetrics, taxAmount, totalSpendWithTax, netProfitWithTax, roiWithTax }
  }, [rawTotalMetrics, taxRate])

  const dailyPerformance = useMemo(
    () => calculateDailyPerformance(filteredMetaAds, filteredShopeeOrders, filteredShopeeClicks),
    [filteredMetaAds, filteredShopeeOrders, filteredShopeeClicks]
  )

  const hasData = showDashboard && metaAds.length > 0 && shopeeOrders.length > 0

  // Kunci sumber data (berubah hanya saat CSV/parse berubah, bukan saat filter
  // status/tanggal diubah) — dipakai untuk auto-audit AI agar tidak memanggil
  // Gemini ulang pada tiap perubahan filter.
  const campaignSourceKey = useMemo(
    () => `${metaAds.length}|${shopeeOrders.length}|${metaCsvText.length}|${shopeeCsvText.length}`,
    [metaAds, shopeeOrders, metaCsvText, shopeeCsvText]
  )

  // --- Handler upload ---
  const readFile = (file: File, cb: (text: string) => void) => {
    const reader = new FileReader()
    reader.onload = (e) => cb((e.target?.result as string) ?? '')
    reader.readAsText(file)
  }
  const handleMetaUpload = (file: File) => {
    setIsDemoMode(false)
    setActiveWorkspaceId('')
    setFileName((f) => ({ ...f, meta: file.name }))
    readFile(file, (text) => {
      setMetaCsvText(text)
      setUploadStep(2)
    })
  }
  const handleShopeeUpload = (file: File) => {
    setIsDemoMode(false)
    setActiveWorkspaceId('')
    setFileName((f) => ({ ...f, shopee: file.name }))
    readFile(file, (text) => {
      setShopeeCsvText(text)
      setUploadStep(3)
    })
  }
  const handleClicksUpload = (file: File) => {
    setIsDemoMode(false)
    setActiveWorkspaceId('')
    setFileName((f) => ({ ...f, clicks: file.name }))
    readFile(file, (text) => setShopeeClicksText(text))
  }

  const loadDemoData = () => {
    setIsDemoMode(true)
    setActiveWorkspaceId('')
    setFileName({ meta: 'demo-meta-ads.csv', shopee: 'demo-shopee.csv', clicks: 'demo-clicks.csv' })
    setMetaCsvText(DEMO_META_ADS_CSV)
    setShopeeCsvText(DEMO_SHOPEE_AFFILIATE_CSV)
    setShopeeClicksText(DEMO_SHOPEE_CLICKS_CSV)
    setUploadStep(3)
    setShowDashboard(true)
    setActiveTab('overview')
  }

  const doClear = () => {
    setMetaCsvText('')
    setShopeeCsvText('')
    setShopeeClicksText('')
    setMetaAds([])
    setShopeeOrders([])
    setShopeeClicks([])
    setSelectedStatuses([])
    setIsDemoMode(false)
    setActiveWorkspaceId('')
    setParsingError(null)
    setUploadStep(1)
    setShowDashboard(false)
    setActiveTab('overview')
    setFileName({ meta: '', shopee: '', clicks: '' })
  }

  /** Tombol "Bersihkan Data" → buka modal validasi (bukan langsung membersihkan). */
  const handleClear = () => setConfirm({ type: 'clearData' })

  // --- Ekspor CSV hasil ---
  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Tag', 'Nama Iklan', 'Spend (IDR)', 'Klik Meta', 'Klik Shopee', 'Orders', 'Komisi (IDR)', 'ROI (%)', 'CPA (IDR)', 'CPC (IDR)', 'Konversi (%)'],
    ]
    mappedCampaigns.forEach((c) => {
      rows.push([
        c.matchedTag,
        c.adNames.join('; '),
        String(c.spend),
        String(c.clicks),
        String(c.shopeeClicksCount ?? 0),
        String(c.ordersCount),
        String(c.commission),
        c.roi.toFixed(1),
        String(c.cpa),
        String(c.cpc),
        c.conversionRate.toFixed(2),
      ])
    })
    rows.push([], ['RINGKASAN'])
    rows.push(['Total Spend', String(totalMetrics.totalSpend)])
    rows.push(['Total Komisi', String(totalMetrics.totalCommission)])
    rows.push(['Net Profit', String(totalMetrics.netProfit)])
    rows.push(['ROI', totalMetrics.roi.toFixed(1) + '%'])

    const bom = '\uFEFF'
    const csv = bom + rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metaxshopee_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Workspace: localStorage store (simpan / muat / hapus / ekspor / impor) ---
  const refreshWorkspaces = useCallback(() => {
    setWorkspaces(listWorkspaces())
  }, [])

  const handleSaveWorkspace = () => {
    const name = workspaceName.trim() || profileName || 'default'
    try {
      const res = storeSaveWorkspace({
        name,
        profileName,
        metaCsvText,
        shopeeCsvText,
        shopeeClicksText,
        settings: { mappingRule, taxRate, selectedStatuses, dateStart, dateEnd },
      })
      setWorkspaceName(name)
      setActiveWorkspaceId(res.id)
      setIsDemoMode(false)
      refreshWorkspaces()
      onToast?.(`Workspace "${name}" disimpan.`, 'success')
    } catch (err) {
      onToast?.(`Gagal menyimpan workspace: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }

  const handleLoadWorkspace = (id: string) => {
    const ws = loadWorkspace(id)
    if (!ws) {
      onToast?.('Workspace tidak ditemukan.', 'error')
      return
    }
    setProfileName(ws.profileName || 'default')
    setMetaCsvText(ws.metaCsvText || '')
    setShopeeCsvText(ws.shopeeCsvText || '')
    setShopeeClicksText(ws.shopeeClicksText || '')
    setMappingRule(ws.settings.mappingRule)
    setTaxRate(ws.settings.taxRate)
    setSelectedStatuses(ws.settings.selectedStatuses ?? [])
    setDateStart(ws.settings.dateStart ?? '')
    setDateEnd(ws.settings.dateEnd ?? '')
    setWorkspaceName(ws.name)
    setShowDashboard(true)
    setActiveTab('overview')
    setShowWorkspace(false)
    setIsDemoMode(false)
    setActiveWorkspaceId(ws.id)
    onToast?.(`Workspace "${ws.name}" dimuat.`, 'success')
  }

  /** Klik "Hapus" → buka modal validasi (bukan langsung menghapus). */
  const handleDeleteWorkspace = (id: string, name: string) => setConfirm({ type: 'deleteWorkspace', id, name })

  /** Konfirmasi modal validasi → eksekusi aksi yang dipilih. */
  const handleConfirm = () => {
    if (!confirm) return
    if (confirm.type === 'deleteWorkspace' && confirm.id) {
      storeDeleteWorkspace(confirm.id)
      refreshWorkspaces()
      onToast?.('Workspace dihapus.', 'success')
    } else if (confirm.type === 'clearData') {
      doClear()
    }
    setConfirm(null)
  }

  const handleExportWorkspace = (id?: string) => {
    const stored = id ? loadWorkspace(id) : null
    const ws = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profileName: stored?.profileName ?? profileName,
      metaCsvText: stored?.metaCsvText ?? metaCsvText,
      shopeeCsvText: stored?.shopeeCsvText ?? shopeeCsvText,
      shopeeClicksText: stored?.shopeeClicksText ?? shopeeClicksText,
      settings: stored?.settings ?? { mappingRule, taxRate, selectedStatuses, dateStart, dateEnd },
    }
    const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metaxshopee_${ws.profileName}_${new Date().toISOString().slice(0, 10)}.mxs9.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportWorkspace = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const ws = JSON.parse(text)
        if (!ws.metaCsvText && !ws.shopeeCsvText) throw new Error('File workspace tidak valid.')
        if (ws.profileName) setProfileName(ws.profileName)
        if (ws.metaCsvText) setMetaCsvText(ws.metaCsvText)
        if (ws.shopeeCsvText) setShopeeCsvText(ws.shopeeCsvText)
        if (ws.shopeeClicksText) setShopeeClicksText(ws.shopeeClicksText)
        if (ws.settings?.mappingRule) setMappingRule(ws.settings.mappingRule)
        if (ws.settings?.taxRate !== undefined) setTaxRate(ws.settings.taxRate)
        if (ws.settings?.selectedStatuses) setSelectedStatuses(ws.settings.selectedStatuses)
        if (ws.settings?.dateStart) setDateStart(ws.settings.dateStart)
        if (ws.settings?.dateEnd) setDateEnd(ws.settings.dateEnd)
        setUploadStep(3)
        setShowDashboard(true)
        setActiveTab('overview')
        setIsDemoMode(false)
        setActiveWorkspaceId('')
        onToast?.('Workspace berhasil diimpor.', 'success')
      } catch (err) {
        onToast?.(`Gagal mengimpor workspace: ${err instanceof Error ? err.message : String(err)}`, 'error')
      }
    }
    input.click()
  }

  const handleSaveAiSettings = async () => {
    if (!window.api?.setAiSettings) return
    const s = await window.api
      .setAiSettings({ provider: aiProvider, geminiKey, openaiKey })
      .catch(() => null)
    if (s) {
      setAiProvider(s.provider)
      setGeminiKey(s.geminiKey)
      setOpenaiKey(s.openaiKey)
    }
    onToast?.(
      `Pengaturan AI (${aiProvider === 'openai' ? 'OpenAI GPT' : 'Gemini'}) disimpan.`,
      'success'
    )
    setShowSettings(false)
  }

  const statusBreakdown = useMemo(() => {
    return shopeeOrders.reduce<Record<string, { count: number; commission: number }>>((acc, o) => {
      const s = o.orderStatus || 'Lainnya'
      if (!acc[s]) acc[s] = { count: 0, commission: 0 }
      acc[s].count += 1
      acc[s].commission += o.netAffiliateCommission
      return acc
    }, {})
  }, [shopeeOrders])

  // Modal pengaturan AI, profil & workspace — di-PORTAL ke body agar keluar dari
  // stacking context z-10 halaman (sidebar z-20 di root context mengecat DI ATAS
  // modal bila modal di dalam context z-10 → sidebar tidak terblur/teredup).
  // Dirender di wizard & dashboard (dulu hanya dashboard → tombol Settings di
  // wizard tidak menampilkan modal). Portal ke body = posisi di JSX bebas.
  const settingsModal = showSettings
    ? createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors"
          onClick={() => setShowSettings(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-lg w-full relative shadow-2xl transition-colors flex flex-col max-h-[85vh]"
          >
            {/* Header — pola kanonik modal aplikasi */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                <Settings className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">Pengaturan Performa Kampanye</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Profil & kunci AI.</p>
              </div>
              <Tooltip label="Tutup">
                <button type="button" onClick={() => setShowSettings(false)} aria-label="Tutup" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
              <FloatingInput
                label="Nama Profil"
                icon={<Users className="h-4 w-4" />}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value || 'default')}
                helper="Digunakan untuk menamai ekspor & workspace."
              />

              {/* Pilih provider AI (Gemini / OpenAI GPT) */}
              <FloatingSelect
                label="Provider AI"
                icon={<Brain className="h-4 w-4" />}
                value={aiProvider}
                options={[
                  { value: 'gemini', label: 'Google Gemini', description: 'gemini-3.5-flash' },
                  { value: 'openai', label: 'OpenAI GPT', description: 'gpt-4o-mini' },
                ]}
                onChange={(v) => setAiProvider(v === 'openai' ? 'openai' : 'gemini')}
                placeholder="Pilih AI…"
              />

              {/* Hanya tampilkan input kunci sesuai provider yang dipilih */}
              {aiProvider === 'openai' ? (
                <FloatingInput
                  label="Kunci OpenAI (GPT)"
                  icon={<KeyRound className="h-4 w-4" />}
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  helper="Kunci aktif untuk provider OpenAI."
                />
              ) : (
                <FloatingInput
                  label="Kunci Gemini"
                  icon={<KeyRound className="h-4 w-4" />}
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  helper="Kunci aktif untuk provider Gemini."
                />
              )}
            </div>

            {/* Footer aksi */}
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleSaveAiSettings()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
              >
                <Save className="h-3.5 w-3.5" /> Simpan
              </button>
            </div>
          </motion.div>
        </motion.div>,
        document.body,
      )
    : null

  // Modal Workspace — manajemen workspace (simpan/muat/hapus/ekspor/impor) via
  // localStorage. Portal ke body (z-70) agar menutupi sidebar & konsisten dgn modal lain.
  const workspaceModal = showWorkspace
    ? createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors"
          onClick={() => setShowWorkspace(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-lg w-full relative shadow-2xl transition-colors flex flex-col max-h-[85vh]"
          >
            {/* Header — pola kanonik modal aplikasi */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="p-2 bg-indigo-50 dark:bg-slate-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 transition-colors">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">Workspace Performa Kampanye</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Simpan & muat set data. Tersimpan di perangkat (localStorage).</p>
              </div>
              <Tooltip label="Tutup">
                <button type="button" onClick={() => setShowWorkspace(false)} aria-label="Tutup" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {/* Simpan workspace baru / perbarui */}
              <FloatingInput
                label="Nama Workspace"
                icon={<Save className="h-4 w-4" />}
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                helper="Menyimpan profil, laporan CSV, dan pengaturan saat ini. Nama sama = perbarui."
                action={
                  <button
                    type="button"
                    onClick={handleSaveWorkspace}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
                  >
                    <Save className="h-3.5 w-3.5" /> Simpan
                  </button>
                }
              />

              {/* Daftar workspace tersimpan */}
              <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Workspace Tersimpan ({workspaces.length})
                  </h4>
                  <Tooltip label="Impor dari file JSON">
                    <button
                      type="button"
                      onClick={handleImportWorkspace}
                      aria-label="Impor workspace"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-600/50 dark:hover:text-blue-400"
                    >
                      <Upload className="h-3 w-3" /> Impor
                    </button>
                  </Tooltip>
                </div>

                {workspaces.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    Belum ada workspace. Simpan state saat ini untuk mulai.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {workspaces.map((w, i) => (
                      <li key={w.id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                        {/* Avatar warna — berbeda per workspace agar mudah dikenali */}
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            WS_AVATAR_COLORS[i % WS_AVATAR_COLORS.length]
                          }`}
                        >
                          {w.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{w.name}</span>
                            {w.hasMeta && (
                              <span className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                                Meta
                              </span>
                            )}
                            {w.hasShopee && (
                              <span className="shrink-0 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400">
                                Shopee
                              </span>
                            )}
                            {w.hasClicks && (
                              <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                                Klik
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[10px] text-slate-400">
                            {w.profileName} ·{' '}
                            {new Date(w.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <Tooltip label="Muat workspace">
                          <button
                            type="button"
                            onClick={() => handleLoadWorkspace(w.id)}
                            aria-label={`Muat ${w.name}`}
                            className="rounded-md p-1.5 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip label="Ekspor JSON">
                          <button
                            type="button"
                            onClick={() => handleExportWorkspace(w.id)}
                            aria-label={`Ekspor ${w.name}`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip label="Hapus workspace">
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkspace(w.id, w.name)}
                            aria-label={`Hapus ${w.name}`}
                            className="rounded-md p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>,
        document.body,
      )
    : null

  // Modal validasi (confirm) — untuk aksi destruktif: hapus workspace & bersihkan data.
  const confirmDialog = confirm
    ? createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-80 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors"
          onClick={() => setConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-sm w-full relative shadow-2xl transition-colors flex flex-col"
          >
            {/* Header — pola kanonik modal aplikasi */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div
                className={`p-2 rounded-lg shrink-0 transition-colors ${
                  confirm.type === 'clearData'
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400'
                }`}
              >
                {confirm.type === 'clearData' ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                  {confirm.type === 'deleteWorkspace' ? 'Hapus Workspace?' : 'Bersihkan Data?'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {confirm.type === 'deleteWorkspace'
                    ? `Workspace "${confirm.name}" akan dihapus permanen.`
                    : 'Semua laporan akan dikosongkan dari tampilan. Preferensi & workspace tetap tersimpan.'}
                </p>
              </div>
              <Tooltip label="Tutup">
                <button type="button" onClick={() => setConfirm(null)} aria-label="Tutup" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Footer aksi */}
            <div className="flex justify-end gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition ${
                  confirm.type === 'clearData' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirm.type === 'deleteWorkspace' ? 'Hapus' : 'Bersihkan'}
              </button>
            </div>
          </motion.div>
        </motion.div>,
        document.body,
      )
    : null

  // ============================================================
  // RENDER
  // ============================================================
  if (!hasData) {
    return (
      <motion.div
        key="campaign-wizard"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col min-h-0 relative z-10"
      >
        <div className="relative z-10 pt-16 md:pt-8 px-4 sm:px-6 md:px-8 pb-4 flex-1 flex flex-col min-h-0">
          {/* Aksi (tanpa judul header) */}
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={loadDemoData}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              <Sparkles className="h-3.5 w-3.5" /> Coba Data Demo
            </button>
            <button
              type="button"
              onClick={() => setShowWorkspace(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              <Database className="h-4 w-4" /> Workspace
            </button>
            <ToolbarBtn title="Impor Workspace (JSON)" onClick={handleImportWorkspace}>
              <Upload className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Pengaturan AI, Profil & Workspace" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </ToolbarBtn>
          </div>

          {/* Konten scroll internal */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Panduan kolom */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <Info className="h-4 w-4 text-blue-500" /> Panduan Ekspor CSV
              </h3>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Pastikan kolom berikut ada agar file terbaca sempurna.
              </p>
              <div className="mt-4 space-y-3">
                <GuideCard badge="Laporan Meta Ads" badgeCls="bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <Code>Ad Name</Code>, <Code>Amount Spent</Code>, <Code>Link Clicks</Code>, <Code>Impressions</Code>.
                </GuideCard>
                <GuideCard badge="Laporan Shopee Affiliate" badgeCls="bg-orange-500/10 text-orange-600 border border-orange-500/20">
                  <Code>Tag Link 1</Code> (pencocokan nama iklan), <Code>Status Pesanan</Code>, <Code>Komisi Bersih Affiliate</Code>.
                </GuideCard>
                <GuideCard badge="Laporan Klik Shopee (Opsional)" badgeCls="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Code>Tag Link</Code>, <Code>Klik ID</Code>, <Code>Waktu Klik</Code>. Untuk efisiensi link.
                </GuideCard>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
              <HelpCircle className="h-4 w-4 text-blue-500" />
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Semua file diolah lokal di perangkat Anda.</p>
            </div>
          </div>

          {/* Wizard upload */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Proses &amp; Unggah CSV</h3>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Ikuti 3 tahapan berikut untuk menganalisis kecocokan data.</p>

              {parsingError && (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span className="font-medium">{parsingError}</span>
                </div>
              )}

              {/* Stepper */}
              <div className="mt-4 flex items-center border-b border-slate-100 pb-3 dark:border-slate-700">
                {([1, 2, 3] as const).map((step) => (
                  <StepItem
                    key={step}
                    step={step}
                    active={uploadStep === step}
                    done={step === 1 ? !!metaCsvText : step === 2 ? !!shopeeCsvText : !!shopeeClicksText}
                    label={step === 1 ? 'Meta Ads' : step === 2 ? 'Shopee Order' : 'Klik Shopee'}
                    onClick={() => setUploadStep(step)}
                  />
                ))}
              </div>

              <div className="mt-4">
                {uploadStep === 1 && (
                  <UploadBox
                    title="Langkah 1: Laporan Meta Ads"
                    required
                    desc="CSV dari Meta Ads Manager (nama iklan, klik, biaya)."
                    fileLabel={fileName.meta}
                    onPick={(f) => f && handleMetaUpload(f)}
                  />
                )}
                {uploadStep === 2 && (
                  <div className="space-y-3">
                    <UploadBox
                      title="Langkah 2: Laporan Shopee Affiliate"
                      required
                      desc="CSV Laporan Pesanan Shopee Affiliate (tag, status, komisi)."
                      fileLabel={fileName.shopee}
                      onPick={(f) => f && handleShopeeUpload(f)}
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setUploadStep(1)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Kembali
                      </button>
                    </div>
                  </div>
                )}
                {uploadStep === 3 && (
                  <div className="space-y-3">
                    <UploadBox
                      title="Langkah 3: Laporan Klik Shopee"
                      required={false}
                      desc="Opsional. CSV Laporan Klik (Tag Link, Klik ID, Waktu)."
                      fileLabel={fileName.clicks}
                      onPick={(f) => f && handleClicksUpload(f)}
                    />
                    <button
                      type="button"
                      onClick={() => setUploadStep(2)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Kembali
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tombol mulai */}
            {metaCsvText && shopeeCsvText && (
              <button
                type="button"
                onClick={() => setShowDashboard(true)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
              >
                <Sparkles className="h-4 w-4" /> Mulai Proses &amp; Analisis Kecocokan Data
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
      {settingsModal}
      {workspaceModal}
      {confirmDialog}
    </motion.div>
    )
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  return (
    <motion.div
      key="campaign-dashboard"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col min-h-0 relative z-10"
    >
      <div className="relative z-10 pt-16 md:pt-8 px-4 sm:px-6 md:px-8 pb-4 flex-1 flex flex-col min-h-0">
        {/* Aksi (tanpa judul header) */}
        <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
          {activeWorkspaceName ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Database className="h-3.5 w-3.5" /> {activeWorkspaceName}
            </span>
          ) : isDemoMode ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
              <Sparkles className="h-3.5 w-3.5" /> Mode Demo
            </span>
          ) : null}
          <CampaignDateRange dateStart={dateStart} dateEnd={dateEnd} onChange={(s, e) => { setDateStart(s); setDateEnd(e) }} onReset={() => { setDateStart(''); setDateEnd('') }} />
          <button
            type="button"
            onClick={() => setShowWorkspace(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            <Database className="h-4 w-4" /> Workspace
          </button>
          <ToolbarBtn title="Ekspor Hasil (CSV)" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Bersihkan Data" onClick={handleClear} danger>
            <Trash2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Pengaturan AI, Profil & Workspace" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </ToolbarBtn>
        </div>

        {/* Konten scroll internal */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4">
            {/* Panel diagnostik */}
      <DiagnosticsPanel metaAds={metaAds} shopeeOrders={shopeeOrders} mappingRule={mappingRule} shopeeClicks={shopeeClicks} />

      {/* Filter status pesanan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filter Status Pesanan Shopee</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Status yang dipilih dihitung ke Komisi, ROI, dan Analisis AI.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStatuses(Array.from(new Set(shopeeOrders.map((o) => o.orderStatus).filter(Boolean))))}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedStatuses(
                  Array.from(new Set(shopeeOrders.map((o) => o.orderStatus).filter(Boolean))).filter((s) => {
                    const l = s.toLowerCase()
                    return l.includes('selesai') || l.includes('complete') || l.includes('success')
                  })
                )
              }
              className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-emerald-600 transition hover:bg-emerald-50 dark:border-slate-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            >
              Selesai Saja
            </button>
          </div>
        </div>

        {/* Grid auto-fit: kartu status menyesuaikan lebar kontainer (isi penuh, tanpa
            kolom kosong) & membungkus rapi di semua ukuran layar — super responsive. */}
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5">
          {Object.entries(statusBreakdown).map(([status, data]) => {
            const isSelected = selectedStatuses.includes(status)
            return (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setSelectedStatuses(isSelected ? selectedStatuses.filter((s) => s !== status) : [...selectedStatuses, status])
                }
                className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 dark:border-blue-500/50 dark:bg-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-blue-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`min-w-0 truncate text-xs font-bold uppercase ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
                    {status}
                  </span>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="shrink-0 text-[10px] text-slate-400">{data.count} pesanan</span>
                  <span className="min-w-0 truncate font-mono text-xs font-extrabold text-slate-700 dark:text-slate-200">{formatIDR(data.commission)}</span>
                </div>
              </button>
            )
          })}
        </div>

        {selectedStatuses.length === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            Tidak ada status dipilih — komisi akan bernilai Rp 0. Pilih minimal satu status.
          </div>
        )}
      </div>

      {/* Mapping rule */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Aturan Pencocokan Data (Mapping Rule)</h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Cara sistem mengaitkan Ad Name dengan Tag Shopee Affiliate.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMappingRule('contains')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mappingRule === 'contains' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25' : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Cocok Sebagian (Contains) — Rekomendasi
          </button>
          <button
            type="button"
            onClick={() => setMappingRule('exact')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mappingRule === 'exact' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25' : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Cocok Persis (Exact)
          </button>
        </div>
      </div>

      {/* KPI */}
      <CampaignMetrics
        totalMetrics={totalMetrics}
        taxRate={taxRate}
        onTaxRateChange={setTaxRate}
        metaRows={filteredMetaAds}
        shopeeClicksCount={filteredShopeeClicks.length}
      />

      {/* Tab konten — STICKY (menempel di atas saat scroll, tepat di bawah header) */}
      <div className="sticky top-0 z-20 bg-slate-50/95 py-1 backdrop-blur-sm dark:bg-slate-900/95">
        <div className="relative flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
            {(
              [
                { id: 'overview', label: 'Ringkasan & Grafik', Icon: BarChart3 },
                { id: 'campaigns', label: `Kampanye (${mappedCampaigns.length})`, Icon: Layers },
                { id: 'unmapped', label: `Tidak Terpetakan (${unmappedAds.length + unmappedOrders.length})`, Icon: Package },
                { id: 'ai', label: 'Asisten AI', Icon: Brain },
              ] as const
            ).map(({ id, label, Icon }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
                    isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="campaign-tab-pill"
                      className="absolute inset-0 rounded-lg bg-blue-600 shadow-md shadow-blue-600/30"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10 whitespace-nowrap">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Konten tab — responsif: tinggi mengikuti isi (tanpa area kosong artifisial) */}
      <div className="min-h-0">
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-4">
              <CampaignCharts mappedCampaigns={mappedCampaigns} shopeeOrders={shopeeOrders} dailyPerformance={dailyPerformance} />
            </div>
          )}
          {activeTab === 'campaigns' && <CampaignTable campaigns={mappedCampaigns} />}
          {activeTab === 'unmapped' && <UnmappedSection unmappedAds={unmappedAds} unmappedOrders={unmappedOrders} />}
          {activeTab === 'ai' && (
            <AiAdvisor campaigns={mappedCampaigns} totalMetrics={totalMetrics} autoAuditKey={campaignSourceKey} aiProvider={aiProvider} />
          )}
        </div>
        </div>
      </div>
      </div>

      {settingsModal}
      {workspaceModal}
      {confirmDialog}
    </motion.div>
  )
}

// ============================================================
// Sub-komponen
// ============================================================

function GuideCard({
  badge,
  badgeCls,
  children,
}: {
  badge: string
  badgeCls: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeCls}`}>{badge}</span>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{children}</p>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
      {children}
    </code>
  )
}

function StepItem({
  step,
  active,
  done,
  label,
  onClick,
}: {
  step: number
  active: boolean
  done: boolean
  label: string
  onClick: () => void
}) {
  return (
    <>
      {step > 1 && <span className="mx-1 h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
      <button type="button" onClick={onClick} className="flex flex-1 cursor-pointer flex-col items-center gap-1.5">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
            done
              ? 'bg-emerald-500 text-white'
              : active
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
          }`}
        >
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
        </span>
        <span className={`text-[10px] uppercase tracking-wider ${active ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-slate-400'}`}>{label}</span>
      </button>
    </>
  )
}

function UploadBox({
  title,
  required,
  desc,
  fileLabel,
  onPick,
}: {
  title: string
  required: boolean
  desc: string
  fileLabel: string
  onPick: (file: File | null) => void
}) {
  const inputId = `campaign-upload-${title}`
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
            required
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          }`}
        >
          {required ? 'Wajib' : 'Opsional'}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{desc}</p>
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
          fileLabel
            ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/5'
            : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/5'
        }`}
      >
        <UploadCloud className={`mb-2 h-8 w-8 ${fileLabel ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {fileLabel || 'Pilih / seret file CSV'}
        </span>
        <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
          {fileLabel ? 'File siap — klik untuk ganti' : 'Mendukung format ekspor standar'}
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function ToolbarBtn({
  title,
  onClick,
  children,
  danger,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <Tooltip label={title}>
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all ${
          danger
            ? 'border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'
            : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-600/50 dark:hover:text-blue-400'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  )
}
