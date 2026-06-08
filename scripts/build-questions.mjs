#!/usr/bin/env node
// scripts/build-questions.mjs
//
// input/questions/lvN/{check,cert}/*.yaml を ai_edu の 9 列 CSV へ変換する。
//   check → lvN-check.csv / cert → lvN-cert.csv
//
// 正解位置は書かない（provision-question-bank.mjs が seed_ref から決定的にシャッフル）。
// CSV 列: 問題番号,学習項目,問題文,正答1,誤答1,誤答2,誤答3,解説,関連キーワード
//
// 使い方:
//   node scripts/build-questions.mjs            # dry-run → output/questions/
//   node scripts/build-questions.mjs --apply    # ai_edu の seeds/questions/ へ

import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

import { ROOT, outputRoots, parseArgs, ensureDir } from './lib/paths.mjs'
import { toCsv, QUESTION_HEADER } from './lib/csv.mjs'

const INPUT_DIR = path.join(ROOT, 'input', 'questions')

function listLevels() {
  if (!fs.existsSync(INPUT_DIR)) return []
  return fs.readdirSync(INPUT_DIR).filter((d) => /^lv\d+$/.test(d))
}

function loadQuestions(level, purpose) {
  const dir = path.join(INPUT_DIR, level, purpose)
  if (!fs.existsSync(dir)) return []
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort() // ファイル名順 → 問題番号の安定化
  const out = []
  for (const f of files) {
    const doc = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'))
    const list = Array.isArray(doc) ? doc : doc?.questions
    if (!Array.isArray(list)) {
      throw new Error(`${level}/${purpose}/${f}: questions 配列が見つかりません`)
    }
    list.forEach((q, i) => out.push({ ...q, _src: `${f}#${i + 1}` }))
  }
  return out
}

function keywordsToString(kw) {
  if (kw == null) return ''
  if (Array.isArray(kw)) return kw.join('、')
  return String(kw)
}

function questionToRow(q, number) {
  const wrongs = q.wrongs ?? []
  if (q.correct == null) throw new Error(`${q._src}: correct がありません`)
  if (wrongs.length !== 3) throw new Error(`${q._src}: wrongs はちょうど 3 つ必要です（現在 ${wrongs.length}）`)
  return [
    String(number),
    q.learning_item ?? '',
    q.stem ?? '',
    q.correct,
    wrongs[0],
    wrongs[1],
    wrongs[2],
    q.explanation ?? '',
    keywordsToString(q.keywords),
  ]
}

function buildLevelPurpose(level, purpose, outDir) {
  const questions = loadQuestions(level, purpose)
  if (questions.length === 0) return null
  const rows = [QUESTION_HEADER]
  questions.forEach((q, i) => rows.push(questionToRow(q, i + 1)))
  const csv = toCsv(rows, { bom: true })
  const file = path.join(outDir, `${level}-${purpose}.csv`)
  ensureDir(outDir)
  fs.writeFileSync(file, csv, 'utf8')
  return { file, count: questions.length }
}

function main() {
  const args = parseArgs(process.argv)
  const roots = outputRoots({ apply: args.apply })
  const levels = (args.level ? [args.level] : listLevels())
  if (levels.length === 0) {
    console.log('問題入力がありません（input/questions/lvN/...）')
    return
  }
  console.log(`[build-questions] mode: ${roots.mode}`)
  const results = []
  for (const level of levels) {
    for (const purpose of ['check', 'cert']) {
      const r = buildLevelPurpose(level, purpose, roots.questions)
      if (r) {
        results.push(r)
        console.log(`  ✓ ${path.relative(ROOT, r.file)}  (${r.count} 問)`)
      }
    }
  }
  if (results.length === 0) console.log('  生成対象なし')
}

main()
