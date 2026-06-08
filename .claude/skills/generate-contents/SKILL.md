---
name: generate-contents
description: input/raw の元資料から教材本文（章データ YAML）を量産する。ai-certificate-html 形式に変換可能な content_blocks を作り、input/materials/lvN/chNN.yaml に出力する。
argument-hint: "[scope] 例: level=lv0 / chapter=lv0:1-6 / topic=セキュリティ / apply"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Generate Contents — 教材本文の量産

`input/raw/` の元資料から教材本文を拾い集め、章データ YAML を作る。

## 引数 `$ARGUMENTS`

例: `level=lv0` / `chapter=lv0:1-6` / `topic=セキュリティ` / `count=6` / `apply`

## 先に必ず読む

- `CLAUDE.md`、`.claude/rules/10-html-template.md`、`.claude/rules/20-input-schema.md`
- `.claude/skills/ai-certificate-html/SKILL.md` と `references/`
- ground truth: `ai_edu/packages/db/seeds/materials/lv0/ch01.html`（実テンプレート）
- `input/blueprint.yaml`、既存の `input/materials/lvN/*.yaml`
- `input/raw/**/*`（元資料）

## 出力

- `input/materials/lvN/chNN.yaml`（章データ）
- `--apply` 時のみ `scripts/build-materials.mjs --apply` で `ai_edu` の HTML を更新

## 手順

1. `input/raw/` と既存章を走査し、対象レベル/トピックの素材を把握する
2. `blueprint.yaml` の章構成に沿って、不足章を洗い出す
3. 各章を `schemas/chapter.schema.json` 準拠で作る
   - `level / id / type / title / subtitle / icon / status / source_refs / content_blocks`
4. `content_blocks` は references の変換表にある kind だけを使う
5. 元資料にない断定は書かない。不足は `paragraph` 内に `TODO:` を残す
6. `npm run validate` を実行する
7. （任意）`npm run build`（dry-run）で HTML を生成し、構造を確認する

## 作成ルール

- `id` はレベル内 1 始まり連番、ファイル番号と一致（ゼロ埋め 2 桁）
- `type` は `core`（知識）/ `user`（実践）
- 各章に `source_refs` を必ず付ける
- 1 章あたり h3 セクション 2〜4 個、`kv-box`/`tip-box`/`warn-box` を適度に配置
- リスク・注意は `warn-box`、コツは `tip-box`、活用事例は `ex-box`
- 確認問題はここで作らない（`/generate-check-questions`）

## 報告

- 作成/更新した章数、TODO の残る章、source_refs 不足、次に実行すべきコマンド
