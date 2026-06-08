---
paths:
  - "validators/**/*.mjs"
  - "validators/**/*.js"
---

# Validator Rules

`scripts/build-*.mjs` の出力と `input/` を検証する。`npm run validate` で全部回す。

## 教材 HTML の検証

- `<html lang="ja">` / charset / viewport がある
- React18 / ReactDOM18 / Babel standalone / Tailwind の CDN がある
- `<div id="root"></div>` と `ReactDOM.createRoot` がある
- JSX 内に `class=`（`className` でない素の class）が残っていない
- `<img` などの画像タグがない
- 必須 CSS クラス（`prose / kv-box / warn-box / tip-box / ex-box / chk-item`）が定義されている
- ファイル名が `index.html` または `chNN.html`

## 章入力（YAML）の検証

- `id` がレベル内で連番・重複なし
- `type` が `core` / `user`
- `title` / `subtitle` / `icon` / `source_refs` が存在
- `content_blocks` の各 `kind` が既知のもの

## 問題（YAML / CSV）の検証

- `correct` が 1 つ、`wrongs` がちょうど 3 つ
- `stem` / `explanation` が空でない
- 同一ファイル内・同一レベル内で `stem` が重複しない
- CSV ヘッダが `問題番号,学習項目,問題文,正答1,誤答1,誤答2,誤答3,解説,関連キーワード`
- CSV が `ai_edu/scripts/lib/csv.mjs` でパースでき、各行 9 列になる
- `問題番号` が 1 始まり連番
- 解説のプレースホルダ `${正答1}` `${誤答1〜3}` が、存在しない番号を参照していない

## ai_edu 互換チェック

- 生成 CSV を `ai_edu/scripts/lib/csv.mjs` の `parseCsvRecords` に通して列名が一致する
- 生成 HTML のファイル名が `provision-course-materials.mjs` の `orderKey`（index / chNN）に合う

## レポート

- 機械可読: `report/validation-report.json`
- 人間用: `report/validation-report.html`（任意）
- エラーと警告を分け、対象ファイルと行を示す
