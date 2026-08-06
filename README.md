# cot — 教材生成ハーネス

教材の本文・確認問題を **YAML から生成** するハーネス。生成物は HTML と CSV。

## Web開発の虎の巻（web 種別）

新人向け Web 開発教育の教材。全 9 章。

**📖 [講師用ガイドを開く](https://sasakiyusuke2017015.github.io/cot/)** — 章一覧・章別カンペ・進め方

スマホのブラウザでそのまま読めます（GitHub Pages で公開）。
push すれば数分で反映されるので、生成 → push → スマホで確認、という流れでレビューできます。

| 章 | テーマ | 章 | テーマ |
|----|--------|----|--------|
| 1 | [HTML](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch01.html) | 6 | [React](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch06.html) |
| 2 | [CSS](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch02.html) | 7 | [API](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch07.html) |
| 3 | [JavaScript](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch03.html) | 8 | [DB](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch08.html) |
| 4 | [Git](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch04.html) | 9 | [デプロイ](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch09.html) |
| 5 | [TypeScript](https://sasakiyusuke2017015.github.io/cot/output/materials/web/ch05.html) | | |

## 使い方

```bash
npm install

npm run web         # 生成 + 検証（ふだんはこれ1つ）
npm run preview     # ローカルサーバで確認（スマホ用に QR コードも表示）
```

個別に動かす場合:

```bash
npm run build:web       # input/ の YAML → output/ の HTML と CSV
npm run validate:web    # 生成物の検証（構造・リンク・HTML↔CSV の一致）
```

### 公開までの流れ

```
input/ の YAML を直す
   ↓
npm run web          … 生成 + 検証
   ↓
git commit && git push
   ↓
数分で https://sasakiyusuke2017015.github.io/cot/ に反映
```

> **Actions が「失敗」でもサイトは公開されていることがある。**
> `deploy-pages` はデプロイ成功後の完了検知でタイムアウトすることがあるため、
> 成否は Actions の表示ではなく**公開 URL を直接開いて**確認する。

### 内容を直すとき

**`output/` の生成物は直接編集しない。** `input/` の YAML を直して再生成する。

| 直したいもの | 編集するファイル |
|--------------|------------------|
| 章の本文 | `input/materials/web/chNN.yaml` |
| 講師向けカンペ | 同上の `teaching:` |
| コース全体の進め方 | `input/materials/web/course.yaml` |
| 確認問題 | `input/questions/web/chNN.yaml` |

問題 YAML は CSV と HTML 内クイズの**共通ソース**なので、1 か所直せば両方に反映される。

### スマホで確認する

用途に応じて 3 通り。

**1. 公開版を開く**（push 済みの内容・いちばん手軽）
[https://sasakiyusuke2017015.github.io/cot/](https://sasakiyusuke2017015.github.io/cot/)

push すれば数分で反映される。スマホでブックマークしておけば、開き直すだけで最新版が読める。

**2. ファイルを送る**（サーバも通信も不要）
`output/toranomaki-all.html` は**全 9 章 + 講師用メモ + 確認問題を 1 ファイルにまとめた版**（53KB・外部依存なし）。
メールに添付するかクラウド経由でスマホに送れば、そのまま読める。オフラインでも見られる。

**3. push 前の手元の内容を見る**

```bash
npm run preview
```

同じ Wi-Fi のスマホから、表示された QR コードを読むかアドレスを開く。

## 構成

```
input/          著者が書く YAML（唯一の元データ）
  raw/          元資料。教材本文の根拠
  materials/    course.yaml（コース設計）+ chNN.yaml（章）
  questions/    chNN.yaml（問題）
scripts/        YAML → HTML / CSV の変換
validators/     生成物の検証
output/         生成物
  toranomaki.html       講師用ハブ（章一覧・カンペ。公開サイトの入口）
  toranomaki-all.html   全章を1ファイルにまとめた版（送付・オフライン用）
  materials/web/        章ページ chNN.html
  questions/web/        問題 CSV chNN-check.csv
```

詳しいルールは [CLAUDE.md](CLAUDE.md) と `.claude/rules/` を参照。

## もう一つの種別（lvN）

`lvN` は社内 AI 活用資格研修用で、隣の `ai_edu` プロジェクトの seed へ出力する別系統。
現在 web 種別を優先しており、lvN は着手前の状態。詳細は [CLAUDE.md](CLAUDE.md) を参照。
