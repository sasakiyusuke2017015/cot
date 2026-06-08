---
paths:
  - "scripts/**/*.mjs"
  - "scripts/**/*.js"
---

# Generator Rules

## 役割

- `scripts/build-materials.mjs` : `input/materials/lvN/*.yaml` → 教材 HTML
- `scripts/build-questions.mjs` : `input/questions/lvN/**/*.yaml` → `lvN-check.csv` / `lvN-cert.csv`
- `scripts/build-all.mjs`       : 上記をまとめて実行
- `scripts/preview.mjs`         : 生成 HTML をローカルサーバで表示

## 出力先の規約

- 既定（`--apply` なし）: `output/` に生成（dry-run。レビュー用）
- `--apply` 指定時: `ai_edu` の seed ディレクトリへ直接書き込む
  - 教材: `${AI_EDU_DIR}/packages/db/seeds/materials/lvN/`
  - 問題: `${AI_EDU_DIR}/packages/db/seeds/questions/`
- `AI_EDU_DIR` 未設定時は `../ai_edu`（相対）→ それも無ければエラーで止める

## 生成方針

- 章は `id`（章番号）順にソートして出力
- 問題は `問題番号` を 1 始まり連番で安定的に振る（`seed_ref` 安定のため並び替えに注意）
- 文字コード UTF-8。CSV は先頭 BOM を付ける（既存ファイルに合わせる）
- HTML は `ai_edu` の既存ファイルと差分が最小になるよう整形する

## 安全ルール

- `--apply` で `ai_edu` 既存ファイルを上書きする場合、上書き対象一覧を出してから書く
- `ai_edu` 側のファイルを**削除しない**（消すなら明示確認）
- `ai_edu` の DB / migration / 他スクリプトを実行しない
- 外部ネットワーク取得をしない（CDN URL は文字列として埋めるだけ）

## 依存

- 外部依存は最小限（`js-yaml`, `ajv` 程度）
- CSV は `ai_edu/scripts/lib/csv.mjs` と round-trip 互換になるよう出力する
