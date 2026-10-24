import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runMigration } from '../fp400_setup/server/migrate.mjs';

async function fixture(t) {
  // macOS /var is a symlink; use the canonical temporary parent.
  const root = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'fp400-migrate-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const target = path.join(root, 'target');
  const transferRoot = path.join(root, 'shared', 'fp400-migration');
  await fs.mkdir(path.join(source, 'matter', 'empty'), { recursive: true });
  await fs.mkdir(target);
  await fs.writeFile(path.join(source, 'matter', 'fabric.json'), '{"secret":"fabric"}');
  await fs.writeFile(path.join(source, 'options.json'), 'private-options');
  const exportData = () => runMigration({ mode: 'export', dataRoot: source, transferRoot });
  const importData = () => runMigration({ mode: 'import', dataRoot: target, transferRoot });
  const editManifest = async edit => {
    const file = path.join(transferRoot, 'manifest.json');
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    edit(value);
    await fs.writeFile(file, JSON.stringify(value));
  };
  return { root, source, target, transferRoot, exportData, importData, editManifest };
}

test('export/import preserves fabric and empty directories, excludes options, and is idempotent', async t => {
  const f = await fixture(t);
  assert.equal((await f.exportData()).exported, true);
  assert.deepEqual((await fs.readdir(f.transferRoot)).sort(), ['manifest.json', 'matter']);
  assert.equal((await fs.stat(f.transferRoot)).mode & 0o777, 0o700);
  assert.equal((await fs.stat(path.join(f.transferRoot, 'matter', 'fabric.json'))).mode & 0o777, 0o600);
  assert.equal((await f.importData()).imported, true);
  assert.equal(await fs.readFile(path.join(f.target, 'matter', 'fabric.json'), 'utf8'), '{"secret":"fabric"}');
  assert.deepEqual(await fs.readdir(path.join(f.target, 'matter', 'empty')), []);
  assert.equal((await f.importData()).alreadyImported, true);
  assert.equal(await fs.readFile(path.join(f.source, 'options.json'), 'utf8'), 'private-options');
  await assert.rejects(f.exportData, /already exists/);
  await fs.access(path.join(f.source, 'matter', 'fabric.json'));
  await fs.access(path.join(f.transferRoot, 'matter', 'fabric.json'));
});

test('accepts empty existing destination', async t => {
  const f = await fixture(t);
  await f.exportData();
  await fs.mkdir(path.join(f.target, 'matter'));
  assert.equal((await f.importData()).imported, true);
});

for (const [name, mutate] of [
  ['corrupt payload', f => fs.writeFile(path.join(f.transferRoot, 'matter', 'fabric.json'), 'corrupt')],
  ['wrong hash', f => f.editManifest(m => { m.entries.find(e => e.type === 'file').sha256 = '0'.repeat(64); })],
  ['path traversal', f => f.editManifest(m => { m.entries[0].path = '../outside'; })],
  ['absolute path', f => f.editManifest(m => { m.entries[0].path = '/outside'; })],
  ['wrong source', f => f.editManifest(m => { m.source = 'unrelated-controller'; })],
  ['invalid type', f => f.editManifest(m => { m.entries[0].type = 'symlink'; })],
  ['duplicate entry', f => f.editManifest(m => { m.entries.push(m.entries[0]); })],
  ['symlink payload', async f => {
    const file = path.join(f.transferRoot, 'matter', 'fabric.json');
    await fs.unlink(file);
    await fs.symlink(path.join(f.source, 'options.json'), file);
  }],
  ['symlink manifest', async f => {
    const file = path.join(f.transferRoot, 'manifest.json');
    await fs.rename(file, path.join(f.root, 'manifest.json'));
    await fs.symlink(path.join(f.root, 'manifest.json'), file);
  }],
]) {
  test(`rejects ${name} without creating destination or leaving staging`, async t => {
    const f = await fixture(t);
    await f.exportData();
    await mutate(f);
    await assert.rejects(f.importData);
    assert.deepEqual(await fs.readdir(f.target), []);
    assert.deepEqual(await fs.readdir(path.dirname(f.transferRoot)), ['fp400-migration']);
  });
}

test('rejects a different nonempty destination and preserves it', async t => {
  const f = await fixture(t);
  await f.exportData();
  await fs.mkdir(path.join(f.target, 'matter'));
  await fs.writeFile(path.join(f.target, 'matter', 'fabric.json'), 'existing-fabric');
  await assert.rejects(f.importData);
  assert.equal(await fs.readFile(path.join(f.target, 'matter', 'fabric.json'), 'utf8'), 'existing-fabric');
  assert.deepEqual(await fs.readdir(f.target), ['matter']);
});

test('export rejects source symlinks and leaves no transfer', async t => {
  const f = await fixture(t);
  await fs.symlink(path.join(f.source, 'options.json'), path.join(f.source, 'matter', 'link'));
  await assert.rejects(f.exportData, /Symlinks/);
  assert.deepEqual(await fs.readdir(path.dirname(f.transferRoot)), []);
});

test('rejects symlinked destination ancestor', async t => {
  const f = await fixture(t);
  await f.exportData();
  const link = path.join(f.root, 'linked-target');
  await fs.symlink(f.target, link);
  await assert.rejects(runMigration({ mode: 'import', dataRoot: link, transferRoot: f.transferRoot }));
  assert.deepEqual(await fs.readdir(f.target), []);
});

test('copy failure removes staging and preserves empty destination and transfer', async t => {
  const f = await fixture(t);
  await f.exportData();
  await fs.mkdir(path.join(f.target, 'matter'));
  const write = fs.writeFile;
  t.mock.method(fs, 'writeFile', async (file, ...args) => {
    if (String(file).includes('.matter-import-')) throw new Error('Injected copy failure');
    return write.call(fs, file, ...args);
  });
  await assert.rejects(f.importData, /Injected copy failure/);
  assert.deepEqual(await fs.readdir(f.target), ['matter']);
  assert.deepEqual(await fs.readdir(path.join(f.target, 'matter')), []);
  assert.deepEqual(await fs.readdir(path.dirname(f.transferRoot)), ['fp400-migration']);
  assert.equal(await fs.readFile(path.join(f.transferRoot, 'matter', 'fabric.json'), 'utf8'), '{"secret":"fabric"}');
});

test('export copy failure removes partial transfer and preserves source', async t => {
  const f = await fixture(t);
  const write = fs.writeFile;
  t.mock.method(fs, 'writeFile', async (file, ...args) => {
    if (String(file).includes('.stage-')) throw new Error('Injected export failure');
    return write.call(fs, file, ...args);
  });
  await assert.rejects(f.exportData, /Injected export failure/);
  assert.deepEqual(await fs.readdir(path.dirname(f.transferRoot)), []);
  assert.equal(await fs.readFile(path.join(f.source, 'matter', 'fabric.json'), 'utf8'), '{"secret":"fabric"}');
});

test('none does no filesystem work; invalid mode fails closed', async () => {
  assert.deepEqual(await runMigration({ mode: 'none', dataRoot: '/nonexistent' }), { exported: false, imported: false });
  await assert.rejects(runMigration({ mode: 'invalid' }));
});
