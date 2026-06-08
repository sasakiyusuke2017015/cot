#!/usr/bin/env node
// validators/validate-all.mjs
// input/ の章・問題 YAML をスキーマ検証し、構造ルールをチェックする。
// レポートを report/validation-report.json に書き、エラーがあれば exit 1。

import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'
import Ajv2020 from 'ajv/dist/2020.js'

import { ROOT, ensureDir } from '../scripts/lib/paths.mjs'

const ajv = new Ajv2020({ allErrors: true, strict: false })
const chapterSchema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas', 'chapter.schema.json'), 'utf8'))
const questionSchema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas', 'question.schema.json'), 'utf8'))
const validateChapter = ajv.compile(chapterSchema)
const validateQuestion = ajv.compile(questionSchema)

const errors = []
const warnings = []
function err(file, msg) { errors.push({ file, msg }) }
function warn(file, msg) { warnings.push({ file, msg }) }

function walk(dir, pred) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, pred))
    else if (pred(p)) out.push(p)
  }
  return out
}

const isYaml = (p) => p.endsWith('.yaml') || p.endsWith('.yml')
const rel = (p) => path.relative(ROOT, p)

// --- 章の検証 ---
function validateChapters() {
  const dir = path.join(ROOT, 'input', 'materials')
  const files = walk(dir, (p) => /ch\d+\.ya?ml$/.test(p))
  const byLevel = {}
  for (const f of files) {
    let doc
    try { doc = yaml.load(fs.readFileSync(f, 'utf8')) } catch (e) { err(rel(f), `YAML parse: ${e.message}`); continue }
    if (!validateChapter(doc)) {
      for (const e of validateChapter.errors) err(rel(f), `schema ${e.instancePath} ${e.message}`)
      continue
    }
    ;(byLevel[doc.level] ??= []).push({ f, id: doc.id })
    if (!doc.source_refs?.length) warn(rel(f), 'source_refs が空')
  }
  // id の連番・重複チェック
  for (const [level, list] of Object.entries(byLevel)) {
    const ids = list.map((x) => x.id).sort((a, b) => a - b)
    const seen = new Set()
    for (const x of list) {
      if (seen.has(x.id)) err(rel(x.f), `${level} で id=${x.id} が重複`)
      seen.add(x.id)
    }
    ids.forEach((id, i) => {
      if (id !== i + 1) warn(level, `id が 1 始まり連番でない（${ids.join(',')}）`)
    })
  }
}

// --- 問題の検証 ---
function validateQuestions() {
  const dir = path.join(ROOT, 'input', 'questions')
  const files = walk(dir, isYaml)
  const stemsByLevel = {}
  for (const f of files) {
    let doc
    try { doc = yaml.load(fs.readFileSync(f, 'utf8')) } catch (e) { err(rel(f), `YAML parse: ${e.message}`); continue }
    const list = Array.isArray(doc) ? doc : doc?.questions
    if (!Array.isArray(list)) { err(rel(f), 'questions 配列がない'); continue }
    list.forEach((q, i) => {
      const tag = `${rel(f)}#${i + 1}`
      if (!validateQuestion(q)) {
        for (const e of validateQuestion.errors) err(tag, `schema ${e.instancePath} ${e.message}`)
        return
      }
      if ((q.wrongs ?? []).length !== 3) err(tag, 'wrongs は 3 つ必要')
      // プレースホルダの参照健全性
      const ph = String(q.explanation ?? '').match(/\$\{誤答(\d)\}/g) ?? []
      for (const m of ph) {
        const n = Number(m.match(/\d/)[0])
        if (n < 1 || n > 3) err(tag, `解説のプレースホルダ ${m} が範囲外`)
      }
      // 重複 stem
      const key = `${q.level}:${q.stem}`
      ;(stemsByLevel[key] ??= []).push(tag)
    })
  }
  for (const [key, tags] of Object.entries(stemsByLevel)) {
    if (tags.length > 1) warn(key.split(':')[0], `stem 重複: ${tags.join(' / ')}`)
  }
}

// --- 生成 HTML の検証（output があれば）---
function validateOutputHtml() {
  const dir = path.join(ROOT, 'output', 'materials')
  const files = walk(dir, (p) => p.endsWith('.html'))
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8')
    const checks = [
      ['<html lang="ja">', 'lang=ja がない'],
      ['react@18', 'React18 CDN がない'],
      ['@babel/standalone', 'Babel standalone がない'],
      ['cdn.tailwindcss.com', 'Tailwind CDN がない'],
      ['<div id="root">', 'root div がない'],
      ['ReactDOM.createRoot', 'createRoot がない'],
      ['type="text/babel"', 'babel script がない'],
    ]
    for (const [needle, msg] of checks) if (!html.includes(needle)) err(rel(f), msg)
    if (/<img\b/.test(html)) err(rel(f), '<img> が含まれている（画像禁止）')
    // babel script 内の素の class=（className でない）のみ検出（HTML本体の class= は除外）
    const babel = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/)?.[1] ?? ''
    if (/\sclass="/.test(babel)) warn(rel(f), 'JSX内に素の class= がある（className 推奨）')
  }
}

function main() {
  validateChapters()
  validateQuestions()
  validateOutputHtml()

  const report = { errors, warnings, ok: errors.length === 0 }
  ensureDir(path.join(ROOT, 'report'))
  fs.writeFileSync(path.join(ROOT, 'report', 'validation-report.json'), JSON.stringify(report, null, 2), 'utf8')

  console.log(`[validate] errors: ${errors.length}, warnings: ${warnings.length}`)
  for (const e of errors) console.log(`  ✗ ${e.file}: ${e.msg}`)
  for (const w of warnings) console.log(`  ! ${w.file}: ${w.msg}`)
  if (errors.length) process.exit(1)
}

main()
