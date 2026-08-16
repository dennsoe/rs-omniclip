/** Helper format angka & tanggal untuk fitur "Performa Kampanye". */

/** Format angka menjadi Rupiah (mis. "Rp 1.250.000"). */
export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

/** Format angka polos dengan pemisah ribuan lokal Indonesia. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(value || 0)
}

/**
 * Label status pesanan Shopee untuk TAMPILAN (data mentah tidak diubah).
 * "Tertunda" → "Diproses" — dipakai di kartu filter status, pie chart, dan tabel.
 */
export function displayOrderStatus(status: string): string {
  const l = (status || '').toLowerCase()
  if (l === 'tertunda' || l.includes('tertunda')) return 'Diproses'
  return status
}

// ---------------------------------------------------------------------------
// Tanggal — konsisten untuk SELURUH fitur (baku: Agustus → "Agt").
// Parsing LOKAL (hindari pergeseran UTC) agar tidak berubah per zona waktu.
// ---------------------------------------------------------------------------

/** Nama bulan pendek Indonesia (baku: "Agt" untuk Agustus). */
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

/** Nama bulan penuh Indonesia. */
export const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** Nama hari pendek Indonesia (indeks 0 = Minggu). */
export const WEEKDAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** Parse "YYYY-MM-DD" menjadi Date LOKAL; null bila tidak valid. */
function parseDateLocal(dateStr: string): Date | null {
  if (!dateStr) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return Number.isNaN(d.getTime()) ? null : d
}

/** Format "YYYY-MM-DD" menjadi "10 Jul 2026" (lokal, konsisten "Agt"). */
export function formatDateID(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  if (!d) return dateStr || '-'
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** Format "YYYY-MM-DD" menjadi "Jum, 10 Jul 2026" (lokal, konsisten "Agt"). */
export function formatDateFullID(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  if (!d) return dateStr || '-'
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}
