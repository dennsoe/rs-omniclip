/* eslint-disable @typescript-eslint/no-require-imports */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

/**
 * Hook `afterSign` electron-builder — GRATIS, tanpa Developer ID / notarisasi.
 *
 * Masalah: build dengan `CSC_IDENTITY_AUTO_DISCOVERY=false` membuat binary
 * Electron Framework/helper tetap `linker-signed` + bundle tidak ter-seal.
 * Di macOS 26+, `codesign --deep` TIDAK rekursif penuh dan `spctl` melaporkan
 * "internal error in Code Signing subsystem" -> app tidak bisa dibuka.
 *
 * Solusi: tanda tangan ulang adhoc yang KONSISTEN dengan urutan DALAM-KE-LUAR:
 *   1) semua .dylib + binary versioned framework
 *   2) semua bundle .framework
 *   3) semua helper .app (di dalam Helpers)
 *   4) bundle app utama (mensegel executable utama + seluruh resources)
 *
 * Hook ini berjalan SETELAH .app di-package (appOutDir) dan SEBELUM DMG/zip
 * dibuat, sehingga artefak rilis berisi app yang sudah di-sign dengan benar.
 */
exports.default = async function afterSign(context) {
  const { appOutDir, packager } = context
  const appName = packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)

  if (!fs.existsSync(appPath)) {
    throw new Error(`[afterSign] App tidak ditemukan: ${appPath}`)
  }

  const binaries = []
  const bundles = []

  // Kumpulkan .dylib di dalam folder Libraries suatu framework.
  function collectLibraries(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) collectLibraries(full)
      else if (e.name.endsWith('.dylib')) binaries.push(full)
    }
  }

  // Jelajahi bundle: framework (binary + bundle), helper app (rekursif + bundle).
  function processDir(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name.endsWith('.framework')) {
          const base = path.basename(e.name, '.framework')
          const v = path.join(full, 'Versions', 'A')
          const bin = path.join(v, base)
          collectLibraries(path.join(v, 'Libraries'))
          if (fs.existsSync(bin)) binaries.push(bin)
          bundles.push(full)
        } else if (e.name.endsWith('.app')) {
          processDir(full)
          bundles.push(full)
        } else {
          processDir(full)
        }
      } else if (e.name.endsWith('.dylib')) {
        binaries.push(full)
      }
    }
  }

  processDir(appPath)

  const sign = (target, label) => {
    console.log(`[afterSign] Adhoc sign: ${label}`)
    execFileSync('codesign', ['--force', '--sign', '-', target], { stdio: 'inherit' })
  }

  for (const b of binaries) sign(b, `binary ${path.basename(b)}`)
  for (const b of bundles) sign(b, `bundle ${path.basename(b)}`)
  sign(appPath, `app ${appName}.app`)

  // Verifikasi menyeluruh — gagalkan build bila masih ada yang rusak.
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
  console.log(`[afterSign] Adhoc signing selesai & terverifikasi: ${appPath} (${binaries.length} binaries, ${bundles.length} bundle)`)
}
