import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve('.');
const dist = path.join(root, 'dist');

test('distributed archives and checksums agree, with no cached/user-specific data', async () => {
  const sums = JSON.parse(await fs.readFile(path.join(dist, 'SHA256SUMS.json'), 'utf8'));
  for (const [name, expected] of Object.entries(sums)) {
    assert.equal(createHash('sha256').update(await fs.readFile(path.join(dist, name))).digest('hex'), expected, name);
  }
  const zip = path.join(dist, 'fp400-app.zip');
  const outer = path.join(dist, 'FP400-Startpaket.zip');
  const outerNames = execFileSync('unzip', ['-Z1', outer], { encoding: 'utf8' }).trim().split('\n');
  assert.deepEqual(outerNames.sort(), [...Object.keys(sums), 'SHA256SUMS.json'].sort());
  const report = execFileSync('unzip', ['-p', outer, 'PRUEFSTAND.md'], { encoding: 'utf8' });
  assert.match(report, /Sitztest mit einer echten Person – bestanden/);
  for (const [, image] of report.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    assert.ok(outerNames.includes(image), image);
    const bytes = execFileSync('unzip', ['-p', outer, image]);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sums[image], image);
    assert.deepEqual(bytes, await fs.readFile(path.join(root, image)), image);
  }
  const names = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes('fp400_setup/integration/aqara_fp400/config_flow.py'));
  assert.ok(names.includes('fp400_setup/server/public/index.html'));
  for (const name of names) {
    assert.ok(name.startsWith('fp400_setup/') && !name.includes('..'));
    assert.ok(!/(__pycache__|\.pyc$|\.storage|backups\/|options\.json$)/.test(name), name);
  }
  const script = await fs.readFile(path.join(dist, 'fp400-installieren.sh'), 'utf8');
  assert.ok(script.includes(sums['fp400-app.zip']));
  assert.ok(!script.includes('__ARCHIVE_SHA256__'));
  execFileSync('sh', ['-n', path.join(dist, 'fp400-installieren.sh')]);
});

test('1.4 release archive includes both cards, current manifests and the complete new guides',async()=>{
  const zip=path.join(dist,'fp400-app.zip'),outer=path.join(dist,'FP400-Startpaket.zip');
  const get=(archive,name)=>execFileSync('unzip',['-p',archive,name],{encoding:'utf8'});
  const frontend=get(zip,'fp400_setup/integration/aqara_fp400/www/aqara-fp400-zone-card.js');
  assert.equal(frontend,await fs.readFile('custom_components/aqara_fp400/www/aqara-fp400-zone-card.js','utf8'));
  assert.match(frontend,/aqara-fp400-floorplan-card/);assert.match(frontend,/fp400-floorplan-test-v5/);
  assert.equal(JSON.parse(get(zip,'fp400_setup/integration/aqara_fp400/manifest.json')).version,'1.4.1');
  assert.match(get(zip,'fp400_setup/config.yaml'),/version: "0\.2\.2"/);
  for(const name of ['docs/grundriss.md','docs/radar-raumausschnitt.md'])assert.equal(get(outer,name),await fs.readFile(name,'utf8'));
  assert.match(get(outer,'ANLEITUNG.md'),/Grundriss und Raumausschnitt/);
});

test('bootstrap installs only local app, reloads catalog and refuses overwrite', async t => {
  const sandbox = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fp400-bootstrap-')));
  t.after(() => fs.rm(sandbox, { recursive: true, force: true }));
  const apps = path.join(sandbox, 'local_apps'), bin = path.join(sandbox, 'bin');
  await fs.mkdir(apps); await fs.mkdir(bin);
  await fs.copyFile(path.join(dist, 'fp400-app.zip'), path.join(sandbox, 'fp400-app.zip'));
  const original = await fs.readFile(path.join(dist, 'fp400-installieren.sh'), 'utf8');
  // Redirect only the mount points in this test copy; shipped installer has fixed HA paths.
  const script = original.replaceAll('/local_apps', apps).replaceAll('/addons', path.join(sandbox, 'absent-addons'));
  const scriptPath = path.join(sandbox, 'fp400-installieren.sh');
  await fs.writeFile(scriptPath, script);
  const curl = path.join(bin, 'curl');
  await fs.writeFile(curl, '#!/bin/sh\nprintf "%s\\n" "$@" >> "$FP400_TEST_LOG"\n'); await fs.chmod(curl, 0o755);
  const log = path.join(sandbox, 'calls');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, SUPERVISOR_TOKEN: 'test-only', FP400_TEST_LOG: log };
  const first = execFileSync('sh', [scriptPath], { env, encoding: 'utf8' });
  assert.match(first, /Fertig/);
  const target = path.join(apps, 'fp400_setup');
  await fs.writeFile(path.join(target, 'USER-CHANGE'), 'preserve');
  const second = execFileSync('sh', [scriptPath], { env, encoding: 'utf8' });
  assert.match(second, /keine Dateien überschrieben/);
  assert.equal(await fs.readFile(path.join(target, 'USER-CHANGE'), 'utf8'), 'preserve');
  assert.deepEqual((await fs.readdir(apps)).sort(), ['fp400_setup']);
  const calls = await fs.readFile(log, 'utf8');
  assert.equal(calls.match(/http:\/\/supervisor\/store\/reload/g).length, 2);
  assert.ok(!calls.includes('/restart') && !calls.includes('/stop'));
  await fs.appendFile(path.join(sandbox, 'fp400-app.zip'), 'corruption');
  assert.throws(() => execFileSync('sh', [scriptPath], { env, stdio: 'pipe' }), /Dateiprüfung fehlgeschlagen/);
  assert.equal((await fs.readFile(log, 'utf8')), calls);
});
