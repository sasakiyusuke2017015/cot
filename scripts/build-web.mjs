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

import yaml from 'js-yaml'

import { ROOT, ensureDir } from './lib/paths.mjs'
import { toCsv, QUESTION_HEADER } from './lib/csv.mjs'
import { renderWebBlocks } from './lib/render-blocks-web.mjs'
import { renderWebIndex } from './lib/render-web-index.mjs'

const MATERIALS_IN = path.join(ROOT, 'input', 'materials', 'web')
const QUESTIONS_IN = path.join(ROOT, 'input', 'questions', 'web')
const MATERIALS_OUT = path.join(ROOT, 'output', 'materials', 'web')
const QUESTIONS_OUT = path.join(ROOT, 'output', 'questions', 'web')
// ハブは output/ 直下（materials/web/chNN.html への相対リンクが通る位置）
//   index.html   … 受講者用。章一覧と学び方だけ。teaching: の内容は出さない
//   teacher.html … 講師用。章別カンペ・進め方つき
//   toranomaki.html … teacher.html への転送（従来の URL を維持するため）
const LEARNER_OUT = path.join(ROOT, 'output', 'index.html')
const TEACHER_OUT = path.join(ROOT, 'output', 'teacher.html')
const LEGACY_OUT = path.join(ROOT, 'output', 'toranomaki.html')
const COURSE_IN = path.join(MATERIALS_IN, 'course.yaml')
const HEAD_TPL = fs.readFileSync(path.join(ROOT, 'scripts', 'templates', 'web-chapter-head.html'), 'utf8')

const TYPE_LABEL = { core: '知識', user: '実践' }
const GRADIENT = {
  core: { card: 'from-blue-700 to-blue-500', sub: 'text-blue-100' },
  user: { card: 'from-emerald-700 to-emerald-500', sub: 'text-emerald-100' },
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function loadChapters() {
  if (!fs.existsSync(MATERIALS_IN)) return []
  return fs
    .readdirSync(MATERIALS_IN)
    .filter((f) => /^ch\d+\.ya?ml$/.test(f))
    .map((f) => yaml.load(fs.readFileSync(path.join(MATERIALS_IN, f), 'utf8')))
    .sort((a, b) => a.id - b.id)
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

/** 解説の ${正答1} / ${誤答N} プレースホルダを実テキストへ（HTML 表示用。CSV には残す）。 */
function resolveExplanation(q) {
  return String(q.explanation ?? '')
    .replaceAll('${正答1}', q.correct)
    .replaceAll('${誤答1}', q.wrongs[0])
    .replaceAll('${誤答2}', q.wrongs[1])
    .replaceAll('${誤答3}', q.wrongs[2])
}

/** 問題番号を種にした決定的シャッフル（LCG + Fisher-Yates）。 */
function shuffleOptions(q, seed) {
  let s = seed * 7919 + 104729
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const options = [q.correct, ...q.wrongs]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { options, answer: options.indexOf(q.correct) }
}

function keywordsToString(kw) {
  if (kw == null) return ''
  if (Array.isArray(kw)) return kw.join('・')
  return String(kw)
}

function jsConst(name, value) {
  return `const ${name} = ${JSON.stringify(value, null, 2)};`
}

function buildChapterHtml(chapter, quiz, prev, next, total) {
  const typeLabel = TYPE_LABEL[chapter.type] ?? chapter.type
  const g = GRADIENT[chapter.type] ?? GRADIENT.core
  const head = HEAD_TPL.replace('__TITLE__', `Web開発の虎の巻 第${chapter.id}章 - ${chapter.title}`)
  const body = renderWebBlocks(chapter.content_blocks)

  const quizData = quiz.map((q) => {
    const { options, answer } = shuffleOptions(q, q._number)
    return { q: q.stem, options, answer, explain: resolveExplanation(q) }
  })

  const prevNav = prev
    ? `<a href="ch${pad2(prev.id)}.html" className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← 第${prev.id}章 ${prev.title}</a>`
    : `<span></span>`
  const nextNav = next
    ? `<a href="ch${pad2(next.id)}.html" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">第${next.id}章 ${next.title} →</a>`
    : `<span className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">🎉 全章読破！おつかれさま</span>`

  return `${head}<script type="text/babel">
const { useState } = React;

${jsConst('KEYWORDS', chapter.keywords ?? [])}

${jsConst('QUIZ', quizData)}

function KeywordsPanel({ keywords }) {
  if (!keywords || keywords.length === 0) return null;
  return (
    <aside className="w-64 shrink-0 no-print hidden lg:block">
      <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="font-bold text-sm text-blue-900 mb-3">🔑 重要キーワード</p>
        {keywords.map((k, i) => (
          <div key={i} className="mb-3">
            <p className="text-sm font-semibold text-gray-800">{k.term}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{k.desc}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Quiz({ items }) {
  const [answers, setAnswers] = useState({});
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-10 pt-6 border-t-2 border-gray-200">
      <h3 className="text-lg font-bold text-purple-800 mb-4">📝 確認クイズ</h3>
      {items.map((item, qi) => {
        const selected = answers[qi];
        return (
          <div key={qi} className="mb-6">
            <p className="font-semibold text-gray-800 mb-2">Q{qi + 1}. {item.q}</p>
            {item.options.map((opt, oi) => {
              let cls = 'quiz-option';
              if (selected !== undefined) {
                if (oi === item.answer) cls += ' correct';
                else if (oi === selected) cls += ' wrong';
              }
              return (
                <div key={oi} className={cls} onClick={() => setAnswers({ ...answers, [qi]: oi })}>{opt}</div>
              );
            })}
            {selected !== undefined && (
              <p className={"text-sm mt-2 p-3 rounded-lg " + (selected === item.answer ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
                {selected === item.answer ? '⭕ 正解！' : '❌ 不正解。'} {item.explain}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg no-print sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <a href="../../index.html" className="px-2 py-1 rounded hover:bg-white/20 text-sm">← 目次</a>
          <p className="font-bold flex-1">🐯 Web開発の虎の巻</p>
          <p className="text-sm text-blue-200">第${chapter.id}章 / 全${total}章</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full flex-1">
        <main className="flex-1 p-6 min-w-0">
          <div className="rounded-2xl p-6 mb-6 text-white shadow-md bg-gradient-to-r ${g.card}">
            <span className="tag bg-white/20 text-white">第${chapter.id}章 · ${typeLabel}</span>
            <h1 className="text-2xl font-bold mt-2">${chapter.icon} ${chapter.title}</h1>
            <p className="${g.sub} mt-1">${chapter.subtitle}</p>
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="prose">
${body}
                </div>
                <Quiz items={QUIZ} />
              </div>
            </div>
            <KeywordsPanel keywords={KEYWORDS} />
          </div>

          <div className="flex justify-between mt-8 no-print">
            ${prevNav}
            ${nextNav}
          </div>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Page />);
</script>
</body>
</html>
`
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
  const chapters = loadChapters()
  if (chapters.length === 0) {
    console.log('[build-web] 章入力がありません（input/materials/web/chNN.yaml）')
    return
  }
  ensureDir(MATERIALS_OUT)
  ensureDir(QUESTIONS_OUT)
  console.log('[build-web] mode: output/（web 種別は ai_edu へは出力しない）')

  // 問題番号は章をまたいだ通し番号（ch01 から順に 1 始まり）
  let number = 0
  const questionsByChapter = new Map()
  for (const ch of chapters) {
    const qs = loadQuestionsFor(ch.id)
    qs.forEach((q) => {
      number += 1
      q._number = number
    })
    questionsByChapter.set(ch.id, qs)
  }

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const qs = questionsByChapter.get(ch.id) ?? []
    const html = buildChapterHtml(ch, qs, chapters[i - 1] ?? null, chapters[i + 1] ?? null, chapters.length)
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
  if (fs.existsSync(COURSE_IN)) {
    const course = yaml.load(fs.readFileSync(COURSE_IN, 'utf8'))

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
