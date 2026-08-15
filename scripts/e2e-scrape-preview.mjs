/* E2E fitur "Akun/Halaman" pada instance Electron CDP (port 9222):
   scrape akun TikTok asli → item + durasi → thumbnail lazy (saat terlihat /
   saat scroll) → klik kartu → modal preview memutar video.
   Jalankan: node scripts/e2e-scrape-preview.mjs  (instance harus di port 9222) */
import http from 'node:http'

const getJson = (url) =>
  new Promise((res, rej) => {
    http
      .get(url, (r) => {
        let d = ''
        r.on('data', (c) => (d += c))
        r.on('end', () => {
          try { res(JSON.parse(d)) } catch (e) { rej(e) }
        })
      })
      .on('error', rej)
  })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const targets = await getJson('http://127.0.0.1:9222/json')
  const page = targets.find((t) => t.type === 'page')
  if (!page) { console.log('NO PAGE TARGET'); process.exit(1) }
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const call = (method, params) =>
    new Promise((res) => {
      const myId = ++id
      const h = (ev) => {
        const m = JSON.parse(ev.data)
        if (m.id === myId) { ws.removeEventListener('message', h); res(m) }
      }
      ws.addEventListener('message', h)
      ws.send(JSON.stringify({ id: myId, method, params }))
    })
  const evalJs = async (expr) => {
    const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return 'ERR ' + JSON.stringify(r.result.exceptionDetails.exception?.description || '').slice(0, 150)
    return r.result?.result?.value
  }
  const countThumbs = () =>
    evalJs(`(() => { const imgs = Array.from(document.querySelectorAll('button[data-url] img')); return { loaded: imgs.filter(x=>x.complete&&x.naturalWidth>0).length, withImg: imgs.length, total: document.querySelectorAll('button[data-url]').length }; })()`)
  const scrollResults = (pct) =>
    evalJs(`(() => { const sc = Array.from(document.querySelectorAll('*')).find(e => e.querySelector('button[data-url]') && e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY === 'auto'); if (sc) sc.scrollTop = sc.scrollHeight * ${pct}; return !!sc })()`)

  const out = {}
  await evalJs(`(() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('Pengunduh Video')); if(b)b.click(); return !!b })()`)
  await sleep(700)
  await evalJs(`(() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Akun / Halaman'); if(b)b.click(); return !!b })()`)
  await sleep(400)
  await evalJs(`(() => { const i=document.querySelector('input[type="url"]'); if(!i)return false; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(i,'https://www.tiktok.com/@tatappmataojann'); i.dispatchEvent(new Event('input',{bubbles:true})); return true })()`)
  await sleep(200)
  await evalJs(`(() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Ambil Daftar'); if(b)b.click(); return !!b })()`)
  for (let i = 0; i < 30; i++) {
    await sleep(2000)
    const n = await evalJs(`(document.body.innerText.match(/(\\d+) video ditemukan/)||[])[1]`)
    if (n) { out.videoCount = Number(n); break }
  }
  await sleep(2500)
  out.thumbsStart = await countThumbs()
  await scrollResults(1)
  await sleep(4000)
  out.thumbsAfterScroll = await countThumbs()
  await evalJs(`(() => { const c=Array.from(document.querySelectorAll('button[data-url]')).find(b=>b.querySelector('img')&&b.querySelector('img').complete&&b.querySelector('img').naturalWidth>0); if(c)c.click(); return !!c })()`)
  for (let i = 0; i < 12; i++) {
    await sleep(1500)
    const v = await evalJs(`(() => { const v=document.querySelector('video'); if(!v) return {hasVideo:false}; return { hasVideo:true, readyState:v.readyState, dur:v.duration, paused:v.paused, err:v.error?v.error.message:null }; })()`)
    out.video = v
    if (v && v.hasVideo && (v.readyState >= 1 || v.err)) break
  }
  out.modalErr = await evalJs(`(Array.from(document.querySelectorAll('p')).map(x=>x.textContent).find(t=>t.includes('Tidak dapat')||t.includes('handler')))||null`)
  console.log(JSON.stringify(out, null, 2))
  ws.close()
  process.exit(0)
})().catch((e) => { console.error('ERR', e); process.exit(1) })
