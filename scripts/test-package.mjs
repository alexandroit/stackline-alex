import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-alex-packed-'))
function npm(args, cwd) {
  return execFileSync('npm', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})
}
try {
  const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], root))[0]
  for (const key of [manifest.name, 'alex']) {
    const cwd = path.join(temporary, key === manifest.name ? 'direct' : 'alias')
    await mkdir(cwd)
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({private: true, type: 'module', dependencies: {
      [key]: 'file:' + path.join(temporary, packed.filename)
    }}))
    npm(['install', '--omit=dev', '--ignore-scripts', '--no-fund'], cwd)
    const tree = JSON.parse(npm(['ls', '--all', '--omit=dev', '--json'], cwd))
    assert.deepEqual(tree.problems || [], [])
    const installed = JSON.parse(await readFile(path.join(cwd, 'node_modules', key, 'package.json'), 'utf8'))
    assert.equal(installed.name, manifest.name)
    assert.equal(installed.version, manifest.version)
    assert.deepEqual(installed.dependencies, manifest.dependencies)
    const source = `
      import assert from 'node:assert/strict';
      import {spawnSync} from 'node:child_process';
      import alex, {text, markdown, html, mdx} from ${JSON.stringify(key)};
      assert.equal(alex, markdown); assert.equal(typeof mdx, 'function');
      assert.equal(text('His').messages.length, 1);
      assert.equal(text('His').messages[0].ruleId, 'her-him');
      assert.equal(html('<p>His</p>').messages.length, 1);
      assert.equal(markdown('A friendly team.').messages.length, 0);
      const cli = 'node_modules/.bin/alex';
      const options = {encoding:'utf8', env:{...process.env, NO_UPDATE_NOTIFIER:'1'}};
      const version = spawnSync(process.execPath, [cli, '--version'], options);
      assert.equal(version.status, 0); assert.equal(version.stdout.trim(), ${JSON.stringify(manifest.version)});
      const checked = spawnSync(process.execPath, [cli, '--stdin'], {...options, input:'His'});
      assert.equal(checked.status, 1); assert.match(checked.stderr, /her-him/); assert.equal(checked.stdout, '');
    `
    execFileSync(process.execPath, ['--input-type=module', '-e', source], {cwd, stdio: 'pipe'})
  }
  console.log('Packed direct and legacy-alias consumers verified text/Markdown/HTML API and CLI version/stdin diagnostics.')
} finally {
  await rm(temporary, {recursive: true, force: true})
}
