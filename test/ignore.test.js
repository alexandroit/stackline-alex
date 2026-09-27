import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {spawnSync} from 'node:child_process'
import {fileURLToPath, URL} from 'node:url'
import {test} from 'node:test'

const cli = fileURLToPath(new URL('../cli.js', import.meta.url))

function fixture(run) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stackline-alex-'))
  try {
    fs.writeFileSync(path.join(cwd, '.alexignore'), 'ignored.md\n*.csv\n')
    fs.writeFileSync(path.join(cwd, 'ignored.md'), 'His document.\n')
    fs.writeFileSync(path.join(cwd, 'ignored.csv'), 'His document.\n')
    fs.writeFileSync(path.join(cwd, 'readme.md'), 'A useful document.\n')
    return run((args) => {
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd,
        encoding: 'utf8',
        input: '',
        timeout: 15000,
        env: {...process.env, NO_COLOR: '1', NO_UPDATE_NOTIFIER: '1'}
      })
      assert.ifError(result.error)
      return result
    }, cwd)
  } finally {
    fs.rmSync(cwd, {recursive: true, force: true})
  }
}

test('explicitly ignored files remain an error by default (#348)', () => {
  fixture((run) => {
    const result = run(['ignored.md'])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Cannot process specified file: it’s ignored/)
    assert.equal(result.stdout, '')
  })
})

test('--silently-ignore skips explicitly ignored markdown and CSV inputs', () => {
  fixture((run) => {
    const result = run(['ignored.md', 'ignored.csv', '--silently-ignore'])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, '')
    assert.equal(result.stdout, '')
  })
})

test('mixed inputs still report language warnings from nonignored files', () => {
  fixture((run, cwd) => {
    fs.writeFileSync(path.join(cwd, 'warning.md'), 'His document.\n')
    const result = run(['ignored.md', 'warning.md', '--silently-ignore'])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /her-him/)
    assert.match(result.stderr, /1 warning/)
    assert.doesNotMatch(result.stderr, /ignored|Cannot process/)
  })
})

test('the opt-in flag does not suppress missing-file errors', () => {
  fixture((run) => {
    const result = run(['missing.md', '--silently-ignore'])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /missing\.md/)
  })
})

test('default discovery still ignores files without requiring the new flag', () => {
  fixture((run) => {
    const result = run([])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, 'readme.md: no issues found\n')
  })
})

test('negated flag keeps explicit-file errors, and help documents the opt-in', () => {
  fixture((run) => {
    assert.equal(run(['ignored.md', '--no-silently-ignore']).status, 1)
    assert.match(run(['--help']).stdout, /--silently-ignore/)
  })
})

test('the scoped diff plugin remains loadable through the existing CLI option', () => {
  fixture((run) => {
    const result = run(['readme.md', '--diff'])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, 'readme.md: no issues found\n')
  })
})
