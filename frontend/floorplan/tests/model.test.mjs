import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {TYPE,normalizeConfig,toWorld,fromWorld,cellPolygon,sensorStatus,scene,calibrate,EditSession,imageSource,compatibleEntities,imageDimensions,imagePlacement,displayFingerprint} from '../model.mjs';
const base=()=>normalizeConfig({plan:{width_m:20,height_m:20},sensors:[{entity:'sensor.a',zones_entity:'sensor.az',x:10,y:10}]});
const now=Date.parse('2026-10-25T12:00:00Z');
const state=(age=0)=>({state:'1',attributes:{live_tracking:true,position_received:new Date(now-age).toISOString(),targets:[{id:1,x:100,y:200,activity:'still'}]}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('card defaults are isolated, have no devices and bounded dimensions',()=>{
  const c=normalizeConfig({});assert.equal(c.type,TYPE);assert.equal(c.schema_version,1);assert.deepEqual(c.sensors,[]);
});
test('HA layout and visibility settings survive normalization, editing and calibration',()=>{
  const raw={...base(),grid_options:{columns:12,rows:6},layout_options:{grid_columns:2},view_layout:{grid_area:'main'},visibility:[{condition:'user',users:['user-test']}]};
  const normalized=normalizeConfig(raw);const edited=new EditSession(normalized);edited.begin();edited.draft.title='New';const saved=edited.save();
  const scaled=calibrate(saved,{x:0,y:0},{x:4,y:0},2);
  for(const key of ['grid_options','layout_options','view_layout','visibility']){assert.deepEqual(scaled[key],raw[key]);assert.notEqual(normalized[key],raw[key]);}
});
test('image viewport displays exact source coordinates without editing the original image',()=>{
  const image='data:image/jpeg;base64,AAAA',crop={x:.4,y:.1,width:.5,height:.4};
  const c=normalizeConfig({plan:{width_m:10,height_m:8,image,image_crop:crop}}),p=imagePlacement(c.plan);
  close(p.x+crop.x*p.width,0);close(p.y+crop.y*p.height,0);
  close(p.x+(crop.x+crop.width)*p.width,10);close(p.y+(crop.y+crop.height)*p.height,8);
  const next=calibrate(c,{x:0,y:0},{x:2,y:0},4);assert.deepEqual(next.plan.image_crop,crop);assert.equal(next.plan.image,image);
  assert.deepEqual(imagePlacement(normalizeConfig({}).plan),{x:0,y:0,width:12,height:8});
});
test('invalid image windows are rejected and changing the window triggers a redraw',()=>{
  for(const crop of [null,{x:0,y:0,width:0,height:1},{x:.8,y:0,width:.4,height:1},{x:0,y:-1,width:1,height:1}])assert.throws(()=>normalizeConfig({plan:{image_crop:crop}}));
  const a=normalizeConfig({}),b=normalizeConfig({plan:{image_crop:{x:.5,y:0,width:.5,height:1}}});assert.notEqual(displayFingerprint(a,{}),displayFingerprint(b,{}));
});
test('four cardinal headings preserve the stable card handedness',()=>{
  const sensor={x:5,y:5,yaw:0};
  for(const [yaw,x,y] of [[0,4,3],[90,7,4],[180,6,7],[-90,3,6]]){
    const p=toWorld({...sensor,yaw},100,200);close(p.x,x);close(p.y,y);
  }
});
test('horizontal mirroring places asymmetric sofa and kitchen cells on the requested floorplan sides',()=>{
  const s={x:5,y:0,yaw:180,mirror_x:true};
  const centre=points=>points.reduce((sum,p)=>sum+p.x,0)/points.length;
  assert.ok(centre(cellPolygon(s,2,1))<s.x,'Sofa must be on the left of the sensor axis');
  assert.ok(centre(cellPolygon(s,8,12))>s.x,'Kitchen must be on the right of the sensor axis');
  const p=toWorld(s,100,200);close(p.x,4);close(p.y,2);
});
test('mirrored target centres and zone cells stay aligned for every orientation and inverse',()=>{
  for(const mirror_x of [false,true])for(let yaw=-180;yaw<=180;yaw+=5){
    const s={x:10,y:10,yaw,mirror_x};
    for(const [r,c] of [[0,0],[2,1],[8,12],[19,15]]){
      const rawX=(8-c-.5)*50,rawY=(r+.5)*50,p=toWorld(s,rawX,rawY),corners=cellPolygon(s,r,c),back=fromWorld(s,p);
      close(p.x,corners.reduce((a,b)=>a+b.x,0)/4);close(p.y,corners.reduce((a,b)=>a+b.y,0)/4);close(back.x,rawX);close(back.y,rawY);
    }
  }
});
test('mirroring is opt-in, survives editing and rejects ambiguous string flags',()=>{
  assert.equal(base().sensors[0].mirror_x,false);
  const c=base();c.sensors[0].mirror_x=true;const s=new EditSession(c);s.begin();const next=s.save();assert.equal(next.sensors[0].mirror_x,true);
  assert.throws(()=>normalizeConfig({sensors:[{entity:'sensor.a',mirror_x:'false'}]}));
  const p={x:5,y:5,yaw:0};assert.deepEqual(toWorld(p,100,100),toWorld({...p,mirror_x:false},100,100));
});
test('inverse conversion round trips 5913 rotations and coordinates without shifting origin',()=>{
  for(let yaw=-180;yaw<=180;yaw+=5)for(let x=-400;x<=400;x+=100)for(let y=0;y<=1000;y+=125){
    const s={x:12.25,y:7.5,yaw},p=toWorld(s,x,y),r=fromWorld(s,p);close(r.x,x);close(r.y,y);
  }
});
test('all 320 grid cells have exact 0.5 m sides and match target centre coordinates',()=>{
  const s={x:10,y:12,yaw:37};
  for(let r=0;r<20;r++)for(let c=0;c<16;c++){
    const p=cellPolygon(s,r,c);close(Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),.5);
    const centre=toWorld(s,(8-c-.5)*50,(r+.5)*50);close(p.reduce((a,b)=>a+b.x,0)/4,centre.x);close(p.reduce((a,b)=>a+b.y,0)/4,centre.y);
  }
  for(const [r,c] of [[-1,0],[20,0],[0,16],[0,1.5]])assert.equal(cellPolygon(s,r,c),null);
});
test('untrusted config rejects wrong types, non-finite/out-of-range dimensions and coordinates',()=>{
  for(const raw of [null,[],{type:'custom:aqara-fp400-zone-card'},{schema_version:2},{plan:[]},{plan:{width_m:Infinity}},{plan:{height_m:0}},{sensors:[{entity:'sensor.a',x:-1}]},{sensors:[{entity:'sensor.a',yaw:181}]},{sensors:[{entity:'switch.a'}]},{sensors:[{entity:'sensor.a',color:'url(x)'}]}])assert.throws(()=>normalizeConfig(raw));
});
test('duplicate person sensors, excessive sensor lists and invalid entity names are rejected',()=>{
  for(const sensors of [[{entity:'sensor.a'},{entity:'sensor.a'}],Array.from({length:17},(_,i)=>({entity:`sensor.a${i}`})),[{entity:'sensor.a',zones_entity:'<svg>'}]])assert.throws(()=>normalizeConfig({sensors}));
});
test('image validation rejects external urls, SVG, traversal and oversized data',()=>{
  for(const value of ['https://example.org/plan.png','//example.org/a.png','data:image/svg+xml;base64,AAAA','/local/../a.png','/local/%2e%2e/a.png','/local/%252e%252e/a.png','/local/%2f%2fa.png','x'.repeat(1200001),'/local/a.png?remote=1'])assert.throws(()=>imageSource(value));
  for(const value of ['', '/local/private/plan.png','data:image/png;base64,AAAA'])assert.equal(imageSource(value),value);
});
test('image header bounds are checked before decoding, including PNG/JPEG/WebP and malformed inputs',()=>{
  const png=new Uint8Array(24);png.set([137,80,78,71,13,10,26,10]);png.set([73,72,68,82],12);const d=new DataView(png.buffer);d.setUint32(16,1200);d.setUint32(20,800);assert.deepEqual(imageDimensions(png.buffer,'image/png'),{width:1200,height:800});
  d.setUint32(16,100000);assert.throws(()=>imageDimensions(png.buffer,'image/png'));
  const jpg=new Uint8Array([255,216,255,192,0,7,8,3,32,4,176]);assert.deepEqual(imageDimensions(jpg.buffer,'image/jpeg'),{width:1200,height:800});
  const webp=new Uint8Array(30);webp.set(new TextEncoder().encode('RIFF'),0);webp.set(new TextEncoder().encode('WEBPVP8X'),8);webp[24]=175;webp[25]=4;webp[27]=31;webp[28]=3;assert.deepEqual(imageDimensions(webp.buffer,'image/webp'),{width:1200,height:800});
  for(const mime of ['image/png','image/jpeg','image/webp'])assert.throws(()=>imageDimensions(new Uint8Array(5).buffer,mime));
});
test('freshness has explicit missing, offline, disabled, no-data, stale and future states',()=>{
  assert.equal(sensorStatus(null,now).key,'missing');
  assert.equal(sensorStatus({...state(),state:'unavailable'},now).key,'offline');
  const off=state();off.attributes.live_tracking=false;assert.equal(sensorStatus(off,now).key,'off');
  for(const stamp of [undefined,'not a date','2026-10-25T12:00:00',null]){const s=state();s.attributes.position_received=stamp;assert.equal(sensorStatus(s,now).key,'no_data');}
  assert.equal(sensorStatus(state(15000),now).live,true);assert.equal(sensorStatus(state(15001),now).key,'stale');
  assert.equal(sensorStatus(state(-5001),now).key,'clock');assert.equal(sensorStatus(state(-5000),now).live,true);
});
test('stale/off/missing targets are removed rather than shown as live',()=>{
  const c=base();for(const s of [undefined,state(16000),{...state(),state:'unknown'}])assert.equal(scene(c,{states:{'sensor.a':s}},now)[0].targets.length,0);
});
test('target ids remain sensor scoped and no overlap merging or total is invented',()=>{
  const c=base();c.sensors.push({...c.sensors[0],entity:'sensor.b',zones_entity:''});
  const data=scene(c,{states:{'sensor.a':state(),'sensor.b':state()}},now);
  assert.equal(data[0].targets[0].key,'sensor.a#1');assert.equal(data[1].targets[0].key,'sensor.b#1');assert.equal(data[0].targets[0].x,data[1].targets[0].x);assert.ok(!('total' in data));
});
test('invalid and duplicate targets are excluded; out-of-plan positions are never clamped into a room',()=>{
  const c=base(),s=state();s.attributes.targets=[{id:1,x:0,y:200},{id:1,x:1,y:2},{id:2,x:NaN,y:2},{id:3,x:0,y:-1},{id:4,x:999,y:1},{id:5,x:'10',y:1},null];
  const d=scene(c,{states:{'sensor.a':s}},now)[0];assert.equal(d.targets.length,1);assert.equal(d.invalid,6);
  c.sensors[0].y=0;const outside=scene(c,{states:{'sensor.a':state()}},now)[0];assert.equal(outside.targets.length,0);assert.equal(outside.outside,1);
});
test('zones are bounded, deduplicated, labelled and never mutate source data',()=>{
  const c=base(),zs={state:'2',attributes:{grid_rows:20,grid_cols:16,zone_names:{1:'Sofa'},zones:[{id:1,cells:[[0,0],[0,0],[-1,0],[1,1]]},{id:2,enabled:false,cells:[[0,2]]}]}};
  const hass={states:{'sensor.a':state(),'sensor.az':zs}};const before=JSON.stringify(hass);
  const d=scene(c,hass,now)[0];assert.equal(d.zones.length,1);assert.equal(d.zones[0].cells.length,2);assert.equal(d.zones[0].name,'Sofa');assert.equal(JSON.stringify(hass),before);
});
test('mismatched HA device assignments suppress misleading combined zones and targets',()=>{
  const d=scene(base(),{entities:{'sensor.a':{device_id:'one'},'sensor.az':{device_id:'two'}},states:{'sensor.a':state()}},now)[0];
  assert.equal(d.status.key,'mismatch');assert.equal(d.targets.length,0);assert.equal(d.zones.length,0);
});
test('unsupported or offline grid does not guess zones',()=>{
  for(const grid of [{grid_cols:20,grid_rows:16},{}]){
    const d=scene(base(),{states:{'sensor.a':state(),'sensor.az':{state:'1',attributes:{...grid,zones:[{id:1,cells:[[0,0]]}]}}}},now)[0];
    assert.equal(d.zones.length,0);assert.ok(d.zoneWarning);
  }
});
test('entity discovery uses attributes rather than translated names',()=>{
  const hass={states:{'sensor.verfolgte_personen':state(),'sensor.thing':{attributes:{zones:[],grid_rows:20,grid_cols:16}},'sensor.other':{attributes:{targets:[]}}}};
  assert.equal(compatibleEntities(hass,'targets').length,1);assert.equal(compatibleEntities(hass,'zones').length,1);
});
test('calibration scales the plan and mounted sensor positions together while preserving yaw and data',()=>{
  const c=base();const next=calibrate(c,{x:0,y:0},{x:4,y:0},2);assert.equal(next.plan.width_m,10);assert.equal(next.sensors[0].x,5);assert.equal(next.sensors[0].yaw,0);assert.equal(c.plan.width_m,20);
  assert.throws(()=>calibrate(c,{x:0,y:0},{x:0,y:0},2));assert.throws(()=>calibrate(c,{x:0,y:0},{x:4,y:0},100));
});
test('drafts remain separate, cancel restores all changes, explicit save emits normalized config',()=>{
  const s=new EditSession(base());s.begin();s.draft.plan.image='data:image/png;base64,AAAA';s.draft.sensors[0].name='Changed';s.cancel();assert.equal(s.current.sensors[0].name,'FP400 1');assert.equal(s.current.plan.image,'');
  s.begin();s.draft.sensors[0].name='New';const saved=s.save();assert.equal(saved.sensors[0].name,'New');assert.equal(s.draft,null);
});
test('external config conflict blocks overwrite; identical HA echoes preserve active draft',()=>{
  const s=new EditSession(base());s.begin();s.draft.sensors[0].name='Mine';s.receive(base());assert.equal(s.conflict,false);assert.equal(s.draft.sensors[0].name,'Mine');
  const remote=base();remote.title='External';s.receive(remote);assert.equal(s.conflict,true);assert.throws(()=>s.save());s.cancel();assert.equal(s.current.title,'External');
});
test('card has no HA writes, stable element registration or remote code dependencies',async()=>{
  const src=await fs.readFile(new URL('../card.js',import.meta.url),'utf8');
  assert.doesNotMatch(src,/callService|callWS|fetch\(|WebSocket|aqara-fp400-zone-card|innerHTML/);
  assert.match(src,/EDITOR_TAG/);assert.match(src,/config-changed/);
});
