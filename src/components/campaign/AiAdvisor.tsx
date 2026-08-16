import { useEffect, useRef, useState } from 'react'
import { Brain, Send, Sparkles, RefreshCw, User, Bot, AlertCircle, KeyRound } from 'lucide-react'
import type { MappedCampaign, TotalMetrics, ChatMessage } from '@lib/campaign/types'
import Markdown from '@components/Markdown'

/** Pertanyaan cepat yang disarankan. */
const SUGGESTIONS = [
  { label: 'Cari Kampanye Winning', query: 'Analisis kampanye paling menguntungkan (winning) dan kenapa performanya bagus?' },
  { label: 'Solusi Kampanye Boncos', query: 'Sebutkan kampanye yang paling boncos (rugi) dan berikan saran optimasinya.' },
  { label: 'Cek Link / Tag Rusak', query: 'Apakah ada indikasi tag link affiliate rusak atau spend iklan yang tidak ter-track? Sebutkan nama iklannya.' },
  { label: 'Cara Naikkan Komisi', query: 'Bagaimana strategi scaling budget dan alokasi anggaran terbaik untuk memaksimalkan ROI komisi saya?' },
]

/**
 * Asisten AI Media Buying — chat berbasis Gemini via main process (`ai:analyze`).
 * Bekerja meski tanpa kunci API (menampilkan panduan), karena kunci disimpan di
 * config main process — bukan sistem login/auth.
 */
export default function AiAdvisor({
  campaigns,
  totalMetrics,
  autoAuditKey,
}: {
  campaigns: MappedCampaign[]
  totalMetrics: TotalMetrics
  /** Kunci sumber data — audit otomatis hanya dijalankan saat data berubah (bukan tiap filter). */
  autoAuditKey?: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noApi, setNoApi] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  // Auto audit hanya saat SUMBER data berubah (autoAuditKey), bukan saat filter
  // status/tanggal diubah (mencegah spam panggilan Gemini pada tiap render).
  useEffect(() => {
    if (campaigns.length > 0 && autoAuditKey) {
      void runAnalyze()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAuditKey])

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
      if (/API key|kunci|GEMINI|ai:analyze|belum diatur/i.test(msg)) {
        setNoApi(true)
        setError('Kunci Gemini belum diatur di Pengaturan Performa Kampanye.')
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

  return (
    <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-4">
      {/* Sidebar saran */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick Analysis</h4>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Klik pertanyaan untuk analisis instan:</p>
        </div>
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={isLoading || campaigns.length === 0}
              onClick={() => void runAnalyze(s.query)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-medium leading-relaxed text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
            >
              {s.label}
            </button>
          ))}
        </div>
        {campaigns.length > 0 && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void runAnalyze()}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Muat Ulang Audit Utama
          </button>
        )}
      </div>

      {/* Area chat */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">AI Media Buying Analyst</h3>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              Gemini Active · Spesialis Optimasi ROI
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400 dark:text-slate-500">
              <Brain className="h-10 w-10 animate-pulse" />
              <p className="text-sm font-medium">Unggah data laporan iklan untuk memulai analisis AI.</p>
              <p className="text-xs">AI akan membaca angka nyata Anda dan menyarankan optimasi anggaran.</p>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user'
            return (
              <div key={i} className={`flex max-w-[85%] gap-2.5 ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    isUser
                      ? 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      : 'border-blue-600/20 bg-blue-600 text-white'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
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
                  <span className="mt-1 block text-right text-[9px] opacity-60">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
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
                    Atur <strong>GEMINI_API_KEY</strong> melalui menu <strong>Performa Kampanye → Pengaturan</strong> (disimpan aman di perangkat,
                    tanpa login). Sementara itu, seluruh analisis tabel/grafik tetap berfungsi.
                  </p>
                )}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex shrink-0 gap-2.5 border-t border-slate-100 p-3 dark:border-slate-700">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading || campaigns.length === 0}
            placeholder={campaigns.length === 0 ? 'Unggah laporan Meta Ads & Shopee dulu...' : 'Tanyakan hal spesifik, e.g. "Kenapa kampanye sekolah rugi?"'}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim() || campaigns.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Kirim
          </button>
        </form>

        <div className="flex shrink-0 items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <KeyRound className="h-3 w-3" /> Analisis AI berjalan lokal via aplikasi; data CSV tidak dikirim ke server kecuali untuk permintaan AI ini.
        </div>
      </div>
    </div>
  )
}
