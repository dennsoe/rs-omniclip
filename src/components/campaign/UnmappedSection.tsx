import { AlertTriangle, PackageX, Megaphone } from 'lucide-react'
import type { UnmappedAd, UnmappedOrder } from '@lib/campaign/types'
import { formatIDR } from '@lib/campaign/format'

/**
 * Data yang tidak terpetakan: iklan Meta tanpa tag Shopee + pesanan Shopee
 * organik/tanpa iklan. Gaya rs-omni.
 */
export default function UnmappedSection({
  unmappedAds,
  unmappedOrders,
}: {
  unmappedAds: UnmappedAd[]
  unmappedOrders: UnmappedOrder[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Iklan Meta tanpa tag */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Iklan Meta Tanpa Tag Shopee</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {unmappedAds.length} iklan tidak cocok dengan tag mana pun
            </p>
          </div>
        </div>
        <div>
          {unmappedAds.length === 0 ? (
            <Empty text="Semua iklan Meta berhasil dipetakan ke tag Shopee." />
          ) : (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                  <th className="w-[55%] bg-slate-50/95 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95 dark:text-slate-500">
                    Nama Iklan
                  </th>
                  <th className="w-[20%] bg-slate-50/95 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95 dark:text-slate-500">
                    Spend
                  </th>
                  <th className="w-[25%] bg-slate-50/95 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95 dark:text-slate-500">
                    Klik
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {unmappedAds.map((ad, i) => (
                  <tr key={`${ad.adName}-${i}`} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="min-w-0 truncate px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200">{ad.adName}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatIDR(ad.spend)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">{ad.clicks.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {unmappedAds.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Total spend tidak terpetakan: <strong>{formatIDR(unmappedAds.reduce((s, a) => s + a.spend, 0))}</strong>
          </div>
        )}
      </div>

      {/* Pesanan Shopee organik / tanpa iklan */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
            <PackageX className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pesanan Shopee Organik / Tanpa Iklan</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{unmappedOrders.length} pesanan tidak terpetakan ke kampanye</p>
          </div>
        </div>
        <div>
          {unmappedOrders.length === 0 ? (
            <Empty text="Semua pesanan Shopee terpetakan ke kampanye iklan." />
          ) : (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                  <th className="w-[40%] bg-slate-50/95 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95 dark:text-slate-500">
                    Produk
                  </th>
                  <th className="w-[20%] bg-slate-50/95 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95 dark:text-slate-500">
                    Status
                  </th>
                  <th className="w-[25%] bg-slate-50/95 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95 dark:text-slate-500">
                    Komisi
                  </th>
                  <th className="w-[15%] bg-slate-50/95 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95 dark:text-slate-500">
                    Tag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {unmappedOrders.map((o, i) => (
                  <tr key={`${o.orderId}-${i}`} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="min-w-0 truncate px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200">{o.itemName || o.orderId}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{o.orderStatus}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatIDR(o.netAffiliateCommission)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {o.tags.length > 0 ? o.tags.join(',') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {unmappedOrders.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-t border-blue-200 bg-blue-50 px-4 py-2.5 text-[11px] text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            Total komisi tidak terpetakan: <strong>{formatIDR(unmappedOrders.reduce((s, o) => s + o.netAffiliateCommission, 0))}</strong>
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400 dark:text-slate-500">
      <PackageX className="h-8 w-8" />
      <p className="px-6 text-center text-xs">{text}</p>
    </div>
  )
}
