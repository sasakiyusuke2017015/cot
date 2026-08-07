// scripts/lib/render-blocks-web.mjs
// web（虎の巻）種別の content_blocks → JSX 文字列。
// lvN 用の render-blocks.mjs とはボックスの体裁が異なる（title と text を同一行に置く等）ため別実装。

/** `**強調**` を <strong> に。HTML 特殊文字は最小限エスケープ（JSX テキストはエンティティを解釈する）。 */
function inline(text) {
  const esc = String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/** JS テンプレートリテラルに安全に埋め込めるようエスケープ。 */
function escapeTemplateLiteral(text) {
  return String(text ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('`', '\\`')
    .replaceAll('${', '\\${')
}

const P = '                  ' // 本文ブロックの基本インデント

function renderH3(b) {
  return `${P}<h3>${inline(b.text)}</h3>`
}

function renderParagraph(b) {
  return `${P}<p>${inline(b.text)}</p>`
}

function renderList(b, tag) {
  const items = (b.items ?? []).map((it) => `${P}  <li>${inline(it)}</li>`).join('\n')
  return `${P}<${tag}>\n${items}\n${P}</${tag}>`
}

// kv-box / warn-box / tip-box: <strong>タイトル</strong> 本文 を同一行に。
// タイトルの絵文字は YAML 側に書く（renderer は付けない）。
function renderBox(b, cls) {
  return `${P}<div className="${cls}">\n${P}  <strong>${inline(b.title)}</strong> ${inline(b.text)}\n${P}</div>`
}

function renderExBox(b) {
  return `${P}<div className="ex-box">\n${P}  <p className="ex-title">✏️ ${inline(b.title ?? '演習')}</p>\n${P}  <p>${inline(b.text)}</p>\n${P}</div>`
}

// checklist: <h3>チェックリスト</h3> + クリックで実際にチェックできるリスト
function renderChecklist(b) {
  const items = JSON.stringify(b.items ?? [])
  return `${P}<h3>${inline(b.title ?? 'チェックリスト')}</h3>\n${P}<CheckList items={${items}} />`
}

function renderCode(b) {
  const code = escapeTemplateLiteral(String(b.text ?? '').replace(/\n$/, ''))
  return `${P}<div className="code-block">{\`${code}\`}</div>`
}

/**
 * 課題ブロック。章の総仕上げとして「何を作るか」を提示する。
 * title / goal / steps[] / done[]（完成の条件） / hint
 */
function renderAssignment(b) {
  const steps = (b.steps ?? [])
    .map((s, i) => `${P}    <li>${inline(s)}</li>`)
    .join('\n')
  const done = (b.done ?? []).length
    ? `${P}  <p className="assign-h">できたと言える条件</p>\n${P}  <CheckList items={${JSON.stringify(b.done)}} />`
    : ''
  return `${P}<div className="assign-box">
${P}  <p className="assign-title">🛠 課題: ${inline(b.title)}</p>
${P}  ${b.goal ? `<p className="assign-goal">${inline(b.goal)}</p>` : ''}
${steps ? `${P}  <p className="assign-h">作るもの</p>\n${P}  <ol className="assign-steps">\n${steps}\n${P}  </ol>` : ''}
${done}
${P}  ${b.hint ? `<p className="assign-hint">💡 ${inline(b.hint)}</p>` : ''}
${P}</div>`
}

/** 表。headers[] と rows[][]。機能分解やスケジュールに使う。 */
function renderTable(b) {
  const head = (b.headers ?? []).map((h) => `<th className="tbl-th">${inline(h)}</th>`).join('')
  const rows = (b.rows ?? [])
    .map(
      (r) =>
        `${P}      <tr>${r.map((c) => `<td className="tbl-td">${inline(c)}</td>`).join('')}</tr>`,
    )
    .join('\n')
  return `${P}<div className="tbl-wrap">
${P}  <table className="tbl">
${P}    <thead><tr>${head}</tr></thead>
${P}    <tbody>
${rows}
${P}    </tbody>
${P}  </table>
${P}</div>`
}

const RENDERERS = {
  h3: renderH3,
  paragraph: renderParagraph,
  ul: (b) => renderList(b, 'ul'),
  ol: (b) => renderList(b, 'ol'),
  'kv-box': (b) => renderBox(b, 'kv-box'),
  'warn-box': (b) => renderBox(b, 'warn-box'),
  'tip-box': (b) => renderBox(b, 'tip-box'),
  'ex-box': renderExBox,
  checklist: renderChecklist,
  code: renderCode,
  assignment: renderAssignment,
  table: renderTable,
}

export function renderWebBlocks(blocks) {
  return (blocks ?? [])
    .map((b) => {
      const fn = RENDERERS[b.kind]
      if (!fn) throw new Error(`未知の content_block kind: ${b.kind}`)
      return fn(b)
    })
    .filter(Boolean)
    .join('\n')
}
