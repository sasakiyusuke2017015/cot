# content_agent — 教材生成ハーネス

このリポジトリは、社内AI活用資格研修（`ai_edu` プロジェクト）向けの **教材本文・確認問題・試験問題を量産し、検証する** ためのオーサリング/生成ハーネスです。

成果物は最終的に **隣の `ai_edu` プロジェクトの seed ディレクトリ** に出力し、`ai_edu` 側の既存 `provision-*.mjs` が Postgres へ冪等投入します。**content_agent 自身は DB を持たず、ファイルを生成・検証するだけ** です。

## プロジェクトの関係

```
content_agent/                         ← このリポジトリ（生成・検証）
  input/                               ← 著者が書く元データ（YAML）
  scripts/                             ← YAML → HTML / CSV 変換
  validators/                          ← 生成物の検証

ai_edu/                                ← 出力先（DBパイプラインを持つ別プロジェクト）
  packages/db/seeds/materials/lvN/     ← 教材 HTML（chNN.html / index.html）
  packages/db/seeds/questions/         ← 問題 CSV（lvN-check.csv / lvN-cert.csv）
  scripts/provision-course-materials.mjs   ← 教材を course_contents へ
  scripts/provision-question-bank.mjs      ← 問題を questions / question_options へ
```

絶対パス: `ai_edu` は `c:/Users/NT-210174/Desktop/projects/gitea/ai_edu`。
`AI_EDU_DIR` 環境変数で上書き可能。

## ゴール

- `input/` の YAML から、`ai_edu` の **既存フォーマットに完全一致する** ファイルを生成する
  - 教材: `ai_edu/.../materials/lvN/chNN.html`（および `index.html`）
  - 確認問題: `ai_edu/.../questions/lvN-check.csv`
  - 試験問題: `ai_edu/.../questions/lvN-cert.csv`
- 生成物が `ai_edu` の provisioner で問題なく投入できることを検証する
- React18 + Babel + Tailwind の CDN 単一 HTML 構成を維持する（ビルド・画像に依存しない）

## コース種別

このリポジトリは **2 つの独立したコース種別** を扱う。混同しないこと。

### 1. `lvN` 種別（AI活用資格研修）— ai_edu へ出力する

`ai_edu` のレベル規約に従う。

| レベル | コース名             | 教材ディレクトリ           | 問題ファイル                  |
|--------|----------------------|----------------------------|-------------------------------|
| `lv0`  | AIリテラシー入門     | `materials/lv0/`           | `lv0-check.csv` / `lv0-cert.csv` |
| `lv1`  | 生成AI活用ガイド     | `materials/lv1/`           | `lv1-check.csv` / `lv1-cert.csv` |

- ビルド: `npm run build`（`build-materials.mjs` / `build-questions.mjs`）
- 出力先: dry-run は `output/`、`--apply` で `ai_edu` の seed へ
- 問題は `lvN-check.csv` / `lvN-cert.csv` に**レベル単位で集約**される

### 2. `web` 種別（Web開発の虎の巻）— ai_edu へは出力しない

新人向け Web 開発教育の教材。**DB 投入を前提とせず、`output/` に閉じる**。

| 種別  | コース名            | 教材ディレクトリ     | 問題ファイル              |
|-------|---------------------|----------------------|---------------------------|
| `web` | Web開発の虎の巻     | `materials/web/`     | `chNN-check.csv`（章別）  |

- 入力: `input/materials/web/chNN.yaml`・`input/questions/web/chNN.yaml`
- ビルド: `npm run build:web` → `output/materials/web/chNN.html` + `output/questions/web/chNN-check.csv`
- 検証: `npm run validate:web`
- 章構成（全 9 章・ロードマップ順）: HTML → CSS → JavaScript → Git → TypeScript → React → API → DB → デプロイ
- **問題 YAML が唯一の元データ**。CSV と HTML 内の確認クイズの両方をそこから生成する（二重管理しない）
- HTML クイズの選択肢は問題番号を種にした決定的シャッフル（再生成しても並びは変わらない）
- 問題番号は章をまたいだ通し連番（ch01 の 1 問目が 1 番）
- `--apply` は無い（`ai_edu` へは書き込まない）

## 重要ルール（ハードルール）

### 教材 HTML
- `<html lang="ja">` / `<meta charset="UTF-8">` / viewport meta を入れる
- React18・ReactDOM18・Babel standalone・Tailwind の **CDN** を `<head>` に置く
- JSX は `<script type="text/babel">` 内に置く。`class` ではなく `className` を使う
- 本文ロジックは `<div id="root"></div>` + `ReactDOM.createRoot(...).render(...)`
- 既存 CSS クラスを維持: `prose / kv-box / warn-box / tip-box / ex-box / chk-item / quiz-option / sidebar-item / tag-core / tag-user`
- **画像アセットを使わない**（絵文字アイコンは可）
- ファイル名: 章は `chNN.html`、概要は `index.html`（`provision` の表示順は index=先頭, chNN=NN順）

### 問題（CSV）
- 出力は `ai_edu` の 9 列 CSV: `問題番号,学習項目,問題文,正答1,誤答1,誤答2,誤答3,解説,関連キーワード`
- **正解は「正答1」、誤答は「誤答1〜3」**。著者は正解の位置（A〜D）を決めない。
  A〜D への配置は `provision-question-bank.mjs` が `seed_ref` から**決定的にシャッフル**する。
- `解説` には `${正答1}` / `${誤答1}` / `${誤答2}` / `${誤答3}` のプレースホルダを使ってよい（provision 時に実テキストへ置換される）
- ファイル名規約: `lvN-check.csv`（理解度チェック=確認問題） / `lvN-cert.csv`（認定テスト=試験問題）
- 著者は YAML で書き、`scripts/build-questions.mjs` が CSV へ変換する

### 出力先
- 生成物は `ai_edu` の seed ディレクトリに出す（直接 or staging 経由は `--apply` で制御）
- **`ai_edu` 側のファイルを消す/上書きする前に必ず確認する**
- `ai_edu` の DB / migration / 他スクリプトを勝手に実行しない

## よく使うコマンド

```bash
# lvN 種別（AI研修 → ai_edu へ）
npm run build             # input → 教材HTML + 問題CSV を生成（dry-run、output/ に出す）
npm run build -- --apply  # ai_edu の seed ディレクトリへ直接書き込む
npm run validate          # 生成物・入力の検証

# web 種別（虎の巻 → output/ に閉じる）
npm run build:web         # input/*/web/*.yaml → output/materials/web/ + output/questions/web/
npm run validate:web      # 生成HTML/CSV の構造検証 + HTML↔CSV の突き合わせ

npm run preview           # 生成 HTML をブラウザで確認（ローカルサーバ）
```

## Claude 向け作業方針

- 章を追加するときは `/generate-contents` を使う
- 確認問題は `/generate-check-questions`、試験問題は `/generate-exam-bank` を使う
- まとめて量産するときは `/generate-all-materials` を使う
- テンプレートの確認は `/ai-certificate-html` を参照する
- **元資料（`input/raw/`）にない内容を断定で書かない。** 不足は `TODO:` で残す
- すべての章・問題に `source_refs`、すべての問題に `解説` を付ける
- `ai_edu` 側のファイルは**読むのは自由、書くのは `--apply` 経由のみ**。手で直接編集しない
- 大きな変更では、先に対象レベル・章・問題数を宣言してから着手する

## ディレクトリ概要

- `input/raw/` — 元資料（md/txt）。教材本文の根拠
- `input/materials/lvN/chNN.yaml` — 章データ（lvN 種別・著者が書く）
- `input/questions/lvN/check/`・`lvN/cert/` — 問題データ（lvN 種別・著者が書く YAML）
- `input/materials/web/chNN.yaml` — 章データ（web 種別・虎の巻）
- `input/questions/web/chNN.yaml` — 問題データ（web 種別・CSV と HTML クイズの共通ソース）
- `scripts/build-materials.mjs`・`build-questions.mjs` — lvN 種別のビルダー
- `scripts/build-web.mjs` — web 種別のビルダー（HTML + CSV を一括生成）
- `scripts/lib/render-blocks.mjs` — lvN 用 content_blocks → JSX
- `scripts/lib/render-blocks-web.mjs` — web 用 content_blocks → JSX（`code` ブロック対応）
- `scripts/templates/` — HTML の head 部テンプレート（種別ごと）
- `validators/validate-all.mjs` — lvN 種別の検証
- `validators/validate-web.mjs` — web 種別の検証
- `output/` — 生成物（lvN は dry-run 用、web は最終出力）
- `.claude/rules/` — ファイル種別ごとの詳細ルール
- `.claude/skills/` — 生成ワークフロー

詳細ルールは `.claude/rules/` を参照。テンプレート仕様は `.claude/skills/ai-certificate-html/` を参照。
