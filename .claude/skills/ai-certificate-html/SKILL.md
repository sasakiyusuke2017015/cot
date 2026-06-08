---
name: ai-certificate-html
description: 社内AI活用資格研修の教材HTMLテンプレート仕様。ai_edu の materials/lvN/*.html と一致する React18+Babel+Tailwind CDN 単一HTML構成、CSSクラス、章別型/ハブ型の2テンプレートを定義する。教材を作る・直すときに参照する。
---

# ai-certificate-html — 教材HTMLテンプレート仕様

このスキルは、教材 HTML の**正準テンプレート**を定義する。生成物は
`ai_edu/packages/db/seeds/materials/lvN/*.html` と構造が一致しなければならない。

ground truth（実ファイル。読んで確認すること）:
- `ai_edu/packages/db/seeds/materials/lv0/ch01.html` … 章別単独型
- `ai_edu/packages/db/seeds/materials/lv0/index.html` … ハブ型（CHAPTERS[]）

## 技術スタック（ビルド不要・CDN）

- React 18 `https://unpkg.com/react@18/umd/react.development.js`
- ReactDOM 18 `https://unpkg.com/react-dom@18/umd/react-dom.development.js`
- Babel standalone `https://unpkg.com/@babel/standalone/babel.min.js`
- Tailwind `https://cdn.tailwindcss.com`

## 2 つのテンプレート型

| 型 | ファイル | 用途 |
|----|----------|------|
| 章別単独型 | `chNN.html` | 1 章 = 1 ページ。ヘッダ + 章ヘッダ + 本文 + 右キーワードパネル + 前後ナビ |
| ハブ型 | `index.html` | コース概要 + 全章。`CHAPTERS[]`・サイドバー・インタラクティブ quiz・進捗 |

詳細は `references/` を参照:
- `references/chapter-template.md` … 章別単独型の完全な雛形と各部解説
- `references/index-template.md` … ハブ型（CHAPTERS[] + quiz）の雛形
- `references/css-classes.md` … 共有 CSS クラス定義（`.kv-box` 等）

## 不変条件（必ず守る）

- `<html lang="ja">`、charset UTF-8、viewport meta
- `<div id="root"></div>` + `<script type="text/babel">` + `ReactDOM.createRoot(...).render(...)`
- JSX は `className`（`class` 禁止）、イベントは camelCase、コメントは `{/* */}`
- 画像アセット禁止（絵文字は可）
- 指定 CDN 以外の外部 JS/CSS を足さない

## 章の型タグ

- `core` = 知識（青系 `tag-core`）
- `user` = 実践（緑系 `tag-user`）

## このスキルの使いどころ

- 新しい章 HTML を生成・修正するとき、まず該当 `references/` と実ファイルを読む
- 生成ロジック（`scripts/build-materials.mjs`）がこの仕様どおりか確認する
- 迷ったら ChatGPT の設計案より **`ai_edu` の実ファイルを優先**する
