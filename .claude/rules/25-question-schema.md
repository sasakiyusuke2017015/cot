---
paths:
  - "input/questions/**/*.yaml"
  - "input/questions/**/*.yml"
  - "schemas/question.schema.json"
  - "output/questions/**/*.csv"
---

# Question Input Schema & CSV Output

問題は YAML で著者が書き、`scripts/build-questions.mjs` が `ai_edu` の **9 列 CSV** へ変換する。
ground truth は `ai_edu/packages/db/seeds/questions/lvN-check.csv` / `lvN-cert.csv`。

## 入力（著者が書く YAML）

```
input/questions/lv0/check/01-ai-basics.yaml   → lv0-check.csv へ集約
input/questions/lv0/cert/01-ai-basics.yaml    → lv0-cert.csv へ集約
```

### 問題フィールド

- `level`      : `lv0` / `lv1`（必須、ファイル経路と一致）
- `purpose`    : `check`（確認） / `cert`（試験）（必須）
- `learning_item` : 学習項目（CSV の「学習項目」、必須）
- `stem`       : 問題文（CSV の「問題文」、必須）
- `correct`    : 正解の選択肢テキスト（CSV の「正答1」、必須）
- `wrongs`     : 誤答テキスト 3 つの配列（CSV の「誤答1〜3」、必須・ちょうど 3）
- `explanation`: 解説（CSV の「解説」、必須）。`${正答1}` `${誤答1〜3}` プレースホルダ可
- `keywords`   : 関連キーワード（CSV の「関連キーワード」、任意・カンマ連結）
- `source_refs`: 根拠（任意だが推奨）

## 重要: 正解位置は著者が決めない

`ai_edu/scripts/provision-question-bank.mjs` が `seed_ref`（`<basename>#<問題番号>`）から
**決定的に A〜D へシャッフル配置**する。よって:

- 著者は `correct` / `wrongs` を書くだけ。`ans` インデックスや A/B/C/D を**書かない**
- 「正解は常に A」のような偏りは provisioner が防ぐ
- 解説のプレースホルダ `${正答1}` 等は provision 時に実テキストへ置換される

## CSV 出力フォーマット（厳守）

ヘッダ行（先頭に BOM 付き）:

```
問題番号,学習項目,問題文,正答1,誤答1,誤答2,誤答3,解説,関連キーワード
```

- `問題番号` は 1 始まり連番（ファイル集約順）。`seed_ref` の一部になるので**安定させる**
- カンマ・改行・`"` を含むフィールドは RFC4180 でクオート（`ai_edu/scripts/lib/csv.mjs` 互換）
- 文字コード UTF-8、先頭 BOM あり（既存ファイルに合わせる）

## 作問ルール

- 選択肢は 1 正解 + 3 誤答（合計 4）。正解は 1 つだけ
- 確認問題（check）は本文を読めば答えられる素直な難度
- 試験問題（cert）は判断・シナリオ・実践を含む（難度高め）
- 解説を必ず付ける。誤答にも「なぜ誤りか」を書く
- 「すべて選べ」「最も適切でないもの」の多用を避け、正解根拠が一意に説明できる問題にする
- 既存問題と重複させない（同じ `stem` を作らない）
- セキュリティ・個人情報・著作権・ハルシネーション・人間確認のテーマを厚めに
