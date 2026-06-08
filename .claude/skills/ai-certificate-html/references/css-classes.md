# 共有 CSS クラス（`<style>` 内）

`ai_edu/.../materials/lv0/ch01.html` と `index.html` の実値。生成 HTML はこれを維持する。

## prose（本文）

```css
body { font-family: 'Yu Gothic UI', 'Yu Gothic', 'YuGothic', sans-serif; }
.prose h3 { font-size:1.1rem; font-weight:700; margin:2.5rem 0 0.75rem; color:#1e3a8a; padding-top:1.5rem; border-top:2px solid #e5e7eb; }
.prose h3:first-child { margin-top:0.5rem; border-top:none; padding-top:0; }
.prose p { margin-bottom:1.1rem; line-height:1.9; color:#374151; }
.prose ul { list-style:disc; padding-left:1.5rem; margin-bottom:1.1rem; }
.prose ul li { margin-bottom:0.5rem; color:#374151; }
.prose ol { list-style:decimal; padding-left:1.5rem; margin-bottom:1.1rem; }
.prose ol li { margin-bottom:0.5rem; color:#374151; }
```

## ボックス類

```css
.kv-box  { background:#eff6ff; border-left:4px solid #3b82f6; padding:1rem 1.25rem; border-radius:0 0.5rem 0.5rem 0; margin:1.75rem 0; line-height:1.8; }  /* 学習ポイント・重要 */
.warn-box{ background:#fff7ed; border-left:4px solid #f97316; padding:1rem 1.25rem; border-radius:0 0.5rem 0.5rem 0; margin:1.75rem 0; line-height:1.8; }  /* 注意・リスク */
.tip-box { background:#f0fdf4; border-left:4px solid #10b981; padding:1rem 1.25rem; border-radius:0 0.5rem 0.5rem 0; margin:1.75rem 0; line-height:1.8; }  /* コツ */
.ex-box  { background:#faf5ff; border:2px dashed #7c3aed; padding:1.1rem 1.25rem; border-radius:0.75rem; margin:1.75rem 0; }                                  /* 活用事例 */
.ex-box .ex-title { font-weight:700; color:#5b21b6; margin-bottom:0.75rem; }
```

## チェックリスト

```css
.chk-item { display:flex; gap:0.5rem; padding:0.4rem 0; font-size:0.875rem; color:#374151; align-items:flex-start; }
.chk-item::before { content:"☐"; color:#f97316; font-size:1rem; flex-shrink:0; margin-top:-1px; }
```

## ハブ型（index.html）のみ

```css
.quiz-option { cursor:pointer; padding:0.5rem 1rem; border:2px solid #e5e7eb; border-radius:0.5rem; margin:0.4rem 0; transition:all 0.2s; }
.quiz-option:hover { border-color:#3b82f6; background:#eff6ff; }
.quiz-option.correct { border-color:#10b981; background:#f0fdf4; color:#065f46; }
.quiz-option.wrong { border-color:#ef4444; background:#fef2f2; color:#991b1b; }
.sidebar-item { cursor:pointer; padding:0.5rem 0.75rem; border-radius:0.5rem; transition:all 0.15s; font-size:0.85rem; }
.sidebar-item:hover { background:#dbeafe; color:#1d4ed8; }
.sidebar-item.active { background:#2563eb; color:white; font-weight:600; }
.tag { display:inline-block; padding:0.15rem 0.5rem; border-radius:9999px; font-size:0.7rem; font-weight:600; }
.tag-core { background:#dbeafe; color:#1d4ed8; }
.tag-user { background:#d1fae5; color:#065f46; }
```

## 印刷

```css
@media print { .no-print { display:none; } }
```

## tailwind.config（index.html のみ）

```js
tailwind.config = {
  theme: { extend: { colors: {
    brand:  { 50:'#eff6ff', 100:'#dbeafe', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8', 900:'#1e3a8a' },
    accent: { 400:'#34d399', 500:'#10b981', 600:'#059669' }
  } } }
}
```

> 注: `ch01.html` と `index.html` で一部の値（h3 の余白、box の padding）が微妙に異なる。
> 生成時はそれぞれの実ファイルに合わせる。新規生成は `ch01.html` の値を基準にする。
