import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Installer, compareVersions, digestTree } from '../fp400_setup/server/install.mjs';
import { createWizard } from '../fp400_setup/server/http.mjs';

async function fixture(t, installedVersion) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fp400-overview-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const config = path.join(root, 'config'), source = path.join(root, 'source');
  await fs.mkdir(config); await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'manifest.json'), JSON.stringify({ version: '1.3.0' }));
  const installer = new Installer(config, source);
  if (installedVersion !== undefined) {
    await fs.mkdir(installer.target, { recursive: true });
    await fs.writeFile(path.join(installer.target, 'manifest.json'), JSON.stringify({ version: installedVersion }));
    await fs.writeFile(path.join(installer.target, 'local.py'), '# preserve');
  }
  return { installer, config, source };
}
test('newer HACS integration cannot be downgraded and status performs no writes', async t => {
  const { installer, config } = await fixture(t, '1.4.0');
  const before = await digestTree(config);
  const status = await installer.status();
  assert.equal(status.relation, 'newer');
  assert.equal(status.installed, false);
  assert.equal(status.installedVersion, '1.4.0');
  assert.equal(status.bundledVersion, '1.3.0');
  assert.equal(status.availableVersion, null);
  assert.equal(status.canInstall, false);
  await assert.rejects(installer.install(), /integration_downgrade/);
  assert.equal(await digestTree(config), before);
  assert.deepEqual(await fs.readdir(config), ['custom_components']);
});
test('unknown installed version is honest and cannot be replaced', async t => {
  const { installer, config } = await fixture(t, null);
  const before = await digestTree(config);
  const status = await installer.status();
  assert.equal(status.installedVersion, null);
  assert.equal(status.relation, 'unknown');
  assert.equal(status.canInstall, false);
  await assert.rejects(installer.install(), /integration_version_unknown/);
  assert.equal(await digestTree(config), before);
});
test('same version with different files is distinguished from exact bundled install', async t => {
  const { installer } = await fixture(t, '1.3.0');
  assert.equal((await installer.status()).relation, 'different');
  assert.equal((await installer.install()).changed, true);
  assert.equal((await installer.status()).relation, 'same');
});
test('older integration can be explicitly upgraded and version ordering is numeric', async t => {
  assert.equal(compareVersions('1.10.0', '1.3.0'), 1);
  assert.equal(compareVersions('2.0.0-beta', '1.3.0'), null);
  const { installer } = await fixture(t, '1.2.0');
  assert.equal((await installer.status()).relation, 'older');
  assert.equal((await installer.install()).changed, true);
  assert.equal((await installer.status()).installedVersion, '1.3.0');
});
test('fresh status is read only and does not invent installed or available version', async t => {
  const { installer, config } = await fixture(t);
  const status = await installer.status();
  assert.equal(status.relation, 'absent');
  assert.equal(status.installedVersion, null);
  assert.equal(status.availableVersion, null);
  assert.deepEqual(await fs.readdir(config), []);
});

test('HACS update during staging is preserved and installation stops', async t => {
  const { installer } = await fixture(t, '1.2.0');
  const copy = fs.cp;
  t.mock.method(fs, 'cp', async (...args) => {
    await copy(...args);
    await fs.writeFile(path.join(installer.target, 'manifest.json'), JSON.stringify({ version: '1.4.0' }));
  });
  await assert.rejects(installer.install(), /integration_changed/);
  assert.equal((await installer.status()).installedVersion, '1.4.0');
  assert.deepEqual(await fs.readdir(path.dirname(installer.target)), ['aqara_fp400']);
});

test('HACS update during journal creation is restored before bundled integration can commit', async t => {
  const { installer } = await fixture(t, '1.2.0');
  const open = fs.open;
  let updated = false;
  t.mock.method(fs, 'open', async (file, ...args) => {
    if (String(file).startsWith(`${installer.journal}.`) && String(file).endsWith('.tmp')) {
      updated = true;
      await fs.writeFile(path.join(installer.target, 'manifest.json'), JSON.stringify({ version: '1.4.0' }));
      await fs.writeFile(path.join(installer.target, 'hacs-update.py'), '# newer HACS release');
    }
    return open(file, ...args);
  });
  await assert.rejects(installer.install(), /integration_changed/);
  assert.equal(updated, true);
  assert.equal((await installer.status()).installedVersion, '1.4.0');
  assert.equal(await fs.readFile(path.join(installer.target, 'hacs-update.py'), 'utf8'), '# newer HACS release');
  assert.equal(await fs.readFile(path.join(installer.target, 'local.py'), 'utf8'), '# preserve');
  assert.deepEqual(await fs.readdir(path.dirname(installer.target)), ['aqara_fp400']);
  await assert.rejects(fs.access(installer.journal), { code: 'ENOENT' });
  assert.equal(installer.busy, false);
});

async function serve(t, options) {
  const server = createWizard({ allowAddress: () => true, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return async () => (await fetch(`http://127.0.0.1:${server.address().port}/api/state`)).json();
}
test('paired offline sensor defaults to overview and controller outage preserves known pairing', async t => {
  const { installer } = await fixture(t);
  let ready = true;
  const read = await serve(t, { installer, controllerReady: () => ready,
    appVersion: '0.2.0', pairer: { state: { phase: 'idle' }, nodes: async () => [{ available: false }] } });
  const offline = await read();
  assert.equal(offline.defaultView, 'overview');
  assert.equal(offline.paired, true);
  assert.equal(offline.available, false);
  assert.equal(offline.appVersion, '0.2.0');
  assert.equal(offline.availableAppVersion, null);
  ready = false;
  const unavailable = await read();
  assert.equal(unavailable.defaultView, 'overview');
  assert.equal(unavailable.paired, true);
  assert.equal(unavailable.available, null);
});
test('unknown controller state never presents a fresh pairing requirement or fabricated versions', async t => {
  const { installer } = await fixture(t);
  const read = await serve(t, { installer, controllerReady: () => false,
    pairer: { state: { phase: 'idle' }, nodes: async () => { throw new Error('offline'); } } });
  const state = await read();
  assert.equal(state.defaultView, 'overview');
  assert.equal(state.paired, null);
  assert.equal(state.available, null);
  assert.equal(state.appVersion, null);
});
test('confirmed unpaired controller defaults to setup', async t => {
  const { installer } = await fixture(t);
  const read = await serve(t, { installer, controllerReady: () => true,
    pairer: { state: { phase: 'idle' }, nodes: async () => [] } });
  assert.equal((await read()).defaultView, 'setup');
});
