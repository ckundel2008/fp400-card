import {test} from 'node:test';
import assert from 'node:assert/strict';
class Node {
  constructor(tag='node'){this.tag=tag;this.children=[];this.attrs={};this.style={};this.handlers={};this.events=[];this.isConnected=true;this._text='';}
  append(...nodes){this.children.push(...nodes);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(k,fn){this.handlers[k]=fn;}
  replaceChildren(...nodes){this.children=nodes;this.replacements=(this.replacements??0)+1;}
  attachShadow(){return this.shadowRoot=new Node('shadow');}
  dispatchEvent(event){this.events.push(event);this.handlers[event.type]?.(event);return true;}
  querySelector(selector){return walk(this).find(n=>selector==='.error'?n.attrs.class==='error':n.tag===selector)??null;}
  set textContent(v){this._text=v;this.children=[];}
  get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
}
function walk(node){return [node,...node.children.flatMap(walk)];}
class StaleCard extends Node {}
class StaleEditor extends Node {}
// Simulate a Companion session that retains registrations from test.3/4.
const registry=new Map([['fp400-floorplan-test',StaleCard],['fp400-floorplan-test-editor',StaleEditor]]);
globalThis.HTMLElement=Node;globalThis.CustomEvent=class {constructor(type,options){this.type=type;Object.assign(this,options);}};
globalThis.customElements={get:n=>registry.get(n),define:(n,c)=>registry.set(n,c)};
globalThis.window={};globalThis.document={createElement:n=>registry.has(n)?new (registry.get(n))():new Node(n),createElementNS:(_ns,n)=>new Node(n)};
const {FP400FloorplanEditor,FP400FloorplanTest}=await import('../card.js');
const {CARD_TAG,EDITOR_TAG,TYPE}=await import('../model.mjs');
const config=()=>({sensors:[{entity:'sensor.people',zones_entity:'sensor.zones',name:'Sofa',x:5,y:5}],plan:{width_m:12,height_m:8}});
const hass={states:{'sensor.people':{state:'1',attributes:{targets:[{id:1,x:10,y:20}],position_received:new Date().toISOString(),live_tracking:true}}},callService(){assert.fail('No HA service may be called');}};
const make=()=>{const e=new FP400FloorplanEditor();e.setConfig(config());e.hass=hass;return e;};
const click=(e,label)=>{const n=walk(e.shadowRoot).find(n=>n.tag==='button'&&n.textContent===label);assert.ok(n,`missing button ${label}`);assert.ok(!n.disabled,`disabled button ${label}`);n.handlers.click();};
test('editor is locked until explicit edit and cancel causes no configuration events',()=>{
  const e=make();assert.equal(e.session.draft,null);click(e,'Grundriss bearbeiten');e._point({x:4,y:3});assert.equal(e.session.draft.sensors[0].x,4);
  click(e,'Abbrechen');assert.equal(e.session.current.sensors[0].x,5);assert.equal(e.events.length,0);
});
test('only explicit apply emits config-changed and retains original entity IDs',()=>{
  const e=make();click(e,'Grundriss bearbeiten');e._point({x:3,y:2});click(e,'Entwurf übernehmen');assert.equal(e.events.length,1);
  assert.equal(e.events[0].type,'config-changed');assert.equal(e.events[0].detail.config.sensors[0].entity,'sensor.people');assert.equal(e.events[0].detail.config.sensors[0].x,3);
});
test('live state updates do not overwrite pending sensor placement',()=>{
  const e=make();e._begin();e._point({x:3,y:2});e.hass={...hass};assert.equal(e.session.draft.sensors[0].x,3);assert.equal(e.events.length,0);
});
test('invalid draft cannot be applied and displays a visible error',()=>{
  const e=make();e._begin();e.session.draft.plan.width_m=-1;e._save();assert.equal(e.events.length,0);assert.match(e.shadowRoot.querySelector('.error').textContent,/Grundrissbreite/);
});
test('external config change disables apply, cancel adopts external config',()=>{
  const e=make();e._begin();e.setConfig({...config(),title:'External'});assert.equal(e.session.conflict,true);e._save();assert.equal(e.events.length,0);e._cancel();assert.equal(e.session.current.title,'External');
});
test('device mismatch cannot be saved',()=>{
  const e=make();e._begin();e.hass={...hass,entities:{'sensor.people':{device_id:'a'},'sensor.zones':{device_id:'b'}}};e._save();assert.equal(e.events.length,0);assert.match(e.shadowRoot.querySelector('.error').textContent,/verschiedenen Geräten/);
});
test('pending image decode cannot resurrect a cancelled or newer draft',async()=>{
  const e=make();e._begin();let resolve,closed=false;globalThis.createImageBitmap=()=>new Promise(r=>resolve=r);
  const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);bytes.set([73,72,68,82],12);const header=new DataView(bytes.buffer);header.setUint32(16,100);header.setUint32(20,80);
  const pending=e._upload({type:'image/png',size:100,arrayBuffer:async()=>bytes.buffer});await Promise.resolve();e._cancel();e._begin();
  const original=document.createElement;document.createElement=tag=>tag==='canvas'?{getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,AAAA'}:original(tag);
  resolve({width:100,height:80,close(){closed=true;}});await pending;document.createElement=original;
  assert.equal(e.session.draft.plan.image,'');assert.equal(closed,true);
});
test('unapplied calibration cannot silently be discarded by Apply',()=>{
  const e=make();e._begin();click(e,'Zwei-Punkt-Kalibrierung');e._point({x:2,y:2});e._save();assert.equal(e.events.length,0);assert.match(e.shadowRoot.querySelector('.error').textContent,/Kalibrierung zuerst/);
});
test('text from config is inserted as text and no user input becomes HTML markup',()=>{
  const c=new FP400FloorplanTest();c.setConfig({...config(),title:'<img src=x onerror=alert(1)>'});c.hass=hass;
  assert.ok(walk(c.shadowRoot).some(n=>n.tag==='h2'&&n.textContent==='<img src=x onerror=alert(1)>'));
  assert.ok(!walk(c.shadowRoot).some(n=>n.tag==='img'));
});
test('runtime card never enables placement or writes config by default',()=>{
  const c=new FP400FloorplanTest();c.setConfig(config());c.hass=hass;
  const map=walk(c.shadowRoot).find(n=>n.tag==='svg');assert.equal(map.handlers.click,undefined);assert.equal(c.events.length,0);
});
test('cropped images have their own plan-sized clipping viewport even inside letterboxed SVGs',()=>{
  const c=new FP400FloorplanTest();c.setConfig({...config(),plan:{width_m:8,height_m:10.24,image:'data:image/jpeg;base64,AAAA',image_crop:{x:.4,y:.1,width:.4,height:.3}}});
  const viewport=walk(c.shadowRoot).find(n=>n.tag==='svg'&&n.children.some(child=>child.tag==='image'));
  assert.ok(viewport);assert.equal(viewport.attrs.width,'8');assert.equal(viewport.attrs.height,'10.24');assert.equal(viewport.attrs.overflow,'hidden');assert.equal(viewport.attrs.viewBox,'0 0 8 10.24');
});
test('500 irrelevant HA updates and idle timer ticks do not rebuild the SVG or background',()=>{
  const c=new FP400FloorplanTest();c.setConfig(config());c.hass=hass;const count=c.shadowRoot.replacements;
  for(let i=0;i<500;i++){c.hass={...hass,states:{...hass.states,'sensor.unrelated':{state:String(i)}}};c._render();}
  assert.equal(c.shadowRoot.replacements,count);
});
test('relevant positions and freshness boundaries still rebuild after idle suppression',()=>{
  const original=Date.now;let now=Date.parse('2026-10-25T12:00:00Z');Date.now=()=>now;
  try{
    const h={states:{'sensor.people':{state:'1',attributes:{targets:[{id:1,x:10,y:20}],position_received:new Date(now).toISOString(),live_tracking:true}}}};
    const c=new FP400FloorplanTest();c.setConfig(config());c.hass=h;const count=c.shadowRoot.replacements;
    h.states['sensor.people'].attributes.targets[0].x=50;c.hass=h;assert.equal(c.shadowRoot.replacements,count+1);
    now+=15001;c._render();assert.equal(c.shadowRoot.replacements,count+2);assert.match(c.shadowRoot.textContent,/älter als 15 s/);
  }finally{Date.now=original;}
});
test('Apply is blocked while a selected floorplan upload is still pending',async()=>{
  const e=make();e._begin();let finish;const waiting=new Promise(r=>finish=r);
  const pending=e._upload({type:'image/png',size:100,arrayBuffer:()=>waiting});e._save();
  try{assert.equal(e.events.length,0);assert.match(e.shadowRoot.querySelector('.error').textContent,/Bild.*geladen|Bild.*verarbeitet/);}
  finally{e._cancel();finish(new ArrayBuffer(0));await pending.catch(()=>{});}
});
test('the latest selected upload wins even when the previous bitmap finishes first',async()=>{
  const e=make();e._begin();e.session.draft.sensors[0].y=2;const resolvers={};const originalBitmap=globalThis.createImageBitmap,originalCreate=document.createElement;
  const png=(width)=>{const b=new Uint8Array(24);b.set([137,80,78,71,13,10,26,10]);b.set([73,72,68,82],12);const d=new DataView(b.buffer);d.setUint32(16,width);d.setUint32(20,80);return b.buffer;};
  globalThis.createImageBitmap=file=>new Promise(r=>resolvers[file.label]=r);
  let drawn;document.createElement=tag=>tag==='canvas'?{getContext:()=>({fillRect(){},drawImage(bitmap){drawn=bitmap.label;}}),toDataURL:()=>`data:image/jpeg;base64,${drawn==='B'?'BBBB':'AAAA'}`} : originalCreate(tag);
  try{
    const a=e._upload({label:'A',type:'image/png',size:100,arrayBuffer:async()=>png(100)});await Promise.resolve();
    const b=e._upload({label:'B',type:'image/png',size:100,arrayBuffer:async()=>png(200)});await Promise.resolve();
    resolvers.A({label:'A',width:100,height:80,close(){}});await a;assert.equal(e._uploading,true);
    resolvers.B({label:'B',width:200,height:80,close(){}});await b;
    assert.equal(e.session.draft.plan.image,'data:image/jpeg;base64,BBBB');assert.equal(e._uploading,false);assert.equal(e.events.length,0);
  }finally{globalThis.createImageBitmap=originalBitmap;document.createElement=originalCreate;}
});
test('fresh heartbeat alone does not redraw but changing image, zones or pairing does',()=>{
  const stamp=new Date().toISOString();const h={entities:{'sensor.people':{device_id:'a'},'sensor.zones':{device_id:'a'}},states:{
    'sensor.people':{state:'1',attributes:{targets:[{id:1,x:10,y:20}],position_received:stamp,live_tracking:true}},
    'sensor.zones':{state:'1',attributes:{grid_cols:16,grid_rows:20,zones:[{id:1,cells:[[0,0,7]]}]}}
  }};
  const c=new FP400FloorplanTest();c.setConfig(config());c.hass=h;let count=c.shadowRoot.replacements;
  h.states['sensor.people'].attributes.position_received=new Date(Date.now()+100).toISOString();c.hass=h;assert.equal(c.shadowRoot.replacements,count);
  h.states['sensor.zones'].attributes.zones[0].cells=[[0,0]];c.hass=h;assert.equal(c.shadowRoot.replacements,++count);
  h.entities['sensor.zones'].device_id='b';c.hass=h;assert.equal(c.shadowRoot.replacements,++count);assert.match(c.shadowRoot.textContent,/verschiedenen Geräten/);
  c.setConfig({...config(),plan:{...config().plan,image:'data:image/png;base64,AAAA'}});assert.equal(c.shadowRoot.replacements,++count);
});
test('invalid draft plus Add sensor reports the validation error without an uncaught event error',()=>{
  const e=make();e._begin();e.hass={states:{...hass.states,'sensor.second':{state:'0',attributes:{targets:[],live_tracking:true}}}};
  e._render();e.session.draft.plan.width_m=-1;assert.doesNotThrow(()=>click(e,'FP400 hinzufügen'));assert.match(e.shadowRoot.querySelector('.error').textContent,/Grundrissbreite/);assert.equal(e.events.length,0);
});
test('closing or leaving calibration releases references to detached editor controls',()=>{
  const e=make();e._begin();click(e,'Zwei-Punkt-Kalibrierung');assert.ok(e._measurement);assert.ok(e._saveButton);
  click(e,'Sensor per Klick platzieren');assert.equal(e._measurement,null);e._cancel();assert.equal(e._measurement,null);assert.equal(e._saveButton,null);
});
test('stable card and experimental card register together without replacing each other',async t=>{
  const fs=await import('node:fs/promises');
  try{await fs.access(new URL('../../../custom_components/aqara_fp400/www/aqara-fp400-zone-card.js',import.meta.url));}
  catch(error){if(error.code==='ENOENT'){t.skip('Stable source is not included in the independent package');return;}throw error;}
  await import('../../../custom_components/aqara_fp400/www/aqara-fp400-zone-card.js');
  assert.equal(registry.get(CARD_TAG),FP400FloorplanTest);
  assert.ok(registry.get('aqara-fp400-zone-card'));assert.notEqual(registry.get('aqara-fp400-zone-card'),FP400FloorplanTest);
  assert.ok(window.customCards.some(c=>c.type===CARD_TAG));
  assert.ok(window.customCards.some(c=>c.type==='aqara-fp400-zone-card'));
});
test('retained old registrations cannot supply the current card, editor or preview',()=>{
  assert.equal(registry.get('fp400-floorplan-test'),StaleCard);
  assert.equal(registry.get('fp400-floorplan-test-editor'),StaleEditor);
  assert.equal(registry.get(EDITOR_TAG),FP400FloorplanEditor);
  assert.ok(document.createElement(CARD_TAG) instanceof FP400FloorplanTest);
  const e=FP400FloorplanTest.getConfigElement();assert.ok(e instanceof FP400FloorplanEditor);
  e.setConfig({...config(),type:'custom:fp400-floorplan-test'});e.hass=hass;
  click(e,'Grundriss bearbeiten');assert.ok(e._preview instanceof FP400FloorplanTest);
  click(e,'Entwurf übernehmen');assert.equal(e.events[0].detail.config.type,TYPE);
});
