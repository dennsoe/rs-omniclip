/**
 * Utilitas CSV tingkat rendah untuk fitur "Performa Kampanye".
 * - `findKey`: pencocokan nama kolom secara fuzzy (persis → parsial) dengan
 *   istilah generik yang diproteksi agar tidak "mencuri" kolom lain.
 * - `detectDecimalSeparator`: deteksi pemisah desimal (`.` vs `,`) agar
 *   format angka Indonesia (ribuan titik / desimal koma) terbaca benar.
 * - `parseNumber`: parsing angka lokal (Rp, persen, ribuan).
 *
 * Diport dari repo rs-9 dan dipisahkan agar mudah dipindah ke main process
 * bila CSV sangat besar (parse via Node fs, kirim hasil lewat IPC).
 */

/** Cari kunci kolom secara case-insensitive; utamakan cocok persis. */
export function findKey(row: Record<string, unknown>, searchTerms: string[]): string | null {
  const keys = Object.keys(row)

  // 1. Coba cocok persis dulu di semua istilah.
  for (const term of searchTerms) {
    const cleanTerm = term.trim().toLowerCase()
    const found = keys.find((key) => key.trim().toLowerCase() === cleanTerm)
    if (found) return found
  }

  // 2. Coba cocok parsial, kecuali istilah generik yang dilindungi
  //    (hanya boleh cocok persis agar tidak menangkap kolom lain).
  const protectedTerms = ['hasil', 'biaya', 'klik', 'komisi', 'level', 'tag', 'status', 'date', 'tanggal']

  for (const term of searchTerms) {
    const cleanTerm = term.trim().toLowerCase()
    if (protectedTerms.includes(cleanTerm)) continue
    const found = keys.find((key) => key.trim().toLowerCase().includes(cleanTerm))
    if (found) return found
  }

  // 3. Upaya terakhir: izinkan parsial bahkan untuk istilah generik.
  for (const term of searchTerms) {
    const cleanTerm = term.trim().toLowerCase()
    const found = keys.find((key) => key.trim().toLowerCase().includes(cleanTerm))
    if (found) return found
  }

  return null
}

/** Deteksi pemisah desimal dari isi CSV (`.` atau `,`). */
export function detectDecimalSeparator(csvText: string): '.' | ',' {
  // Persen dengan titik desimal, mis. "1.50%" / "100.00%".
  if (/\d+\.\d+%/i.test(csvText)) return '.'
  // Persen dengan koma desimal, mis. "1,50%" / "100,00%".
  if (/\d+,\d+%/i.test(csvText)) return ','
  // Titik diikuti >3 digit, mis. "26.36273115".
  if (/\d+\.\d{4,}/.test(csvText)) return '.'
  // Koma diikuti >3 digit, mis. "26,36273115".
  if (/\d+,\d{4,}/.test(csvText)) return ','
  // Default titik (format standar ekspor Meta/Shopee).
  return '.'
}

/** Parsing angka lokal (mis. "Rp 12.000,50", "8,546,057.00", "5.00%"). */
export function parseNumber(val: unknown, decimalSep: '.' | ',' = '.'): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val

  let str = String(val).trim()
  if (!str || str === '-' || str === '--') return 0

  // Hapus awalan mata uang "Rp", "IDR", "$" atau spasi.
  str = str.replace(/^(Rp|IDR|\$)\s*/i, '')

  // Persen (mis. "5.00%").
  if (str.endsWith('%')) {
    str = str.replace('%', '').trim()
    if (decimalSep === ',') {
      str = str.replace(/\./g, '').replace(/,/g, '.')
    } else {
      str = str.replace(/,/g, '')
    }
    return (parseFloat(str) || 0) / 100
  }

  // Bersihkan selain digit, titik, koma, minus.
  const cleaned = str.replace(/[^\d,.-]/g, '')
  if (!cleaned) return 0

  if (decimalSep === '.') {
    // Titik = pemisah desimal → koma = pemisah ribuan (hapus).
    return parseFloat(cleaned.replace(/,/g, '')) || 0
  }
  // Koma = pemisah desimal → titik = pemisah ribuan (hapus), koma → titik.
  return parseFloat(cleaned.replace(/\./g, '').replace(/,/g, '.')) || 0
}
