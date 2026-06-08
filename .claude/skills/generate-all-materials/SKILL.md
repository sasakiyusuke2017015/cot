---
name: generate-all-materials
description: input から教材本文・確認問題・試験問題・模擬試験・HTML/CSV生成・検証まで一括実行する。量産のメイン入口。
argument-hint: "[options] 例: level=lv0 chapters=6 check=3 exam=60 mock=60 apply"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Generate All Materials — 教材一式の一括生成

教材本文 → 確認問題 → 試験問題 → 模擬試験 → HTML/CSV 生成 → 検証 を一気通貫で行う。

## 引数 `$ARGUMENTS`

例: `level=lv0 chapters=6 check=3 exam=60 mock=60` / `topic=AI基礎` / `apply`

`--apply` 無し = dry-run（`output/` に出力）。`apply` 指定で `ai_edu` seed へ書き込む。

## 先に必ず読む

- `CLAUDE.md`、`.claude/rules/*`
- `.claude/skills/ai-certificate-html/SKILL.md` と `references/`
- `input/blueprint.yaml`、`input/exam-spec.yaml`
- `input/raw/**/*`、既存の `input/materials/**`、`input/questions/**`
- ground truth: `ai_edu/.../materials/lv0/ch01.html`、`.../questions/lv0-check.csv`

## 実行順

1. 教材本文を作る → `/generate-contents` の手順（`input/materials/lvN/*.yaml`）
2. 確認問題を作る → `/generate-check-questions` の手順（`input/questions/lvN/check/*.yaml`）
3. 試験問題を作る → `/generate-exam-bank` の手順（`input/questions/lvN/cert/*.yaml`）
4. 模擬試験を組む → `/assemble-exam` の手順（`output/exams/*.md`）
5. HTML/CSV を生成 → `npm run build`（`apply` 時は `-- --apply`）
6. 検証 → `npm run validate`

## 生成ルール（全体）

- 元資料にない断定をしない。不足は `TODO:` で残す
- すべての章・問題に `source_refs`、すべての問題に `explanation`
- 問題の正解位置は書かない（provision がシャッフル）
- 確認問題と試験問題を重複させない
- HTML は ai-certificate-html 仕様、CSV は ai_edu 9 列フォーマット
- `ai_edu` への書き込みは `--apply` 経由のみ。上書き対象を提示してから書く

## 完了条件

- `input/materials/lvN/*.yaml` が作成/更新されている
- 各章に確認問題が 2 問以上ある
- `input/questions/lvN/cert/*.yaml` に試験問題がある
- `npm run build` で HTML/CSV が生成される（dry-run なら `output/`）
- `output/exams/lvN_mock_01.md` と `_answers.md` がある
- `npm run validate` が error 0 件

## 最終報告（この形式）

```md
# 生成結果（{level}）
## 教材本文   作成章数 / 更新章数 / TODO残り
## 確認問題   作成数 / 章別件数
## 試験問題   総数 / 今回追加 / 難易度別 / タイプ別
## 模擬試験   セット数 / 各セット問題数
## 検証      build / validate 結果
## 要確認    人間確認が必要な箇所
## 出力先    dry-run(output/) か ai_edu seed か
```
