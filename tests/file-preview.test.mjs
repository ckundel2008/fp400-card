import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('local HTML preview never calls controller API and opens only a valid HA address', async () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { hidden: true, disabled: false, value: '', handlers: {},
      addEventListener(type, callback) { this.handlers[type] = callback; } });
    return elements.get(id);
  };
  const location = { protocol: 'file:', href: 'file:///preview/index.html' };
  const context = { document: { getElementById: get }, location, URL,
    fetch() { assert.fail('File preview must not call a backend'); },
    setInterval() { assert.fail('File preview must not poll'); } };
  const script = await fs.readFile('fp400_setup/server/public/ui.js', 'utf8');
  vm.runInNewContext(script, context);
  assert.equal(get('file-preview').hidden, false);
  assert.equal(get('backup').disabled, true);
  assert.equal(get('code').disabled, true);
  assert.match(get('connection').textContent, /Keine Verbindung/);
  get('ha-address').value = 'javascript:alert(1)'; get('open-ha').handlers.click();
  assert.equal(location.href, 'file:///preview/index.html');
  assert.match(get('ha-link-state').textContent, /http/);
  get('ha-address').value = 'http://homeassistant.local:8123'; get('open-ha').handlers.click();
  assert.equal(location.href, 'http://homeassistant.local:8123/config/app/local_fp400_setup/info');
  get('ha-address').value = 'https://example.ui.nabu.casa'; get('open-ha').handlers.click();
  assert.equal(location.href, 'https://example.ui.nabu.casa/config/app/local_fp400_setup/info');
});
