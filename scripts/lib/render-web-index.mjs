// scripts/lib/render-web-index.mjs
// web 種別の講師向けハブページ（index.html）を組み立てる。
//
// 元データは input/materials/web/course.yaml（コース運営の設計）と
// 各 chNN.yaml の teaching / title / type など。章を足せば一覧もカンペも自動で増える。
//
// 生徒向けの chNN.html と違い React は使わない（静的な読み物・印刷して使う想定）。

/** `**強調**` を <strong> に。HTML エスケープつき。 */
function inline(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

const COLOR = {
  sky: { bar: 'bg-sky-500', text: 'text-sky-600', border: 'border-sky-400', bg: 'bg-sky-50' },
  amber: { bar: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-400', bg: 'bg-amber-50' },
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  violet: { bar: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-400', bg: 'bg-violet-50' },
  red: { bar: 'bg-red-500', text: 'text-red-600', border: 'border-red-400', bg: 'bg-red-50' },
}
const color = (name) => COLOR[name] ?? COLOR.amber

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 学習の「壁」ごとの4ブロック + 発展。ロードマップはこの単位で区切って見せる。 */
const TAG = {
  frontend: { label: 'フロントエンド', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  vcs: { label: 'バージョン管理', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  backend: { label: 'バックエンド', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  release: { label: '公開', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  advanced: { label: '発展', cls: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
}

/** 各ブロックの見出し。壁を越える意味を一言で示す。 */
const BLOCK_INTRO = {
  frontend: { title: 'フロントエンド', lead: 'ブラウザの中で動くものを作る。ここまでで「動くWebページ」が自力で作れる。' },
  vcs: { title: 'バージョン管理', lead: '1人 → 2人の壁。履歴を残し、2人で1つのものを作る。ここでオセロを完成させる。' },
  backend: { title: 'バックエンド', lead: 'ブラウザ → サーバの壁。別の言語でサーバを書き、データを保存できるようにする。' },
  release: { title: '公開', lead: '手元 → 世界の壁。作ったものを誰でも使える場所に置く。' },
  advanced: { title: '発展', lead: '必修の外。動くものができた後で、より良くするための道具。' },
}
const BLOCK_ORDER = ['frontend', 'vcs', 'backend', 'release', 'advanced']

/** セクション見出しの番号。0 を渡すと番号なし（受講者用は通し番号を振らない）。 */
function num(n) {
  return n ? `${n}. ` : ''
}

/**
 * 章カード一覧。chNN.yaml から自動集約する。
 * teacher=true のときだけ コマ数 / ねらい（teaching:）を出す。
 * link=false のときはカードをリンクにしない（単体配布版。他ファイルを参照しない）。
 */
function renderRoadmap(chapters, { teacher, link = true }) {
  const totalSessions = chapters.reduce((s, c) => s + (c.teaching?.sessions ?? 0), 0)

  const card = (c) => {
    const tag = TAG[c.type] ?? TAG.frontend
    const t = c.teaching ?? {}
    const sessions =
      teacher && t.sessions ? `<span class="text-xs text-slate-400 shrink-0">${t.sessions}コマ</span>` : ''
    const goal =
      teacher && t.goal
        ? `<p class="text-xs text-slate-600 bg-slate-50 rounded p-2 leading-relaxed"><strong class="text-slate-700">ねらい:</strong> ${inline(t.goal)}</p>`
        : ''
    const open = link
      ? `<a href="materials/web/ch${pad2(c.id)}.html" class="block bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition p-4">`
      : `<div class="bg-white rounded-xl border border-slate-200 p-4">`
    const close = link ? '</a>' : '</div>'
    return `          ${open}
            <div class="flex items-center gap-2 mb-2">
              <span class="w-7 h-7 shrink-0 rounded-full ${tag.dot} text-white text-sm font-bold flex items-center justify-center">${c.id}</span>
              <span class="text-lg">${c.icon ?? ''}</span>
              <span class="font-bold flex-1 truncate">${inline(c.title)}</span>
              ${sessions}
            </div>
            <p class="text-sm text-slate-500${goal ? ' mb-2' : ''}">${inline(c.subtitle)}</p>
            ${goal}
          ${close}`
  }

  // 学習の「壁」ごとにグループ化して並べる
  const groups = BLOCK_ORDER.map((type) => {
    const members = chapters.filter((c) => c.type === type)
    if (members.length === 0) return ''
    const meta = BLOCK_INTRO[type]
    const tag = TAG[type]
    const range = `${members[0].id}〜${members.at(-1).id}章`
    const groupSessions = members.reduce((s, c) => s + (c.teaching?.sessions ?? 0), 0)
    return `      <div class="mb-7">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full ${tag.dot}"></span>
          <h3 class="font-bold text-lg">${meta.title}</h3>
          <span class="text-xs text-slate-400">${members.length === 1 ? members[0].id + '章' : range}</span>
          ${teacher && groupSessions ? `<span class="text-xs text-slate-400">・${groupSessions}コマ</span>` : ''}
        </div>
        <p class="text-sm text-slate-600 mb-3">${inline(meta.lead)}</p>
        <div class="grid md:grid-cols-2 gap-3">
${members.map(card).join('\n')}
        </div>
      </div>`
  }).filter(Boolean)

  const heading = teacher ? `学習ロードマップ（全${chapters.length}章）` : `学習ロードマップ`
  const note = !link
    ? 'この順に進めます。ブロックの切れ目が学習の「壁」です。'
    : teacher
      ? 'カードをクリックすると受講者向けの教材ページが開きます。ブロックの切れ目が学習の「壁」です。'
      : 'この順に進めます。ブロックごとに、越える壁が変わります。'

  return `    <section>
      <div class="flex items-baseline justify-between mb-4">
        <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3">${teacher && link ? '1. ' : ''}${heading}</h2>
        ${teacher && totalSessions ? `<span class="text-sm text-slate-500">想定 計${totalSessions}コマ（1コマ=1時間）</span>` : ''}
      </div>
      <p class="text-sm text-slate-600 mb-5">${note}</p>
${groups.join('\n')}
    </section>`
}

/** 章ごとの講師カンペ表。teaching を持つ章だけ出す。 */
function renderTeachingNotes(chapters) {
  const withTeaching = chapters.filter((c) => c.teaching)
  if (withTeaching.length === 0) return ''

  const rows = withTeaching
    .map((c) => {
      const t = c.teaching
      return `          <tr class="border-b border-slate-100 align-top">
            <td class="px-3 py-3 whitespace-nowrap">
              <a href="materials/web/ch${pad2(c.id)}.html" class="font-semibold text-amber-700 hover:underline">${c.id}. ${inline(c.title)}</a>
              ${t.sessions ? `<div class="text-xs text-slate-400 mt-0.5">${t.sessions}コマ</div>` : ''}
            </td>
            <td class="px-3 py-3 text-sm">${inline(t.goal ?? '')}</td>
            <td class="px-3 py-3 text-sm text-slate-600">${inline(t.watch ?? '')}</td>
            <td class="px-3 py-3 text-sm text-violet-700 italic">${t.ask ? '「' + inline(t.ask) + '」' : ''}</td>
          </tr>`
    })
    .join('\n')

  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">2. 章別カンペ（講師用）</h2>
      <p class="text-sm text-slate-600 mb-4">各章を教えるときのねらい・つまずきポイント・投げかける質問。生徒向けページには出ません。</p>
      <div class="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table class="w-full text-left min-w-[720px]">
          <thead class="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-3 py-2">章</th>
              <th class="px-3 py-2">ねらい</th>
              <th class="px-3 py-2">つまずき・見るところ</th>
              <th class="px-3 py-2">問いかけ</th>
            </tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
    </section>`
}

function renderPrinciple(p, n) {
  if (!p) return ''
  const chain = (p.cycle ?? [])
    .map(
      (s, i, arr) =>
        `<span class="bg-amber-100 text-amber-800 rounded-lg px-4 py-2">${inline(s)}</span>` +
        (i < arr.length - 1 ? '<span class="text-amber-500">→</span>' : ''),
    )
    .join('\n          ')
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(p.title)}</h2>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p class="leading-relaxed mb-4">${inline(p.text)}</p>
        <div class="flex flex-wrap items-center justify-center gap-2 text-center font-semibold text-sm">
          ${chain}
        </div>
      </div>
    </section>`
}

function renderLessonPlan(lp, n) {
  if (!lp) return ''
  const total = (lp.slots ?? []).reduce((s, x) => s + x.minutes, 0) || 60
  const bar = (lp.slots ?? [])
    .map(
      (s) =>
        `<div class="${color(s.color).bar} flex items-center justify-center" style="width:${((s.minutes / total) * 100).toFixed(1)}%">${s.minutes}分</div>`,
    )
    .join('\n          ')
  const legend = (lp.slots ?? [])
    .map(
      (s) =>
        `<div><p class="font-bold ${color(s.color).text}">${inline(s.label)}</p><p>${inline(s.desc)}</p></div>`,
    )
    .join('\n          ')
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(lp.title)}</h2>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div class="flex w-full h-12 rounded-lg overflow-hidden text-white text-xs md:text-sm font-bold text-center">
          ${bar}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          ${legend}
        </div>
        ${lp.warning ? `<p class="mt-4 text-sm bg-red-50 border-l-4 border-red-400 rounded p-3">⚠️ ${inline(lp.warning)}</p>` : ''}
      </div>
    </section>`
}

function renderMentorRoles(mr, n) {
  if (!mr) return ''
  const cards = (mr.items ?? [])
    .map((it, i) => {
      const c = color(it.color)
      const badge = it.badge
        ? ` <span class="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 ml-1">${inline(it.badge)}</span>`
        : ''
      return `        <div class="bg-white rounded-xl shadow-sm border-t-4 ${c.border} border border-slate-200 p-5${it.wide ? ' md:col-span-2' : ''}">
          <p class="font-bold mb-2">${'①②③④⑤⑥⑦⑧⑨'[i] ?? ''} ${inline(it.label)}${badge}</p>
          <p class="text-sm">${inline(it.text)}</p>
        </div>`
    })
    .join('\n')
  const notNeeded = mr.not_needed
    ? `      <div class="mt-4 bg-slate-100 rounded-xl p-5 text-sm">
        <p class="font-bold mb-2">🚫 ${inline(mr.not_needed.title)}</p>
        <p>${inline(mr.not_needed.text)}</p>
      </div>`
    : ''
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(mr.title)}</h2>
      ${mr.lead ? `<p class="mb-4 text-sm text-slate-600">${inline(mr.lead)}</p>` : ''}
      <div class="grid md:grid-cols-2 gap-4">
${cards}
      </div>
${notNeeded}
    </section>`
}

function renderQuestionRule(qr, n) {
  if (!qr) return ''
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(qr.title)}</h2>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p class="mb-3 text-sm">${inline(qr.lead)}</p>
        <blockquote class="border-l-4 border-amber-500 bg-amber-50 rounded p-4 font-semibold">${inline(qr.quote)}</blockquote>
        ${qr.note ? `<p class="mt-3 text-sm text-slate-600">${inline(qr.note)}</p>` : ''}
      </div>
    </section>`
}

function renderGrowthSteps(gs, n) {
  if (!gs) return ''
  const items = (gs.items ?? [])
    .map((it, i) => {
      const bullets = it.bullets
        ? `<ul class="text-sm list-disc list-inside space-y-1">${it.bullets.map((b) => `<li>${inline(b)}</li>`).join('')}</ul>`
        : ''
      const groups = it.groups
        ? `<div class="grid md:grid-cols-2 gap-3 text-sm mt-2">${it.groups
            .map(
              (g) =>
                `<div class="${color(g.color).bg} rounded p-3"><p class="font-bold ${color(g.color).text} mb-1">${inline(g.label)}</p>${inline(g.text)}</div>`,
            )
            .join('')}</div>`
        : ''
      const flow = it.flow
        ? `<div class="flex flex-wrap items-center gap-1 text-sm font-semibold mt-3">${it.flow
            .map(
              (f, fi, arr) =>
                `<span class="bg-slate-100 rounded px-3 py-1">${inline(f)}</span>` +
                (fi < arr.length - 1 ? '<span class="text-amber-500">→</span>' : ''),
            )
            .join('')}</div>`
        : ''
      const period = it.period ? `（${inline(it.period)}）` : ''
      return `        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p class="font-bold text-lg mb-1">STEP ${i + 1}｜${inline(it.label)} <span class="text-sm font-normal text-slate-500">${period}— ${inline(it.goal)}</span></p>
          ${bullets}${groups}
          ${it.note ? `<p class="text-sm mt-3">${inline(it.note)}</p>` : ''}
          ${flow}
        </div>`
    })
    .join('\n')
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(gs.title)}</h2>
      <div class="space-y-4">
${items}
      </div>
    </section>`
}

function renderAntiPatterns(ap, n) {
  if (!ap) return ''
  const cards = (ap.items ?? [])
    .map(
      (it) => `        <div class="bg-white rounded-xl shadow-sm border-t-4 border-red-500 border border-slate-200 p-5">
          <p class="font-bold mb-2">❌ ${inline(it.label)}</p>
          <p>${inline(it.text)}</p>
        </div>`,
    )
    .join('\n')
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(ap.title)}</h2>
      <div class="grid md:grid-cols-3 gap-4 text-sm">
${cards}
      </div>
    </section>`
}

function renderLearnerTraits(lt, n) {
  if (!lt) return ''
  const panel = (side, cls) =>
    `        <div class="${cls} rounded-xl p-5">
          <p class="font-bold mb-2">${side.icon ?? ''} ${inline(side.label)}</p>
          <ul class="list-disc list-inside space-y-1">${(side.items ?? []).map((x) => `<li>${inline(x)}</li>`).join('')}</ul>
        </div>`
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(lt.title)}</h2>
      <div class="grid md:grid-cols-2 gap-4 text-sm">
${panel(lt.good, 'bg-emerald-50 border border-emerald-200 text-emerald-900')}
${panel(lt.bad, 'bg-red-50 border border-red-200 text-red-900')}
      </div>
    </section>`
}

function renderTeachingCycle(tc, n) {
  if (!tc) return ''
  const steps = (tc.steps ?? [])
    .map(
      (s, i, arr) =>
        `<span class="bg-amber-100 text-amber-800 rounded-lg px-4 py-2">${inline(s)}</span>` +
        (i < arr.length - 1 ? '<span class="text-amber-500">→</span>' : ''),
    )
    .join('\n          ')
  return `    <section>
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-3 mb-4">${num(n)}${inline(tc.title)}</h2>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div class="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-center">
          ${steps}
        </div>
        ${tc.note ? `<p class="mt-4 text-sm text-center text-slate-600">${inline(tc.note)}</p>` : ''}
      </div>
    </section>`
}

/**
 * ページの外枠（head / ヘッダ / main / footer）。
 * ハブページと単体配布のロードマップページで共有する。
 */
function pageShell({ course, teacher, sections, switchLink = '', titleSuffix, label, grad, lead, footerText }) {
  const badges = (course.conditions ?? [])
    .map((c) => `<span class="bg-white/20 rounded-full px-3 py-1">${inline(c)}</span>`)
    .join('\n        ')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${inline(course.title)}${titleSuffix}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
body { font-family: 'Yu Gothic UI', 'Yu Gothic', 'YuGothic', sans-serif; }
@media print { .no-print { display:none; } a { text-decoration:none; color:inherit; } }
</style>
</head>
<body class="${teacher ? 'bg-amber-50' : 'bg-slate-50'} text-slate-800">

<header class="bg-gradient-to-r ${grad} text-white">
  <div class="max-w-5xl mx-auto px-6 py-10">
    <p class="text-white/80 text-sm tracking-widest mb-2">${label}</p>
    <h1 class="text-3xl md:text-4xl font-bold mb-3">${inline(course.title)}</h1>
    <p class="text-white/90 leading-relaxed">${lead}</p>
    <div class="flex flex-wrap gap-2 mt-4 text-sm">
        ${badges}
    </div>
  </div>
</header>
${switchLink}

<main class="max-w-5xl mx-auto px-6 py-10 space-y-12">

${sections}

</main>

<footer class="text-center text-xs text-slate-400 pb-8">
  ${footerText}
</footer>

</body>
</html>
`
}

/**
 * 学習ロードマップだけの単体ページ。
 * 他ファイルへのリンクを持たないので、この 1 枚だけ配っても成立する。
 */
export function renderWebRoadmapPage(course, chapters, { audience = 'learner' } = {}) {
  const teacher = audience === 'teacher'
  const suffix = teacher ? ' — 学習ロードマップ（講師用）' : ' — 学習ロードマップ'
  return pageShell({
    course,
    teacher,
    sections: renderRoadmap(chapters, { teacher, link: false }),
    titleSuffix: suffix,
    label: teacher ? '🐯 WEB DEVELOPMENT PLAYBOOK — 講師用' : '🐯 WEB DEVELOPMENT PLAYBOOK',
    grad: teacher ? 'from-amber-500 to-orange-600' : 'from-blue-600 to-indigo-700',
    lead: inline(course.lead),
    footerText: `${inline(course.title)}${suffix}`,
  })
}

/**
 * ハブページを組み立てる。
 * @param {object} course   course.yaml
 * @param {object[]} chapters chNN.yaml の配列
 * @param {{audience?: 'teacher'|'learner'}} [opts]
 *   teacher … 章別カンペ・教え方（course.yaml の各節）を含む
 *   learner … 章一覧と学び方の心得だけ。teaching: の内容は一切出さない
 */
export function renderWebIndex(course, chapters, { audience = 'teacher' } = {}) {
  const teacher = audience === 'teacher'
  const sections = [renderRoadmap(chapters, { teacher })]

  if (teacher) {
    // セクション番号は存在するものだけ通し番号を振る
    sections.push(renderTeachingNotes(chapters)) // 2
    let n = 2
    const rest = [
      [course.principle, renderPrinciple],
      [course.lesson_plan, renderLessonPlan],
      [course.mentor_roles, renderMentorRoles],
      [course.question_rule, renderQuestionRule],
      [course.growth_steps, renderGrowthSteps],
      [course.anti_patterns, renderAntiPatterns],
      [course.learner_traits, renderLearnerTraits],
      [course.teaching_cycle, renderTeachingCycle],
    ]
    for (const [data, fn] of rest) {
      if (!data) continue
      n += 1
      sections.push(fn(data, n))
    }
  } else {
    // 受講者にも役立つ「学び方」だけを、教え方の文脈を外して載せる
    if (course.principle) sections.push(renderPrinciple(course.principle, 0))
    if (course.question_rule) sections.push(renderQuestionRule(course.question_rule, 0))
    if (course.learner_traits) sections.push(renderLearnerTraits(course.learner_traits, 0))
  }

  const head = teacher
    ? { label: '🐯 WEB DEVELOPMENT PLAYBOOK — 講師用', title: '講師用ガイド', grad: 'from-amber-500 to-orange-600' }
    : { label: '🐯 WEB DEVELOPMENT PLAYBOOK', title: '受講者用', grad: 'from-blue-600 to-indigo-700' }

  const lead = teacher
    ? `${inline(course.subtitle)}<br class="hidden md:block" />${inline(course.lead)}`
    : `${inline(course.lead)}`

  // 相手側のページへの導線（受講者用には講師用リンクを置かない）
  const switchLink = teacher
    ? `<div class="max-w-5xl mx-auto px-6 pt-6">
    <a href="index.html" class="inline-block text-sm bg-white border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 no-print">👥 受講者に見せるページを開く →</a>
  </div>`
    : ''

  return pageShell({
    course,
    teacher,
    sections: sections.filter(Boolean).join('\n\n'),
    switchLink,
    titleSuffix: teacher ? ' — 講師用ガイド' : '',
    label: head.label,
    grad: head.grad,
    lead,
    footerText: `${inline(course.title)}${teacher ? ' — 講師用ガイド' : ''}`,
  })
}
