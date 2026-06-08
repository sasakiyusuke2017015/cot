#!/usr/bin/env node
// scripts/build-all.mjs
// build-materials + build-questions をまとめて実行する。引数はそのまま両方へ渡す。

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const passthrough = process.argv.slice(2)

function run(script) {
  const r = spawnSync(process.execPath, [path.join(HERE, script), ...passthrough], {
    stdio: 'inherit',
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('build-materials.mjs')
run('build-questions.mjs')
