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

// checklist: <h3>チェックリスト</h3> + chk-item の列
function renderChecklist(b) {
  const items = (b.items ?? []).map((s) => `${P}<div className="chk-item">${inline(s)}</div>`).join('\n')
  return `${P}<h3>${inline(b.title ?? 'チェックリスト')}</h3>\n${items}`
}

function renderCode(b) {
  const code = escapeTemplateLiteral(String(b.text ?? '').replace(/\n$/, ''))
  return `${P}<div className="code-block">{\`${code}\`}</div>`
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
