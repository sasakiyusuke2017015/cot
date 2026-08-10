// scripts/lib/render-blocks-web.mjs
// web（虎の巻）種別の content_blocks → JSX 文字列。
// lvN 用の render-blocks.mjs とはボックスの体裁が異なる（title と text を同一行に置く等）ため別実装。

/**
 * `**強調**` を <strong>、`` `コード` `` を <code> に。
 * HTML 特殊文字は最小限エスケープ（JSX テキストはエンティティを解釈する）。
 * 波括弧は JSX の式展開と衝突するのでエンティティにするが、<code> の中でも
 * JSX がエンティティを解釈するので `{ }` はそのまま表示される。
 */
function inline(text) {
  const esc = String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
  // 段落内の改行は著者が意図した折り返し（対比・箇条）。JSX は生の改行を空白に潰すので <br /> にする。
  return code(esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')).replace(/\n/g, '<br />')
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

/**
 * CheckList の項目は JS の文字列として渡り `{text}` で描画されるため、マークアップを持てない。
 * `**強調**` と `` `コード` `` の記号だけ落として素のテキストにする。
 */
function plain(text) {
  return String(text ?? '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/``(.+?)``/g, '$1')
    .replace(/`([^`]+?)`/g, '$1')
    .replace(/\s*\n\s*/g, ' ')
    .trim()
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
// 本文が複数段落なら 2 段落目以降を <p> で続ける（JSX は生の改行を空白に潰すため）。
function renderBox(b, cls) {
  const [first, ...rest] = String(b.text ?? '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  const tail = rest.map((s) => `\n${P}  <p className="mt-2">${inline(s)}</p>`).join('')
  return `${P}<div className="${cls}">\n${P}  <strong>${inline(b.title)}</strong> ${inline(first ?? '')}${tail}\n${P}</div>`
}

function renderExBox(b) {
  return `${P}<div className="ex-box">\n${P}  <p className="ex-title">✏️ ${inline(b.title ?? '演習')}</p>\n${P}  <p>${inline(b.text)}</p>\n${P}</div>`
}

// checklist: <h3>チェックリスト</h3> + クリックで実際にチェックできるリスト
function renderChecklist(b) {
  const items = JSON.stringify((b.items ?? []).map(plain))
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
    ? `${P}  <p className="assign-h">できたと言える条件</p>\n${P}  <CheckList items={${JSON.stringify(b.done.map(plain))}} />`
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
