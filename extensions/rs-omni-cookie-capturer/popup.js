// RS OmniTools — Cookie Capturer
// Mengambil cookie sesi dari situs yang dipilih lalu mengirimnya ke aplikasi
// desktop RS OmniTools via jembatan lokal (127.0.0.1). Token diambil dari
// "kode hubung" yang ditampilkan aplikasi — ditempel sekali, disimpan lokal.

'use strict'

/** Situs yang didukung + kunci sesi untuk validasi. */
const SITES = {
  douyin: {
    label: 'Douyin',
    urls: ['https://www.douyin.com/', 'https://www.iesdouyin.com/'],
    sessionKeys: ['ttwid', 'msToken', 'odin_tt', 'passport_csrf_token', 'sid_guard']
  },
  tiktok: {
    label: 'TikTok',
    urls: ['https://www.tiktok.com/'],
    sessionKeys: ['sessionid', 'sessionid_ss', 'sid_tt', 'uid_tt', 'uid_tt_ss', 'passport_csrf_token']
  }
}

const APP_HOST = '127.0.0.1'

// --- Elemen DOM ---
const $ = (id) => document.getElementById(id)
const siteSel = $('site')
const codeInput = $('code')
const captureBtn = $('capture')
const saveBtn = $('saveCode')
const checkBtn = $('check')
const copyBtn = $('copy')
const statusEl = $('status')
const statusDot = $('statusDot')

function setStatus(text, kind) {
  statusEl.textContent = text
  statusEl.className = 'status' + (kind ? ' ' + kind : '')
}

function setPill(on) {
  statusDot.textContent = on ? 'Terhubung' : 'Tidak terhubung'
  statusDot.classList.toggle('on', Boolean(on))
}

/** Membaca kode hubung `port:token` dari storage lokal. */
async function getBridgeCode() {
  const data = await chrome.storage.local.get('bridgeCode')
  return typeof data.bridgeCode === 'string' ? data.bridgeCode.trim() : ''
}

/** Memecah kode hubung menjadi { port, token } atau null bila tidak valid. */
function parseCode(code) {
  const m = /^(\d{1,5}):([0-9a-f]{16,})$/i.exec(String(code || '').trim())
  if (!m) return null
  return { port: m[1], token: m[2] }
}

/**
 * Membangun header Cookie persis seperti yang dikirim browser ke situs:
 * dedupe per nama (ambil path terpanjang / terlama), lalu urutkan path
 * menurun — urutan yang sama dengan header asli.
 */
async function buildCookieHeader(siteId) {
  const site = SITES[siteId]
  if (!site) throw new Error('Situs tidak dikenal.')

  const byName = new Map()
  for (const url of site.urls) {
    const cookies = await chrome.cookies.getAll({ url })
    for (const c of cookies) {
      const prev = byName.get(c.name)
      if (
        !prev ||
        c.path.length > prev.path.length ||
        (c.path.length === prev.path.length && c.creationDate > prev.creationDate)
      ) {
        byName.set(c.name, c)
      }
    }
  }

  const list = Array.from(byName.values()).sort(
    (a, b) => b.path.length - a.path.length || b.creationDate - a.creationDate
  )
  return {
    header: list.map((c) => `${c.name}=${c.value}`).join('; '),
    count: list.length,
    sessionKeys: site.sessionKeys.filter((k) => byName.has(k))
  }
}

/** Mengirim cookie ke jembatan lokal aplikasi. */
async function sendToApp(siteId, cookieHeader) {
  const code = await getBridgeCode()
  const parsed = parseCode(code)
  if (!parsed) {
    throw Object.assign(new Error('Kode hubung belum valid.'), { code: 'NO_CODE' })
  }

  const res = await fetch(`http://${APP_HOST}:${parsed.port}/api/cookies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: siteId, cookieHeader, token: parsed.token })
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    throw Object.assign(new Error('Kode hubung ditolak — salin ulang dari aplikasi.'), { code: 'UNAUTHORIZED' })
  }
  if (!res.ok) {
    throw new Error(data && data.error ? `Aplikasi menolak: ${data.error}` : `Gagal terkirim (HTTP ${res.status}).`)
  }
  return data
}

/** Cek apakah aplikasi menerima koneksi (GET /api/health). */
async function checkApp() {
  const code = await getBridgeCode()
  const parsed = parseCode(code)
  if (!parsed) throw Object.assign(new Error('Kode hubung belum valid.'), { code: 'NO_CODE' })
  const res = await fetch(`http://${APP_HOST}:${parsed.port}/api/health`)
  if (!res.ok) throw new Error(`Jembatan menolak (HTTP ${res.status}).`)
  return true
}

function busy(b) {
  captureBtn.disabled = b
  saveBtn.disabled = b
  checkBtn.disabled = b
  copyBtn.disabled = b
}

// --- Aksi UI ---

async function handleCapture() {
  const siteId = siteSel.value
  const site = SITES[siteId]
  busy(true)
  setStatus(`Membaca cookie ${site.label}…`)
  try {
    const { header, count, sessionKeys } = await buildCookieHeader(siteId)
    if (!header) {
      setStatus(`Tidak ada cookie ${site.label} di browser ini. Buka & login dulu di ${site.label}.`, 'warn')
      return
    }
    const data = await sendToApp(siteId, header)
    if (data.hasSession) {
      setStatus(`Terkirim: ${data.count} cookie + sesi terdeteksi. Cek aplikasi — kolom terisi otomatis.`, 'ok')
    } else {
      setStatus(`Terkirim: ${data.count} cookie, tapi kunci sesi utama belum lengkap (${sessionKeys.join(', ') || 'perlu login'}).`, 'warn')
    }
    setPill(true)
  } catch (err) {
    if (err && err.code === 'NO_CODE') {
      setStatus('Atur kode hubung dulu — salin dari aplikasi lalu Simpan.', 'err')
    } else if (err && err.code === 'UNAUTHORIZED') {
      setStatus(err.message, 'err')
    } else {
      setStatus(err.message || 'Gagal mengirim cookie.', 'err')
    }
    setPill(false)
  } finally {
    busy(false)
  }
}

function handleSaveCode() {
  const value = codeInput.value.trim()
  if (!parseCode(value)) {
    setStatus('Format kode tidak valid — harus berupa "port:token".', 'err')
    return
  }
  chrome.storage.local.set({ bridgeCode: value }, () => {
    setStatus('Kode hubung disimpan.', 'ok')
  })
}

async function handleCheck() {
  busy(true)
  setStatus('Memeriksa koneksi ke aplikasi…')
  try {
    await checkApp()
    setPill(true)
    setStatus('Aplikasi RS OmniTools terhubung.', 'ok')
  } catch (err) {
    setPill(false)
    if (err && err.code === 'NO_CODE') {
      setStatus('Atur kode hubung dulu.', 'err')
    } else {
      setStatus('Aplikasi tidak terhubung — pastikan RS OmniTools terbuka.', 'err')
    }
  } finally {
    busy(false)
  }
}

async function handleCopy() {
  const siteId = siteSel.value
  const site = SITES[siteId]
  busy(true)
  setStatus(`Menyalin cookie ${site.label}…`)
  try {
    const { header, count } = await buildCookieHeader(siteId)
    if (!header) {
      setStatus(`Tidak ada cookie ${site.label} di browser ini.`, 'warn')
      return
    }
    await navigator.clipboard.writeText(header)
    setStatus(`Disalin: ${count} cookie — tempel manual di aplikasi bila perlu.`, 'ok')
  } catch (err) {
    setStatus(err.message || 'Gagal menyalin cookie.', 'err')
  } finally {
    busy(false)
  }
}

// --- Inisialisasi ---
async function init() {
  // Tampilkan versi ekstensi (dari manifest — satu sumber kebenaran).
  const verEl = document.getElementById('ver')
  if (verEl && chrome.runtime && chrome.runtime.getManifest) {
    const v = chrome.runtime.getManifest().version
    verEl.textContent = 'RS OmniTools Cookie Capturer · v' + v
  }

  // Muat kode yang tersimpan.
  const code = await getBridgeCode()
  if (code) codeInput.value = code

  // Periksa koneksi aplikasi (status titik).
  try {
    await checkApp()
    setPill(true)
  } catch {
    setPill(false)
  }
}

captureBtn.addEventListener('click', () => void handleCapture())
saveBtn.addEventListener('click', handleSaveCode)
checkBtn.addEventListener('click', () => void handleCheck())
copyBtn.addEventListener('click', () => void handleCopy())
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSaveCode()
})

void init()
