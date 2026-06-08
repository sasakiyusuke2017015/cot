---
name: assemble-exam
description: lvN-cert.csv（試験問題バンク）から模擬試験セットを組む。受験者用問題と解答解説を分けて output/exams に出力する。配分は exam-spec.yaml に従う。
argument-hint: "[options] 例: level=lv0 count=60 sets=2 seed=20260608"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Assemble Exam — 模擬試験の組み立て

試験問題バンク（`lvN-cert.csv` または `input/questions/lvN/cert/*.yaml`）から模擬試験を組む。

## 引数 `$ARGUMENTS`

例: `level=lv0` / `count=60` / `sets=2` / `seed=20260608` / `difficulty=balanced`

## 先に必ず読む

- `input/exam-spec.yaml`（問題数・時間・合格点・配分）
- 試験問題バンク（`input/questions/lvN/cert/*.yaml` か `ai_edu/.../questions/lvN-cert.csv`）
- 対象レベルの章 YAML（出典確認用）

## 出力（content_agent 内）

- `output/exams/lvN_mock_01.md`（受験者用：正解・解説なし）
- `output/exams/lvN_mock_01_answers.md`（解答解説：正解・解説・出典あり）
- `sets=2` なら `_02` も

> 注: 模擬試験 md は配布物。DB 投入はしない（DB は cert CSV が担う）。
> 受験者用と解答解説は**必ず別ファイル**にする。

## 受験者用ファイル

```md
# 社内AI活用資格 Lv.0 模擬試験 01
制限時間: {time_limit}分 / 問題数: {count}問

## 問1
{問題文}
A. … / B. … / C. … / D. …
```

正解・解説・出典を**出さない**。選択肢順は `seed` から決定的にシャッフル。

## 解答解説ファイル

```md
# … 模擬試験 01 解答解説
## 問1
正解: {X}
解説: …
出典: input/materials/lv0/chNN.yaml
```

## 選定ルール

- `exam-spec.yaml` の難易度別・タイプ別配分を優先
- 章の偏り・同一論点の連続を避ける
- 問題不足時は不足カテゴリを報告する
- `seed` で再現可能にする（同じ seed → 同じ出題・同じ選択肢順）

## 報告

- セット数、各セット問題数、章別/難易度別出題数、不足カテゴリ
