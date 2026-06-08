#!/usr/bin/env node
// scripts/preview.mjs
// output/materials を静的サーバで配信し、生成 HTML をブラウザ確認する。
// 依存を増やさず node 標準 http のみで実装。
//   node scripts/preview.mjs            # http://localhost:4173
//   PORT=5000 node scripts/preview.mjs

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

import { ROOT } from './lib/paths.mjs'

const ROOT_DIR = path.join(ROOT, 'output', 'materials')
const PORT = Number(process.env.PORT || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

function listing() {
  if (!fs.existsSync(ROOT_DIR)) return '<p>output/materials がありません。先に `npm run build` を実行してください。</p>'
  const items = []
  for (const lv of fs.readdirSync(ROOT_DIR)) {
    const lvDir = path.join(ROOT_DIR, lv)
    if (!fs.statSync(lvDir).isDirectory()) continue
    items.push(`<li><strong>${lv}</strong><ul>`)
    for (const f of fs.readdirSync(lvDir).filter((f) => f.endsWith('.html'))) {
      items.push(`<li><a href="/${lv}/${f}">${f}</a></li>`)
    }
    items.push('</ul></li>')
  }
  return `<ul>${items.join('')}</ul>`
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  if (urlPath === '/' || urlPath === '') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html><meta charset="utf-8"><title>preview</title><h1>教材プレビュー</h1>${listing()}`)
    return
  }
  const filePath = path.join(ROOT_DIR, urlPath)
  if (!filePath.startsWith(ROOT_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
    return
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`[preview] http://localhost:${PORT}  (root: ${path.relative(ROOT, ROOT_DIR)})`)
})
