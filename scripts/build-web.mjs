#!/usr/bin/env node
// scripts/build-web.mjs
//
// web（虎の巻）種別のビルダー。lvN（AI研修）とは別コース種別で、ai_edu には出力しない。
//
//   input/materials/web/chNN.yaml   → output/materials/web/chNN.html（章別単独型 + 確認クイズ埋め込み）
//   input/questions/web/chNN.yaml   → output/questions/web/chNN-check.csv（9列・BOM付き）
//
// 問題 YAML が唯一の元データで、CSV と HTML 内クイズの両方をここから生成する。
// HTML クイズの選択肢は問題番号を種にした決定的シャッフル（再生成しても並びは変わらない）。
//
// 使い方:
//   node scripts/build-web.mjs

import fs from 'node:fs'
import path from 'node:path'

import { ROOT, ensureDir } from './lib/paths.mjs'
import { toCsv, QUESTION_HEADER } from './lib/csv.mjs'
import { loadWebChapters, loadWebCourse, loadWebQuestions } from './lib/load-web-input.mjs'
import { renderWebChapter } from './lib/render-web-chapter.mjs'
import { renderWebIndex } from './lib/render-web-index.mjs'

const MATERIALS_OUT = path.join(ROOT, 'output', 'materials', 'web')
const QUESTIONS_OUT = path.join(ROOT, 'output', 'questions', 'web')
// ハブは output/ 直下（materials/web/chNN.html への相対リンクが通る位置）
//   index.html   … 受講者用。章一覧と学び方だけ。teaching: の内容は出さない
//   teacher.html … 講師用。章別カンペ・進め方つき
//   toranomaki.html … teacher.html への転送（従来の URL を維持するため）
const LEARNER_OUT = path.join(ROOT, 'output', 'index.html')
const TEACHER_OUT = path.join(ROOT, 'output', 'teacher.html')
const LEGACY_OUT = path.join(ROOT, 'output', 'toranomaki.html')

function pad2(n) {
  return String(n).padStart(2, '0')
}

function keywordsToString(kw) {
  if (kw == null) return ''
  if (Array.isArray(kw)) return kw.join('・')
  return String(kw)
}

/** 旧 URL を維持するための転送ページ。 */
function redirectHtml(to, label) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${label}へ移動します</title>
<meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="${to}">
</head>
<body style="font-family:'Yu Gothic UI',sans-serif;text-align:center;padding:60px 20px">
<p>${label}へ移動します。</p>
<p><a href="${to}">開かない場合はこちら</a></p>
</body>
</html>
`
}

function questionToRow(q) {
  return [
    String(q._number),
    q.learning_item ?? '',
    q.stem ?? '',
    q.correct,
    q.wrongs[0],
    q.wrongs[1],
    q.wrongs[2],
    q.explanation ?? '',
    keywordsToString(q.keywords),
  ]
}

function main() {
  const chapters = loadWebChapters()
  if (chapters.length === 0) {
    console.log('[build-web] 章入力がありません（input/materials/web/chNN.yaml）')
    return
  }
  ensureDir(MATERIALS_OUT)
  ensureDir(QUESTIONS_OUT)
  console.log('[build-web] mode: output/（web 種別は ai_edu へは出力しない）')

  // 問題番号は章をまたいだ通し番号（ch01 から順に 1 始まり）
  const questionsByChapter = loadWebQuestions(chapters)

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const qs = questionsByChapter.get(ch.id) ?? []
    const html = renderWebChapter(ch, qs, {
      prev: chapters[i - 1] ?? null,
      next: chapters[i + 1] ?? null,
      total: chapters.length,
    })
    const htmlFile = path.join(MATERIALS_OUT, `ch${pad2(ch.id)}.html`)
    fs.writeFileSync(htmlFile, html, 'utf8')
    console.log(`  ✓ ${path.relative(ROOT, htmlFile)}`)

    if (qs.length > 0) {
      const rows = [QUESTION_HEADER, ...qs.map(questionToRow)]
      const csvFile = path.join(QUESTIONS_OUT, `ch${pad2(ch.id)}-check.csv`)
      fs.writeFileSync(csvFile, toCsv(rows, { bom: true }), 'utf8')
      console.log(`  ✓ ${path.relative(ROOT, csvFile)}  (${qs.length} 問)`)
    }
  }

  // ハブページ（章一覧・カンペは chNN.yaml から自動集約）
  const course = loadWebCourse()
  if (course) {
    fs.writeFileSync(LEARNER_OUT, renderWebIndex(course, chapters, { audience: 'learner' }), 'utf8')
    console.log(`  ✓ ${path.relative(ROOT, LEARNER_OUT)}  (受講者用ハブ)`)

    fs.writeFileSync(TEACHER_OUT, renderWebIndex(course, chapters, { audience: 'teacher' }), 'utf8')
    console.log(`  ✓ ${path.relative(ROOT, TEACHER_OUT)}  (講師用ハブ)`)

    // 従来 toranomaki.html を共有していた場合に備えて転送を置く
    fs.writeFileSync(LEGACY_OUT, redirectHtml('teacher.html', '講師用ガイド'), 'utf8')
    console.log(`  ✓ ${path.relative(ROOT, LEGACY_OUT)}  (→ teacher.html へ転送)`)
  } else {
    console.log('  － course.yaml が無いのでハブはスキップ')
  }
}

main()
