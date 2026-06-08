---
paths:
  - "input/materials/**/*.yaml"
  - "input/materials/**/*.yml"
  - "input/blueprint.yaml"
  - "schemas/chapter.schema.json"
---

# Material Input Schema

章データは YAML で書く。`scripts/build-materials.mjs` が HTML へ変換する。
スキーマは `schemas/chapter.schema.json`。

## 章ファイルの場所と命名

```
input/materials/lv0/ch01.yaml   → ai_edu/.../materials/lv0/ch01.html
input/materials/lv0/index.yaml  → ai_edu/.../materials/lv0/index.html
```

## 章フィールド

- `level`     : `lv0` / `lv1`（必須）
- `id`        : 章番号（1 始まりの整数、必須。ファイル番号と一致）
- `type`      : `core`（知識） / `user`（実践）のみ（必須）
- `title`     : 章タイトル（必須）
- `subtitle`  : サブタイトル（必須）
- `icon`      : 絵文字 1 つ（必須）
- `status`    : `draft` / `review` / `done`（既定 `draft`）
- `source_refs`: 根拠となる元資料への参照（必須、1 件以上）
- `total_chapters`: そのレベルの全章数（ヘッダ表示用、任意）
- `content_blocks`: 本文ブロックの配列（必須）

## content_blocks の kind

最終的に JSX へ変換できる構造化ブロック。

| kind | 用途 | 主なフィールド |
|------|------|----------------|
| `h3` | 見出し | `text` |
| `paragraph` | 段落（**強調**可） | `text` |
| `ul` / `ol` | 箇条書き | `items[]` |
| `kv-box` | 学習ポイント（青） | `title`, `text` または `items[{term,desc}]` |
| `warn-box` | 注意・リスク（橙） | `title`, `text` |
| `tip-box` | コツ（緑） | `title`, `text` |
| `ex-box` | 活用事例（紫） | `title`, `items[]` |
| `checklist` | 判断チェックリスト | `title`, `items[]` |
| `table` | 表 | `headers[]`, `rows[][]` |
| `keywords` | 右パネル重要語 | `items[{term,desc}]` |

## ルール

- `id` はレベル内で 1 始まり連番・重複なし
- `type` は `core` / `user` のみ
- `source_refs` を必ず付ける
- 元資料にない断定を本文に入れない。不足は `text` 内に `TODO:` を残す
- 確認問題はここに書かない（`input/questions/` 側で管理）

## 禁止

- HTML/JSX を YAML 本文へ直書きしすぎる（`paragraph` の `**強調**` 程度に留める）
- 画像参照
