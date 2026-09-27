import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import fs from 'node:fs'
import {fileURLToPath, URL} from 'node:url'
import {spawnSync} from 'node:child_process'
import process from 'node:process'

const root = fileURLToPath(new URL('../', import.meta.url))
for (const file of ['index.js', 'filter.js', 'cli.js']) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.equal(result.status, 0, result.stderr)
}

// This is a source package. Retain the published API declarations instead of
// regenerating legacy JSDoc types with an incompatible TypeScript release.
const expected = JSON.parse(
  fs.readFileSync(new URL('./declaration-hashes.json', import.meta.url), 'utf8')
)
for (const [file, hash] of Object.entries(expected)) {
  const bytes = fs.readFileSync(new URL('../' + file, import.meta.url))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, file)
}
console.log('Source entrypoints and retained public declarations verified')
