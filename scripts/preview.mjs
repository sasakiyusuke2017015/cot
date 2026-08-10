#!/usr/bin/env node
// scripts/preview.mjs
// output/ を静的サーバで配信し、生成物をブラウザ確認する。
// 同じ Wi-Fi のスマホからも見られるよう LAN のアドレスで待ち受け、QR コードを表示する。
// 依存を増やさず node 標準のみで実装。
//   node scripts/preview.mjs            # http://<LAN IP>:4173
//   PORT=5000 node scripts/preview.mjs

import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ROOT } from './lib/paths.mjs'

// output/ 全体を配信する（toranomaki.html から materials/web/chNN.html への相対リンクを通すため）
const ROOT_DIR = path.join(ROOT, 'output')
const PORT = Number(process.env.PORT || 4173)
const INDEX = 'toranomaki.html'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
}

/** LAN 側の IPv4 アドレス（スマホからアクセスする用）。見つからなければ null。 */
function lanAddress() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) return a.address
    }
  }
  return null
}

// ---- QR コード（数字/バイトモード, 誤り訂正 L, version 自動）----------------
// URL を1つ出すだけなので、外部依存を足さず最小構成の実装を置く。

const GF_EXP = new Array(512)
const GF_LOG = new Array(256)
;(function initGf() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]
})()

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGenerator(deg) {
  let poly = [1]
  for (let i = 0; i < deg; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], 1)
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i])
    }
    poly = next
  }
  return poly
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen)
  const res = new Array(ecLen).fill(0)
  for (const d of data) {
    const factor = d ^ res[0]
    res.shift()
    res.push(0)
    for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i + 1], factor)
  }
  return res
}

// version 1..10 / EC level L の (総コードワード数, EC コードワード数)
const CAPACITY_L = [
  null,
  [26, 7], [44, 10], [70, 15], [100, 20], [134, 26],
  [172, 18], [196, 20], [242, 24], [292, 30], [346, 18],
]
const ALIGN_POS = [
  null, [], [6, 18], [6, 22], [6, 26], [6, 30],
  [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
]

function buildQrMatrix(text) {
  const bytes = [...Buffer.from(text, 'utf8')]

  // バイトモードで収まる最小 version を選ぶ
  let version = 0
  for (let v = 1; v <= 10; v++) {
    const [total, ec] = CAPACITY_L[v]
    const dataCw = total - ec
    const lenBits = v <= 9 ? 8 : 16
    const needBits = 4 + lenBits + bytes.length * 8
    if (needBits <= dataCw * 8) {
      version = v
      break
    }
  }
  if (!version) return null // 長すぎる URL は QR を諦める（URL 文字列は表示する）

  const [totalCw, ecCw] = CAPACITY_L[version]
  const dataCw = totalCw - ecCw
  const lenBits = version <= 9 ? 8 : 16

  // ビット列を作る
  const bits = []
  const push = (val, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }
  push(0b0100, 4) // バイトモード
  push(bytes.length, lenBits)
  for (const b of bytes) push(b, 8)
  push(0, Math.min(4, dataCw * 8 - bits.length)) // 終端
  while (bits.length % 8) bits.push(0)
  const codewords = []
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  }
  const PAD = [0xec, 0x11]
  let p = 0
  while (codewords.length < dataCw) codewords.push(PAD[p++ % 2])

  const ec = rsEncode(codewords, ecCw)
  const all = [...codewords, ...ec]

  // モジュール配置
  const size = version * 4 + 17
  const m = Array.from({ length: size }, () => new Array(size).fill(null))

  const setFinder = (r, c) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const rr = r + i
        const cc = c + j
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue
        const on =
          i >= 0 && i <= 6 && (j === 0 || j === 6) ||
          j >= 0 && j <= 6 && (i === 0 || i === 6) ||
          i >= 2 && i <= 4 && j >= 2 && j <= 4
        m[rr][cc] = on ? 1 : 0
      }
    }
  }
  setFinder(0, 0)
  setFinder(0, size - 7)
  setFinder(size - 7, 0)

  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0
    if (m[6][i] === null) m[6][i] = v
    if (m[i][6] === null) m[i][6] = v
  }

  for (const r of ALIGN_POS[version]) {
    for (const c of ALIGN_POS[version]) {
      if (m[r][c] !== null) continue
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          m[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0
        }
      }
    }
  }

  m[size - 8][8] = 1 // 常に暗

  // フォーマット情報の領域を予約
  const reserved = []
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) { m[8][i] = 0; reserved.push([8, i]) }
    if (m[i][8] === null) { m[i][8] = 0; reserved.push([i, 8]) }
  }
  for (let i = size - 8; i < size; i++) {
    if (m[8][i] === null) { m[8][i] = 0; reserved.push([8, i]) }
    if (m[i][8] === null) { m[i][8] = 0; reserved.push([i, 8]) }
  }
  const isReserved = (r, c) => reserved.some(([a, b]) => a === r && b === c)

  // データ配置（マスク 0 固定: (r+c)%2===0）
  let bitIdx = 0
  const dataBits = []
  for (const cw of all) for (let i = 7; i >= 0; i--) dataBits.push((cw >> i) & 1)

  let upward = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let n = 0; n < size; n++) {
      const row = upward ? size - 1 - n : n
      for (const c of [col, col - 1]) {
        if (m[row][c] !== null) continue
        let bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0
        if ((row + c) % 2 === 0) bit ^= 1 // マスク 0
        m[row][c] = bit
      }
    }
    upward = !upward
  }

  // フォーマット情報（EC=L, マスク0 → 0b01000）
  let fmt = 0b01000
  let rem = fmt
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >> 9) * 0b10100110111)
  }
  const fmtBits = ((fmt << 10) | rem) ^ 0b101010000010010
  const put = (r, c, v) => { m[r][c] = v }
  for (let i = 0; i < 15; i++) {
    const v = (fmtBits >> i) & 1
    if (i < 6) put(8, i, v)
    else if (i < 8) put(8, i + 1, v)
    else if (i === 8) put(7, 8, v)
    else put(14 - i, 8, v)

    if (i < 8) put(size - 1 - i, 8, v)
    else put(8, size - 15 + i, v)
  }

  return m
}

/** QR をターミナルに half-block で描く（1文字に上下2モジュール）。 */
function qrToTerminal(text) {
  const m = buildQrMatrix(text)
  if (!m) return null
  const size = m.length
  const QUIET = 2
  const at = (r, c) =>
    r < 0 || c < 0 || r >= size || c >= size ? 0 : m[r][c]

  const lines = []
  for (let r = -QUIET; r < size + QUIET; r += 2) {
    let line = ''
    for (let c = -QUIET; c < size + QUIET; c++) {
      const top = at(r, c)
      const bottom = at(r + 1, c)
      // 暗モジュール=黒。背景を白にするため反転して描く
      if (top && bottom) line += ' '
      else if (top) line += '▄'
      else if (bottom) line += '▀'
      else line += '█'
    }
    lines.push(line)
  }
  return lines.join('\n')
}

// ---- サーバ ---------------------------------------------------------------

function listing() {
  if (!fs.existsSync(ROOT_DIR)) {
    return '<p>output/ がありません。先に <code>npm run build:web</code> を実行してください。</p>'
  }
  const items = []

  // 入口になるページ（受講者用・講師用・全章1ファイル版）
  const entries = [
    ['index.html', '👥 受講者用トップ'],
    ['teacher.html', '🐯 講師用ガイド（カンペ付き）'],
    ['all-learner.html', '📘 全章1ファイル版（受講者用）'],
    ['all-teacher.html', '📕 全章1ファイル版（講師用）'],
  ]
  for (const [file, label] of entries) {
    if (fs.existsSync(path.join(ROOT_DIR, file))) {
      items.push(`<li><a href="/${file}"><strong>${label}</strong></a></li>`)
    }
  }

  // 単体配布版（1ファイルだけ渡して成立するもの）
  const standalone = path.join(ROOT_DIR, 'standalone')
  if (fs.existsSync(standalone)) {
    const files = fs.readdirSync(standalone).filter((f) => f.endsWith('.html')).sort()
    items.push('<li><strong>standalone</strong>（単体配布版・リンク無し）<ul>')
    for (const f of files) items.push(`<li><a href="/standalone/${f}">${f}</a></li>`)
    items.push('</ul></li>')
  }

  const materials = path.join(ROOT_DIR, 'materials')
  if (fs.existsSync(materials)) {
    for (const course of fs.readdirSync(materials)) {
      const dir = path.join(materials, course)
      if (!fs.statSync(dir).isDirectory()) continue
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort()
      items.push(`<li><strong>${course}</strong><ul>`)
      for (const f of files) items.push(`<li><a href="/materials/${course}/${f}">${f}</a></li>`)
      items.push('</ul></li>')
    }
  }
  return `<ul>${items.join('')}</ul>`
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0])

  if (urlPath === '/' || urlPath === '') {
    // ハブがあればそれを入口にする
    const hub = path.join(ROOT_DIR, INDEX)
    if (fs.existsSync(hub)) {
      res.writeHead(302, { location: `/${INDEX}` })
      res.end()
      return
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>preview</title><h1>教材プレビュー</h1>${listing()}`,
    )
    return
  }

  if (urlPath === '/_index') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>preview</title><h1>教材プレビュー</h1>${listing()}`,
    )
    return
  }

  const filePath = path.join(ROOT_DIR, urlPath)
  if (!filePath.startsWith(ROOT_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
    return
  }
  res.writeHead(200, {
    'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store', // 再生成した内容がスマホでも即反映されるように
  })
  fs.createReadStream(filePath).pipe(res)
})

// 0.0.0.0 で待ち受けて LAN のスマホからも見られるようにする
server.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddress()
  console.log('')
  console.log(`  [preview] root: ${path.relative(ROOT, ROOT_DIR)}`)
  console.log(`  PC からは   http://localhost:${PORT}`)
  if (lan) {
    const url = `http://${lan}:${PORT}`
    console.log(`  スマホからは ${url}   ← 同じ Wi-Fi に繋いでアクセス`)
    const qr = qrToTerminal(url)
    if (qr) {
      console.log('')
      console.log(qr)
    }
  } else {
    console.log('  （LAN のアドレスが取得できませんでした。スマホからのアクセスは不可）')
  }
  console.log('')
  console.log('  一覧は /_index 、終了は Ctrl+C')
})
