# ハブ型テンプレート（index.html）

`ai_edu/.../materials/lv0/index.html` 準拠。コース概要 + 全章を 1 ファイルに収める SPA。
章別単独型（chNN.html）と違い、`CHAPTERS[]` 配列・サイドバー・進捗・インタラクティブ quiz を持つ。

## 全体骨格

```html
<head>
  … React/ReactDOM/Babel/Tailwind CDN …
  <script>tailwind.config = { theme:{ extend:{ colors:{ brand:{…}, accent:{…} } } } }</script>
  <style>/* css-classes.md（quiz-option / sidebar-item / tag も含む） */</style>
</head>
<body class="bg-gray-50">
<div id="root"></div>
<script type="text/babel">
const { useState, useEffect, useRef } = React;

const CHAPTERS = [
  {
    id: 1, type: 'core',           // 'core' | 'user' | 'check'
    title: '…', subtitle: '…', icon: '🤖',
    content: () => ( <div className="prose"> … </div> ),
    quiz: [ /* 任意。確認問題を埋め込む場合 */ ]
  },
  …
];

function ProgressBar({ visited, total }) { /* visited/total から % バー */ }

function App() {
  const [active, setActive] = useState(1);
  const [visited, setVisited] = useState(new Set([1]));
  const [showSidebar, setShowSidebar] = useState(true);
  const mainRef = useRef(null);

  const chapter = CHAPTERS.find(c => c.id === active);
  const coreChapters  = CHAPTERS.filter(c => c.type === 'core');   // 知識
  const userChapters  = CHAPTERS.filter(c => c.type === 'user');   // 実践
  const checkChapters = CHAPTERS.filter(c => c.type === 'check');  // 確認テスト

  // header（brand グラデ）+ サイドバー（core/user/check の3グループ）+ main（章本文 + quiz）
  return ( … );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
</body>
```

## サイドバーの 3 グループ

| type | ラベル | タグ |
|------|--------|------|
| `core` | 知識 · AI基礎・背景知識 | `tag-core`（青） |
| `user` | 実践 · AI実践活用 | `tag-user`（緑） |
| `check` | 📝 確認テスト | 紫系バッジ |

`SidebarItem` は `sidebar-item`（active 時 `.active`）。クリックで `goTo(id)`、`visited` に追加。

## quiz の埋め込み（任意）

章オブジェクトに `quiz: [...]` を持たせる場合、選択肢は `quiz-option` クラスで描画し、
クリックで正解は `.correct`、不正解は `.wrong` を付ける。

> 注意: ここで章に埋め込む quiz は **表示用**。DB に投入される確認/試験問題は
> `ai_edu/.../questions/lvN-*.csv` 側（CSV）が正準。両者を混同しない。
> CSV の問題は正解位置を持たない（provision 時シャッフル）が、HTML 埋め込み quiz は
> 表示のため自前で正解を持つ。整合が要るなら CSV を出典にして生成する。

## ヘッダ

- `bg-gradient-to-r from-brand-900 to-brand-700`、ハンバーガーでサイドバー開閉
- 右に `{visited.size}/{CHAPTERS.length} 閲覧済み`

## 生成の指針

- 各レベルの `index.html` は、そのレベルの全 `chNN` を `CHAPTERS[]` に集約して作る
- `content: () => (…)` は章 YAML の `content_blocks` から生成（章別型と同じ変換表）
- `provision-course-materials.mjs` は `index` を先頭に並べるので、ハブ型はコース入口になる
