import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Brain, Send, Sparkles, RefreshCw, AlertCircle, KeyRound, X, MessageSquare, Maximize2, Minimize2, Trash2 } from 'lucide-react'
import type { MappedCampaign, TotalMetrics, ChatMessage } from '@lib/campaign/types'
import Markdown from '@components/Markdown'
import { FloatingInput } from '@components/ui/FloatingField'
import Tooltip from '@components/ui/Tooltip'
import { usePersistentState } from '@hooks/use-persistent-state'
import { PREF_KEYS } from '@lib/preferences'

/** Pertanyaan cepat yang disarankan. */
const SUGGESTIONS = [
  { label: 'Cari Kampanye Winning', query: 'Analisis kampanye paling menguntungkan (winning) dan kenapa performanya bagus?' },
  { label: 'Solusi Kampanye Boncos', query: 'Sebutkan kampanye yang paling boncos (rugi) dan berikan saran optimasinya.' },
  { label: 'Cek Link / Tag Rusak', query: 'Apakah ada indikasi tag link affiliate rusak atau spend iklan yang tidak ter-track? Sebutkan nama iklannya.' },
  { label: 'Cara Naikkan Komisi', query: 'Bagaimana strategi scaling budget dan alokasi anggaran terbaik untuk memaksimalkan ROI komisi saya?' },
]

/**
 * Asisten AI Media Buying — BUBBLE CHAT mengambang (bukan tab).
 * - FAB (tombol mengambang kanan-bawah) membuka/menutup panel chat; bisa
 *   diperluas menjadi LAYAR PENUH (full 1 halaman).
 * - Dirender via PORTAL ke body (z-50) agar selalu di atas konten & bebas dari
 *   jebakan stacking context (ancestor bertransform pada shell halaman).
 * - Tampilan mengikuti tema aplikasi (pola kanonik modal + FloatingInput),
 *   TANPA avatar/ikon bot & user di pesan.
 * - Percakapan DISIMPAN ke localStorage (key omni.campaign.ai.chat) & bisa
 *   dihapus riwayatnya.
 * - Bisa memakai Gemini atau OpenAI GPT (provider dipilih di Pengaturan).
 */

/** Format waktu tampilan — toleran terhadap Date asli maupun string ISO dari JSON localStorage. */
function formatTime(ts: unknown): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts instanceof Date ? ts : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function AiAdvisor({
  campaigns,
  totalMetrics,
  autoAuditKey,
  aiProvider = 'gemini',
}: {
  campaigns: MappedCampaign[]
  totalMetrics: TotalMetrics
  /** Kunci sumber data — audit otomatis hanya dijalankan saat data berubah (bukan tiap filter). */
  autoAuditKey?: string
  /** Provider AI yang dipilih user: 'gemini' | 'openai'. */
  aiProvider?: 'gemini' | 'openai'
}) {
  const [open, setOpen] = useState(false)
  /** Layar penuh (full 1 halaman) vs panel mengambang kompak. */
  const [maximized, setMaximized] = useState(false)
  // Percakapan DIPERSIST ke localStorage (key omni.campaign.ai.chat) —
  // otomatis tersimpan tiap perubahan & dihapus saat dikosongkan.
  const [messages, setMessages] = usePersistentState<ChatMessage[]>(PREF_KEYS.campaignAiChat, [])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noApi, setNoApi] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  /** Key data terakhir yang sudah diaudit — cegah audit berulang tiap buka chat. */
  const lastAuditedKey = useRef<string | null>(null)

  const summaryPayload = () =>
    campaigns.map((c) => ({
      adName: c.adName,
      adNames: c.adNames,
      matchedTag: c.matchedTag,
      spend: c.spend,
      clicks: c.clicks,
      orders: c.ordersCount,
      commission: c.commission,
      roi: c.roi,
    }))

  // Auto audit hanya saat chat DIBUKA dan SUMBER data berubah (autoAuditKey),
  // agar tidak membuang pemakaian API saat chat tertutup. Tiap key hanya 1x.
  // Bila sudah ada percakapan tersimpan (mis. setelah reload), tidak auto-audit ulang.
  useEffect(() => {
    if (!open || campaigns.length === 0 || !autoAuditKey) return
    if (lastAuditedKey.current === autoAuditKey) return
    if (messages.length > 0) {
      lastAuditedKey.current = autoAuditKey
      return
    }
    lastAuditedKey.current = autoAuditKey
    void runAnalyze()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoAuditKey, messages.length])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function runAnalyze(question?: string) {
    if (campaigns.length === 0) return
    setIsLoading(true)
    setError(null)
    setNoApi(false)

    if (question) {
      const userMsg: ChatMessage = { role: 'user', text: question, timestamp: new Date() }
      setMessages((prev) => [...prev, userMsg])
    }

    try {
      const chatHistory = question ? messages.map((m) => ({ role: m.role, text: m.text })) : []
      const res = await window.api?.aiAnalyze({
        campaignsSummary: summaryPayload(),
        totalMetrics,
        question,
        chatHistory,
      })
      if (!res || !res.text) {
        throw new Error('Asisten AI tidak merespon.')
      }
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: res.text, timestamp: new Date() },
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/API key|kunci|GEMINI|OPENAI|ai:analyze|belum diatur/i.test(msg)) {
        setNoApi(true)
        setError(
          `Kunci ${aiProvider === 'openai' ? 'OpenAI (GPT)' : 'Gemini'} belum diatur di Pengaturan Performa Kampanye.`
        )
      } else {
        setError(`Gagal berkomunikasi dengan AI: ${msg}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading || campaigns.length === 0) return
    const q = inputMessage.trim()
    setInputMessage('')
    void runAnalyze(q)
  }

  /** Hapus riwayat percakapan dari localStorage (2 langkah konfirmasi). */
  const handleClearHistory = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      window.setTimeout(() => setConfirmClear(false), 2500)
      return
    }
    setConfirmClear(false)
    // lastAuditedKey TIDAK di-reset → setelah hapus, chat bersih TANPA auto-audit
    // ulang otomatis (hindari panggilan API tak terduga); user bisa klik Muat Ulang.
    setMessages([]) // [] === default → key otomatis dihapus dari localStorage
  }

  return createPortal(
    <>
      {/* FAB — buka/tutup bubble chat (sembunyi saat layar penuh) */}
      {!maximized && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Tutup Asisten AI' : 'Buka Asisten AI'}
          title={open ? 'Tutup Asisten AI' : 'Buka Asisten AI'}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95"
        >
          {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </button>
      )}

      {/* Panel chat — kompak (mengambang) atau LAYAR PENUH (full 1 halaman) */}
      {open && (
        <div
          className={`fixed z-50 flex flex-col overflow-hidden bg-white dark:bg-slate-800 ${
            maximized
              ? 'inset-0 rounded-none'
              : 'bottom-24 right-6 h-[min(640px,calc(100dvh-9rem))] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-slate-200 shadow-2xl dark:border-slate-700'
          }`}
        >
          {/* Header — pola kanonik modal aplikasi */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Brain className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">AI Media Buying Analyst</h3>
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                {aiProvider === 'openai' ? 'OpenAI GPT Active' : 'Gemini Active'} · Spesialis Optimasi ROI
              </p>
            </div>
            <Tooltip label={maximized ? 'Kecilkan' : 'Layar Penuh'}>
              <button
                type="button"
                onClick={() => setMaximized((v) => !v)}
                aria-label={maximized ? 'Kecilkan' : 'Layar Penuh'}
                title={maximized ? 'Kecilkan' : 'Layar Penuh'}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </Tooltip>
            <Tooltip label="Muat ulang audit utama">
              <button
                type="button"
                onClick={() => void runAnalyze()}
                disabled={isLoading || campaigns.length === 0}
                aria-label="Muat ulang audit utama"
                title="Muat ulang audit utama"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </Tooltip>
            <Tooltip label={confirmClear ? 'Yakin hapus riwayat?' : 'Hapus riwayat'}>
              <button
                type="button"
                onClick={handleClearHistory}
                aria-label="Hapus riwayat percakapan"
                title="Hapus riwayat percakapan"
                className={`rounded-lg p-1.5 transition ${
                  confirmClear
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip label="Tutup">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setMaximized(false)
                }}
                aria-label="Tutup"
                title="Tutup"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>

          {/* Saran cepat (chip) saat belum ada pesan */}
          {campaigns.length > 0 && messages.length === 0 && !isLoading && (
            <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2 dark:border-slate-700">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void runAnalyze(s.query)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                >
                  <Sparkles className="h-3 w-3" /> {s.label}
                </button>
              ))}
            </div>
          )}

        {/* Area pesan — tanpa avatar/ikon bot & user */}
        <div className={`min-h-0 flex-1 overflow-y-auto ${maximized ? 'mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6' : 'space-y-4 px-3 py-3'}`}>
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400 dark:text-slate-500">
              <p className="text-xs font-medium">
                {campaigns.length === 0
                  ? 'Unggah laporan Meta Ads & Shopee dulu untuk memulai.'
                  : 'Percakapan kosong — klik saran di atas atau tanyakan hal spesifik.'}
              </p>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user'
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'rounded-tr-none bg-blue-600 text-white'
                      : 'rounded-tl-none border border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-200'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-xs">{m.text}</p>
                  ) : (
                    <div className="text-xs">
                      <Markdown>{m.text}</Markdown>
                    </div>
                  )}
                  <span className="mt-1 block text-right text-[9px] opacity-60">{formatTime(m.timestamp)}</span>
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-slate-400">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
              </span>
              Asisten AI sedang menganalisis ROI Anda...
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <span className="font-semibold">{noApi ? 'Kunci AI belum diatur' : 'Terjadi kesalahan'}:</span>
                <p className="mt-0.5">{error}</p>
                {noApi && (
                  <p className="mt-1">
                    Atur <strong>{aiProvider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'}</strong> melalui menu <strong>Performa Kampanye → Pengaturan</strong> (disimpan aman di perangkat,
                    tanpa login). Sementara itu, seluruh analisis tabel/grafik tetap berfungsi.
                  </p>
                )}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className={`shrink-0 border-t border-slate-100 dark:border-slate-700 ${
            maximized ? 'mx-auto w-full max-w-3xl px-4 py-4 sm:px-6' : 'px-3 py-3'
          }`}
        >
          <FloatingInput
            label="Tulis pesan…"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading || campaigns.length === 0}
            action={
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim() || campaigns.length === 0}
                aria-label="Kirim"
                title="Kirim"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Kirim
              </button>
            }
          />
        </form>

        <div
          className={`flex shrink-0 items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500 ${
            maximized ? 'justify-center' : ''
          }`}
        >
          <KeyRound className="h-3 w-3" /> Analisis AI berjalan via aplikasi; data CSV tidak dikirim ke server kecuali untuk permintaan AI ini.
        </div>
        </div>
      )}
    </>,
    document.body
  )
}
