// scripts/lib/paths.mjs
// content_agent と ai_edu のパス解決。出力先（dry-run output/ か ai_edu seed か）を決める。

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** ai_edu のルートを解決する。AI_EDU_DIR > ../ai_edu の順。存在しなければ null。 */
export function resolveAiEduDir() {
  const candidates = [
    process.env.AI_EDU_DIR,
    path.resolve(ROOT, '..', 'ai_edu'),
  ].filter(Boolean)
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'packages', 'db', 'seeds'))) return path.resolve(c)
  }
  return null
}

/**
 * 出力ルートを決める。
 * apply=false → content_agent/output（dry-run）
 * apply=true  → ai_edu の seed ルート（無ければ throw）
 */
export function outputRoots({ apply }) {
  if (!apply) {
    return {
      materials: path.join(ROOT, 'output', 'materials'),
      questions: path.join(ROOT, 'output', 'questions'),
      mode: 'dry-run',
    }
  }
  const aiEdu = resolveAiEduDir()
  if (!aiEdu) {
    throw new Error(
      'AI_EDU_DIR が解決できません。--apply には ai_edu の場所が必要です。' +
        ' 環境変数 AI_EDU_DIR を設定するか、../ai_edu に配置してください。',
    )
  }
  return {
    materials: path.join(aiEdu, 'packages', 'db', 'seeds', 'materials'),
    questions: path.join(aiEdu, 'packages', 'db', 'seeds', 'questions'),
    mode: `apply → ${aiEdu}`,
  }
}

/** 引数 --apply を解釈する。 */
export function parseArgs(argv) {
  const args = { apply: false, level: null }
  for (const a of argv.slice(2)) {
    if (a === '--apply' || a === 'apply') args.apply = true
    else if (a.startsWith('level=')) args.level = a.slice('level='.length)
    else if (a.startsWith('--level=')) args.level = a.slice('--level='.length)
  }
  return args
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}
