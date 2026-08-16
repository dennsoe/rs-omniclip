/**
 * Pemrosesan data fitur "Performa Kampanye": parse CSV (Meta Ads, Shopee
 * Affiliate, Klik Shopee) → pencocokan tag otomatis → metrik kampanye →
 * agregasi harian & per jam. Diport penuh dari repo rs-9.
 *
 * Alur inti:
 *  1. Kumpulkan semua tag unik (dari pesanan tag1-5 + laporan klik).
 *  2. Kelompokkan pesanan Shopee per tag.
 *  3. Cocokkan iklan Meta ke tag (aturan contains / exact).
 *  4. Hitung turunan: ROI, CPA, CPC, conversion rate, klik Shopee per kampanye.
 *  5. Pisahkan data yang tidak terpetakan + metrik global.
 */

import Papa from 'papaparse'
import { findKey, detectDecimalSeparator, parseNumber } from './csv'
import type {
  MetaAdRow,
  ShopeeAffiliateRow,
  ShopeeClickRow,
  MappedCampaign,
  UnmappedAd,
  UnmappedOrder,
  TotalMetrics,
  DailyPerformanceRow,
  HourlyPerformanceRow,
} from './types'

/** Parse laporan Meta Ads (hasil ekspor Meta Ads Manager). */
export function parseMetaAds(csvText: string): Promise<MetaAdRow[]> {
  const decimalSep = detectDecimalSeparator(csvText)
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data
          const parsed: MetaAdRow[] = []

          for (const row of rows) {
            const adNameKey =
              findKey(row, ['nama iklan', 'ad name', 'ad_name', 'ad.name', 'iklan', 'campaign name', 'nama kampanye', 'nama_iklan']) || ''
            const dateKey = findKey(row, ['tanggal', 'date', 'hari', 'day']) || findKey(row, ['reporting starts', 'awal pelaporan']) || ''
            const timeSlotKey = findKey(row, ['waktu (zona waktu', 'time slot', 'waktu', 'jam']) || ''
            const statusKey = findKey(row, ['status penayangan', 'delivery status', 'status']) || ''
            const levelKey = findKey(row, ['level penayangan', 'delivery level', 'level']) || ''
            const resultTypeKey = findKey(row, ['jenis hasil', 'result type', 'jenis_hasil']) || ''
            const resultsKey =
              findKey(row, ['klik tautan', 'klik link', 'link clicks', 'clicks', 'klik', 'outbound clicks', 'hasil', 'results', 'klik keluar', 'tautan']) || ''
            const costPerResultKey = findKey(row, ['biaya per hasil', 'cost per result', 'biaya hasil']) || ''
            const spendKey =
              findKey(row, ['jumlah yang dibelanjakan', 'spend', 'amount spent', 'biaya', 'pengeluaran', 'ongkos', 'cost', 'dibelanjakan']) || ''
            const impressionsKey = findKey(row, ['impresi', 'impressions', 'tayangan', 'tampil', 'tampilan']) || ''
            const reachKey = findKey(row, ['jangkauan', 'reach', 'jangkauan_orang']) || ''
            const attributionKey = findKey(row, ['pengaturan atribusi', 'attribution']) || ''
            const adSetNameKey =
              findKey(row, ['nama set iklan', 'ad set name', 'adset_name', 'nama_set_iklan', 'set iklan', 'adset']) || ''
            const startKey = findKey(row, ['awal pelaporan', 'reporting starts', 'start']) || ''
            const endKey = findKey(row, ['akhir pelaporan', 'reporting ends', 'end']) || ''

            const rawAdName = row[adNameKey]
            const adNameStr = rawAdName ? String(rawAdName).trim() : ''
            const lowerAdName = adNameStr.toLowerCase()

            // Lewati baris kosong / TOTAL / ringkasan agar tidak dobel hitung.
            if (
              !adNameStr ||
              lowerAdName === 'total' ||
              lowerAdName === 'jumlah' ||
              lowerAdName === 'summary' ||
              lowerAdName === 'hasil ringkasan' ||
              lowerAdName === 'total keseluruhan' ||
              lowerAdName === 'grand total' ||
              lowerAdName === 'overall total' ||
              lowerAdName.includes('hasil ringkasan') ||
              lowerAdName.includes('total keseluruhan') ||
              lowerAdName.includes('total campaign') ||
              lowerAdName.includes('total ad set') ||
              lowerAdName.includes('total iklan') ||
              lowerAdName.startsWith('total ') ||
              lowerAdName.endsWith(' total')
            ) {
              continue
            }

            parsed.push({
              adName: String(adNameStr).trim(),
              date: row[dateKey] ? String(row[dateKey]).trim() : '',
              timeSlot: row[timeSlotKey] ? String(row[timeSlotKey]).trim() : '',
              status: row[statusKey] ? String(row[statusKey]).trim() : '',
              level: row[levelKey] ? String(row[levelKey]).trim() : '',
              resultType: row[resultTypeKey] ? String(row[resultTypeKey]).trim() : '',
              results: parseNumber(row[resultsKey], decimalSep),
              costPerResult: Math.round(parseNumber(row[costPerResultKey], decimalSep) * 100) / 100,
              spend: parseNumber(row[spendKey], decimalSep),
              impressions: parseNumber(row[impressionsKey], decimalSep),
              reach: parseNumber(row[reachKey], decimalSep),
              attribution: row[attributionKey] ? String(row[attributionKey]).trim() : '',
              adSetName: row[adSetNameKey] ? String(row[adSetNameKey]).trim() : '',
              reportingStart: row[startKey] ? String(row[startKey]).trim() : '',
              reportingEnd: row[endKey] ? String(row[endKey]).trim() : '',
              raw: row,
            })
          }
          resolve(parsed)
        } catch (err) {
          reject(err)
        }
      },
      error: (err: Error) => {
        reject(err)
      },
    })
  })
}

/** Parse laporan pesanan Shopee Affiliate. */
export function parseShopeeAffiliate(csvText: string): Promise<ShopeeAffiliateRow[]> {
  const decimalSep = detectDecimalSeparator(csvText)
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data
          const parsed: ShopeeAffiliateRow[] = []

          for (const row of rows) {
            const orderIdKey = findKey(row, ['id pemesanan', 'order id', 'id_pemesanan', 'order_id', 'orderid']) || ''
            const rawOrderId = row[orderIdKey]
            if (!rawOrderId) continue // Lewati header/baris kosong

            const orderIdStr = String(rawOrderId).trim()
            const lowerOrderId = orderIdStr.toLowerCase()
            if (lowerOrderId === 'total' || lowerOrderId === 'jumlah' || lowerOrderId === 'summary' || lowerOrderId.includes('total') || lowerOrderId.includes('jumlah')) {
              continue // Lewati baris ringkasan/total
            }

            const orderStatusKey = findKey(row, ['status pesanan', 'order status', 'status_pesanan', 'order_status', 'status']) || ''
            const affiliateCodeKey = findKey(row, ['kode pesanan affiliate', 'affiliate code', 'affiliate_code', 'kode_affiliate']) || ''
            const orderTimeKey = findKey(row, ['waktu pemesanan', 'order time', 'order_time', 'tanggal pemesanan', 'order_date']) || ''
            const completeTimeKey = findKey(row, ['waktu terselesaikan', 'complete time', 'complete_time', 'tanggal terselesaikan']) || ''
            const clickTimeKey = findKey(row, ['waktu klik', 'click time', 'click_time']) || ''
            const shopNameKey = findKey(row, ['nama toko', 'shop name', 'nama_toko', 'shop_name']) || ''
            const shopIdKey = findKey(row, ['id shop', 'shop id', 'shop_id']) || ''
            const shopTypeKey = findKey(row, ['tipe toko', 'shop type', 'shop_type']) || ''
            const itemIdKey = findKey(row, ['id barang', 'item id', 'item_id', 'product_id']) || ''
            const itemNameKey = findKey(row, ['nama barange', 'nama barang', 'item name', 'product name', 'nama produk', 'nama_barang', 'nama_produk']) || ''
            const modelIdKey = findKey(row, ['id model', 'model id', 'model_id']) || ''
            const productTypeKey = findKey(row, ['tipe produk', 'product type', 'product_type']) || ''
            const promoIdKey = findKey(row, ['id promosi', 'promo id', 'promo_id']) || ''
            const catL1Key = findKey(row, ['l1 kategori', 'l1 category', 'l1_category']) || ''
            const catL2Key = findKey(row, ['l2 kategori', 'l2 category', 'l2_category']) || ''
            const catL3Key = findKey(row, ['l3 kategori', 'l3 category', 'l3_category']) || ''
            const priceKey = findKey(row, ['harga', 'price', 'harga_satuan']) || ''
            const quantityKey = findKey(row, ['jumlah', 'quantity', 'qty', 'kuantitas', 'jumlah_barang']) || ''
            const offerTypeKey = findKey(row, ['tipe penawaran', 'offer type', 'offer_type']) || ''
            const partnerCampaignKey = findKey(row, ['kampanye partnerr', 'partner campaign', 'partner_campaign']) || ''
            const purchaseValueKey = findKey(row, ['nilai pembelian', 'purchase value', 'purchase_value', 'nilai belanja', 'total belanja', 'total_pembelian']) || ''
            const refundKey = findKey(row, ['jumlah pengembalian', 'refund amount', 'refund_amount']) || ''

            // Kunci komisi.
            const shopeeCommPercentKey = findKey(row, ['persentase komisi shopee', 'shopee commission percent']) || ''
            const shopeeCommAmountKey = findKey(row, ['komisi barang shopee', 'shopee commission amount']) || ''
            const xtraCommPercentKey = findKey(row, ['persentase komisi xtra', 'xtra commission percent']) || ''
            const xtraCommAmountKey = findKey(row, ['komisi xtra', 'xtra commission amount']) || ''
            const totalCommProductKey = findKey(row, ['total komisi per produk', 'total commission per product']) || ''
            const shopeeCommOrderKey = findKey(row, ['komisi shopee per pesanan', 'shopee commission per order']) || ''
            const xtraCommOrderKey = findKey(row, ['komisi xtra per pesanan', 'xtra commission per order']) || ''
            const totalCommOrderKey = findKey(row, ['total komisi per pesanan', 'total commission per order']) || ''

            const mcnNameKey = findKey(row, ['nama mcn', 'mcn name']) || ''
            const mcnContractKey = findKey(row, ['id kontrak mcn', 'mcn contract id']) || ''
            const mcnFeePercentKey = findKey(row, ['persentase biaya manajemen mcn', 'mcn fee percent']) || ''
            const mcnFeeAmountKey = findKey(row, ['biaya manajemen mcn', 'mcn fee amount']) || ''
            const affiliateShareKey = findKey(row, ['persentase pembagian komisi affiliate', 'affiliate commission share percent']) || ''

            // Kolom utama pendapatan affiliate (dengan fallback ke total komisi pesanan).
            const netAffiliateCommKey =
              findKey(row, ['komisi bersih affiliate', 'net affiliate commission', 'komisi bersih']) || totalCommOrderKey || totalCommProductKey || ''

            const affiliateProductStatusKey = findKey(row, ['status produk affiliate', 'product affiliate status']) || ''
            const productNotesKey = findKey(row, ['catatan produk', 'product notes']) || ''
            const orderTypeKey = findKey(row, ['tipe pesanan', 'order type']) || ''
            const purchaseStatusKey = findKey(row, ['status pemebelian', 'purchase status', 'status pembelian']) || ''

            // Tag.
            const tag1Key = findKey(row, ['tag_link1', 'tag1']) || ''
            const tag2Key = findKey(row, ['tag_link2', 'tag2']) || ''
            const tag3Key = findKey(row, ['tag_link3', 'tag3']) || ''
            const tag4Key = findKey(row, ['tag_link4', 'tag4']) || ''
            const tag5Key = findKey(row, ['tag_link5', 'tag5']) || ''
            const platformKey = findKey(row, ['platform']) || ''

            parsed.push({
              orderId: String(row[orderIdKey]).trim(),
              orderStatus: row[orderStatusKey] ? String(row[orderStatusKey]).trim() : 'Unknown',
              affiliateCode: row[affiliateCodeKey] ? String(row[affiliateCodeKey]).trim() : '',
              orderTime: row[orderTimeKey] ? String(row[orderTimeKey]).trim() : '',
              completeTime: row[completeTimeKey] ? String(row[completeTimeKey]).trim() : '',
              clickTime: row[clickTimeKey] ? String(row[clickTimeKey]).trim() : '',
              shopName: row[shopNameKey] ? String(row[shopNameKey]).trim() : '',
              shopId: row[shopIdKey] ? String(row[shopIdKey]).trim() : '',
              shopType: row[shopTypeKey] ? String(row[shopTypeKey]).trim() : '',
              itemId: row[itemIdKey] ? String(row[itemIdKey]).trim() : '',
              itemName: row[itemNameKey] ? String(row[itemNameKey]).trim() : '',
              modelId: row[modelIdKey] ? String(row[modelIdKey]).trim() : '',
              productType: row[productTypeKey] ? String(row[productTypeKey]).trim() : '',
              promoId: row[promoIdKey] ? String(row[promoIdKey]).trim() : '',
              categoryL1: row[catL1Key] ? String(row[catL1Key]).trim() : '',
              categoryL2: row[catL2Key] ? String(row[catL2Key]).trim() : '',
              categoryL3: row[catL3Key] ? String(row[catL3Key]).trim() : '',
              price: parseNumber(row[priceKey], decimalSep),
              quantity: parseNumber(row[quantityKey], decimalSep),
              offerType: row[offerTypeKey] ? String(row[offerTypeKey]).trim() : '',
              partnerCampaign: row[partnerCampaignKey] ? String(row[partnerCampaignKey]).trim() : '',
              purchaseValue: parseNumber(row[purchaseValueKey], decimalSep),
              refundAmount: parseNumber(row[refundKey], decimalSep),
              shopeeCommissionPercent: row[shopeeCommPercentKey] ? String(row[shopeeCommPercentKey]).trim() : '',
              shopeeCommissionAmount: parseNumber(row[shopeeCommAmountKey], decimalSep),
              xtraCommissionPercent: row[xtraCommPercentKey] ? String(row[xtraCommPercentKey]).trim() : '',
              xtraCommissionAmount: parseNumber(row[xtraCommAmountKey], decimalSep),
              totalCommissionPerProduct: parseNumber(row[totalCommProductKey], decimalSep),
              shopeeCommissionPerOrder: parseNumber(row[shopeeCommOrderKey], decimalSep),
              xtraCommissionPerOrder: parseNumber(row[xtraCommOrderKey], decimalSep),
              totalCommissionPerOrder: parseNumber(row[totalCommOrderKey], decimalSep),
              mcnName: row[mcnNameKey] ? String(row[mcnNameKey]).trim() : '',
              mcnContractId: row[mcnContractKey] ? String(row[mcnContractKey]).trim() : '',
              mcnFeePercent: row[mcnFeePercentKey] ? String(row[mcnFeePercentKey]).trim() : '',
              mcnFeeAmount: parseNumber(row[mcnFeeAmountKey], decimalSep),
              affiliateCommissionSharePercent: row[affiliateShareKey] ? String(row[affiliateShareKey]).trim() : '',
              netAffiliateCommission: parseNumber(row[netAffiliateCommKey], decimalSep),
              affiliateProductStatus: row[affiliateProductStatusKey] ? String(row[affiliateProductStatusKey]).trim() : '',
              productNotes: row[productNotesKey] ? String(row[productNotesKey]).trim() : '',
              orderType: row[orderTypeKey] ? String(row[orderTypeKey]).trim() : '',
              purchaseStatus: row[purchaseStatusKey] ? String(row[purchaseStatusKey]).trim() : '',
              tag1: row[tag1Key] ? String(row[tag1Key]).trim() : '',
              tag2: row[tag2Key] ? String(row[tag2Key]).trim() : '',
              tag3: row[tag3Key] ? String(row[tag3Key]).trim() : '',
              tag4: row[tag4Key] ? String(row[tag4Key]).trim() : '',
              tag5: row[tag5Key] ? String(row[tag5Key]).trim() : '',
              platform: row[platformKey] ? String(row[platformKey]).trim() : '',
              raw: row,
            })
          }
          resolve(parsed)
        } catch (err) {
          reject(err)
        }
      },
      error: (err: Error) => {
        reject(err)
      },
    })
  })
}

/** Parse laporan klik Shopee (opsional). */
export function parseShopeeClicks(csvText: string): Promise<ShopeeClickRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data
          const parsed: ShopeeClickRow[] = []

          for (const row of rows) {
            const clickIdKey = findKey(row, ['klik id', 'click id', 'klik_id', 'click_id', 'klikid', 'clickid']) || ''
            const rawClickId = row[clickIdKey]
            if (!rawClickId) continue // Lewati baris kosong

            const clickIdStr = String(rawClickId).trim()
            const lowerClickId = clickIdStr.toLowerCase()
            if (lowerClickId === 'total' || lowerClickId === 'jumlah' || lowerClickId === 'summary' || lowerClickId.includes('total') || lowerClickId.includes('jumlah')) {
              continue
            }

            const clickTimeKey = findKey(row, ['waktu klik', 'click time', 'waktu_klik', 'click_time']) || ''
            const clickRegionKey = findKey(row, ['wilayah klik', 'click region', 'wilayah_klik', 'click_region', 'wilayah']) || ''
            const tagLinkKey = findKey(row, ['tag_link', 'tag link', 'tag_link', 'tag']) || ''
            const referrerKey = findKey(row, ['perujuk', 'referrer']) || ''

            parsed.push({
              clickId: clickIdStr,
              clickTime: row[clickTimeKey] ? String(row[clickTimeKey]).trim() : '',
              clickRegion: row[clickRegionKey] ? String(row[clickRegionKey]).trim() : '',
              tagLink: row[tagLinkKey] ? String(row[tagLinkKey]).trim() : '',
              referrer: row[referrerKey] ? String(row[referrerKey]).trim() : '',
              raw: row,
            })
          }
          resolve(parsed)
        } catch (err) {
          reject(err)
        }
      },
      error: (err: Error) => {
        reject(err)
      },
    })
  })
}

/** Logika pencocokan dinamis: meta ads ↔ tag shopee. */
export function processAndMatchData(
  metaAds: MetaAdRow[],
  shopeeOrders: ShopeeAffiliateRow[],
  mappingRule: 'contains' | 'exact' = 'contains',
  shopeeClicks: ShopeeClickRow[] = []
): {
  mappedCampaigns: MappedCampaign[]
  unmappedAds: UnmappedAd[]
  unmappedOrders: UnmappedOrder[]
  totalMetrics: TotalMetrics
} {
  // 1. Kumpulkan semua tag unik dari pesanan & klik.
  const activeTagsSet = new Set<string>()
  shopeeOrders.forEach((o) => {
    ;[o.tag1, o.tag2, o.tag3, o.tag4, o.tag5].forEach((tag) => {
      if (tag && tag.trim()) {
        activeTagsSet.add(tag.trim().toLowerCase())
      }
    })
  })

  shopeeClicks.forEach((c) => {
    if (c.tagLink && c.tagLink.trim()) {
      const clean = c.tagLink.trim().toLowerCase().replace(/[-_]+$/, '')
      if (clean) {
        activeTagsSet.add(clean)
      }
    }
  })

  const activeTags = Array.from(activeTagsSet)

  // 2. Lacak iklan Meta yang sudah cocok.
  const matchedAdIndexes = new Set<number>()

  // Kelompokkan iklan per tag kampanye.
  const mappedCampaignsMap = new Map<string, MappedCampaign>()

  // Kelompokkan pesanan Shopee per tag aktif (tag pertama yang valid).
  const shopeeOrdersByTag = new Map<string, ShopeeAffiliateRow[]>()
  shopeeOrders.forEach((order) => {
    const orderTags = [order.tag1, order.tag2, order.tag3, order.tag4, order.tag5]
      .map((t) => t.trim().toLowerCase())
      .filter((t) => !!t)

    let matchedTag: string | null = null
    for (const tag of orderTags) {
      if (tag) {
        matchedTag = tag
        break
      }
    }

    if (matchedTag) {
      if (!shopeeOrdersByTag.has(matchedTag)) {
        shopeeOrdersByTag.set(matchedTag, [])
      }
      shopeeOrdersByTag.get(matchedTag)!.push(order)
    }
  })

  // Cocokkan iklan Meta ke tag.
  metaAds.forEach((ad, adIdx) => {
    const adNameLower = ad.adName.toLowerCase()
    const adSetNameLower = ad.adSetName.toLowerCase()

    let matchedTag: string | null = null
    for (const tag of activeTags) {
      if (mappingRule === 'exact') {
        if (adNameLower === tag || adSetNameLower === tag) {
          matchedTag = tag
          break
        }
      } else if (adNameLower.includes(tag) || adSetNameLower.includes(tag)) {
        matchedTag = tag
        break
      }
    }

    if (matchedTag) {
      matchedAdIndexes.add(adIdx)

      const key = matchedTag
      const associatedOrders = shopeeOrdersByTag.get(matchedTag) || []

      if (!mappedCampaignsMap.has(key)) {
        mappedCampaignsMap.set(key, {
          id: key,
          adName: ad.adName,
          adNames: [ad.adName],
          adSetName: ad.adSetName,
          matchedTag,
          spend: 0,
          clicks: 0,
          impressions: 0,
          ordersCount: associatedOrders.length,
          commission: associatedOrders.reduce((sum, o) => sum + o.netAffiliateCommission, 0),
          salesValue: associatedOrders.reduce((sum, o) => sum + o.purchaseValue, 0),
          roi: 0,
          cpa: 0,
          cpc: 0,
          conversionRate: 0,
          orderIds: associatedOrders.map((o) => o.orderId),
        })
      }

      const campaign = mappedCampaignsMap.get(key)!
      campaign.spend += ad.spend
      campaign.clicks += ad.results || 0
      campaign.impressions += ad.impressions
      if (!campaign.adNames.includes(ad.adName)) {
        campaign.adNames.push(ad.adName)
      }
    }
  })

  // Hitung turunan untuk kampanye terpetakan.
  const isClickMatch = (clickTag: string, campaignTag: string) => {
    const cTag = clickTag.trim().toLowerCase()
    const campTag = campaignTag.trim().toLowerCase()
    if (cTag === campTag) return true
    const cleanedClickTag = cTag.replace(/[-_]+$/, '')
    if (cleanedClickTag === campTag) return true
    return cTag.includes(campTag) || campTag.includes(cTag)
  }

  const mappedCampaigns = Array.from(mappedCampaignsMap.values())
  mappedCampaigns.forEach((c) => {
    c.roi = Math.round((c.spend > 0 ? (c.commission / c.spend) * 100 : 0) * 100) / 100
    c.cpa = Math.round((c.ordersCount > 0 ? c.spend / c.ordersCount : 0) * 100) / 100
    c.cpc = Math.round((c.clicks > 0 ? c.spend / c.clicks : 0) * 100) / 100
    c.conversionRate = Math.round((c.clicks > 0 ? (c.ordersCount / c.clicks) * 100 : 0) * 100) / 100

    // Hitung klik Shopee untuk kampanye ini.
    const campaignClicks = shopeeClicks.filter((click) => isClickMatch(click.tagLink, c.matchedTag))
    c.shopeeClicksCount = campaignClicks.length
  })

  // 3. Iklan Meta tidak terpetakan.
  const unmappedAds: UnmappedAd[] = []
  metaAds.forEach((ad, idx) => {
    if (!matchedAdIndexes.has(idx)) {
      unmappedAds.push({
        adName: ad.adName,
        adSetName: ad.adSetName,
        spend: ad.spend,
        clicks: ad.results || 0,
        date: ad.date,
      })
    }
  })

  // 4. Pesanan Shopee tidak terpetakan (tanpa tag / tag tak cocok iklan aktif).
  const unmappedOrders: UnmappedOrder[] = []
  shopeeOrders.forEach((order) => {
    const orderTags = [order.tag1, order.tag2, order.tag3, order.tag4, order.tag5]
      .map((t) => t.trim())
      .filter((t) => !!t)

    let hasActiveAdMatch = false
    for (const tag of orderTags) {
      const tagLower = tag.toLowerCase()
      if (mappedCampaigns.some((c) => c.matchedTag === tagLower)) {
        hasActiveAdMatch = true
        break
      }
    }

    if (!hasActiveAdMatch) {
      unmappedOrders.push({
        orderId: order.orderId,
        orderTime: order.orderTime,
        itemName: order.itemName,
        netAffiliateCommission: order.netAffiliateCommission,
        tags: orderTags,
        orderStatus: order.orderStatus,
      })
    }
  })

  // 5. Metrik global.
  const totalSpend = metaAds.reduce((sum, ad) => sum + ad.spend, 0)
  const totalCommission = shopeeOrders.reduce((sum, o) => sum + o.netAffiliateCommission, 0)
  const netProfit = totalCommission - totalSpend
  const roi = Math.round((totalSpend > 0 ? (totalCommission / totalSpend) * 100 : 0) * 100) / 100
  const totalClicks = metaAds.reduce((sum, ad) => sum + (ad.results || 0), 0)
  const totalShopeeClicks = shopeeClicks.length > 0 ? new Set(shopeeClicks.map((c) => c.clickId).filter(Boolean)).size : 0
  const totalImpressions = metaAds.reduce((sum, ad) => sum + ad.impressions, 0)
  const totalOrders = shopeeOrders.length
  const conversionRate = Math.round((totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0) * 100) / 100
  const averageCpc = Math.round((totalClicks > 0 ? totalSpend / totalClicks : 0) * 100) / 100
  const cpa = Math.round((totalOrders > 0 ? totalSpend / totalOrders : 0) * 100) / 100

  const totalMetrics: TotalMetrics = {
    totalSpend,
    totalCommission,
    netProfit,
    roi,
    totalClicks,
    totalShopeeClicks,
    totalImpressions,
    totalOrders,
    conversionRate,
    averageCpc,
    cpa,
  }

  return { mappedCampaigns, unmappedAds, unmappedOrders, totalMetrics }
}

/** Filter baris berdasarkan rentang tanggal (YYYY-MM-DD). */
export function filterByDateRange<T extends { date?: string; orderTime?: string; clickTime?: string }>(
  rows: T[],
  startDate: string | null,
  endDate: string | null,
  dateField: 'date' | 'orderTime' | 'clickTime' = 'date'
): T[] {
  if (!startDate && !endDate) return rows

  return rows.filter((row) => {
    const rawDate = (row as Record<string, unknown>)[dateField]
    if (!rawDate) return false
    const dateStr = String(rawDate).trim().split(/[ T]/)[0]
    if (!dateStr) return false

    if (startDate && dateStr < startDate) return false
    if (endDate && dateStr > endDate) return false
    return true
  })
}

/** Hitung performa harian (+ breakdown per jam) dari seluruh data. */
export function calculateDailyPerformance(
  metaAds: MetaAdRow[],
  shopeeOrders: ShopeeAffiliateRow[],
  shopeeClicks: ShopeeClickRow[]
): DailyPerformanceRow[] {
  const datesSet = new Set<string>()

  const extractDate = (dateTimeStr: string): string => {
    if (!dateTimeStr) return ''
    const parts = dateTimeStr.trim().split(/[ T]/)
    return parts[0] || ''
  }

  const extractHour = (str: string): string => {
    if (!str) return ''
    const clean = str.trim()

    // Tanggal-waktu penuh (mis. "2026-07-10 23:55:39").
    const parts = clean.split(/[ T]+/)
    if (parts.length > 1 && parts[1] && parts[1].includes(':')) {
      const timeParts = parts[1].split(':')
      if (timeParts[0]) {
        return `${timeParts[0].padStart(2, '0')}:00`
      }
    }

    // Hanya waktu / slot waktu (mis. "23:00:00 - 23:59:59").
    if (clean.includes(':')) {
      const match = clean.match(/^(\d{1,2})/)
      if (match) {
        return `${match[1].padStart(2, '0')}:00`
      }
    }

    return ''
  }

  metaAds.forEach((ad) => {
    const d = extractDate(ad.date)
    if (d) datesSet.add(d)
  })
  shopeeOrders.forEach((o) => {
    const d = extractDate(o.orderTime)
    if (d) datesSet.add(d)
  })
  shopeeClicks.forEach((c) => {
    const d = extractDate(c.clickTime)
    if (d) datesSet.add(d)
  })

  const uniqueDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a)) // Terbaru dulu.

  return uniqueDates.map((dateStr) => {
    const dayMeta = metaAds.filter((ad) => extractDate(ad.date) === dateStr)
    const metaSpend = dayMeta.reduce((sum, ad) => sum + ad.spend, 0)
    const metaClicks = dayMeta.reduce((sum, ad) => sum + (ad.results || 0), 0)

    const dayOrders = shopeeOrders.filter((o) => extractDate(o.orderTime) === dateStr)
    const ordersCount = dayOrders.length
    const commission = dayOrders.reduce((sum, o) => sum + o.netAffiliateCommission, 0)

    let shopeeClicksCount = shopeeClicks.filter((c) => extractDate(c.clickTime) === dateStr).length
    if (shopeeClicks.length === 0) {
      shopeeClicksCount = new Set(dayOrders.map((o) => o.clickTime).filter(Boolean)).size
    }

    // Breakdown per jam.
    const hourlyMap = new Map<string, HourlyPerformanceRow>()

    dayOrders.forEach((o) => {
      const h = extractHour(o.orderTime) || 'Lainnya/Harian'
      let row = hourlyMap.get(h)
      if (!row) {
        row = { hour: h, metaSpend: 0, metaClicks: 0, shopeeClicks: 0, ordersCount: 0, commission: 0 }
        hourlyMap.set(h, row)
      }
      row.ordersCount += 1
      row.commission += o.netAffiliateCommission
    })

    const dayClicks = shopeeClicks.filter((c) => extractDate(c.clickTime) === dateStr)
    dayClicks.forEach((c) => {
      const h = extractHour(c.clickTime) || 'Lainnya/Harian'
      let row = hourlyMap.get(h)
      if (!row) {
        row = { hour: h, metaSpend: 0, metaClicks: 0, shopeeClicks: 0, ordersCount: 0, commission: 0 }
        hourlyMap.set(h, row)
      }
      row.shopeeClicks += 1
    })

    dayMeta.forEach((ad) => {
      const h = extractHour(ad.timeSlot) || extractHour(ad.date) || 'Lainnya/Harian'
      let row = hourlyMap.get(h)
      if (!row) {
        row = { hour: h, metaSpend: 0, metaClicks: 0, shopeeClicks: 0, ordersCount: 0, commission: 0 }
        hourlyMap.set(h, row)
      }
      row.metaSpend += ad.spend
      row.metaClicks += ad.results || 0
    })

    const hourlyPerformance = Array.from(hourlyMap.entries())
      .map(([key, row]) => {
        let displayHour = key
        if (key === 'Lainnya/Harian') {
          displayHour = 'Meta & Umum (Harian)'
        } else {
          const hh = parseInt(key.split(':')[0])
          if (!isNaN(hh)) {
            const nextH = (hh + 1) % 24
            const pad = (num: number) => num.toString().padStart(2, '0')
            displayHour = `${pad(hh)}:00 - ${pad(nextH)}:00`
          }
        }
        return { ...row, hour: displayHour, sortKey: key === 'Lainnya/Harian' ? '99:99' : key }
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((row) => {
        const { sortKey, ...rest } = row
        void sortKey
        return rest
      })

    const profit = commission - metaSpend
    const roi = Math.round((metaSpend > 0 ? (commission / metaSpend) * 100 : 0) * 100) / 100

    return {
      date: dateStr,
      metaSpend,
      metaClicks,
      shopeeClicks: shopeeClicksCount,
      ordersCount,
      commission,
      profit,
      roi,
      hourlyPerformance,
    }
  })
}
