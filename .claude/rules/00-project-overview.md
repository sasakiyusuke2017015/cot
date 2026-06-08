# Project Overview

content_agent は、社内AI活用資格研修（`ai_edu`）の教材本文・確認問題・試験問題を量産・検証するハーネスである。

## 成果物（すべて `ai_edu` の seed フォーマット）

- 教材 HTML
  - `ai_edu/packages/db/seeds/materials/lvN/index.html`（コース概要 + 全章ハブ、CHAPTERS[] 単一ファイル型）
  - `ai_edu/packages/db/seeds/materials/lvN/chNN.html`（章別の単独ページ型）
- 確認問題 CSV
  - `ai_edu/packages/db/seeds/questions/lvN-check.csv`
- 試験問題 CSV
  - `ai_edu/packages/db/seeds/questions/lvN-cert.csv`

## 投入の流れ（content_agent は生成まで、投入は ai_edu）

```
input/*.yaml
   │  scripts/build-materials.mjs / build-questions.mjs
   ▼
ai_edu/.../materials/lvN/*.html
ai_edu/.../questions/lvN-*.csv
   │  ai_edu の provision-course-materials.mjs / provision-question-bank.mjs
   ▼
Postgres（course_contents / questions / question_options）
```

## 基本方針

- 教材内容は `input/` に保持する（元資料は `input/raw/`）
- 見た目・HTML 構造は `scripts/` のテンプレートに保持する
- 問題は YAML で著者が書き、`scripts/` が CSV へ変換する
- 出力 HTML / CSV を直接編集しない（`input/` 側を直す）
- `ai_edu` 側は読み取り自由・書き込みは `--apply` 経由のみ

## レベル規約

- `lv0` = AIリテラシー入門、`lv1` = 生成AI活用ガイド
- 章ファイルは `chNN`（NN は 01 始まりのゼロ埋め2桁）
- 問題ファイルは `lvN-check`（確認）/ `lvN-cert`（試験）
