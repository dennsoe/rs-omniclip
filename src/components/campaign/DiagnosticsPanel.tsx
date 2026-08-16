import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp, FileSpreadsheet, Tag } from 'lucide-react'
import type { MetaAdRow, ShopeeAffiliateRow, ShopeeClickRow } from '@lib/campaign/types'
import { findKey } from '@lib/campaign/csv'

/**
 * Deteksi nama kolom asli dari baris pertama — memakai findKey yang SAMA dengan
 * dataProcessor agar nama yang ditampilkan konsisten dgn kolom yang benar-benar
 * dipakai (bukan sekadar partial-match yang bisa menunjuk kolom salah).
 */
function detectKeys(row: Record<string, string> | undefined, terms: string[]) {
  if (!row) return 'Tidak Ditemukan'
  return findKey(row, terms) || 'Tidak Ditemukan'
}

/**
 * Sistem Diagnostik & Validasi Laporan — memastikan kecocokan kolom CSV,
 * jumlah baris, dan status tag link. Gaya rs-omni.
 */
export default function DiagnosticsPanel({
  metaAds,
  shopeeOrders,
  mappingRule,
  shopeeClicks = [],
}: {
  metaAds: MetaAdRow[]
  shopeeOrders: ShopeeAffiliateRow[]
  mappingRule: 'contains' | 'exact'
  shopeeClicks?: ShopeeClickRow[]
}) {
  const [isOpen, setIsOpen] = useState(true)
  if (metaAds.length === 0 && shopeeOrders.length === 0) return null

  const metaSample = metaAds[0]?.raw
  const shopeeSample = shopeeOrders[0]?.raw

  const metaKeys = {
    adName: detectKeys(metaSample, ['nama iklan', 'ad name', 'ad_name', 'campaign name']),
    spend: detectKeys(metaSample, ['jumlah yang dibelanjakan', 'spend', 'amount spent', 'dibelanjakan']),
    clicks: detectKeys(metaSample, ['klik tautan', 'link clicks', 'clicks', 'hasil', 'results']),
  }
  const shopeeKeys = {
    orderId: detectKeys(shopeeSample, ['id pemesanan', 'order id', 'order_id']),
    commission: detectKeys(shopeeSample, ['komisi bersih affiliate', 'net affiliate commission', 'komisi bersih']),
    tag1: detectKeys(shopeeSample, ['tag_link1', 'tag1']),
  }

  // Tag unik + jumlah pesanan.
  const uniqueTagsMap = new Map<string, number>()
  shopeeOrders.forEach((o) => {
    ;[o.tag1, o.tag2, o.tag3, o.tag4, o.tag5].forEach((tag) => {
      if (tag && tag.trim()) {
        const clean = tag.trim().toLowerCase()
        uniqueTagsMap.set(clean, (uniqueTagsMap.get(clean) || 0) + 1)
      }
    })
  })
  const allDetectedTags = Array.from(uniqueTagsMap.entries()).sort((a, b) => b[1] - a[1])
  const totalOrdersWithTags = shopeeOrders.filter((o) => [o.tag1, o.tag2, o.tag3, o.tag4, o.tag5].some((t) => t && t.trim())).length
  const totalOrdersWithoutTags = shopeeOrders.length - totalOrdersWithTags

  const rowCls = 'flex items-center justify-between text-xs'
  const keyCls = 'font-mono rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800/60">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 transition-colors hover:bg-slate-100/60 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sistem Diagnostik &amp; Validasi Laporan</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Kecocokan kolom CSV, jumlah baris, dan status tag link.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
              metaAds.length > 0 && shopeeOrders.length > 0
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metaAds.length > 0 && shopeeOrders.length > 0 ? 'Siap Analisis' : 'Menunggu File'}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-5 p-4">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Meta */}
            {metaAds.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status Laporan Meta Ads</h4>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {metaAds.length} Baris
                  </span>
                </div>
                <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
                  <div className={rowCls}>
                    <span className="font-medium text-slate-500 dark:text-slate-400">Kolom Nama Iklan</span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> <span className={keyCls}>{metaKeys.adName}</span>
                    </span>
                  </div>
                  <div className={rowCls}>
                    <span className="font-medium text-slate-500 dark:text-slate-400">Kolom Biaya (Spend)</span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> <span className={keyCls}>{metaKeys.spend}</span>
                    </span>
                  </div>
                  <div className={rowCls}>
                    <span className="font-medium text-slate-500 dark:text-slate-400">Kolom Klik Tautan / Hasil</span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> <span className={keyCls}>{metaKeys.clicks}</span>
                    </span>
                  </div>
                </div>
                {metaAds.some((ad) => ad.spend > 0 && ad.results === 0) && (
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Catatan:</strong> Beberapa iklan punya budget tetapi 0 klik. Wajar jika link belum dapat klik, atau aktifkan kolom
                      "Klik Tautan" saat mengekspor.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Shopee */}
            {shopeeOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status Laporan Shopee</h4>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {shopeeOrders.length} Pesanan
                  </span>
                </div>
                <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
                  <div className={rowCls}>
                    <span className="font-medium text-slate-500 dark:text-slate-400">Kolom ID Pemesanan</span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> <span className={keyCls}>{shopeeKeys.orderId}</span>
                    </span>
                  </div>
                  <div className={rowCls}>
                    <span className="font-medium text-slate-500 dark:text-slate-400">Kolom Komisi Bersih</span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> <span className={keyCls}>{shopeeKeys.commission}</span>
                    </span>
                  </div>
                  <div className={rowCls}>
                    <span className="font-medium text-slate-500 dark:text-slate-400">Laporan Bertag / Sub-ID</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {totalOrdersWithTags} dari {shopeeOrders.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-xs dark:border-slate-700">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Laporan Klik Shopee</span>
                    {shopeeClicks.length > 0 ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        Terunggah ({shopeeClicks.length} Klik)
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                        Tidak Ada (Estimasi Aktif)
                      </span>
                    )}
                  </div>
                </div>
                {totalOrdersWithoutTags > 0 && (
                  <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-[11px] leading-relaxed">
                      Ada <strong>{totalOrdersWithoutTags} pesanan organik/tanpa sub-tag</strong>. Data ini dikelompokkan aman di bagian "Tidak
                      Terpetakan".
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Daftar tag */}
          {allDetectedTags.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-blue-500" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Daftar Tag Shopee Affiliate yang Ditemukan ({allDetectedTags.length})
                </h4>
              </div>
              <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto p-1">
                {allDetectedTags.map(([tag, count]) => {
                  const hasMetaMatch = metaAds.some((ad) => {
                    const adName = ad.adName.toLowerCase()
                    const adSetName = ad.adSetName.toLowerCase()
                    return mappingRule === 'exact' ? adName === tag || adSetName === tag : adName.includes(tag) || adSetName.includes(tag)
                  })
                  return (
                    <span
                      key={tag}
                      title={hasMetaMatch ? 'Cocok dengan iklan Meta aktif' : 'Tag tidak ditemukan di nama iklan Meta'}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold ${
                        hasMetaMatch
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${hasMetaMatch ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="font-mono uppercase">{tag}</span>
                      <span className="text-[10px] opacity-60">({count})</span>
                    </span>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Hijau: Tag cocok dengan iklan Meta
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Kuning: Tag tidak cocok (beda penulisan / iklan tidak aktif)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
