import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

async function cardClasses() {
  const classes = new Map();
  const context = { HTMLElement: class { dispatchEvent(e) { this.event = e; } },
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    customElements: { define: (name, cls) => classes.set(name, cls) }, window: {},
    document: { createElement: name => new (classes.get(name))() } };
  vm.runInNewContext(await fs.readFile('custom_components/aqara_fp400/www/aqara-fp400-zone-card.js', 'utf8'), context);
  return { Card: classes.get('aqara-fp400-zone-card'), Editor: classes.get('aqara-fp400-zone-card-editor'), context };
}

function fixture() {
  return { states: {
    'sensor.wohnzimmer_zonen_2': { attributes: { zones: [], grid_rows: 20 } },
    'sensor.wohnzimmer_personen': { attributes: { targets: [], live_tracking: true } },
    'sensor.wohnzimmer_bereiche': { attributes: { regions: {}, grid_rows: 20 } },
    'sensor.fremde_personen': { attributes: { targets: [], live_tracking: true } },
  }, entities: {
    'sensor.wohnzimmer_zonen_2': { device_id: 'living' },
    'sensor.wohnzimmer_personen': { device_id: 'living' },
    'sensor.wohnzimmer_bereiche': { device_id: 'living' },
    'sensor.fremde_personen': { device_id: 'other' },
  } };
}

test('card picker and editor use translated/renamed sensors of the same device', async () => {
  const { Card, context } = await cardClasses();
  const config = Card.getStubConfig(fixture());
  assert.equal(config.entity, 'sensor.wohnzimmer_zonen_2');
  assert.equal(config.targets_entity, 'sensor.wohnzimmer_personen');
  assert.equal(config.regions_entity, 'sensor.wohnzimmer_bereiche');
  assert.ok(Card.getConfigElement());
  assert.equal(context.window.customCards[0].preview, true);
});

test('automatic mapping refuses ambiguous targets and multiple FP400 defaults', async () => {
  const { Card } = await cardClasses();
  const hass = fixture();
  hass.entities['sensor.fremde_personen'].device_id = 'living';
  assert.equal(Card.getStubConfig(hass).targets_entity, undefined);
  hass.states['sensor.andere_zonen'] = { attributes: { zones: [], grid_rows: 20 } };
  assert.equal(Card.getStubConfig(hass).entity, undefined);
  assert.equal(Card.getStubConfig({ states: {} }).entity, undefined);
});

test('editor changes emit full config and changing device clears old companion sensors', async () => {
  const { Editor } = await cardClasses();
  const editor = new Editor(); editor._render = () => {};
  editor.hass = fixture();
  editor.setConfig({ entity: 'sensor.old', targets_entity: 'sensor.old_targets', title: 'Mein Radar', grid_options: { columns: 6 } });
  editor._change('entity', 'sensor.wohnzimmer_zonen_2');
  assert.equal(editor.event.type, 'config-changed');
  assert.equal(editor.event.composed, true);
  assert.equal(editor.event.bubbles, true);
  assert.equal(editor.event.detail.config.targets_entity, 'sensor.wohnzimmer_personen');
  assert.equal(editor.event.detail.config.grid_options.columns, 6);
  editor._change('entity', 'sensor.no_match');
  assert.equal(editor.event.detail.config.targets_entity, undefined);
  assert.equal(editor.event.detail.config.regions_entity, undefined);
  assert.equal(editor.event.detail.config.title, 'Mein Radar');
});

test('existing cards resolve companion sensors by device while explicit selection wins', async () => {
  const { Card } = await cardClasses();
  const card = new Card(); card._hass = fixture();
  card._config = { entity: 'sensor.wohnzimmer_zonen_2' };
  assert.equal(card._targetsEntity(), 'sensor.wohnzimmer_personen');
  assert.equal(card._regionsEntity(), 'sensor.wohnzimmer_bereiche');
  card._config.targets_entity = 'sensor.manual';
  assert.equal(card._targetsEntity(), 'sensor.manual');
  card._config = {};
  assert.equal(card._targetsEntity(), undefined);
});

async function files(root) {
  const result = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    if (entry.isDirectory()) result.push(...(await files(path.join(root, entry.name))).map(p => path.join(entry.name, p)));
    else result.push(entry.name);
  }
  return result.sort();
}
test('picker preview cannot write zones or regions to a real sensor', async () => {
  const { Card } = await cardClasses();
  const card = new Card(); card.preview = true;
  const error = { textContent: '' };
  card.shadowRoot = { querySelector: () => error };
  card._hass = { callService() { assert.fail('preview must not call a service'); } };
  assert.equal(await card._runService('set_zones', {}), false);
  assert.equal(await card._runService('remove_target', { target_id: 1 }), false);
  assert.match(error.textContent, /Vorschau/);
});

test('forget requires confirmation and keeps selection on failure', async () => {
  const { Card, context } = await cardClasses();
  const element = () => ({ children: [], appendChild(x) { this.children.push(x); }, addEventListener(k, fn) { this[k] = fn; } });
  context.document.createElement = element;
  const card = new Card(); card._forget = 7; card._render = () => {};
  let calls = 0;
  card._runService = async (service, data) => { calls++; assert.equal(service, 'remove_target'); assert.equal(data.target_id, 7); return false; };
  const panel = element(); card._forgetPanel(panel);
  assert.equal(calls, 0);
  const [cancel, confirm] = panel.children[0].children;
  await confirm.click(); assert.equal(calls, 1); assert.equal(card._forget, 7);
  cancel.click(); assert.equal(card._forget, null); assert.equal(calls, 1);
  card._forget = 7; card._runService = async () => true;
  await confirm.click(); assert.equal(card._forget, null);
});

test('forget is disabled in preview and missing device cannot call service', async () => {
  const { Card, context } = await cardClasses();
  const element = () => ({ children: [], appendChild(x) { this.children.push(x); }, addEventListener() {} });
  context.document.createElement = element;
  const card = new Card(); card._forget = 1; card.preview = true;
  const panel = element(); card._forgetPanel(panel);
  assert.equal(panel.children[0].children[1].disabled, true);
  card.preview = false; card._config = { entity: 'sensor.missing' };
  card._hass = { entities: {}, callService() { assert.fail('no device'); } };
  card.shadowRoot = { querySelector: () => ({ textContent: '' }) };
  assert.equal(await card._runService('remove_target', { target_id: 1 }), false);
});

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
