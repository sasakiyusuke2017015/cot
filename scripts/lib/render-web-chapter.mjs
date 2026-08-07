// scripts/lib/render-web-chapter.mjs
// web（虎の巻）種別の章ページ（chNN.html）を組み立てる。
//
// build-web.mjs（サイト用）と build-web-standalone.mjs（単体配布用）の両方から使う。
// 違いは `standalone` オプションだけ:
//   false … 目次へ戻るリンクと前後の章ナビを出す（サイトとして繋がっている前提）
//   true  … 他ファイルへのリンクを一切出さない（1ファイル単体で配れる）
//
// 本文・クイズ・キーワードの中身は両者で完全に同じ。二重管理しない。

import fs from 'node:fs'
import path from 'node:path'

import { ROOT } from './paths.mjs'
import { renderWebBlocks } from './render-blocks-web.mjs'

const HEAD_TPL = fs.readFileSync(
  path.join(ROOT, 'scripts', 'templates', 'web-chapter-head.html'),
  'utf8',
)

// 学習の「壁」ごとに4ブロックへ色分けする。
//   frontend … ブラウザの中だけで完結する（HTML/CSS/JS）
//   vcs      … 1人 → 2人の壁（Git・共同開発）
//   backend  … ブラウザ → サーバの壁（Python/SQL/API/DB）
//   release  … 手元 → 世界の壁（デプロイ）
//   advanced … 必修の外（TypeScript/React）
const TYPE_LABEL = {
  frontend: 'フロントエンド',
  vcs: 'バージョン管理',
  backend: 'バックエンド',
  release: '公開',
  advanced: '発展',
}
const GRADIENT = {
  frontend: { card: 'from-blue-700 to-blue-500', sub: 'text-blue-100' },
  vcs: { card: 'from-orange-600 to-amber-500', sub: 'text-orange-100' },
  backend: { card: 'from-emerald-700 to-emerald-500', sub: 'text-emerald-100' },
  release: { card: 'from-rose-600 to-pink-500', sub: 'text-rose-100' },
  advanced: { card: 'from-violet-700 to-violet-500', sub: 'text-violet-100' },
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function jsConst(name, value) {
  return `const ${name} = ${JSON.stringify(value, null, 2)};`
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

/**
 * 章ページの HTML を返す。
 * @param {object} chapter chNN.yaml
 * @param {object[]} quiz   その章の問題（_number 付き）
 * @param {{prev?: object|null, next?: object|null, total: number, standalone?: boolean}} opts
 */
export function renderWebChapter(chapter, quiz, { prev = null, next = null, total, standalone = false } = {}) {
  const typeLabel = TYPE_LABEL[chapter.type] ?? chapter.type
  const g = GRADIENT[chapter.type] ?? GRADIENT.frontend
  const head = HEAD_TPL.replace('__TITLE__', `Web開発の虎の巻 第${chapter.id}章 - ${chapter.title}`)
  const body = renderWebBlocks(chapter.content_blocks)

  const quizData = quiz.map((q) => {
    const { options, answer } = shuffleOptions(q, q._number)
    return { q: q.stem, options, answer, explain: resolveExplanation(q) }
  })

  // 単体配布版は他ファイルへのリンクを持たない（開いた1枚で完結させる）
  const backLink = standalone
    ? ''
    : `<a href="../../index.html" className="px-2 py-1 rounded hover:bg-white/20 text-sm">← 目次</a>
          `

  const prevNav = prev
    ? `<a href="ch${pad2(prev.id)}.html" className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← 第${prev.id}章 ${prev.title}</a>`
    : `<span></span>`
  const nextNav = next
    ? `<a href="ch${pad2(next.id)}.html" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">第${next.id}章 ${next.title} →</a>`
    : `<span className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">🎉 全章読破！おつかれさま</span>`

  // 単体版はナビの代わりに、続きがどこにあるかだけ文章で示す
  const footer = standalone
    ? `<div className="mt-8 text-center text-sm text-gray-500 no-print">
            <p>この章はここまで。${next ? `次は第${next.id}章「${next.title}」です。` : '全章読破です。おつかれさま。'}</p>
          </div>`
    : `<div className="flex justify-between mt-8 no-print">
            ${prevNav}
            ${nextNav}
          </div>`

  return `${head}<script type="text/babel">
const { useState } = React;

${jsConst('KEYWORDS', chapter.keywords ?? [])}

${jsConst('QUIZ', quizData)}

// クリックでチェックできるリスト。状態は localStorage に残すので、
// ページを閉じて開き直しても消えない（章ごと・項目ごとに保存）。
function CheckList({ items }) {
  const storeKey = 'cot-check-ch${pad2(chapter.id)}';
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storeKey) || '{}');
    } catch (e) {
      return {};
    }
  });
  const toggle = (text) => {
    const next = { ...checked, [text]: !checked[text] };
    setChecked(next);
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
    } catch (e) {
      /* 保存できなくても表示は動かす */
    }
  };
  return (
    <div className="chk-list">
      {items.map((text, i) => (
        <label key={i} className={"chk-item" + (checked[text] ? ' done' : '')}>
          <input type="checkbox" checked={!!checked[text]} onChange={() => toggle(text)} />
          <span>{text}</span>
        </label>
      ))}
    </div>
  );
}

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
          ${backLink}<p className="font-bold flex-1">🐯 Web開発の虎の巻</p>
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

          ${footer}
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
