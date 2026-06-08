// scripts/lib/render-blocks.mjs
// content_blocks → JSX 文字列。ai-certificate-html の変換表どおり。
// 出力はそのまま <script type="text/babel"> 内に埋め込める JSX。

/** `**強調**` を <strong> に。HTML 特殊文字も最小限エスケープ。 */
function inline(text) {
  const esc = String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  // **x** → <strong>x</strong>（エスケープ後なので * のみ扱う）
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function renderH3(b) {
  return `        <h3>${inline(b.text)}</h3>`
}

function renderParagraph(b) {
  return `        <p>${inline(b.text)}</p>`
}

function renderList(b, tag) {
  const items = (b.items ?? []).map((it) => `          <li>${inline(it)}</li>`).join('\n')
  return `        <${tag}>\n${items}\n        </${tag}>`
}

function renderBox(b, cls, prefix) {
  // items 形式（kv-box の term/desc）にも対応
  if (Array.isArray(b.items) && b.items.length && typeof b.items[0] === 'object') {
    const lines = b.items
      .map((it) => `          <span className="font-bold">${inline(it.term)}</span>：${inline(it.desc)}<br/>`)
      .join('\n')
    return `        <div className="${cls}">\n          <strong>${prefix}${inline(b.title)}</strong><br/>\n${lines}\n        </div>`
  }
  return `        <div className="${cls}">\n          <strong>${prefix}${inline(b.title)}</strong><br/>\n          ${inline(b.text)}\n        </div>`
}

function renderExBox(b) {
  const items = (b.items ?? [])
    .map(
      (s, i) =>
        `            <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-purple-200 text-sm text-gray-700"><span className="text-purple-500 font-bold flex-shrink-0">${i + 1}.</span>${inline(s)}</div>`,
    )
    .join('\n')
  return `        <div className="ex-box">\n          <p className="ex-title">✏️ ${inline(b.title)}</p>\n          <div className="space-y-2 mt-2">\n${items}\n          </div>\n        </div>`
}

function renderChecklist(b) {
  const items = (b.items ?? []).map((s) => `          <div className="chk-item">${inline(s)}</div>`).join('\n')
  return `        <div className="my-5 p-4 rounded-xl bg-orange-50 border border-orange-200">\n          <p className="font-bold text-orange-800 mb-2">⚠️ ${inline(b.title)}</p>\n${items}\n        </div>`
}

function renderTable(b) {
  const head = (b.headers ?? [])
    .map((h) => `              <th className="px-3 py-2 text-left">${inline(h)}</th>`)
    .join('\n')
  const rowsJs = JSON.stringify(b.rows ?? [])
  return `        <div className="overflow-x-auto my-5 rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-blue-800 text-white">
${head}
            </tr></thead>
            <tbody>
              {${rowsJs}.map((cells, i) => (
                <tr key={i} className={\`border-b border-gray-100 \${i%2===1?'bg-gray-50':''}\`}>
                  {cells.map((c, j) => (
                    <td key={j} className="px-3 py-2 align-top">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>`
}

const RENDERERS = {
  h3: renderH3,
  paragraph: renderParagraph,
  ul: (b) => renderList(b, 'ul'),
  ol: (b) => renderList(b, 'ol'),
  'kv-box': (b) => renderBox(b, 'kv-box', ''),
  'warn-box': (b) => renderBox(b, 'warn-box', '⚠️ '),
  'tip-box': (b) => renderBox(b, 'tip-box', '💡 '),
  'ex-box': renderExBox,
  checklist: renderChecklist,
  table: renderTable,
  keywords: () => '', // keywords は右パネル（KEYWORDS 定数）で扱う
}

export function renderBlocks(blocks) {
  return (blocks ?? [])
    .map((b) => {
      const fn = RENDERERS[b.kind]
      if (!fn) throw new Error(`未知の content_block kind: ${b.kind}`)
      return fn(b)
    })
    .filter(Boolean)
    .join('\n')
}

/** keywords ブロック or chapter.keywords から KEYWORDS 定数を作る。 */
export function collectKeywords(chapter) {
  if (Array.isArray(chapter.keywords) && chapter.keywords.length) return chapter.keywords
  const kwBlock = (chapter.content_blocks ?? []).find((b) => b.kind === 'keywords')
  return kwBlock?.items ?? []
}
