import { useEffect, useRef, useState } from 'react'

/**
 * State yang dipersist ke `localStorage` (per instalasi/pengguna di Electron —
 * tersimpan otomatis di folder userData, bertahan saat app ditutup & dibuka lagi).
 *
 * - Nilai awal dibaca secara LAZY dari storage → langsung aktif tanpa flash.
 * - Setiap perubahan disimpan otomatis (kecuali masih sama dengan default).
 * - Saat nilai kembali ke default, key dihapus dari storage (bersih, dan bila
 *   default diubah di kode, nilai lama tidak mengunci).
 * - Semua akses storage dibungkus try/catch (aman di private/read-only mode).
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return defaultValue
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
    }
  })

  // Hindari menulis ulang nilai yang baru saja dibaca saat mount.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    try {
      const sameAsDefault = JSON.stringify(value) === JSON.stringify(defaultValue)
      if (sameAsDefault) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      // Abaikan (mis. storage penuh / mode privat).
    }
  }, [key, value, defaultValue])

  return [value, setValue]
}

/** Menghapus satu nilai tersimpan (bila diperlukan). */
export function clearPersistedValue(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Abaikan.
  }
}
