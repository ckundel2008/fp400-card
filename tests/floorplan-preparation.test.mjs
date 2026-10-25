import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {TYPE,normalizeConfig} from '../frontend/floorplan/model.mjs';
const resource=await fs.readFile('custom_components/aqara_fp400/www/aqara-fp400-zone-card.js','utf8');
function context(stale=false){
  const registry=new Map(stale?[['fp400-floorplan-test-v5',class {}],['fp400-floorplan-test-editor-v5',class {}]]:[]);
  const ctx={HTMLElement:class {attachShadow(){return this.shadowRoot={};}},window:{},customElements:{get:n=>registry.get(n),define(n,c){assert.ok(!registry.has(n),`duplicate ${n}`);registry.set(n,c);}},document:{createElement:n=>new (registry.get(n))()}};
  return {ctx,registry};
}
test('release resource is reproducible and identical in HACS and bundled app',async()=>{
  const canonical=await fs.readFile('frontend/aqara-fp400-zone-card.js','utf8');
  assert.ok(resource.startsWith(canonical));assert.doesNotMatch(resource,/^import /m);
  execFileSync('python3',['tools/build_frontend.py']);
  assert.equal(await fs.readFile('custom_components/aqara_fp400/www/aqara-fp400-zone-card.js','utf8'),resource);
  assert.equal(await fs.readFile('fp400_setup/integration/aqara_fp400/www/aqara-fp400-zone-card.js','utf8'),resource);
});
test('one resource offers two public cards with independent visual editors and legacy aliases',()=>{
  const {ctx,registry}=context();vm.runInNewContext(resource,ctx);
  for(const n of ['aqara-fp400-zone-card','aqara-fp400-zone-card-editor','aqara-fp400-floorplan-card','aqara-fp400-floorplan-card-editor','fp400-floorplan-test-v5','fp400-floorplan-test'])assert.ok(registry.has(n),n);
  assert.equal(ctx.window.customCards.length,2);
  assert.ok(registry.get('aqara-fp400-floorplan-card').getConfigElement() instanceof registry.get('aqara-fp400-floorplan-card-editor'));
  assert.equal(registry.get('fp400-floorplan-test-v5').getStubConfig().type,TYPE);
});
test('public floorplan class cannot silently reuse a retained lab registration',()=>{
  const {ctx,registry}=context(true);const old=registry.get('fp400-floorplan-test-v5');vm.runInNewContext(resource,ctx);
  assert.equal(registry.get('fp400-floorplan-test-v5'),old);assert.notEqual(registry.get('aqara-fp400-floorplan-card'),old);
  assert.equal(registry.get('aqara-fp400-floorplan-card').getStubConfig().type,TYPE);
});
test('legacy imports preserve image, crop, sensor geometry, mirror and HA layout',()=>{
  for(const type of ['custom:fp400-floorplan-test','custom:fp400-floorplan-test-v5']){
    const raw={type,plan:{width_m:8,height_m:10,image:'data:image/png;base64,AAAA',image_crop:{x:.1,y:.2,width:.4,height:.5}},sensors:[{entity:'sensor.people',zones_entity:'sensor.zones',x:2,y:1,yaw:180,mirror_x:true}],grid_options:{columns:12}};
    const result=normalizeConfig(raw);assert.equal(result.type,TYPE);assert.deepEqual(result.plan,raw.plan);assert.equal(result.sensors[0].mirror_x,true);assert.equal(result.sensors[0].yaw,180);assert.deepEqual(result.grid_options,raw.grid_options);assert.equal(raw.type,type);
  }
});
