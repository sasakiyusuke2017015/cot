# 章別単独型テンプレート（chNN.html）

`ai_edu/.../materials/lv0/ch01.html` 準拠。1 章 = 1 ファイル。

## 全体骨格

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>研修教材 Lv.0 第N章 - {章タイトル}</title>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<style>/* css-classes.md の内容 */</style>
</head>
<body class="bg-gray-50">
<div id="root"></div>
<script type="text/babel">
const KEYWORDS = [ { term: '…', desc: '…' }, … ];

function KeywordsPanel({ keywords }) { /* 右の重要キーワードパネル（no-print, sticky） */ }

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー（青グラデ, sticky, no-print）: ← 一覧 / 研修教材 / 第N章 / 全X章 */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg no-print sticky top-0 z-10">…</header>

      <div className="max-w-7xl mx-auto w-full flex-1">
        <main className="flex-1 p-6 min-w-0">
          {/* 章ヘッダ（青グラデ・カード）: タグ(知識/実践) + アイコン + title + subtitle */}
          <div className="rounded-2xl p-6 mb-6 text-white shadow-md bg-gradient-to-r from-blue-700 to-blue-500">…</div>

          {/* 2カラム: 本文 + 右キーワードパネル */}
          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              <div className="prose">
                {/* content_blocks をここに展開 */}
              </div>
            </div>
            <KeywordsPanel keywords={KEYWORDS} />
          </div>

          {/* 前後ナビ（no-print）: ← 一覧に戻る / 次のページ → */}
          <div className="flex justify-between mt-8 no-print">…</div>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Page />);
</script>
</body>
</html>
```

## content_blocks → JSX 変換表

| input kind | 生成 JSX |
|------------|----------|
| `h3` | `<h3>{text}</h3>` |
| `paragraph` | `<p>{text…}</p>`（`**x**` は `<strong>x</strong>`） |
| `ul` | `<ul>{items.map(...<li>)}</ul>` |
| `ol` | `<ol>{items.map(...<li>)}</ol>` |
| `kv-box` | `<div className="kv-box"><strong>{title}</strong><br/>{text}</div>`（`items` 形式なら term/desc を列挙） |
| `warn-box` | `<div className="warn-box"><strong>⚠️ {title}</strong><br/>{text}</div>` |
| `tip-box` | `<div className="tip-box"><strong>💡 {title}</strong><br/>{text}</div>` |
| `ex-box` | `<div className="ex-box"><p className="ex-title">✏️ {title}</p>…{items.map(...)}</div>` |
| `checklist` | 橙カード + `chk-item` の列 |
| `table` | `overflow-x-auto` ラッパ + `<table>`（ヘッダ青、偶数行 `bg-gray-50`） |
| `keywords` | `KEYWORDS` 定数 → 右 `KeywordsPanel` |

## 章ヘッダのタグ

- `type: core` → `第N章 · 知識`
- `type: user` → `第N章 · 実践`

## ナビのリンク先

- 一覧: `index.html`（実ファイルは `Lv0_index_v3.html` 等の命名もあるが、生成は `index.html` 基準）
- 次章: `ch{NN+1}.html`
- ファイル名は **ゼロ埋め 2 桁**（`ch01.html`, `ch02.html` …）
