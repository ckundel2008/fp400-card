import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

async function cardClasses() {
  const classes = new Map();
  const context = { HTMLElement: class { dispatchEvent(e) { this.event = e; } },
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    customElements: { get: name => classes.get(name), define: (name, cls) => classes.set(name, cls) }, window: {}, setTimeout, clearTimeout, setInterval, clearInterval,
    document: { createElement: name => new (classes.get(name))() } };
  vm.runInNewContext(await fs.readFile('custom_components/aqara_fp400/www/aqara-fp400-zone-card.js', 'utf8'), context);
  return { Card: classes.get('aqara-fp400-zone-card'), Editor: classes.get('aqara-fp400-zone-card-editor'), context };
}

function fixture() {
  return { states: {
    'sensor.wohnzimmer_zonen_2': { attributes: { zones: [], grid_rows: 20 } },
    'sensor.wohnzimmer_personen': { attributes: { targets: [], live_tracking: true, position_received:new Date().toISOString() } },
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

test('visual editor stores numeric rotation, rejects invalid input and zero restores default',async()=>{
  const {Editor}=await cardClasses();const editor=new Editor();editor._render=()=>{};editor.hass=fixture();editor.setConfig({entity:'sensor.wohnzimmer_zonen_2',title:'Room'});
  editor._change('map_rotation','45');assert.equal(editor.event.detail.config.map_rotation,45);assert.equal(editor.event.detail.config.title,'Room');
  editor._change('map_rotation','181');assert.equal(editor._config.map_rotation,45);editor._change('map_rotation','invalid');assert.equal(editor._config.map_rotation,45);
  editor._change('map_rotation',0);assert.equal(editor.event.detail.config.map_rotation,undefined);
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

test('visual room editor preserves zero sensor coordinates and refuses invalid geometry without an event',async()=>{
  const {Editor}=await cardClasses();const editor=new Editor();editor._render=()=>{};
  editor.setConfig({entity:'sensor.zones',title:'Room',view_mode:'room',sensor_x:4});
  editor._change('sensor_x','0');assert.equal(editor.event.detail.config.sensor_x,0);
  editor._change('sensor_y','0');assert.equal(editor.event.detail.config.sensor_y,0);
  const accepted=editor.event;editor._change('sensor_x','9');assert.equal(editor.event,accepted);assert.equal(editor._config.sensor_x,0);
  editor._change('room_width','5');assert.equal(editor.event.detail.config.room_width,5);assert.equal(editor.event.detail.config.title,'Room');
  editor._change('view_mode','radar');assert.equal(editor.event.detail.config.sensor_x,0);
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

async function editableCard() {
  const {Card}=await cardClasses(); const card=new Card();card._build=()=>{};card._render=()=>{};
  card.setConfig({entity:'sensor.wohnzimmer_zonen_2'}); card._hass=fixture();
  card._hass.states[card._config.entity].attributes.zones=[{id:1,cells:[[1,1]],enabled:true,type:0}];
  card._hass.services={aqara_fp400:{set_zone_name:{}}};
  const error={textContent:''};card.shadowRoot={querySelector:()=>error};
  return {card,error};
}

test('live view, preview, offline and conflict block all area mutations',async()=>{
  const {card}=await editableCard();
  card._paintZone(20,true);card._toggleEnabled(1);card._deleteZone(1);assert.equal(card._edit,null);
  card._beginEditing();card._paintZone(20,true);assert.ok(card._edit.zones.get(1).cells.has(20));
  card._finishEdit();card.preview=true;card._beginEditing();assert.equal(card._editing,false);
  card.preview=false;card._beginEditing();card._conflict=true;card._paintZone(22,true);assert.equal(card._edit,null);
  card._conflict=false;card._hass.states[card._config.entity].state='unavailable';card._deleteZone(1);assert.equal(card._edit,null);
});

test('dirty layer change is guarded and discard never invokes a service',async()=>{
  const {card}=await editableCard();card._hass.callService=()=>assert.fail('discard is local');
  card._beginEditing();card._paintZone(20,true);card._leave('monitoring');
  assert.equal(card._mode,'zones');assert.equal(card._guard.mode,'monitoring');assert.ok(card._edit);
  card._finishEdit(card._guard.mode);assert.equal(card._mode,'monitoring');assert.equal(card._edit,null);assert.equal(card._editing,true);
  card._leave();assert.equal(card._editing,false);
});

test('save waits for actual sensor echo, not successful service response',async()=>{
  const {card}=await editableCard();card._beginEditing();card._paintZone(20,true);
  let payload;card._hass.callService=async(d,s,p)=>{payload=p;};
  await card._save();assert.ok(card._awaiting);assert.ok(card._edit);assert.equal(card._editing,true);
  card._checkState();assert.ok(card._awaiting);
  const attrs=card._hass.states[card._config.entity].attributes;attrs.zones=payload.zones;attrs.pending=true;
  card._checkState();assert.ok(card._awaiting);
  attrs.pending=false;card._checkState();assert.equal(card._editing,false);assert.equal(card._edit,null);
  card.disconnectedCallback();
});

test('sensor failure and timeout keep drafts; external writes block overwrites',async()=>{
  const {card,error}=await editableCard();card._beginEditing();card._paintZone(20,true);
  card._hass.callService=async()=>{};await card._save();
  const attrs=card._hass.states[card._config.entity].attributes;attrs.error='Sensor rejected';card._checkState();
  assert.equal(card._awaiting,null);assert.ok(card._edit);assert.equal(error.textContent,'Sensor rejected');
  attrs.error=null;await card._save();card._awaiting.deadline=0;card._checkState();assert.ok(card._edit);assert.match(error.textContent,/Keine Sensorbestätigung/);
  attrs.zones[0].cells.push([3,3]);card._checkState();assert.equal(card._conflict,true);
  card._hass.callService=()=>assert.fail('conflict must block service');await card._save();card.disconnectedCallback();
});

test('selected track disappears on missing target, disconnect or tracking off',async()=>{
  const {card}=await editableCard();const state=card._hass.states[card._targetsEntity()];
  state.attributes.targets=[{id:7}];card._forget=7;card._checkState();assert.equal(card._forget,7);
  state.attributes.targets=[];card._checkState();assert.equal(card._forget,null);
  state.attributes.targets=[{id:7}];state.attributes.live_tracking=false;card._forget=7;card._checkState();assert.equal(card._forget,null);
  state.attributes.live_tracking=true;card._forget=7;card._hass.states[card._config.entity].state='unavailable';card._checkState();assert.equal(card._forget,null);
});

test('names use central attributes and saving preserves draft on failure',async()=>{
  const {card}=await editableCard();card._hass.states[card._config.entity].attributes.zone_names={'1':'Sofa <script>'};
  assert.equal(card._zoneName(1),'Sofa <script>');assert.equal(card._zoneName(2),'Zone 2');
  card._beginEditing();card._nameDrafts[1]='Couchtisch';card._hass.callService=async()=>{throw new Error('storage failed');};
  assert.equal(await card._saveName(1,'Couchtisch'),false);assert.equal(card._nameDrafts[1],'Couchtisch');
  let data;card._hass.callService=async(d,s,p)=>{assert.equal(s,'set_zone_name');data=p;};
  assert.equal(await card._saveName(1,'  Sofa  '),true);assert.equal(data.name,'Sofa');assert.equal(data.zone_id,1);assert.equal(card._nameDrafts[1],undefined);
});

test('region draft waits for matching confirmed region and blocks target removal during editing',async()=>{
  const {card}=await editableCard();card._mode='monitoring';card._beginEditing();card._paintRegion(5,true);
  let data;card._hass.callService=async(d,s,p)=>{data=p;};await card._saveRegion();assert.ok(card._regionEdit);
  assert.equal(await card._runService('remove_target',{target_id:7}),false);
  card._hass.states[card._regionsEntity()].attributes.regions={monitoring:data.cells};card._checkState();
  assert.equal(card._regionEdit,null);assert.equal(card._editing,false);card.disconnectedCallback();
});

test('other cards pending writes lock edit entry and writes; name conflicts retain draft',async()=>{
  const {card}=await editableCard();const attrs=card._hass.states[card._config.entity].attributes;
  attrs.pending=true;card._beginEditing();assert.equal(card._editing,false);
  attrs.pending=false;attrs.zone_names={'1':'Sofa'};card._beginEditing();card._nameDrafts[1]='My sofa';
  attrs.zone_names={'1':'Other card name'};card._checkState();assert.equal(card._conflict,true);assert.equal(card._nameDrafts[1],'My sofa');
  card._hass.callService=()=>assert.fail('must not overwrite another card');assert.equal(await card._saveName(1,'My sofa'),false);
  card._finishEdit();card._beginEditing();attrs.pending=true;card._paintZone(5,true);assert.equal(card._edit,null);
});
