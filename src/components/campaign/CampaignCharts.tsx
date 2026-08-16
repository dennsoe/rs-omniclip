import { Fragment, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Calendar, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { MappedCampaign, ShopeeAffiliateRow, DailyPerformanceRow } from '@lib/campaign/types'
import { formatIDR } from '@lib/campaign/format'

const STATUS_COLORS: Record<string, string> = {
  Tertunda: '#f59e0b',
  Selesai: '#10b981',
  Batal: '#ef4444',
  Dibatalkan: '#ef4444',
  Lainnya: '#64748b',
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#818cf8'
}

function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = 'left',
}: {
  label: string
  field: string
  currentField: string
  direction: 'asc' | 'desc'
  onSort: (field: string) => void
  align?: 'left' | 'right'
}) {
  const isActive = currentField === field
  const alignClass = align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
  return (
    <th
      onClick={(e) => {
        e.stopPropagation()
        onSort(field)
      }}
      className={`cursor-pointer px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider transition select-none ${
        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <div className={`flex items-center gap-1 ${alignClass}`}>
        <span>{label}</span>
        <span className="shrink-0">
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
          )}
        </span>
      </div>
    </th>
  )
}

export default function CampaignCharts({
  mappedCampaigns,
  shopeeOrders,
  dailyPerformance,
}: {
  mappedCampaigns: MappedCampaign[]
  shopeeOrders: ShopeeAffiliateRow[]
  dailyPerformance: DailyPerformanceRow[]
}) {
  const [expandedDates, setExpandedDates] = useState<string[]>([])
  const [dailySortField, setDailySortField] = useState('date')
  const [dailySortDirection, setDailySortDirection] = useState<'asc' | 'desc'>('desc')

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => (prev.includes(date) ? prev.filter((x) => x !== date) : [...prev, date]))
  }
  const handleDailySort = (field: string) => {
    if (dailySortField === field) setDailySortDirection(dailySortDirection === 'asc' ? 'desc' : 'asc')
    else {
      setDailySortField(field)
      setDailySortDirection('desc')
    }
  }

  const dailySortValue = (row: DailyPerformanceRow, field: string): number | string => {
    switch (field) {
      case 'date':
        return row.date
      case 'metaSpend':
        return row.metaSpend
      case 'metaClicks':
        return row.metaClicks
      case 'metaCpc':
        return row.metaClicks > 0 ? row.metaSpend / row.metaClicks : 0
      case 'shopeeClicks':
        return row.shopeeClicks
      case 'orders':
        return row.ordersCount
      case 'commission':
        return row.commission
      case 'profit':
        return row.profit
      case 'roi':
        return row.roi
      default:
        return 0
    }
  }

  const sortedDaily = [...dailyPerformance].sort((a, b) => {
    const va = dailySortValue(a, dailySortField)
    const vb = dailySortValue(b, dailySortField)
    if (typeof va === 'string' && typeof vb === 'string') {
      return dailySortDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return dailySortDirection === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va)
  })

  const barData = mappedCampaigns.map((c) => ({
    name: c.matchedTag.toUpperCase(),
    Spend: Math.round(c.spend),
    Commission: Math.round(c.commission),
  }))

  const statusCounts = shopeeOrders.reduce<Record<string, number>>((acc, o) => {
    const s = o.orderStatus || 'Lainnya'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const pieData = Object.keys(statusCounts).map((s) => ({ name: s, value: statusCounts[s] }))

  const totals = dailyPerformance.reduce(
    (acc, r) => ({
      metaSpend: acc.metaSpend + r.metaSpend,
      metaClicks: acc.metaClicks + r.metaClicks,
      shopeeClicks: acc.shopeeClicks + r.shopeeClicks,
      orders: acc.orders + r.ordersCount,
      commission: acc.commission + r.commission,
    }),
    { metaSpend: 0, metaClicks: 0, shopeeClicks: 0, orders: 0, commission: 0 }
  )
  const totalProfit = totals.commission - totals.metaSpend
  const totalRoi = totals.metaSpend > 0 ? (totals.commission / totals.metaSpend) * 100 : 0
  const totalLinkEff = totals.metaClicks > 0 ? (totals.shopeeClicks / totals.metaClicks) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Bar + Pie */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Perbandingan Biaya Iklan vs Komisi Shopee</h3>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Kampanye paling menguntungkan (Winning) vs merugi (Boncos) per tag.</p>
          <div className="mt-4 h-72">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-30" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="#94a3b8"
                    tickFormatter={(v: number) => (v >= 1000 ? `Rp ${v / 1000}k` : `Rp ${v}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      background: '#fff',
                    }}
                    formatter={(value, name) => [formatIDR(Number(value ?? 0)), String(name)]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Belanja Iklan (Meta)" />
                  <Bar dataKey="Commission" fill="#10b981" radius={[4, 4, 0, 0]} name="Komisi Affiliate" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Belum ada data.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-800/60">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status Pesanan Shopee Affiliate</h3>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Breakdown status pemrosesan komisi.</p>
          </div>
          <div className="relative mx-auto h-52 w-full">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                      {pieData.map((e, i) => (
                        <Cell key={`cell-${i}`} fill={getStatusColor(e.name)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }}
                      formatter={(value, name) => [`${Number(value ?? 0)} pesanan`, String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{shopeeOrders.length}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pesanan</span>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Belum ada data.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-700">
            {pieData.map((e) => {
              const pct = shopeeOrders.length > 0 ? ((e.value / shopeeOrders.length) * 100).toFixed(1) : '0'
              return (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getStatusColor(e.name) }} />
                  <span className="truncate text-slate-600 dark:text-slate-300">{e.name}</span>
                  <span className="text-[10px] text-slate-400">({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tabel kinerja harian */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Laporan Kinerja Harian (Per Tanggal)</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Rangkuman biaya Meta, klik, pesanan, dan komisi per tanggal.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            Rasio klik ke Shopee ideal &gt; 70%
          </span>
        </div>

        <div className="overflow-x-auto">
          {sortedDaily.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                  <SortHeader label="Tanggal" field="date" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} />
                  <SortHeader label="Meta Spend" field="metaSpend" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} align="right" />
                  <SortHeader label="Meta Klik" field="metaClicks" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} align="right" />
                  <SortHeader label="Shopee Klik" field="shopeeClicks" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} align="right" />
                  <SortHeader label="Pesanan" field="orders" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} align="right" />
                  <SortHeader label="Komisi" field="commission" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} align="right" />
                  <SortHeader label="Profit" field="profit" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} align="right" />
                  <SortHeader label="ROI" field="roi" currentField={dailySortField} direction={dailySortDirection} onSort={handleDailySort} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sortedDaily.map((row) => {
                  const isExpanded = expandedDates.includes(row.date)
                  const isProfit = row.profit >= 0
                  const cpc = row.metaClicks > 0 ? row.metaSpend / row.metaClicks : 0
                  return (
                    <Fragment key={row.date}>
                      <tr
                        onClick={() => toggleDate(row.date)}
                        className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-300 dark:text-slate-600">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                            {new Date(row.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">{formatIDR(row.metaSpend)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">{row.metaClicks.toLocaleString('id-ID')}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">{row.shopeeClicks.toLocaleString('id-ID')}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-200">{row.ordersCount.toLocaleString('id-ID')}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(row.commission)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              isProfit
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}
                          >
                            {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isProfit ? '+' : ''}
                            {formatIDR(row.profit)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-xs font-bold ${row.roi >= 100 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {row.roi.toFixed(1)}%
                          </span>
                          <span className="ml-1.5 text-[10px] text-slate-300 dark:text-slate-600">CPC {formatIDR(cpc)}</span>
                        </td>
                      </tr>
                      {isExpanded && row.hourlyPerformance && row.hourlyPerformance.length > 0 && (
                        <tr className="bg-slate-50/60 dark:bg-slate-900/30">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="space-y-2 border-l-2 border-blue-500 pl-4">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <Clock className="h-4 w-4 text-blue-500" /> Rincian Transaksi per Jam
                              </div>
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    <th className="px-2 py-1.5 text-left">Jam</th>
                                    <th className="px-2 py-1.5 text-right">Spend</th>
                                    <th className="px-2 py-1.5 text-right">Meta Klik</th>
                                    <th className="px-2 py-1.5 text-right">Shopee Klik</th>
                                    <th className="px-2 py-1.5 text-right">Pesanan</th>
                                    <th className="px-2 py-1.5 text-right">Komisi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                                  {row.hourlyPerformance.map((h) => {
                                    const hProfit = h.commission - h.metaSpend
                                    return (
                                      <tr key={h.hour}>
                                        <td className="px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{h.hour}</td>
                                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{h.metaSpend > 0 ? formatIDR(h.metaSpend) : '-'}</td>
                                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{h.metaClicks > 0 ? h.metaClicks.toLocaleString('id-ID') : '-'}</td>
                                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{h.shopeeClicks > 0 ? h.shopeeClicks.toLocaleString('id-ID') : '-'}</td>
                                        <td className="px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{h.ordersCount > 0 ? h.ordersCount.toLocaleString('id-ID') : '-'}</td>
                                        <td className="px-2 py-1.5 text-right">
                                          <span className={`font-mono text-[11px] font-semibold ${hProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {hProfit >= 0 ? '+' : ''}
                                            {formatIDR(hProfit)}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 font-bold text-slate-800 dark:bg-slate-900/90 dark:text-slate-100">
                  <td className="px-3 py-3 pl-6">TOTAL</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{formatIDR(totals.metaSpend)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{totals.metaClicks.toLocaleString('id-ID')}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{totals.shopeeClicks.toLocaleString('id-ID')}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{totals.orders.toLocaleString('id-ID')}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">{formatIDR(totals.commission)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-xs ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {totalProfit >= 0 ? '+' : ''}
                      {formatIDR(totalProfit)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-blue-600 dark:text-blue-400">{totalRoi.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">Belum ada data harian. Silakan unggah laporan Anda.</div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <span>Efisiensi link total: {totalLinkEff.toFixed(1)}%</span>
          <span>Klik baris tanggal untuk melihat rincian per jam.</span>
        </div>
      </div>
    </div>
  )
}
