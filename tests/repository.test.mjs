import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function files(root) {
  const result = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    if (entry.isDirectory()) result.push(...(await files(path.join(root, entry.name))).map(p => path.join(entry.name, p)));
    else result.push(entry.name);
  }
  return result.sort();
}
test('HACS integration and app-bundled integration are identical', async () => {
  const canonical = 'custom_components/aqara_fp400';
  const bundled = 'fp400_setup/integration/aqara_fp400';
  const names = await files(canonical);
  assert.deepEqual(names, await files(bundled));
  for (const name of names) assert.deepEqual(await fs.readFile(path.join(canonical, name)), await fs.readFile(path.join(bundled, name)), name);
  const manifest = JSON.parse(await fs.readFile(`${canonical}/manifest.json`));
  assert.equal(manifest.domain, 'aqara_fp400');
  assert.equal(manifest.documentation, 'https://github.com/ckundel2008/fp400-card');
  assert.deepEqual(manifest.codeowners, ['@ckundel2008']);
  assert.deepEqual(await fs.readdir('custom_components'), ['aqara_fp400']);
  const brand = await fs.readFile(`${canonical}/brand/icon.png`);
  assert.equal(brand.subarray(1, 4).toString(), 'PNG');
});
