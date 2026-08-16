import { Fragment, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Receipt,
  MousePointerClick,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import type { MappedCampaign } from '@lib/campaign/types'
import { formatIDR } from '@lib/campaign/format'

/** Status kampanye berdasarkan ambang ROI (sama dengan acuan rs-9). */
type RoiStatus = 'winning' | 'bep' | 'boncos'

function roiStatusOf(roi: number): RoiStatus {
  if (roi >= 120) return 'winning'
  if (roi >= 100) return 'bep'
  return 'boncos'
}

function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = 'left',
  className = 'py-3 px-4',
}: {
  label: string
  field: string
  currentField: string
  direction: 'asc' | 'desc'
  onSort: (field: string) => void
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const isActive = currentField === field
  const alignClass =
    align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left'

  return (
    <th
      onClick={(e) => {
        e.stopPropagation()
        onSort(field)
      }}
      className={`${className} text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 cursor-pointer transition select-none group ${
        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <span>{label}</span>
        <span className="shrink-0">
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
          )}
        </span>
      </div>
    </th>
  )
}

export default function CampaignTable({ campaigns }: { campaigns: MappedCampaign[] }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('commission')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expanded, setExpanded] = useState<string[]>([])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleRow = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const sortValue = (c: MappedCampaign, field: string): number | string => {
    switch (field) {
      case 'tag':
        return c.matchedTag
      case 'spend':
        return c.spend
      case 'clicks':
        return c.clicks
      case 'shopeeClicks':
        return c.shopeeClicksCount ?? 0
      case 'orders':
        return c.ordersCount
      case 'commission':
        return c.commission
      case 'roi':
        return c.roi
      default:
        return 0
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? campaigns.filter(
          (c) =>
            c.matchedTag.toLowerCase().includes(q) ||
            c.adNames.some((n) => n.toLowerCase().includes(q)) ||
            c.adSetName.toLowerCase().includes(q)
        )
      : campaigns

    return [...list].sort((a, b) => {
      const va = sortValue(a, sortField)
      const vb = sortValue(b, sortField)
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      const na = Number(va) || 0
      const nb = Number(vb) || 0
      return sortDirection === 'asc' ? na - nb : nb - na
    })
  }, [campaigns, search, sortField, sortDirection])

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800/60">
      {/* Header + Search */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detail Performa Kampanye</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Analisis ROI, CPA, dan konversi per tag kampanye.</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tag atau nama iklan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Tabel auto-resize: tinggi mengikuti isi (semua baris tampil), halaman yang scroll */}
      <div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
            <Tag className="h-8 w-8" />
            <p className="text-xs">Tidak ada kampanye yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                <SortHeader label="Tag / Nama Iklan" field="tag" currentField={sortField} direction={sortDirection} onSort={handleSort} className="w-[26%] py-3 pl-4" />
                <SortHeader label="Spend (Meta)" field="spend" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" className="w-[14%]" />
                <SortHeader label="Klik Meta" field="clicks" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" className="w-[11%]" />
                <SortHeader label="Klik Shopee" field="shopeeClicks" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" className="w-[11%]" />
                <SortHeader label="Orders" field="orders" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" className="w-[8%]" />
                <SortHeader label="Komisi (Shopee)" field="commission" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" className="w-[14%]" />
                <SortHeader label="ROI / Status" field="roi" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" className="w-[16%] py-3 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filtered.map((c) => {
                const status = roiStatusOf(c.roi)
                const isExpanded = expanded.includes(c.id)
                const profit = c.commission - c.spend

                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => toggleRow(c.id)}
                      className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="py-3 pl-4 pr-2 align-middle">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ${
                              status === 'winning'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                : status === 'bep'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                            }`}
                          >
                            {c.matchedTag.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                              <span className="uppercase">{c.matchedTag}</span>
                            </div>
                            <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                              Ad: {c.adNames.join(' · ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">{formatIDR(c.spend)}</td>
                      <td className="py-3 pr-2 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">{c.clicks.toLocaleString('id-ID')}</td>
                      <td className="py-3 pr-2 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">{(c.shopeeClicksCount ?? 0).toLocaleString('id-ID')}</td>
                      <td className="py-3 pr-2 text-right font-mono text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-200">{c.ordersCount.toLocaleString('id-ID')}</td>
                      <td className="py-3 pr-2 text-right font-mono text-xs tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(c.commission)}</td>
                      <td className="py-3 pr-4 text-right align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${
                            status === 'winning'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : status === 'bep'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
                          }`}
                        >
                          {status === 'winning' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {status === 'winning' ? 'Winning' : status === 'bep' ? 'BEP' : 'Boncos'} ({c.roi.toFixed(1)}%)
                        </span>
                        <span className="ml-1.5 inline-flex align-middle text-slate-300 dark:text-slate-600">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </td>
                    </tr>

                    {/* Row expand: detail */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60 dark:bg-slate-900/30">
                        <td colSpan={7} className="border-y border-slate-100 px-4 py-3 dark:border-slate-700/50">
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700/50 dark:bg-slate-800/40">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                <TrendingUp className="h-3.5 w-3.5" /> Net Profit
                              </div>
                              <div className={`mt-1 font-mono text-sm font-bold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {profit >= 0 ? '+' : ''}
                                {formatIDR(profit)}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700/50 dark:bg-slate-800/40">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                <MousePointerClick className="h-3.5 w-3.5" /> CPC
                              </div>
                              <div className="mt-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{formatIDR(c.cpc)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700/50 dark:bg-slate-800/40">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                <Receipt className="h-3.5 w-3.5" /> CPA
                              </div>
                              <div className="mt-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{formatIDR(c.cpa)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700/50 dark:bg-slate-800/40">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                <ShoppingBag className="h-3.5 w-3.5" /> Konversi
                              </div>
                              <div className="mt-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{c.conversionRate.toFixed(2)}%</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700/50 dark:bg-slate-800/40">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                <Tag className="h-3.5 w-3.5" /> Nilai Penjualan
                              </div>
                              <div className="mt-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{formatIDR(c.salesValue)}</div>
                            </div>
                          </div>
                          {c.orderIds.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">ID Pesanan:</span>
                              {c.orderIds.slice(0, 12).map((id) => (
                                <span
                                  key={id}
                                  className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
                                >
                                  {id}
                                </span>
                              ))}
                              {c.orderIds.length > 12 && (
                                <span className="text-[11px] text-slate-400">+{c.orderIds.length - 12} lagi</span>
                              )}
                            </div>
                          )}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
        <span>
          {filtered.length} dari {campaigns.length} kampanye
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" /> Winning (ROI ≥ 120%)
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-rose-500" /> Boncos (ROI &lt; 100%)
          </span>
        </span>
      </div>
    </div>
  )
}
