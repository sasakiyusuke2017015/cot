#!/usr/bin/env node
// scripts/build-web-standalone.mjs
//
// 「1ファイルだけ渡せば読める」配布用の HTML を作る。
//
//   output/standalone/roadmap.html  … 学習ロードマップだけ（章一覧・壁のブロック）
//   output/standalone/chNN.html     … 各章（本文 + 確認クイズ + キーワード）
//
// サイト版（output/materials/web/chNN.html）との違いは、他ファイルへのリンクが無いことだけ。
// 目次へ戻るリンクも前後の章ナビも出さないので、メールやチャットで 1 枚だけ送っても成立する。
// 本文・クイズの中身は共通のレンダラ（lib/render-web-chapter.mjs）から作るので二重管理しない。
//
// 注意: Tailwind と React は CDN から読む構成のままなので、閲覧にはネット接続が必要。
//       「他のファイルを同梱しなくてよい」という意味での単体で、完全オフラインではない。
//
// 使い方:
//   node scripts/build-web-standalone.mjs

import fs from 'node:fs'
import path from 'node:path'

import { ROOT, ensureDir } from './lib/paths.mjs'
import { loadWebChapters, loadWebCourse, loadWebQuestions } from './lib/load-web-input.mjs'
import { renderWebChapter } from './lib/render-web-chapter.mjs'
import { renderWebRoadmapPage } from './lib/render-web-index.mjs'

const OUT_DIR = path.join(ROOT, 'output', 'standalone')

function pad2(n) {
  return String(n).padStart(2, '0')
}

function main() {
  const chapters = loadWebChapters()
  if (chapters.length === 0) {
    console.log('[build-web-standalone] 章入力がありません（input/materials/web/chNN.yaml）')
    return
  }
  ensureDir(OUT_DIR)

  const questionsByChapter = loadWebQuestions(chapters)
  const written = []

  // 学習ロードマップ単体（受講者用。コマ数・ねらいは出さない）
  const course = loadWebCourse()
  if (course) {
    const file = path.join(OUT_DIR, 'roadmap.html')
    fs.writeFileSync(file, renderWebRoadmapPage(course, chapters, { audience: 'learner' }), 'utf8')
    written.push(file)
    console.log(`  ✓ ${path.relative(ROOT, file)}  (学習ロードマップ単体)`)
  } else {
    console.log('  － course.yaml が無いのでロードマップはスキップ')
  }

  // 各章単体
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const html = renderWebChapter(ch, questionsByChapter.get(ch.id) ?? [], {
      prev: chapters[i - 1] ?? null,
      next: chapters[i + 1] ?? null,
      total: chapters.length,
      standalone: true,
    })
    const file = path.join(OUT_DIR, `ch${pad2(ch.id)}.html`)
    fs.writeFileSync(file, html, 'utf8')
    written.push(file)
    console.log(`  ✓ ${path.relative(ROOT, file)}  (第${ch.id}章 ${ch.title})`)
  }

  const kb = Math.round(written.reduce((s, f) => s + fs.statSync(f).size, 0) / 1024)
  console.log(`[build-web-standalone] ${written.length} ファイル / 合計 ${kb}KB`)
  console.log('  どれか 1 つを渡すだけで読めます（相互リンク無し・ネット接続は必要）。')
}

main()
