---
paths:
  - "scripts/templates/**"
  - "output/materials/**/*.html"
  - "input/materials/**/*.yaml"
---

# HTML Template Rules

教材 HTML は `ai_edu/packages/db/seeds/materials/lvN/*.html` と**完全一致する構造**で生成する。
ground truth は `ai_edu` の既存ファイル（例: `materials/lv0/ch01.html`, `materials/lv0/index.html`）。

## 技術スタック（CDN・ビルド不要）

`<head>` に以下を必ず置く。

- `https://unpkg.com/react@18/umd/react.development.js`
- `https://unpkg.com/react-dom@18/umd/react-dom.development.js`
- `https://unpkg.com/@babel/standalone/babel.min.js`
- `https://cdn.tailwindcss.com`

`index.html` 型では `tailwind.config` で `brand` / `accent` カラーを定義する。

## 必須構造

- `<!DOCTYPE html>` / `<html lang="ja">`
- `<meta charset="UTF-8">` / `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `<title>…</title>`
- `<body class="bg-gray-50">` の中に `<div id="root"></div>`
- `<script type="text/babel">` 内に JSX
- 末尾で `ReactDOM.createRoot(document.getElementById('root')).render(<… />)`

## 2 つのテンプレート型

| 型 | ファイル | 用途 | 特徴 |
|----|----------|------|------|
| 章別単独型 | `chNN.html` | 1 章 = 1 ページ | ヘッダ + 章ヘッダ + 本文 + 右キーワードパネル + 前後ナビ |
| ハブ型 | `index.html` | コース概要 + 全章 | `CHAPTERS[]` 配列・サイドバー・インタラクティブ quiz・進捗 |

両方とも `ai_edu` の既存実装に合わせる。詳細は
`.claude/skills/ai-certificate-html/references/` を参照。

## JSX ルール

- `class` を使わず `className` を使う
- イベント属性は camelCase（`onClick` 等）
- JSX コメントは `{/* … */}`。HTML コメント `<!-- -->` を JSX 内に書かない
- 繰り返し要素は `配列.map((x, i) => …)` で描画し `key={i}` を付ける

## デザイン / CSS（既存クラスを維持）

`<style>` に以下を維持する（値は `ai_edu` の既存 CSS に合わせる）。

- `.prose h3 / p / ul / ol`
- `.kv-box`（青・学習ポイント）
- `.warn-box`（橙・注意/リスク）
- `.tip-box`（緑・コツ）
- `.ex-box` + `.ex-title`（紫破線・活用事例）
- `.chk-item`（チェックリスト、`::before` が ☐）
- ハブ型のみ: `.quiz-option(.correct/.wrong)` / `.sidebar-item(.active)` / `.tag-core` / `.tag-user`
- `@media print { .no-print { display:none; } }`

## 禁止

- `<img>` などの画像アセット（絵文字は可）
- 外部 CSS/JS の追加（指定 CDN 以外）
- `type="text/babel"` 以外の場所への JSX
- ビルド成果物（bundle.js 等）への依存
