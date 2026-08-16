/**
 * Tipe data fitur "Performa Kampanye" — analisis Meta Ads vs komisi Shopee
 * Affiliate (pencocokan tag otomatis + ROI). Diport dari repo rs-9 dan
 * disesuaikan dengan konvensi rs-omni (JSDoc Bahasa Indonesia).
 */

/** Satu baris laporan Meta Ads (hasil ekspor Meta Ads Manager). */
export interface MetaAdRow {
  /** Nama iklan (mis. "G-1-sekolah"). */
  adName: string
  date: string
  timeSlot: string
  status: string
  level: string
  resultType: string
  /** Jumlah hasil/klik tautan. */
  results: number
  costPerResult: number
  /** Total biaya iklan. */
  spend: number
  impressions: number
  reach: number
  attribution: string
  adSetName: string
  reportingStart: string
  reportingEnd: string
  /** Objek asli hasil parsing CSV (untuk diagnostik kolom). */
  raw: Record<string, string>
}

/** Satu pesanan laporan Shopee Affiliate (kaya kolom komisi & tag). */
export interface ShopeeAffiliateRow {
  orderId: string
  orderStatus: string
  affiliateCode: string
  orderTime: string
  completeTime: string
  clickTime: string
  shopName: string
  shopId: string
  shopType: string
  itemId: string
  itemName: string
  modelId: string
  productType: string
  promoId: string
  categoryL1: string
  categoryL2: string
  categoryL3: string
  price: number
  quantity: number
  offerType: string
  partnerCampaign: string
  purchaseValue: number
  refundAmount: number
  shopeeCommissionPercent: string
  shopeeCommissionAmount: number
  xtraCommissionPercent: string
  xtraCommissionAmount: number
  totalCommissionPerProduct: number
  shopeeCommissionPerOrder: number
  xtraCommissionPerOrder: number
  totalCommissionPerOrder: number
  mcnName: string
  mcnContractId: string
  mcnFeePercent: string
  mcnFeeAmount: number
  affiliateCommissionSharePercent: string
  /** Komisi bersih yang diterima affiliate (sumber utama pendapatan). */
  netAffiliateCommission: number
  affiliateProductStatus: string
  productNotes: string
  orderType: string
  purchaseStatus: string
  tag1: string
  tag2: string
  tag3: string
  tag4: string
  tag5: string
  platform: string
  raw: Record<string, string>
}

/** Satu baris laporan klik Shopee (opsional, untuk efisiensi link). */
export interface ShopeeClickRow {
  clickId: string
  clickTime: string
  clickRegion: string
  tagLink: string
  referrer: string
  raw: Record<string, string>
}

/** Satu kampanye hasil pencocokan tag → ringkasan performa. */
export interface MappedCampaign {
  id: string
  adName: string
  /** Semua nama iklan yang tergabung ke kampanye ini. */
  adNames: string[]
  adSetName: string
  /** Tag affiliate yang cocok (dipakai sebagai label kampanye). */
  matchedTag: string
  spend: number
  clicks: number
  impressions: number
  ordersCount: number
  commission: number
  salesValue: number
  /** ROI dalam persen: komisi / spend * 100. */
  roi: number
  /** CPA dalam Rupiah: spend / jumlah pesanan. */
  cpa: number
  /** CPC dalam Rupiah: spend / jumlah klik. */
  cpc: number
  /** Konversi: pesanan / klik * 100. */
  conversionRate: number
  orderIds: string[]
  shopeeClicksCount?: number
}

/** Iklan Meta yang tidak cocok dengan tag Shopee mana pun. */
export interface UnmappedAd {
  adName: string
  adSetName: string
  spend: number
  clicks: number
  date: string
}

/** Pesanan Shopee tanpa tag / organik (tidak terpetakan ke kampanye). */
export interface UnmappedOrder {
  orderId: string
  orderTime: string
  itemName: string
  netAffiliateCommission: number
  tags: string[]
  orderStatus: string
}

/** Metrik agregat global seluruh data. */
export interface TotalMetrics {
  totalSpend: number
  totalCommission: number
  netProfit: number
  roi: number
  totalClicks: number
  totalShopeeClicks: number
  totalImpressions: number
  totalOrders: number
  conversionRate: number
  averageCpc: number
  cpa: number
  /** Beban pajak (PPN) — dihitung dinamis di UI. */
  taxAmount?: number
  totalSpendWithTax?: number
  netProfitWithTax?: number
  roiWithTax?: number
}

/** Pesan chat AI advisor. */
export interface ChatMessage {
  role: 'user' | 'model'
  text: string
  timestamp: Date
}

/** Ringkasan performa per jam (breakdown harian). */
export interface HourlyPerformanceRow {
  hour: string
  metaSpend: number
  metaClicks: number
  shopeeClicks: number
  ordersCount: number
  commission: number
}

/** Ringkasan performa per tanggal (+ breakdown per jam). */
export interface DailyPerformanceRow {
  date: string
  metaSpend: number
  metaClicks: number
  shopeeClicks: number
  ordersCount: number
  commission: number
  profit: number
  roi: number
  hourlyPerformance?: HourlyPerformanceRow[]
}

/** Pengaturan analisis campaign (dipersist per profil). */
export interface CampaignSettings {
  /** Aturan pencocokan tag ke nama iklan. */
  mappingRule: 'contains' | 'exact'
  /** Persentase pajak PPN Meta Ads (default 12). */
  taxRate: number
  /** Status pesanan Shopee yang diikutsertakan dalam perhitungan. */
  selectedStatuses: string[]
  /** Rentang tanggal filter (YYYY-MM-DD, kosong = semua). */
  dateStart: string
  dateEnd: string
}

/** Satu workspace (semua data CSV + pengaturan) untuk disimpan/ekspor. */
export interface CampaignWorkspace {
  id: string
  name: string
  profileName: string
  metaCsvText: string
  shopeeCsvText: string
  shopeeClicksText: string
  settings: CampaignSettings
  updatedAt: string
}

/** Ringkasan workspace untuk daftar (tanpa isi CSV yang besar). */
export interface CampaignWorkspaceSummary {
  id: string
  name: string
  profileName: string
  updatedAt: string
}
