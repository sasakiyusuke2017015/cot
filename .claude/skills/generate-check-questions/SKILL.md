---
name: generate-check-questions
description: 各章の確認問題（理解度チェック）を YAML で作成する。purpose=check、本文を読めば解ける素直な難度。最終的に lvN-check.csv へ変換される。
argument-hint: "[scope] 例: level=lv0 / chapter=lv0:1 / per-chapter=5 / apply"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Generate Check Questions — 確認問題の作成

各章の理解度チェック（確認問題）を作る。`purpose: check` → `lvN-check.csv` に集約される。

## 引数 `$ARGUMENTS`

例: `level=lv0` / `chapter=lv0:1` / `per-chapter=5` / `apply`

## 先に必ず読む

- `.claude/rules/25-question-schema.md`
- `input/blueprint.yaml`、対象レベルの `input/materials/lvN/*.yaml`（出題範囲）
- 既存の `input/questions/lvN/check/*.yaml`
- ground truth: `ai_edu/packages/db/seeds/questions/lv0-check.csv`

## 出力

- `input/questions/lvN/check/NN-slug.yaml`
- `--apply` 時のみ `scripts/build-questions.mjs --apply` で `lvN-check.csv` を更新

## 問題フィールド（YAML）

```yaml
level: lv0
purpose: check
learning_item: AIブーム、機械学習、生成AI
stem: 「機械学習」の説明として最も適切なものはどれか。
correct: コンピュータが大量のデータを分析し、パターンやルールを自分で見つけ出す技術
wrongs:
  - 人間がすべてのルールを事前に教え込むプログラミング手法
  - AIが工場の機械を自動操作する技術
  - コンピュータ同士がネットワーク上で情報を共有する仕組み
explanation: |
  【${正答1}】機械学習は…。
  【${誤答1}が誤りの理由】…。
source_refs:
  - input/materials/lv0/ch01.yaml
```

## 重要

- **正解位置は書かない。** A〜D 配置は provision-question-bank.mjs が決定的にシャッフルする
- `correct` 1 つ + `wrongs` ちょうど 3 つ
- `explanation` のプレースホルダ `${正答1}` `${誤答1〜3}` は provision 時に置換される

## 作成ルール

- 各章 2 問以上（既定 3 問、`per-chapter=N` で調整）
- 本文（該当章 YAML）を読めば解ける素直な難度にする（確認問題は易しめ）
- 誤答も「なぜ誤りか」を解説に書く
- 既存の `stem` と重複させない
- `source_refs` に出典章を必ず付ける

## 報告

- 作成した問題数、章別件数、重複回避、次に実行すべきコマンド
