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

/** Format tanggal "YYYY-MM-DD" menjadi "10 Jul 2026" (id-ID). */
export function formatDateID(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
