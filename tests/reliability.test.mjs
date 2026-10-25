import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  constructor(){this.children=[];this.dataset={};this.style={};this.attrs={};this.handlers={};this.classList={add(){},toggle(){},contains(){return false;}};}
  appendChild(el){this.children.push(el);return el;}
  replaceChildren(...els){this.children=els;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){this.handlers[k]=fn;}
  focus(){}
  set innerHTML(value){this.children=[];this.html=value;}
}
async function fixture(t){
  const classes=new Map();const context={HTMLElement:class{},customElements:{define:(name,cls)=>classes.set(name,cls)},window:{},
    document:{createElement:()=>new Element(),createElementNS:()=>new Element()},setTimeout,clearTimeout,setInterval,clearInterval};
  vm.runInNewContext(await fs.readFile('custom_components/aqara_fp400/www/aqara-fp400-zone-card.js','utf8'),context);
  const Card=classes.get('aqara-fp400-zone-card');const card=new Card();card._build=()=>{};card.setConfig({entity:'sensor.zones',regions_entity:'sensor.regions',targets_entity:'sensor.people'});
  const error=new Element(),guard=new Element(),grid=new Element();
  card.shadowRoot={querySelector:selector=>selector==='.error'?error:selector==='.guard'?guard:grid};
  const calls=[];
  const hass={language:'de',entities:{'sensor.zones':{device_id:'device'}},services:{aqara_fp400:{set_zone_name:{}}},states:{
    'sensor.zones':{state:'2',attributes:{zones:[{id:1,enabled:true,type:0,cells:[[1,1]]},{id:2,enabled:true,type:0,cells:[[2,2]]}],zone_names:{1:'Sofa',2:'Tisch'},pending:false,error:null}},
    'sensor.regions':{state:'ok',attributes:{regions:{entry_exit:[],monitoring:[],interference:[]},pending:{},error:{}}},
    'sensor.people':{state:'1',attributes:{targets:[{id:7,x:1,y:2,zones:[1]}],live_tracking:true,position_received:new Date().toISOString()}},
  },async callService(domain,service,data){calls.push({domain,service,data});}};
  card._hass=hass;
  card._render=()=>{card._checkState();card._renderGuard();};
  t.after(()=>card.disconnectedCallback());
  const click=label=>{const button=guard.children.find(el=>el.textContent===label);assert.ok(button,`missing ${label}`);assert.ok(!button.disabled,`${label} disabled`);return button.handlers.click();};
  return {card,hass,calls,error,guard,click,attrs:hass.states['sensor.zones'].attributes};
}

test('name-only leave guard saves through asynchronous HA update and exits without area writes',async t=>{
  const {card,hass,calls,attrs,click}=await fixture(t);card._beginEditing();card._nameDrafts[1]='Neues Sofa';card._leave();
  hass.callService=async(domain,service,data)=>{calls.push({service,data});await Promise.resolve();attrs.zone_names[1]=data.name;card._render();};
  await click('Speichern');assert.equal(calls.length,1);assert.equal(calls[0].service,'set_zone_name');assert.equal(card._editing,false);assert.equal(card._conflict,false);assert.equal(attrs.zone_names[1],'Neues Sofa');
});

test('name-only guard failure preserves text and keeps guarded editing',async t=>{
  const {card,hass,error,click}=await fixture(t);card._beginEditing();card._nameDrafts[1]='Neues Sofa';card._leave('monitoring');
  hass.callService=async()=>{await Promise.resolve();throw new Error('Disk full');};
  await click('Speichern');assert.equal(card._nameDrafts[1],'Neues Sofa');assert.equal(card._mode,'zones');assert.equal(card._editing,true);assert.equal(card._guard.mode,'monitoring');assert.equal(error.textContent,'Disk full');
});

test('offline matching cached echo cannot finish pending area save; reconnect with confirmed data can',async t=>{
  const {card,hass,calls,attrs}=await fixture(t);card._beginEditing();card._paintZone(20,true);await card._save();
  assert.equal(calls.length,1);attrs.zones=calls[0].data.zones;hass.states['sensor.zones'].state='unavailable';card._render();
  assert.ok(card._awaiting);assert.ok(card._edit);assert.equal(card._editing,true);
  card._leave();assert.equal(card._guard,null);
  hass.states['sensor.zones'].state='2';attrs.pending=false;card._render();assert.equal(card._awaiting,null);assert.equal(card._editing,false);
});

test('offline timeout retains area draft and shows failure without service retries',async t=>{
  const {card,hass,calls,error}=await fixture(t);card._beginEditing();card._paintZone(20,true);await card._save();
  hass.states['sensor.zones'].state='unavailable';card._awaiting.deadline=0;card._render();
  assert.equal(card._awaiting,null);assert.ok(card._edit);assert.equal(calls.length,1);assert.match(error.textContent,/Sensorbestätigung/);assert.equal(card._canEdit(),false);
});

test('deleting zone with name draft does not write obsolete name on normal save',async t=>{
  const {card,calls}=await fixture(t);card._beginEditing();card._nameDrafts[1]='To delete';card._deleteZone(1);await card._save();
  assert.equal(calls.length,1);assert.equal(calls[0].service,'set_zones');assert.deepEqual(Array.from(calls[0].data.zones,z=>z.id),[2]);assert.equal(card._nameDrafts[1],undefined);
});

test('deleting zone with name draft through leave guard does not write obsolete name',async t=>{
  const {card,calls,click}=await fixture(t);card._beginEditing();card._nameDrafts[1]='To delete';card._deleteZone(1);card._leave();await click('Speichern');
  assert.equal(calls.filter(c=>c.service==='set_zone_name').length,0,'guard must use same deletion handling as normal Save');assert.equal(calls.filter(c=>c.service==='set_zones').length,1);
});

test('conflicting draft can be kept or discarded then reentered against fresh state',async t=>{
  const {card,attrs,calls,click}=await fixture(t);card._beginEditing();card._paintZone(20,true);attrs.zones[0].cells.push([3,3]);card._render();assert.equal(card._conflict,true);
  card._leave();await click('Weiter bearbeiten');assert.equal(card._guard,null);assert.equal(card._conflict,true);assert.ok(card._edit);
  card._leave();await click('Verwerfen');assert.equal(card._edit,null);assert.equal(card._conflict,false);assert.equal(card._editing,false);assert.equal(calls.length,0);
  card._beginEditing();card._paintZone(40,true);assert.equal(card._conflict,false);assert.ok(card._zones().get(1).cells.has(51));
});

test('readonly pointer and keyboard events cannot change or save zones, regions or names',async t=>{
  const {card,calls}=await fixture(t);card._svg=new Element();card._buildGrid();
  let captures=0;card._onPointer({target:{dataset:{index:'17'},setPointerCapture(){captures++;}},pointerId:1},true);
  card._cells[17].handlers.keydown({key:' ',preventDefault(){assert.fail('read-only keyboard must not consume scroll');}});
  card._paintZone(20,true);card._paintRegion(20,true);card._toggleEnabled(1);card._deleteZone(1);await card._save();await card._saveRegion();await card._saveName(1,'No');
  assert.equal(card._edit,null);assert.equal(card._regionEdit,null);assert.equal(captures,0);assert.equal(calls.length,0);
});

test('stale ghost confirmation cannot remove changed or disconnected target',async t=>{
  const {card,hass,calls}=await fixture(t);card._forget=7;hass.states['sensor.people'].attributes.targets=[];
  assert.equal(await card._runService('remove_target',{target_id:7}),false);
  hass.states['sensor.people'].attributes.targets=[{id:7}];hass.states['sensor.people'].state='unavailable';
  assert.equal(await card._runService('remove_target',{target_id:7}),false);assert.equal(calls.length,0);
});

test('preview blocks direct services and keyboard after editing was previously entered',async t=>{
  const {card,calls}=await fixture(t);card._beginEditing();card._svg=new Element();card._buildGrid();card.preview=true;
  card._cells[17].handlers.keydown({key:'Enter',preventDefault(){assert.fail('preview must ignore painting');}});
  for(const [service,data] of [['set_zones',{zones:[]}],['set_region',{region:'monitoring',cells:[]}],['set_zone_name',{zone_id:1,name:'Preview'}],['remove_target',{target_id:7}]]){
    assert.equal(await card._runService(service,data),false);
  }
  assert.equal(card._edit,null);assert.equal(calls.length,0);
});

test('guarded name-only save can switch layers while preserving the edit session',async t=>{
  const {card,hass,attrs,click,calls}=await fixture(t);card._beginEditing();card._nameDrafts[1]='Sitzbereich';card._leave('monitoring');
  hass.callService=async(domain,service,data)=>{calls.push({service,data});await Promise.resolve();attrs.zone_names[1]=data.name;card._render();};
  await click('Speichern');assert.equal(card._mode,'monitoring');assert.equal(card._editing,true);assert.equal(card._guard,null);assert.equal(card._canEdit(),true);assert.equal(calls.length,1);
  card._paintRegion(10,true);assert.ok(card._regionEdit.cells.has(10));
});

test('second region or area save cannot overlap a pending service or pending device confirmation',async t=>{
  const {card,hass,calls}=await fixture(t);card._beginEditing();card._paintZone(20,true);
  let release;hass.callService=(domain,service,data)=>{calls.push({service,data});return new Promise(resolve=>{release=resolve;});};
  const first=card._save();await card._save();assert.equal(calls.length,1);assert.equal(card._saving,true);
  release();await first;await card._save();assert.equal(calls.length,1);assert.ok(card._awaiting);
});

test('delayed name state echo does not conflict with next edit or restore the old displayed name',async t=>{
  const {card,attrs}=await fixture(t);card._beginEditing();card._nameDrafts[1]='Sitzbereich';
  await card._saveName(1,'Sitzbereich'); // HA service response precedes its state event.
  assert.equal(card._zoneName(1),'Sitzbereich','successful storage response must not flash old name');
  card._nameDrafts[1]='Neuer Sitzbereich';card._render();assert.equal(card._conflict,false);
  attrs.zone_names[1]='Sitzbereich';card._render();assert.equal(card._conflict,false,'own delayed echo is not an external write');assert.equal(card._nameDrafts[1],'Neuer Sitzbereich');
  attrs.zone_names[1]='Andere Karte';card._render();assert.equal(card._conflict,true,'real external write still blocks overwrite');
});

test('name input rebuild preserves unsaved value, focus and selection',async t=>{
  const {card}=await fixture(t);card._beginEditing();card._nameDrafts[1]='Sofa mit Entwurf';
  const old={dataset:{zoneName:'1'},selectionStart:3,selectionEnd:8};
  const tools=new Element(),panel=new Element();
  panel.querySelector=()=>panel.children[0]?.children[1];
  card.shadowRoot={activeElement:old,querySelector:selector=>selector==='.tools'?tools:panel};
  let focus=0,selection;
  card._zoneTools=(unused,p)=>{card._nameEditor(p,1);const input=p.children[0].children[1];input.focus=()=>focus++;input.setSelectionRange=(...range)=>{selection=range;};};
  card._renderTools(card._zones(),card._regions(),card._hass.states['sensor.zones']);
  assert.equal(panel.children[0].children[1].value,'Sofa mit Entwurf');assert.equal(focus,1);assert.deepEqual(selection,[3,8]);
});

test('confirmed zone deletion clears accepted-but-not-yet-echoed name before id reuse',async t=>{
  const {card,attrs}=await fixture(t);card._beginEditing();card._nameDrafts[1]='Sitzbereich';await card._saveName(1,'Sitzbereich');
  attrs.zones=attrs.zones.filter(z=>z.id!==1);delete attrs.zone_names[1];card._render();assert.equal(card._pendingNames[1],undefined);
  attrs.zones.push({id:1,enabled:true,type:0,cells:[[5,5]]});card._render();assert.equal(card._zoneName(1),'Zone 1');
});

test('rotation hit testing maps all sensor cells exactly at arbitrary supported angles and orientations',async t=>{
  const {card}=await fixture(t);
  for(const top of [true,false])for(const angle of [-180,-90,-45,-17,0,33,45,90,180]){
    card._top=top;card._rotation=angle;const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    card._mapLayer={getScreenCTM:()=>({inverse:()=>({apply:(x,y)=>{const rx=(x-100)/10-8,ry=(y-50)/10-10;return {x:8+rx*c+ry*s,y:10-rx*s+ry*c};}})})};
    card._svg={createSVGPoint:()=>({x:0,y:0,matrixTransform(matrix){return matrix.apply(this.x,this.y);}})};
    for(let row=0;row<20;row++)for(let col=0;col<16;col++){
      const x=col+.5,y=(top?row:19-row)+.5;
      const screenX=100+10*(8+(x-8)*c-(y-10)*s),screenY=50+10*(10+(x-8)*s+(y-10)*c);
      assert.equal(card._cellAtPointer({clientX:screenX,clientY:screenY}),row*16+col,`${angle}/${top}/${row}/${col}`);
    }
    const bounds=card._rotationBounds();assert.ok(bounds.width>0&&bounds.height>0);
    for(const [x,y] of [[-2.1,-1.5],[16.5,-1.5],[-2.1,21.5],[16.5,21.5]]){
      const rx=8+(x-8)*c-(y-10)*s,ry=10+(x-8)*s+(y-10)*c;
      assert.ok(rx>=bounds.left-1e-9&&rx<=bounds.left+bounds.width+1e-9);assert.ok(ry>=bounds.top-1e-9&&ry<=bounds.top+bounds.height+1e-9);
    }
  }
});

test('rotation is configuration only and rejects nonfinite or out of range values',async t=>{
  const {card,calls}=await fixture(t);card.shadowRoot=null;card._build=()=>{};
  for(const value of [181,-181,'NaN',Infinity])assert.throws(()=>card.setConfig({entity:'sensor.zones',map_rotation:value}),/map_rotation/);
  card.setConfig({entity:'sensor.zones',map_rotation:45});assert.equal(card._rotation,45);assert.equal(calls.length,0);
  const label=new Element();card._upright(label,2,4);assert.equal(label.attrs.transform,'rotate(-45 2 4)');
  card._top=true;card._rotation=90;assert.equal(card._keyboardCell(85,'ArrowUp'),84);
  card._rotation=0;assert.equal(card._keyboardCell(16,'ArrowLeft'),16,'left edge must not wrap to previous row');
});

test('interference shortcut unions a four-cell sensor-space draft without a write until Save',async t=>{
  const {card,hass,calls}=await fixture(t);hass.states['sensor.people'].attributes.targets=[{id:7,x:100,y:250}];hass.states['sensor.regions'].attributes.regions.interference=[[10,10]];
  card._rotation=45;card._forget=7;assert.equal(card._markInterference(7),true);assert.equal(card._mode,'interference');assert.equal(card._editing,true);assert.equal(calls.length,0);
  assert.deepEqual(Array.from(card._regionEdit.cells).sort((a,b)=>a-b),[69,70,85,86,170]);
  await card._saveRegion();assert.equal(calls.length,1);assert.equal(calls[0].service,'set_region');assert.equal(calls[0].data.region,'interference');assert.equal(calls[0].data.cells.length,5);
});

test('interference shortcut clips edges and rejects stale, removed and preview targets',async t=>{
  const {card,hass,calls}=await fixture(t);const a=hass.states['sensor.people'].attributes;
  a.targets=[{id:7,x:400,y:0}];card._forget=7;assert.equal(card._markInterference(7),true);assert.deepEqual(Array.from(card._regionEdit.cells),[0]);card._finishEdit();
  a.position_received=new Date(Date.now()-16000).toISOString();card._forget=7;assert.equal(card._markInterference(7),false);
  a.position_received=new Date().toISOString();a.targets=[];assert.equal(card._markInterference(7),false);
  a.targets=[{id:7,x:100,y:250}];card.preview=true;assert.equal(card._markInterference(7),false);assert.equal(calls.length,0);
});

test('freshness uses only genuine position_received and distinguishes every missing-data state',async t=>{
  const {card,hass}=await fixture(t);const state=hass.states['sensor.people'];
  assert.equal(card._trackingStatus().kind,'live');state.attributes.position_received=new Date(Date.now()-15001).toISOString();assert.equal(card._trackingStatus().kind,'stale');
  delete state.attributes.position_received;state.last_updated=new Date().toISOString();assert.equal(card._trackingStatus().kind,'no_reports');
  state.attributes.live_tracking=false;assert.equal(card._trackingStatus().kind,'tracking_off');state.state='unavailable';assert.equal(card._trackingStatus().kind,'offline');
});

test('future position timestamps beyond five seconds are untrusted and block target actions',async t=>{
  const {card,hass,calls}=await fixture(t);const attrs=hass.states['sensor.people'].attributes;
  attrs.position_received=new Date(Date.now()+3600000).toISOString();card._forget=7;
  assert.equal(card._trackingStatus().kind,'clock_skew');assert.equal(card._selectedFreshTarget(7),null);
  assert.equal(card._markInterference(7),false);assert.equal(await card._runService('remove_target',{target_id:7}),false);assert.equal(calls.length,0);
  card._render();assert.equal(card._forget,null);
  attrs.position_received=new Date(Date.now()+3000).toISOString();assert.equal(card._trackingStatus().kind,'live','small clock skew is tolerated');
});

test('entity rename is off by default, previews exact names and sends captured identity once',async t=>{
  const {card,hass,attrs,calls}=await fixture(t);hass.user={is_admin:true};attrs.zone_entity_names={'1':{entity_id:'binary_sensor.sofa',name:null,display_name:'Belegung 2'}};card._beginEditing();
  const panel=new Element();card._nameEditor(panel,1);const row=panel.children[0],input=row.children[1],checkbox=row.children[3].children[0],preview=row.children[4];
  assert.equal(checkbox.checked,false);assert.equal(checkbox.disabled,false);input.value='Neues Sofa';input.handlers.input();checkbox.checked=true;checkbox.handlers.change();assert.match(preview.textContent,/Belegung 2 → Neues Sofa/);
  await card._saveName(1,input.value);assert.equal(calls.length,1);assert.equal(calls[0].data.rename_entity,true);assert.equal(calls[0].data.expected_entity_id,'binary_sensor.sofa');assert.equal(calls[0].data.expected_entity_name,null);assert.equal(card._renameRequests[1],undefined);
  await card._saveName(1,'Nur Karte');assert.equal('rename_entity' in calls[1].data,false);
});

test('nonadmins and blank names cannot opt into entity rename',async t=>{
  const {card,hass,attrs,calls}=await fixture(t);attrs.zone_entity_names={'1':{entity_id:'binary_sensor.sofa',name:'Sofa',display_name:'Sofa'}};hass.user={is_admin:false};card._beginEditing();
  let panel=new Element();card._nameEditor(panel,1);let checkbox=panel.children[0].children[3].children[0];assert.equal(checkbox.disabled,true);checkbox.checked=true;checkbox.handlers.change();assert.equal(card._renameRequests[1],undefined);
  hass.user.is_admin=true;panel=new Element();card._nameEditor(panel,1);const input=panel.children[0].children[1];checkbox=panel.children[0].children[3].children[0];checkbox.checked=true;checkbox.handlers.change();input.value=' ';input.handlers.input();assert.equal(checkbox.checked,false);assert.equal(checkbox.disabled,true);assert.equal(card._renameRequests[1],undefined);assert.equal(calls.length,0);
});
