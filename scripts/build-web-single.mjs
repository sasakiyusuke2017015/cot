#!/usr/bin/env node
// scripts/build-web-single.mjs
//
// 全章 + 講師用カンペを 1 つの HTML にまとめて出力する（output/toranomaki-all.html）。
// サーバも Pages も要らず、ファイルを送るだけでスマホで読める形。
//
// 章ページ（chNN.html）は React で描画するが、こちらは静的 HTML として書き出す。
// 確認クイズは details/summary で「答えを見る」形式にする（JS 不要）。
//
// 使い方: node scripts/build-web-single.mjs

import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

import { ROOT, ensureDir } from './lib/paths.mjs'

const MATERIALS_IN = path.join(ROOT, 'input', 'materials', 'web')
const QUESTIONS_IN = path.join(ROOT, 'input', 'questions', 'web')
// 受講者用（講師用メモ抜き）と講師用（メモ入り）の2種類を出す
const OUT_LEARNER = path.join(ROOT, 'output', 'all-learner.html')
const OUT_TEACHER = path.join(ROOT, 'output', 'all-teacher.html')
// 従来の名前は講師用として維持
const OUT_LEGACY = path.join(ROOT, 'output', 'toranomaki-all.html')

const TYPE_LABEL = { core: '基礎', user: '実践', advanced: '発展' }

function pad2(n) {
  return String(n).padStart(2, '0')
}

function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** `**強調**` を <strong>、`` `コード` `` を <code> に。 */
function inline(text) {
  // 段落内の改行は著者が意図した折り返し（対比・箇条）なので <br> にする。
  return code(esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')).replace(/\n/g, '<br>')
}

// 二重形 ``…`` の退避印。本文に絶対現れない制御文字を使う。
const HOLD = String.fromCharCode(0)
const HOLD_RE = new RegExp(HOLD + '(\\d+)' + HOLD, 'g')

/**
 * `コード` を <code> に。
 * 二重形 ``…`` は中身にバッククォートを含むコードを表すので、先に取り出して退避し、
 * 単一形の処理が中のバッククォートを食わないようにする（Markdown と同じ挙動）。
 */
function code(text) {
  const held = []
  return text
    .replace(/``(.+?)``/g, (_, s) => HOLD + (held.push(s.trim()) - 1) + HOLD)
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(HOLD_RE, (_, i) => '<code>' + held[Number(i)] + '</code>')
}

/** ボックス本文の 2 段落目以降を <p> で続ける（改行が空白に潰れるのを防ぐ）。 */
function boxBody(text) {
  const [first, ...rest] = String(text ?? '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  return inline(first ?? '') + rest.map((s) => `<p class="mt-2">${inline(s)}</p>`).join('')
}

function loadChapters() {
  if (!fs.existsSync(MATERIALS_IN)) return []
  return fs
    .readdirSync(MATERIALS_IN)
    .filter((f) => /^ch\d+\.ya?ml$/.test(f))
    .map((f) => yaml.load(fs.readFileSync(path.join(MATERIALS_IN, f), 'utf8')))
    .sort((a, b) => a.id - b.id)
}

function loadQuestions(chapterId) {
  const file = path.join(QUESTIONS_IN, `ch${pad2(chapterId)}.yaml`)
  if (!fs.existsSync(file)) return []
  const doc = yaml.load(fs.readFileSync(file, 'utf8'))
  return (Array.isArray(doc) ? doc : doc?.questions) ?? []
}

function resolveExplanation(q) {
  return String(q.explanation ?? '')
    .replaceAll('${正答1}', q.correct)
    .replaceAll('${誤答1}', q.wrongs?.[0] ?? '')
    .replaceAll('${誤答2}', q.wrongs?.[1] ?? '')
    .replaceAll('${誤答3}', q.wrongs?.[2] ?? '')
}

// content_blocks → 静的 HTML
const BLOCK = {
  h3: (b) => `<h3>${inline(b.text)}</h3>`,
  paragraph: (b) => `<p>${inline(b.text)}</p>`,
  ul: (b) => `<ul>${(b.items ?? []).map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`,
  ol: (b) => `<ol>${(b.items ?? []).map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`,
  'kv-box': (b) => `<div class="kv-box"><strong>${inline(b.title)}</strong> ${boxBody(b.text)}</div>`,
  'warn-box': (b) => `<div class="warn-box"><strong>${inline(b.title)}</strong> ${boxBody(b.text)}</div>`,
  'tip-box': (b) => `<div class="tip-box"><strong>${inline(b.title)}</strong> ${boxBody(b.text)}</div>`,
  'ex-box': (b) =>
    `<div class="ex-box"><p class="ex-title">✏️ ${inline(b.title ?? '演習')}</p><p>${inline(b.text)}</p></div>`,
  checklist: (b) =>
    `<h3>${inline(b.title ?? 'チェックリスト')}</h3>` +
    (b.items ?? []).map((i) => `<div class="chk-item">${inline(i)}</div>`).join(''),
  code: (b) => `<pre class="code-block">${esc(String(b.text ?? '').replace(/\n$/, ''))}</pre>`,
  assignment: (b) => {
    const steps = (b.steps ?? []).map((s) => `<li>${inline(s)}</li>`).join('')
    const done = (b.done ?? []).map((s) => `<div class="chk-item">${inline(s)}</div>`).join('')
    return `<div class="assign-box">
  <p class="assign-title">🛠 課題: ${inline(b.title)}</p>
  ${b.goal ? `<p class="assign-goal">${inline(b.goal)}</p>` : ''}
  ${steps ? `<p class="assign-h">作るもの</p><ol class="assign-steps">${steps}</ol>` : ''}
  ${done ? `<p class="assign-h">できたと言える条件</p>${done}` : ''}
  ${b.hint ? `<p class="assign-hint">💡 ${inline(b.hint)}</p>` : ''}
</div>`
  },
  table: (b) => {
    const head = (b.headers ?? []).map((h) => `<th class="tbl-th">${inline(h)}</th>`).join('')
    const rows = (b.rows ?? [])
      .map((r) => `<tr>${r.map((c) => `<td class="tbl-td">${inline(c)}</td>`).join('')}</tr>`)
      .join('')
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
  },
}

function renderBlocks(blocks) {
  return (blocks ?? [])
    .map((b) => {
      const fn = BLOCK[b.kind]
      if (!fn) throw new Error(`未知の content_block kind: ${b.kind}`)
      return fn(b)
    })
    .join('\n')
}

function renderChapter(ch, questions, teacher) {
  const kw = (ch.keywords ?? [])
    .map((k) => `<div class="kw"><span class="kw-term">${esc(k.term)}</span>${esc(k.desc)}</div>`)
    .join('')

  const quiz = questions
    .map((q, i) => {
      const opts = [q.correct, ...(q.wrongs ?? [])]
      // 章内で順序が偏らないよう、問題番号でずらす
      const rotated = opts.slice(i % opts.length).concat(opts.slice(0, i % opts.length))
      return `<div class="quiz">
  <p class="quiz-q">Q${i + 1}. ${esc(q.stem)}</p>
  <ul class="quiz-opts">${rotated.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
  <details><summary>答えと解説</summary>
    <p class="quiz-a">正解: <strong>${esc(q.correct)}</strong></p>
    <p>${esc(resolveExplanation(q))}</p>
  </details>
</div>`
    })
    .join('\n')

  const t = teacher ? ch.teaching : null
  const teaching = t
    ? `<details class="teaching"><summary>👤 講師用メモ${t.sessions ? `（${t.sessions}コマ）` : ''}</summary>
  ${t.goal ? `<p><strong>ねらい:</strong> ${esc(t.goal)}</p>` : ''}
  ${t.watch ? `<p><strong>つまずき:</strong> ${esc(t.watch)}</p>` : ''}
  ${t.ask ? `<p><strong>問いかけ:</strong> 「${esc(t.ask)}」</p>` : ''}
</details>`
    : ''

  return `<section id="ch${pad2(ch.id)}" class="chapter">
  <div class="ch-head ${ch.type === 'core' ? 'core' : 'user'}">
    <span class="tag">第${ch.id}章 · ${TYPE_LABEL[ch.type] ?? ch.type}</span>
    <h2>${esc(ch.icon ?? '')} ${esc(ch.title)}</h2>
    <p class="ch-sub">${esc(ch.subtitle)}</p>
  </div>
  ${teaching}
  <div class="prose">
${renderBlocks(ch.content_blocks)}
  </div>
  ${kw ? `<div class="kw-panel"><p class="kw-title">🔑 重要キーワード</p>${kw}</div>` : ''}
  ${quiz ? `<div class="quiz-wrap"><p class="quiz-title">📝 確認クイズ</p>${quiz}</div>` : ''}
  <p class="to-top"><a href="#toc">↑ 目次へ</a></p>
</section>`
}

function buildHtml(chapters, teacher) {
  const toc = chapters
    .map(
      (c) =>
        `<li><a href="#ch${pad2(c.id)}"><span class="toc-n">${c.id}</span> ${esc(c.icon ?? '')} ${esc(c.title)}<span class="toc-sub">${esc(c.subtitle)}</span></a></li>`,
    )
    .join('')

  const body = chapters.map((c) => renderChapter(c, loadQuestions(c.id), teacher)).join('\n')
  const totalQ = chapters.reduce((s, c) => s + loadQuestions(c.id).length, 0)

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Web開発の虎の巻 — 全${chapters.length}章${teacher ? '（講師用）' : ''}</title>
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: 'Yu Gothic UI','Yu Gothic',-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;
  margin:0; padding:0; line-height:1.8; color:#1f2937; background:#f9fafb; }
.wrap { max-width: 820px; margin:0 auto; padding: 0 16px 60px; }
header.top { background:linear-gradient(135deg,#f59e0b,#ea580c); color:#fff; padding:28px 16px; }
header.top .inner { max-width:820px; margin:0 auto; }
header.top h1 { margin:6px 0 8px; font-size:1.7rem; }
header.top p { margin:0; opacity:.95; font-size:.9rem; }
.badges { margin-top:12px; display:flex; flex-wrap:wrap; gap:6px; }
.badges span { background:rgba(255,255,255,.22); border-radius:999px; padding:3px 10px; font-size:.78rem; }
#toc { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin:20px 0; }
#toc h2 { margin:0 0 10px; font-size:1.1rem; color:#92400e; }
#toc ul { list-style:none; margin:0; padding:0; }
#toc li a { display:flex; align-items:center; gap:8px; padding:9px 6px; border-bottom:1px solid #f3f4f6;
  text-decoration:none; color:#1f2937; font-weight:600; }
#toc li:last-child a { border-bottom:none; }
.toc-n { width:26px; height:26px; flex:none; border-radius:50%; background:#f59e0b; color:#fff;
  font-size:.8rem; display:flex; align-items:center; justify-content:center; }
.toc-sub { margin-left:auto; font-weight:400; font-size:.75rem; color:#9ca3af; }
.chapter { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:0 0 16px; margin:18px 0; overflow:hidden; }
.ch-head { padding:18px 16px; color:#fff; }
.ch-head.core { background:linear-gradient(135deg,#1d4ed8,#3b82f6); }
.ch-head.user { background:linear-gradient(135deg,#047857,#10b981); }
.ch-head h2 { margin:8px 0 4px; font-size:1.35rem; }
.ch-sub { margin:0; opacity:.9; font-size:.85rem; }
.tag { background:rgba(255,255,255,.25); border-radius:999px; padding:2px 9px; font-size:.7rem; font-weight:700; }
.prose { padding: 0 16px; }
.prose h3 { font-size:1.05rem; color:#1e3a8a; margin:1.8rem 0 .6rem; padding-top:1rem; border-top:2px solid #e5e7eb; }
.prose h3:first-child { border-top:none; padding-top:0; margin-top:1rem; }
.prose p { margin:0 0 1rem; }
.prose ul,.prose ol { padding-left:1.4rem; margin:0 0 1rem; }
.prose li { margin-bottom:.4rem; }
.kv-box,.warn-box,.tip-box { padding:12px 14px; border-radius:0 8px 8px 0; margin:1.2rem 0; font-size:.94rem; }
.kv-box { background:#eff6ff; border-left:4px solid #3b82f6; }
.warn-box { background:#fff7ed; border-left:4px solid #f97316; }
.tip-box { background:#f0fdf4; border-left:4px solid #10b981; }
.ex-box { background:#faf5ff; border:2px dashed #7c3aed; border-radius:10px; padding:12px 14px; margin:1.2rem 0; }
.ex-title { font-weight:700; color:#5b21b6; margin:0 0 .4rem; }
.ex-box p:last-child { margin:0; }
.chk-item { display:flex; gap:8px; padding:5px 0; font-size:.88rem; }
.chk-item::before { content:"☐"; color:#f97316; flex:none; }
.code-block { background:#111827; color:#f3f4f6; font-family:Consolas,Monaco,monospace; font-size:.8rem;
  line-height:1.65; border-radius:8px; padding:12px 14px; overflow-x:auto; margin:1.1rem 0; }
code { background:#f1f5f9; color:#be185d; font-family:Consolas,Monaco,monospace; font-size:.86em;
  border-radius:4px; padding:.1em .35em; word-break:break-word; }
.code-block code { background:none; color:inherit; padding:0; font-size:inherit; }
.assign-box { background:linear-gradient(135deg,#fff7ed,#fef3c7); border:2px solid #f59e0b; border-radius:10px; padding:14px 16px; margin:1.6rem 0; }
.assign-title { font-weight:700; font-size:1rem; color:#92400e; margin:0 0 .4rem; }
.assign-goal { color:#78350f; margin:0 0 .7rem; }
.assign-h { font-weight:700; font-size:.82rem; color:#92400e; margin:.8rem 0 .3rem; }
.assign-steps { list-style:decimal; padding-left:1.4rem; margin:0 0 .4rem; }
.assign-steps li { margin-bottom:.3rem; color:#451a03; }
.assign-hint { margin-top:.8rem; font-size:.83rem; color:#78350f; background:#fffbeb; border-radius:6px; padding:8px 10px; }
.tbl-wrap { overflow-x:auto; margin:1.3rem 0; border:1px solid #e5e7eb; border-radius:8px; }
.tbl { width:100%; border-collapse:collapse; font-size:.83rem; min-width:460px; }
.tbl-th { background:#1e3a8a; color:#fff; text-align:left; padding:8px 10px; font-weight:600; }
.tbl-td { border-top:1px solid #e5e7eb; padding:8px 10px; vertical-align:top; color:#374151; }
.tbl tbody tr:nth-child(even) { background:#f9fafb; }
.kw-panel { margin:16px; padding:12px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; }
.kw-title { font-weight:700; font-size:.85rem; color:#1e3a8a; margin:0 0 8px; }
.kw { font-size:.8rem; color:#64748b; margin-bottom:7px; }
.kw-term { display:block; font-weight:700; color:#334155; }
.quiz-wrap { margin:16px; padding-top:12px; border-top:2px solid #e5e7eb; }
.quiz-title { font-weight:700; color:#6b21a8; margin:0 0 10px; }
.quiz { margin-bottom:16px; }
.quiz-q { font-weight:600; margin:0 0 6px; }
.quiz-opts { list-style:none; padding:0; margin:0 0 6px; }
.quiz-opts li { border:2px solid #e5e7eb; border-radius:8px; padding:7px 12px; margin:5px 0; font-size:.9rem; }
details { border:1px solid #e5e7eb; border-radius:8px; padding:8px 12px; background:#fafafa; }
summary { cursor:pointer; font-weight:600; font-size:.88rem; color:#4b5563; }
details[open] summary { margin-bottom:8px; }
details p { margin:.4rem 0; font-size:.88rem; }
.quiz-a { color:#065f46; }
.teaching { margin:16px 16px 0; background:#fffbeb; border-color:#fde68a; }
.teaching summary { color:#92400e; }
.to-top { text-align:right; margin:12px 16px 0; }
.to-top a { font-size:.8rem; color:#9ca3af; text-decoration:none; }
@media (prefers-color-scheme: dark) {
  body { background:#0f172a; color:#e2e8f0; }
  #toc,.chapter { background:#1e293b; border-color:#334155; }
  #toc li a { color:#e2e8f0; border-color:#334155; }
  .prose h3 { color:#93c5fd; border-color:#334155; }
  .kv-box { background:#1e3a5f; } .warn-box { background:#42230c; } .tip-box { background:#0d3b2e; }
  .ex-box { background:#2e1065; } .ex-title { color:#c4b5fd; }
  .kw-panel { background:#0f172a; border-color:#334155; } .kw-term { color:#cbd5e1; }
  .quiz-opts li { border-color:#334155; }
  details { background:#0f172a; border-color:#334155; } summary { color:#cbd5e1; }
  .teaching { background:#422006; border-color:#a16207; } .teaching summary { color:#fcd34d; }
  .assign-box { background:linear-gradient(135deg,#422006,#451a03); border-color:#b45309; }
  .assign-title,.assign-h { color:#fcd34d; } .assign-goal { color:#fde68a; }
  .assign-steps li { color:#fef3c7; }
  .assign-hint { background:#292524; color:#fde68a; }
  .tbl-wrap { border-color:#334155; } .tbl-td { border-color:#334155; color:#cbd5e1; }
  .tbl tbody tr:nth-child(even) { background:#0f172a; }
}
@media print {
  .to-top,#toc { display:none; }
  details { open: true; }
  .chapter { page-break-before: always; border:none; }
}
</style>
</head>
<body>

<header class="top">
  <div class="inner">
    <p style="font-size:.75rem;letter-spacing:.15em;opacity:.9;margin:0">🐯 WEB DEVELOPMENT PLAYBOOK${teacher ? ' — 講師用' : ''}</p>
    <h1>Web開発の虎の巻</h1>
    <p>${teacher ? 'リモート・2人・1日1時間で、Web開発を教えるためのガイド。' : 'Web開発を学ぶための教材。'}全${chapters.length}章・確認問題${totalQ}問。</p>
    <div class="badges">
      <span>👥 生徒2人</span><span>🏠 リモート</span><span>⏰ 1日1時間</span><span>🗓 目安 4〜6か月</span>
    </div>
  </div>
</header>

<div class="wrap">

<nav id="toc">
  <h2>目次</h2>
  <ul>${toc}</ul>
</nav>

${body}

</div>
</body>
</html>
`

}

function main() {
  const chapters = loadChapters()
  if (chapters.length === 0) {
    console.log('[build-web-single] 章入力がありません')
    return
  }

  ensureDir(path.join(ROOT, 'output'))
  const write = (file, teacher, label) => {
    const html = buildHtml(chapters, teacher)
    fs.writeFileSync(file, html, 'utf8')
    const kb = Math.round(Buffer.byteLength(html, 'utf8') / 1024)
    console.log(`[build-web-single] ✓ ${path.relative(ROOT, file)}  (${label} / ${kb}KB)`)
    return html
  }

  write(OUT_LEARNER, false, '受講者用・講師メモなし')
  const teacherHtml = write(OUT_TEACHER, true, '講師用・メモ入り')
  // 従来の名前は講師用として維持
  fs.writeFileSync(OUT_LEGACY, teacherHtml, 'utf8')

  console.log('  1ファイルで完結します。受講者に渡すのは all-learner.html です。')
}

main()
