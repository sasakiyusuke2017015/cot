// scripts/lib/csv.mjs
// ai_edu/scripts/lib/csv.mjs と round-trip 互換になる CSV シリアライザ。
// クオート規則: フィールドに , " \n \r を含むなら "" で囲み、内部の " は "" にエスケープ。
// 出力は先頭 BOM 付き UTF-8（ai_edu の既存 CSV に合わせる）。

const NEEDS_QUOTE = /[",\r\n]/

export function escapeField(value) {
  const s = value == null ? '' : String(value)
  if (NEEDS_QUOTE.test(s)) {
    return '"' + s.replaceAll('"', '""') + '"'
  }
  return s
}

/**
 * 行配列（各行はセル配列）を CSV テキストにする。
 * @param {string[][]} rows
 * @param {{bom?: boolean}} [opts]
 */
export function toCsv(rows, { bom = true } = {}) {
  const body = rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
  return (bom ? '﻿' : '') + body + '\r\n'
}

/** ai_edu の問題 CSV ヘッダ。 */
export const QUESTION_HEADER = [
  '問題番号',
  '学習項目',
  '問題文',
  '正答1',
  '誤答1',
  '誤答2',
  '誤答3',
  '解説',
  '関連キーワード',
]
