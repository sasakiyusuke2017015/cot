---
name: generate-exam-bank
description: 試験問題（認定テスト）を量産する。purpose=cert、知識・判断・シナリオ・実践問題を含む高難度。最終的に lvN-cert.csv へ変換される。
argument-hint: "[options] 例: level=lv0 / count=60 / type=judgment,scenario / apply"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Generate Exam Bank — 試験問題バンクの量産

認定テスト用の問題を量産する。`purpose: cert` → `lvN-cert.csv` に集約される。

## 引数 `$ARGUMENTS`

例: `level=lv0` / `count=60` / `chapter=lv0:1-6` / `type=knowledge,judgment,scenario,prompt` / `apply`

## 先に必ず読む

- `.claude/rules/25-question-schema.md`
- `input/blueprint.yaml`、`input/exam-spec.yaml`（配分）
- 対象レベルの `input/materials/lvN/*.yaml`、`input/questions/lvN/check/*.yaml`
- 既存の `input/questions/lvN/cert/*.yaml`
- ground truth: `ai_edu/packages/db/seeds/questions/lv0-cert.csv`

## 出力

- `input/questions/lvN/cert/NN-slug.yaml`（章/トピック単位にまとめる）
- `--apply` 時のみ `scripts/build-questions.mjs --apply` で `lvN-cert.csv` を更新

## 問題タイプ（`input/exam-spec.yaml` の配分に従う）

| type | 問うこと | 例 |
|------|----------|----|
| `knowledge` | 定義・用語・基本概念 | 生成AIの特徴として正しいもの |
| `judgment` | OK/NG・リスク判断・適切な対応 | 社外秘をAIに入力してよいか |
| `scenario` | 短い業務シナリオで判断 | 顧客情報を含む議事録の要約 |
| `prompt` | プロンプト設計・活用の実践 | より良い指示文はどれか |

## 重要（確認問題と同じ）

- 正解位置は書かない（provision がシャッフル）。`correct` 1 + `wrongs` 3
- `explanation` に `${正答1}` `${誤答1〜3}` プレースホルダ可
- 確認問題（check）と **重複させない**。cert は判断・実践寄りで難度高め

## 作成ルール

- `exam-spec.yaml` の難易度別・タイプ別配分を満たすよう作る
- 章の偏りを避ける
- 「すべて選べ」を使わない。正解根拠が一意に説明できる問題にする
- セキュリティ/個人情報/著作権/ハルシネーション/人間確認を厚めに
- 既存の `stem` と重複させない

## 報告

- 作成数、難易度別件数、タイプ別件数、章別件数、重複候補、source_refs 不足、次コマンド
