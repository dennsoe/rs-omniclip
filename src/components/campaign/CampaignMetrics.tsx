import {
  TrendingUp,
  TrendingDown,
  Layers,
  Percent,
  MousePointerClick,
  ExternalLink,
  Receipt,
  Wallet,
  BadgeCheck,
  CircleAlert,
  ShoppingBag,
} from 'lucide-react'
import type { TotalMetrics, MetaAdRow } from '@lib/campaign/types'
import { formatIDR } from '@lib/campaign/format'

/**
 * Kartu KPI utama + perbandingan klik + laporan keuangan dengan PPN dinamis
 * + strip KPI sekunder. Gaya mengikuti design system rs-omni.
 */
export default function CampaignMetrics({
  totalMetrics,
  taxRate,
  onTaxRateChange,
  metaRows,
  shopeeClicksCount,
}: {
  totalMetrics: TotalMetrics
  taxRate: number
  onTaxRateChange: (v: number) => void
  metaRows: MetaAdRow[]
  shopeeClicksCount: number
}) {
  const cpcMeta = totalMetrics.totalClicks > 0 ? totalMetrics.totalSpend / totalMetrics.totalClicks : 0
  const cpcShopee = totalMetrics.totalShopeeClicks > 0 ? totalMetrics.totalSpend / totalMetrics.totalShopeeClicks : 0
  const linkEfficiency =
    totalMetrics.totalClicks > 0 ? Math.round((totalMetrics.totalShopeeClicks / totalMetrics.totalClicks) * 100) : 0
  const isProfit = totalMetrics.netProfit >= 0
  const isProfitWithTax = (totalMetrics.netProfitWithTax ?? 0) >= 0

  return (
    <div className="space-y-4">
      {/* Kartu utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          iconCls="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          title="Total Belanja Iklan (Meta)"
          value={formatIDR(totalMetrics.totalSpend)}
          sub={`Dari ${metaRows.length} baris performa iklan`}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          iconCls="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          title="Total Komisi Bersih (Shopee)"
          value={formatIDR(totalMetrics.totalCommission)}
          sub={`Dari ${totalMetrics.totalOrders} pesanan aktif`}
        />
        <MetricCard
          icon={<Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconCls="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          title="Net Profit / Loss"
          value={`${isProfit ? '+' : ''}${formatIDR(totalMetrics.netProfit)}`}
          sub="Komisi Shopee dikurangi Meta Spend"
          badge={
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                isProfit
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
              }`}
            >
              {isProfit ? <BadgeCheck className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
              {isProfit ? 'Untung' : 'Rugi (Boncos)'}
            </span>
          }
        />
        <MetricCard
          icon={<Percent className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
          iconCls="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          title="ROAS Komisi (ROI)"
          value={`${totalMetrics.roi.toFixed(1)}%`}
          sub={`Setara ${(totalMetrics.roi / 100).toFixed(2)}x ROAS`}
        />
      </div>

      {/* Perbandingan klik Meta vs Shopee */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          icon={<MousePointerClick className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
          iconCls="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          title="Total Klik Iklan (Meta)"
          value={totalMetrics.totalClicks.toLocaleString('id-ID')}
          sub={`CPC: ${formatIDR(cpcMeta)} · klik keluar dari Meta Ads`}
        />
        <MetricCard
          icon={<ExternalLink className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          iconCls="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          title="Total Klik Shopee"
          value={totalMetrics.totalShopeeClicks.toLocaleString('id-ID')}
          sub={`CPC Shopee: ${formatIDR(cpcShopee)} · ${
            shopeeClicksCount > 0 ? 'berdasarkan laporan klik asli' : 'berdasarkan pesanan unik'
          }`}
          badge={
            totalMetrics.totalClicks > 0 ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  linkEfficiency >= 70
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                }`}
              >
                {linkEfficiency}% Link Efficiency
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Laporan keuangan + PPN dinamis */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Laporan Keuangan Utama</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Kalkulasi riil setelah memperhitungkan Pajak PPN Meta Ads sebesar {taxRate}% per belanja iklan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <label htmlFor="campaign-tax-rate" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Persentase Pajak (%)
            </label>
            <input
              id="campaign-tax-rate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={taxRate}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                onTaxRateChange(isNaN(v) ? 0 : v)
              }}
              className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center font-mono text-xs font-bold text-slate-700 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <FinCard
            icon={<Receipt className="h-4 w-4 text-amber-500" />}
            label={`Beban PPN (${taxRate}%)`}
            value={formatIDR(totalMetrics.taxAmount ?? 0)}
            sub="PPN dari spend utama"
          />
          <FinCard
            icon={<Wallet className="h-4 w-4 text-amber-500" />}
            label="Total Spend + Pajak"
            value={formatIDR(totalMetrics.totalSpendWithTax ?? 0)}
            sub="Total beban iklan riil"
          />
          <FinCard
            icon={isProfitWithTax ? <BadgeCheck className="h-4 w-4 text-emerald-500" /> : <CircleAlert className="h-4 w-4 text-rose-500" />}
            label="Net Profit (Pasca Pajak)"
            value={`${isProfitWithTax ? '+' : ''}${formatIDR(totalMetrics.netProfitWithTax ?? 0)}`}
            sub={isProfitWithTax ? 'Untung (aman)' : 'Boncos pasca pajak'}
            valueCls={isProfitWithTax ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
          />
          <FinCard
            icon={<Percent className="h-4 w-4 text-indigo-500" />}
            label="ROI Komisi (Pasca Pajak)"
            value={`${(totalMetrics.roiWithTax ?? 0).toFixed(1)}%`}
            sub={`Setara ${((totalMetrics.roiWithTax ?? 0) / 100).toFixed(2)}x ROAS`}
            valueCls="text-indigo-600 dark:text-indigo-400"
          />
        </div>
      </div>

      {/* KPI sekunder */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 lg:grid-cols-5 dark:border-slate-700 dark:bg-slate-800/60">
        <SecondaryKpi icon={<MousePointerClick className="h-4 w-4 text-indigo-500" />} label="Total Klik Iklan" value={totalMetrics.totalClicks.toLocaleString('id-ID')} />
        <SecondaryKpi icon={<ExternalLink className="h-4 w-4 text-emerald-500" />} label="Total Klik Shopee" value={totalMetrics.totalShopeeClicks.toLocaleString('id-ID')} />
        <SecondaryKpi icon={<ShoppingBag className="h-4 w-4 text-blue-500" />} label="Total Pesanan" value={totalMetrics.totalOrders.toLocaleString('id-ID')} />
        <SecondaryKpi icon={<Percent className="h-4 w-4 text-amber-500" />} label="Konversi (Klik→Order)" value={`${totalMetrics.conversionRate.toFixed(2)}%`} />
        <SecondaryKpi icon={<Receipt className="h-4 w-4 text-rose-500" />} label="CPA (Biaya/Pesanan)" value={formatIDR(totalMetrics.cpa)} />
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  iconCls,
  title,
  value,
  sub,
  badge,
}: {
  icon: React.ReactNode
  iconCls: string
  title: string
  value: string
  sub: string
  badge?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconCls}`}>{icon}</div>
        {badge}
      </div>
      <p className="mt-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  )
}

function FinCard({
  icon,
  label,
  value,
  sub,
  valueCls = 'text-slate-800 dark:text-slate-100',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  valueCls?: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {icon} {label}
      </div>
      <p className={`mt-1.5 font-mono text-lg font-bold ${valueCls}`}>{value}</p>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  )
}

function SecondaryKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl p-3 text-center">
      <span className="text-slate-300 dark:text-slate-600">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-base font-bold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  )
}
