// scripts/lib/load-web-input.mjs
// web（虎の巻）種別の入力 YAML を読む。
//
// 章・問題の読み込みと「問題番号の通し連番」は、サイト用ビルダー（build-web.mjs）と
// 単体配布用ビルダー（build-web-standalone.mjs）で必ず一致していなければならない。
// 番号がずれると CSV と HTML クイズの突き合わせ（validate-web）が落ちるため、ここに集約する。

import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

import { ROOT } from './paths.mjs'

const MATERIALS_IN = path.join(ROOT, 'input', 'materials', 'web')
const QUESTIONS_IN = path.join(ROOT, 'input', 'questions', 'web')
export const COURSE_IN = path.join(MATERIALS_IN, 'course.yaml')

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** chNN.yaml を id 順で読む。 */
export function loadWebChapters() {
  if (!fs.existsSync(MATERIALS_IN)) return []
  return fs
    .readdirSync(MATERIALS_IN)
    .filter((f) => /^ch\d+\.ya?ml$/.test(f))
    .map((f) => yaml.load(fs.readFileSync(path.join(MATERIALS_IN, f), 'utf8')))
    .sort((a, b) => a.id - b.id)
}

/** course.yaml。無ければ null。 */
export function loadWebCourse() {
  if (!fs.existsSync(COURSE_IN)) return null
  return yaml.load(fs.readFileSync(COURSE_IN, 'utf8'))
}

function loadQuestionsFor(chapterId) {
  const file = path.join(QUESTIONS_IN, `ch${pad2(chapterId)}.yaml`)
  if (!fs.existsSync(file)) return []
  const doc = yaml.load(fs.readFileSync(file, 'utf8'))
  const list = Array.isArray(doc) ? doc : doc?.questions
  if (!Array.isArray(list)) throw new Error(`questions/web/ch${pad2(chapterId)}.yaml: questions 配列が見つかりません`)
  for (const q of list) {
    if (q.correct == null) throw new Error(`ch${pad2(chapterId)}: correct がありません（${q.stem ?? '?'}）`)
    if (!Array.isArray(q.wrongs) || q.wrongs.length !== 3) {
      throw new Error(`ch${pad2(chapterId)}: wrongs はちょうど 3 つ必要です（${q.stem ?? '?'}）`)
    }
  }
  return list
}

/**
 * 章 id → 問題配列の Map。各問題に `_number`（章をまたいだ 1 始まりの通し番号）を振る。
 * ch01 の 1 問目が 1 番。章の並び順に依存するので必ず loadWebChapters() の結果を渡すこと。
 */
export function loadWebQuestions(chapters) {
  let number = 0
  const byChapter = new Map()
  for (const ch of chapters) {
    const qs = loadQuestionsFor(ch.id)
    qs.forEach((q) => {
      number += 1
      q._number = number
    })
    byChapter.set(ch.id, qs)
  }
  return byChapter
}
