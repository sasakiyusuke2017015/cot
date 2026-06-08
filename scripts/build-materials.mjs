#!/usr/bin/env node
// scripts/build-materials.mjs
//
// input/materials/lvN/chNN.yaml → ai_edu の章別単独型 HTML（chNN.html）を生成する。
// テンプレートは ai-certificate-html 仕様（React18+Babel+Tailwind CDN）。
//
// 使い方:
//   node scripts/build-materials.mjs            # dry-run → output/materials/lvN/
//   node scripts/build-materials.mjs --apply    # ai_edu の seeds/materials/lvN/ へ
//
// 注: index.html（ハブ型 CHAPTERS[]）の生成は未実装（TODO）。
//     現状は章別単独型 chNN.html のみ。ハブ型は references/index-template.md 参照。

import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

import { ROOT, outputRoots, parseArgs, ensureDir } from './lib/paths.mjs'
import { renderBlocks, collectKeywords } from './lib/render-blocks.mjs'

const INPUT_DIR = path.join(ROOT, 'input', 'materials')
const HEAD_TPL = fs.readFileSync(path.join(ROOT, 'scripts', 'templates', 'chapter-head.html'), 'utf8')

const TYPE_LABEL = { core: '知識', user: '実践', check: '確認' }

function listLevels() {
  if (!fs.existsSync(INPUT_DIR)) return []
  return fs.readdirSync(INPUT_DIR).filter((d) => /^lv\d+$/.test(d))
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function keywordsConst(keywords) {
  if (!keywords.length) return 'const KEYWORDS = [];'
  const items = keywords
    .map((k) => `  { term: ${JSON.stringify(k.term)}, desc: ${JSON.stringify(k.desc)} },`)
    .join('\n')
  return `const KEYWORDS = [\n${items}\n];`
}

function buildChapterHtml(chapter) {
  const total = chapter.total_chapters ?? '?'
  const typeLabel = TYPE_LABEL[chapter.type] ?? chapter.type
  const head = HEAD_TPL.replace(
    '__TITLE__',
    `研修教材 ${chapter.level.toUpperCase()} 第${chapter.id}章 - ${chapter.title}`,
  )
  const body = renderBlocks(chapter.content_blocks)
  const kw = collectKeywords(chapter)
  const nextHref = `ch${pad2(chapter.id + 1)}.html`

  return `${head}
<script type="text/babel">
${keywordsConst(kw)}

function KeywordsPanel({ keywords }) {
  if (!keywords || keywords.length === 0) return null;
  return (
    <div className="w-56 flex-shrink-0 no-print">
      <div className="sticky top-20">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-3">📌 重要キーワード</h4>
          <div className="space-y-3">
            {keywords.map((kw, i) => (
              <div key={i} className={\`\${i < keywords.length - 1 ? 'border-b border-blue-100 pb-3' : ''}\`}>
                <p className="font-bold text-sm text-blue-900">{kw.term}</p>
                <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{kw.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg no-print sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="index.html" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-sm font-semibold">← 一覧</a>
          <div className="flex-1">
            <h1 className="text-lg font-bold">研修教材</h1>
            <p className="text-xs text-blue-200">${chapter.level.toUpperCase()} ${chapter.subtitle}</p>
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">第${chapter.id}章 / 全${total}章</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full flex-1">
        <main className="flex-1 p-6 min-w-0">
          <div className="rounded-2xl p-6 mb-6 text-white shadow-md bg-gradient-to-r from-blue-700 to-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">第${chapter.id}章 · ${typeLabel}</span>
                <h2 className="text-2xl font-bold mt-2">${chapter.icon} ${chapter.title}</h2>
                <p className="text-sm opacity-80 mt-1">${chapter.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              <div className="prose">
${body}
              </div>
            </div>
            <KeywordsPanel keywords={KEYWORDS} />
          </div>

          <div className="flex justify-between mt-8 no-print">
            <a href="index.html" className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">← 一覧に戻る</a>
            <a href="${nextHref}" className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">次のページ →</a>
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

function buildLevel(level, outRoot) {
  const dir = path.join(INPUT_DIR, level)
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter((f) => /^ch\d+\.ya?ml$/.test(f))
  const outDir = path.join(outRoot, level)
  ensureDir(outDir)
  const written = []
  const chapters = files
    .map((f) => yaml.load(fs.readFileSync(path.join(dir, f), 'utf8')))
    .sort((a, b) => a.id - b.id)
  for (const ch of chapters) {
    const html = buildChapterHtml(ch)
    const file = path.join(outDir, `ch${pad2(ch.id)}.html`)
    fs.writeFileSync(file, html, 'utf8')
    written.push(file)
  }
  return written
}

function main() {
  const args = parseArgs(process.argv)
  const roots = outputRoots({ apply: args.apply })
  const levels = args.level ? [args.level] : listLevels()
  console.log(`[build-materials] mode: ${roots.mode}`)
  if (levels.length === 0) {
    console.log('  教材入力がありません（input/materials/lvN/...）')
    return
  }
  let count = 0
  for (const level of levels) {
    const written = buildLevel(level, roots.materials)
    written.forEach((f) => console.log(`  ✓ ${path.relative(ROOT, f)}`))
    count += written.length
  }
  if (count === 0) console.log('  生成対象なし')
  console.log('  （注: index.html ハブ型は未実装。chNN.html のみ生成）')
}

main()
