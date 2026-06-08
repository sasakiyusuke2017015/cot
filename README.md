# content_agent

社内AI活用資格研修（`ai_edu`）向けの **教材本文・確認問題・試験問題を量産・検証する** ハーネス。
生成物は隣の `ai_edu` プロジェクトの seed フォーマットに合わせて出力し、`ai_edu` の
`provision-*.mjs` が Postgres へ冪等投入する。

## クイックスタート

```bash
npm install
npm run build        # input → 教材HTML + 問題CSV を生成（dry-run: output/）
npm run validate     # 入力・生成物の検証
npm run preview      # 生成HTMLをブラウザ確認（http://localhost:4173）

# ai_edu の seed ディレクトリへ直接書き込むとき（要 ai_edu）
AI_EDU_DIR=../ai_edu npm run build -- --apply
```

## 仕組み

```
input/raw/                元資料（教材本文の根拠）
input/blueprint.yaml      コース設計（レベル・章構成）
input/exam-spec.yaml      試験の配分・問題数
input/materials/lvN/*.yaml   章データ（著者が書く）   ── build-materials → chNN.html
input/questions/lvN/check/*.yaml  確認問題（YAML）    ─┐
input/questions/lvN/cert/*.yaml   試験問題（YAML）    ─┴ build-questions → lvN-{check,cert}.csv
                                                          │
                                  ai_edu/.../materials, questions へ（--apply）
                                                          │
                                  ai_edu の provision-*.mjs → Postgres
```

## 重要な前提（ai_edu 実装に一致）

- 教材は React18 + Babel + Tailwind の **CDN 単一HTML**（`chNN.html`）。画像なし。
- 問題は 9 列の日本語 CSV（`問題番号,学習項目,問題文,正答1,誤答1,誤答2,誤答3,解説,関連キーワード`）。
- **正解位置は書かない。** A〜D 配置は `ai_edu` の provisioner が `seed_ref` から決定的にシャッフルする。
- 著者は問題を **YAML** で書き、`build-questions.mjs` が CSV へ変換する。

## Claude Code コマンド（.claude/skills/）

| コマンド | 役割 |
|----------|------|
| `/generate-contents` | 元資料から教材本文（章 YAML）を量産 |
| `/generate-check-questions` | 各章の確認問題を作成（→ lvN-check.csv） |
| `/generate-exam-bank` | 試験問題バンクを量産（→ lvN-cert.csv） |
| `/assemble-exam` | バンクから模擬試験を組む（受験者用 / 解答解説を分離） |
| `/generate-all-materials` | 上記をまとめて量産・検証 |
| `/ai-certificate-html` | 教材HTMLテンプレート仕様（参照用） |

## ディレクトリ

- `CLAUDE.md` — プロジェクト憲法（入口）
- `.claude/rules/` — ファイル種別ごとの詳細ルール
- `.claude/skills/` — 生成ワークフロー + テンプレート仕様
- `schemas/` — 章・問題の JSON Schema
- `scripts/` — YAML→HTML / YAML→CSV 変換、preview
- `validators/` — 入力・生成物の検証
- `input/` — 著者が書く元データ
- `output/` — dry-run 生成物（gitignore）

## 既知の TODO

- `build-materials.mjs` は章別単独型 `chNN.html` のみ。ハブ型 `index.html`（CHAPTERS[] +
  サイドバー + quiz）の生成は未実装（仕様は `.claude/skills/ai-certificate-html/references/index-template.md`）。
- `/assemble-exam` の模擬試験生成スクリプトは未実装（スキル手順のみ）。
