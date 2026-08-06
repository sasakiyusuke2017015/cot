#!/usr/bin/env node
// validators/validate-web.mjs
//
// web（虎の巻）種別の生成物を検証する。
//   - HTML: 必須構造・CDN・JSX 規約（class= 禁止等）・KEYWORDS/QUIZ の JSON 妥当性・タグ対応
//   - CSV : ヘッダ一致・9 列・BOM・問題番号の通し連番
//   - 相互: HTML 内クイズと CSV の問題が同一（YAML 単一ソースからの生成を担保）
//
// 使い方: node validators/validate-web.mjs

import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

import { ROOT } from '../scripts/lib/paths.mjs'
import { QUESTION_HEADER } from '../scripts/lib/csv.mjs'

const MATERIALS = path.join(ROOT, 'output', 'materials', 'web')
const QUESTIONS = path.join(ROOT, 'output', 'questions', 'web')
const LEARNER = path.join(ROOT, 'output', 'index.html')
const TEACHER = path.join(ROOT, 'output', 'teacher.html')
const MATERIALS_IN = path.join(ROOT, 'input', 'materials', 'web')

const errors = []
const warnings = []

function err(file, msg) {
  errors.push(`${file}: ${msg}`)
}

/** 素朴な CSV パーサ（RFC4180 のクオート規則に対応）。 */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\r') {
      // 次の \n で行確定
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** JSX 内の JS 定数 `const NAME = [...];` を取り出して JSON.parse する。 */
function extractJsonConst(html, name) {
  const start = html.indexOf(`const ${name} = `)
  if (start < 0) return null
  const open = html.indexOf('[', start)
  if (open < 0) return null
  let depth = 0
  let inStr = false
  for (let i = open; i < html.length; i++) {
    const c = html[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(open, i + 1))
        } catch (e) {
          return { __parseError: e.message }
        }
      }
    }
  }
  return null
}

/**
 * code-block の中身（`{`...`}` のテンプレートリテラル）を取り除く。
 * コード例に含まれる <h1>…</h1> や <URL> はマークアップではないため、タグ対応の判定から外す。
 */
function stripTemplateLiterals(jsx) {
  let out = ''
  let i = 0
  while (i < jsx.length) {
    const start = jsx.indexOf('{`', i)
    if (start < 0) {
      out += jsx.slice(i)
      break
    }
    out += jsx.slice(i, start)
    let j = start + 2
    while (j < jsx.length) {
      if (jsx[j] === '\\') j += 2
      else if (jsx[j] === '`') break
      else j++
    }
    i = jsx.indexOf('}', j) + 1
    if (i <= 0) break
  }
  return out
}

/** JSX 部分のタグ開閉が対応しているか（自己閉じ・void 要素を考慮）。 */
function checkTagBalance(jsxRaw, file) {
  const jsx = stripTemplateLiterals(jsxRaw)
  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link'])
  const stack = []
  const re = /<\/?([A-Za-z][A-Za-z0-9]*)\b[^>]*?(\/?)>/g
  let m
  while ((m = re.exec(jsx)) !== null) {
    const tag = m[1]
    const selfClose = m[2] === '/'
    const isClose = m[0].startsWith('</')
    if (VOID.has(tag.toLowerCase()) || selfClose) continue
    if (isClose) {
      const top = stack.pop()
      if (top !== tag) {
        err(file, `タグの対応が壊れています: </${tag}> に対して開いているのは <${top ?? 'なし'}>`)
        return
      }
    } else {
      stack.push(tag)
    }
  }
  if (stack.length) err(file, `閉じられていないタグ: <${stack.join('>, <')}>`)
}

function validateHtml(file) {
  const rel = path.relative(ROOT, file)
  const html = fs.readFileSync(file, 'utf8')

  const required = [
    ['<!DOCTYPE html>', 'DOCTYPE 宣言'],
    ['<html lang="ja">', 'html lang="ja"'],
    ['<meta charset="UTF-8">', 'charset meta'],
    ['name="viewport"', 'viewport meta'],
    ['unpkg.com/react@18/umd/react.development.js', 'React18 CDN'],
    ['unpkg.com/react-dom@18/umd/react-dom.development.js', 'ReactDOM18 CDN'],
    ['unpkg.com/@babel/standalone/babel.min.js', 'Babel standalone CDN'],
    ['cdn.tailwindcss.com', 'Tailwind CDN'],
    ['<div id="root"></div>', 'root div'],
    ['<script type="text/babel">', 'babel script タグ'],
    ["ReactDOM.createRoot(document.getElementById('root')).render(<Page />)", 'createRoot render'],
  ]
  for (const [needle, label] of required) {
    if (!html.includes(needle)) err(rel, `${label} がありません`)
  }

  const scriptStart = html.indexOf('<script type="text/babel">')
  const jsx = scriptStart >= 0 ? html.slice(scriptStart) : ''

  // JSX 規約
  if (/<[A-Za-z][^>]*\sclass=/.test(jsx)) err(rel, 'JSX 内で class= が使われています（className を使うこと）')
  if (jsx.includes('<!--')) err(rel, 'JSX 内に HTML コメント <!-- --> があります')
  if (/\son[a-z]+=/.test(jsx)) err(rel, 'JSX 内に小文字のイベント属性があります（onClick 等の camelCase にすること）')

  // 埋め込み定数
  const keywords = extractJsonConst(html, 'KEYWORDS')
  if (keywords?.__parseError) err(rel, `KEYWORDS が JSON として不正: ${keywords.__parseError}`)
  else if (!Array.isArray(keywords)) err(rel, 'KEYWORDS 定数が見つかりません')
  else if (keywords.length === 0) warnings.push(`${rel}: KEYWORDS が空です`)

  const quiz = extractJsonConst(html, 'QUIZ')
  if (quiz?.__parseError) err(rel, `QUIZ が JSON として不正: ${quiz.__parseError}`)
  else if (!Array.isArray(quiz)) err(rel, 'QUIZ 定数が見つかりません')
  else {
    quiz.forEach((q, i) => {
      if (!q.q) err(rel, `QUIZ[${i}]: 問題文がありません`)
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        err(rel, `QUIZ[${i}]: options はちょうど 4 つ必要です`)
      }
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) {
        err(rel, `QUIZ[${i}]: answer が 0〜3 の範囲にありません`)
      }
      if (!q.explain) err(rel, `QUIZ[${i}]: 解説がありません`)
      if (/\$\{(正答|誤答)/.test(q.explain ?? '')) {
        err(rel, `QUIZ[${i}]: 解説にプレースホルダが未解決のまま残っています`)
      }
    })
  }

  // 画像アセット禁止
  if (/<img\b/i.test(html)) err(rel, '画像アセット <img> が使われています')

  // Page 関数内 JSX のタグ対応（render 呼び出し以降は JSX ではないので除外）
  const pageStart = jsx.indexOf('function Page()')
  const pageEnd = jsx.indexOf('ReactDOM.createRoot')
  if (pageStart >= 0 && pageEnd > pageStart) checkTagBalance(jsx.slice(pageStart, pageEnd), rel)

  return quiz ?? []
}

function validateCsv(file) {
  const rel = path.relative(ROOT, file)
  const raw = fs.readFileSync(file, 'utf8')
  if (!raw.startsWith('﻿')) err(rel, 'BOM がありません')
  const rows = parseCsv(raw.replace(/^﻿/, '')).filter((r) => r.length > 1 || r[0] !== '')

  const header = rows[0] ?? []
  if (header.join(',') !== QUESTION_HEADER.join(',')) {
    err(rel, `ヘッダが規約と違います: ${header.join(',')}`)
  }
  const body = rows.slice(1)
  if (body.length === 0) err(rel, '問題行がありません')
  body.forEach((r, i) => {
    if (r.length !== 9) err(rel, `${i + 2} 行目: 列数が ${r.length}（9 列であること）`)
    if (!r[7]) err(rel, `${i + 2} 行目: 解説が空です`)
    const options = [r[3], r[4], r[5], r[6]]
    if (new Set(options).size !== 4) err(rel, `${i + 2} 行目: 選択肢に重複があります`)
  })
  return body
}

/** ハブ共通: 全章へのリンクが揃っているか・リンク先が実在するか。 */
function validateHubLinks(file, chapterFiles) {
  const rel = path.relative(ROOT, file)
  if (!fs.existsSync(file)) {
    err(rel, 'ハブが生成されていません')
    return null
  }
  const html = fs.readFileSync(file, 'utf8')

  const linked = new Set([...html.matchAll(/href="materials\/web\/(ch\d+\.html)"/g)].map((m) => m[1]))
  for (const f of chapterFiles) {
    if (!linked.has(f)) err(rel, `${f} へのリンクがありません（章を足したら再生成すること）`)
  }
  for (const l of linked) {
    if (!fs.existsSync(path.join(MATERIALS, l))) err(rel, `リンク先が存在しません: materials/web/${l}`)
  }
  return html
}

/**
 * 受講者用と講師用の分離を検証する。
 * 受講者用（index.html）に teaching: の中身が 1 文字でも出ていたら不合格。
 */
function validateAudienceSeparation(chapterFiles) {
  const learnerRel = path.relative(ROOT, LEARNER)
  const learner = validateHubLinks(LEARNER, chapterFiles)
  const teacher = validateHubLinks(TEACHER, chapterFiles)
  if (!learner || !teacher) return

  // 章数表示は講師用のみ
  const shown = Number(teacher.match(/全(\d+)章/)?.[1])
  if (!shown) err(path.relative(ROOT, TEACHER), '章数の表示が見つかりません')
  else if (shown !== chapterFiles.length) {
    err(path.relative(ROOT, TEACHER), `見出しの章数 ${shown} が実際の ${chapterFiles.length} と違います`)
  }

  // teaching: の実文言が受講者用に漏れていないか（章 YAML を直接読んで突き合わせる）
  if (fs.existsSync(MATERIALS_IN)) {
    const yamls = fs.readdirSync(MATERIALS_IN).filter((f) => /^ch\d+\.ya?ml$/.test(f))
    for (const y of yamls) {
      const doc = yaml.load(fs.readFileSync(path.join(MATERIALS_IN, y), 'utf8'))
      const t = doc?.teaching
      if (!t) continue
      for (const key of ['goal', 'watch', 'ask']) {
        const v = t[key]
        if (!v) continue
        if (learner.includes(v)) {
          err(learnerRel, `講師用メモが受講者ページに漏れています（${y} の teaching.${key}）`)
        }
        if (!teacher.includes(v)) {
          err(path.relative(ROOT, TEACHER), `${y} の teaching.${key} が講師ページに出ていません`)
        }
      }
    }
  }

  // 章ページ（受講者が見る）の戻り先は受講者用ハブであること
  for (const f of chapterFiles) {
    const chHtml = fs.readFileSync(path.join(MATERIALS, f), 'utf8')
    if (!chHtml.includes('href="../../index.html"')) {
      err(`materials/web/${f}`, '受講者用ハブへ戻るリンクがありません')
    }
    if (chHtml.includes('teacher.html')) {
      err(`materials/web/${f}`, '章ページから講師用ページへリンクしています（受講者に見えてしまう）')
    }
  }

  // 単一ファイル版（配布用）も同じ基準で検証する
  const singleLearner = path.join(ROOT, 'output', 'all-learner.html')
  if (fs.existsSync(singleLearner) && fs.existsSync(MATERIALS_IN)) {
    const rel = path.relative(ROOT, singleLearner)
    const html = fs.readFileSync(singleLearner, 'utf8')
    for (const y of fs.readdirSync(MATERIALS_IN).filter((f) => /^ch\d+\.ya?ml$/.test(f))) {
      const t = yaml.load(fs.readFileSync(path.join(MATERIALS_IN, y), 'utf8'))?.teaching
      if (!t) continue
      for (const key of ['goal', 'watch', 'ask']) {
        if (t[key] && html.includes(t[key])) {
          err(rel, `講師用メモが配布用ファイルに漏れています（${y} の teaching.${key}）`)
        }
      }
    }
  }
}

function main() {
  if (!fs.existsSync(MATERIALS)) {
    console.error('output/materials/web がありません。先に node scripts/build-web.mjs を実行してください。')
    process.exit(1)
  }
  const htmlFiles = fs.readdirSync(MATERIALS).filter((f) => /^ch\d+\.html$/.test(f)).sort()
  const csvFiles = fs.readdirSync(QUESTIONS).filter((f) => /^ch\d+-check\.csv$/.test(f)).sort()

  console.log(`[validate-web] 章HTML ${htmlFiles.length} 本 / CSV ${csvFiles.length} 本 / ハブ2種（受講者用・講師用）を検証`)

  validateAudienceSeparation(htmlFiles)

  const quizByChapter = new Map()
  for (const f of htmlFiles) {
    const ch = f.match(/^ch(\d+)\.html$/)[1]
    quizByChapter.set(ch, validateHtml(path.join(MATERIALS, f)))
  }

  const allNumbers = []
  for (const f of csvFiles) {
    const ch = f.match(/^ch(\d+)-check\.csv$/)[1]
    const body = validateCsv(path.join(QUESTIONS, f))
    body.forEach((r) => allNumbers.push(Number(r[0])))

    // HTML クイズと CSV の突き合わせ（同じ YAML から生成されているはず）
    const quiz = quizByChapter.get(ch) ?? []
    if (quiz.length !== body.length) {
      err(f, `HTML のクイズ数 ${quiz.length} と CSV の問題数 ${body.length} が一致しません`)
      continue
    }
    body.forEach((row, i) => {
      const q = quiz[i]
      if (!q) return
      if (q.q !== row[2]) err(f, `${i + 1} 問目: HTML とCSV で問題文が違います`)
      const correctInHtml = q.options?.[q.answer]
      if (correctInHtml !== row[3]) {
        err(f, `${i + 1} 問目: HTML の正解「${correctInHtml}」が CSV の正答1「${row[3]}」と違います`)
      }
      const csvOptions = new Set([row[3], row[4], row[5], row[6]])
      const htmlOptions = new Set(q.options ?? [])
      if (csvOptions.size !== htmlOptions.size || [...csvOptions].some((o) => !htmlOptions.has(o))) {
        err(f, `${i + 1} 問目: 選択肢の集合が HTML と CSV で違います`)
      }
    })
  }

  // 問題番号は 1 始まりの通し連番
  const sorted = [...allNumbers].sort((a, b) => a - b)
  const expected = Array.from({ length: sorted.length }, (_, i) => i + 1)
  if (sorted.join(',') !== expected.join(',')) {
    err('questions/web', `問題番号が 1 始まりの通し連番になっていません: ${sorted.join(',')}`)
  }

  for (const w of warnings) console.log(`  ⚠ ${w}`)
  if (errors.length === 0) {
    console.log(`  ✓ すべて OK（問題 ${allNumbers.length} 問、番号 1〜${sorted.at(-1)} 連番）`)
    return
  }
  console.log(`\n  ✗ ${errors.length} 件のエラー:`)
  for (const e of errors) console.log(`    - ${e}`)
  process.exit(1)
}

main()
