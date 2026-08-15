import { useEffect, useState } from 'react'
import { Globe, Save, Check, X, Loader2, CircleAlert } from 'lucide-react'
import Toggle from './ui/Toggle'
import { FloatingInput, FloatingTextarea } from './ui/FloatingField'

interface ProxyTestResult {
  ok: boolean
  latencyMs: number
  error?: string
}

/**
 * Manajer Proxy (anti-banned system) — bagian dari modal Pengaturan Unduhan.
 * Daftar proxy (HTTP/SOCKS5) disimpan di main process (bukan localStorage).
 * Rotasi otomatis: ganti IP setiap `rotationEvery` unduhan.
 */
export default function ProxyManager(): React.ReactElement {
  const [enabled, setEnabled] = useState(false)
  const [proxiesText, setProxiesText] = useState('')
  const [rotationEvery, setRotationEvery] = useState(5)
  const [saved, setSaved] = useState(false)
  const [testingIdx, setTestingIdx] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, ProxyTestResult | null>>({})

  // Muat konfigurasi proxy dari main process.
  useEffect(() => {
    window.api
      ?.getProxyConfig?.()
      .then((cfg) => {
        if (!cfg) return
        setEnabled(!!cfg.enabled)
        setProxiesText((cfg.proxies ?? []).join('\n'))
        setRotationEvery(cfg.rotationEvery || 5)
      })
      .catch(() => {})
  }, [])

  const proxyList = proxiesText.split('\n').map((l) => l.trim()).filter(Boolean)

  const handleSave = (): void => {
    window.api
      ?.saveProxyConfig?.({ enabled, proxies: proxyList, rotationEvery })
      .then(() => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
      .catch(() => {})
  }

  const handleTest = (index: number): void => {
    const proxyUrl = proxyList[index]
    if (!proxyUrl) return
    setTestingIdx(index)
    setResults((p) => ({ ...p, [index]: null }))
    window.api
      ?.testProxy?.(proxyUrl)
      .then((r) => setResults((p) => ({ ...p, [index]: r })))
      .catch(() => setResults((p) => ({ ...p, [index]: { ok: false, latencyMs: 0, error: 'Gagal tes' } })))
      .finally(() => setTestingIdx(null))
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-4 py-3 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">Manajer Proxy</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Rotasi IP anti-banned</p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} label="Aktifkan" />
      </div>

      {enabled && (
        <>
          <FloatingTextarea
            label="Daftar Proxy (satu per baris)"
            value={proxiesText}
            onChange={(e) => setProxiesText(e.target.value)}
            helper="Format: http://user:pass@host:port atau socks5://user:pass@host:port"
            rows={3}
          />

          <div className="flex items-end gap-2">
            <div className="w-40">
              <FloatingInput
                type="number"
                min={1}
                label="Rotasi tiap N unduhan"
                value={String(rotationEvery)}
                onChange={(e) => setRotationEvery(Math.max(1, Number(e.target.value) || 5))}
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
            >
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? 'Tersimpan' : 'Simpan'}
            </button>
          </div>

          {proxyList.length > 0 && (
            <ul className="flex flex-col gap-1">
              {proxyList.map((p, i) => {
                const r = results[i]
                return (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 transition-colors">
                    <span className="flex-1 min-w-0 truncate text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {p}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTest(i)}
                      disabled={testingIdx === i}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                    >
                      {testingIdx === i ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Tes'
                      )}
                    </button>
                    {r && (
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold ${
                          r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                        }`}
                      >
                        {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {r.ok ? `${r.latencyMs} ms` : 'Gagal'}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <p className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
            <CircleAlert className="w-3 h-3 shrink-0" />
            Instagram/Facebook memblokir proxy datacenter — gunakan proxy residential untuk platform tersebut.
          </p>
        </>
      )}
    </div>
  )
}
