// Standalone read-only display model. No Home Assistant service calls.
export const VERSION = '1.4.0';
export const CARD_TAG = 'aqara-fp400-floorplan-card';
export const EDITOR_TAG = 'aqara-fp400-floorplan-card-editor';
export const TYPE = `custom:${CARD_TAG}`;
export const MAX_IMAGE_LENGTH = 1200000;
export function imageDimensions(buffer, mime) {
  const b=new Uint8Array(buffer), d=new DataView(buffer);
  let width=0,height=0;
  const ascii=(offset,count)=>String.fromCharCode(...b.slice(offset,offset+count));
  if(mime==='image/png'&&b.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n)&&ascii(12,4)==='IHDR'){
    width=d.getUint32(16);height=d.getUint32(20);
  }else if(mime==='image/jpeg'&&b[0]===255&&b[1]===216){
    let p=2;
    while(p+4<=b.length){
      if(b[p++]!==255)break;
      while(b[p]===255)p++;
      const marker=b[p++];if(marker===217||marker===218)break;
      if(marker===1||(marker>=208&&marker<=215))continue;
      if(p+2>b.length)break;
      const length=d.getUint16(p);if(length<2||p+length>b.length)break;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=7){height=d.getUint16(p+3);width=d.getUint16(p+5);break;}
      p+=length;
    }
  }else if(mime==='image/webp'&&b.length>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
    const type=ascii(12,4),u24=p=>b[p]+b[p+1]*256+b[p+2]*65536;
    if(type==='VP8X'){width=1+u24(24);height=1+u24(27);}
    else if(type==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42){width=d.getUint16(26,true)&16383;height=d.getUint16(28,true)&16383;}
    else if(type==='VP8L'&&b[20]===47){width=1+b[21]+((b[22]&63)<<8);height=1+(b[22]>>6)+(b[23]<<2)+((b[24]&15)<<10);}
  }
  if(!width||!height||width>10000||height>10000||width*height>30000000)throw new Error('Bildformat ungültig oder Bild zu groß (maximal 30 Megapixel / 10.000 Pixel pro Seite).');
  return {width,height};
}
const own = (v) => v && typeof v === 'object' && !Array.isArray(v);
const number = (v, min, max, label) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`${label}: Zahl zwischen ${min} und ${max} erforderlich.`);
  return v;
};
const text = (v, fallback, max = 80) => {
  if (v === undefined) return fallback;
  if (typeof v !== 'string' || v.length > max) throw new Error('Name oder Text ist ungültig / zu lang.');
  return v;
};
export function imageSource(value = '') {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_LENGTH) throw new Error('Grundrissbild ist zu groß (maximal 1,2 MB als Text).');
  if (!value) return '';
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  if (/^\/local\/[A-Za-z0-9_./%-]+\.(png|jpe?g|webp)$/i.test(value)) {
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { throw new Error('Ungültiger Bildpfad.'); }
    if (!decoded.includes('..') && !decoded.includes('%') && !decoded.includes('//')) return value;
  }
  throw new Error('Nur PNG/JPEG/WebP als eingebettetes Bild oder /local/-Datei erlaubt.');
}
export function normalizeConfig(raw) {
  if (!own(raw)) throw new Error('Kartenkonfiguration muss ein Objekt sein.');
  if (raw.type !== undefined && ![TYPE,'custom:fp400-floorplan-test-v5','custom:fp400-floorplan-test'].includes(raw.type)) throw new Error('Dies ist keine FP400-Grundriss-Konfiguration.');
  if (raw.schema_version !== undefined && raw.schema_version !== 1) throw new Error('Nicht unterstützte Konfigurationsversion.');
  const plan = raw.plan ?? {};
  if (!own(plan)) throw new Error('Grundriss-Konfiguration ungültig.');
  const width = number(plan.width_m ?? 12, 1, 100, 'Grundrissbreite');
  const height = number(plan.height_m ?? 8, 1, 100, 'Grundrisshöhe');
  let imageCrop;
  if(plan.image_crop!==undefined){
    const crop=plan.image_crop;
    if(!own(crop))throw new Error('Bildausschnitt ist ungültig.');
    imageCrop={x:number(crop.x,0,1,'Bildausschnitt X'),y:number(crop.y,0,1,'Bildausschnitt Y'),
      width:number(crop.width,.01,1,'Bildausschnitt Breite'),height:number(crop.height,.01,1,'Bildausschnitt Höhe')};
    if(imageCrop.x+imageCrop.width>1+1e-9||imageCrop.y+imageCrop.height>1+1e-9)throw new Error('Bildausschnitt liegt außerhalb des Originalbilds.');
  }
  if (!Array.isArray(raw.sensors ?? [] ) || (raw.sensors ?? []).length > 16) throw new Error('Maximal 16 FP400 pro Karte erlaubt.');
  const seen = new Set();
  const sensors = (raw.sensors ?? []).map((s, i) => {
    if (!own(s) || typeof s.entity !== 'string' || !/^sensor\.[a-z0-9_]+$/.test(s.entity)) throw new Error(`FP400 ${i + 1}: Personenentität auswählen.`);
    if (seen.has(s.entity)) throw new Error('Jede Personenentität darf nur einmal vorkommen.');
    seen.add(s.entity);
    const zones = s.zones_entity ?? '';
    if (typeof zones !== 'string' || (zones && !/^sensor\.[a-z0-9_]+$/.test(zones))) throw new Error('Ungültige Zonenentität.');
    const color = s.color ?? ['#007fa8', '#a34bc8', '#d67815', '#27845a'][i % 4];
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Sensorfarbe muss ein sechsstelliger Hex-Farbwert sein.');
    if(s.mirror_x!==undefined&&typeof s.mirror_x!=='boolean')throw new Error('Spiegelung muss ein Wahrheitswert sein.');
    return {
      entity: s.entity, zones_entity: zones, name: text(s.name, `FP400 ${i + 1}`),
      x: number(s.x ?? width / 2, 0, width, 'Sensorposition X'),
      y: number(s.y ?? height / 2, 0, height, 'Sensorposition Y'),
      yaw: number(s.yaw ?? 0, -180, 180, 'Blickrichtung'), color, mirror_x:s.mirror_x===true,
      show_zones: s.show_zones !== false,
    };
  });
  const metadata={};
  for(const key of ['grid_options','layout_options','view_layout','visibility']){
    if(raw[key]===undefined)continue;
    if(key==='visibility'?!Array.isArray(raw[key]):!own(raw[key]))throw new Error(`HA-Einstellung ${key} ist ungültig.`);
    const serialized=JSON.stringify(raw[key]);
    if(serialized.length>65536)throw new Error(`HA-Einstellung ${key} ist zu groß.`);
    metadata[key]=JSON.parse(serialized);
  }
  return {...metadata,type: TYPE, schema_version: 1, title: text(raw.title, 'Wohnung · FP400'),
    plan: {width_m: width, height_m: height, image: imageSource(plan.image),...(imageCrop?{image_crop:imageCrop}:{})}, sensors,
    show_coverage: raw.show_coverage === true};
}
export function imagePlacement(plan){
  const crop=plan.image_crop??{x:0,y:0,width:1,height:1};
  return {x:-crop.x*plan.width_m/crop.width+0,y:-crop.y*plan.height_m/crop.height+0,
    width:plan.width_m/crop.width,height:plan.height_m/crop.height};
}
export function toWorld(sensor, rawX, rawY) {
  if (![rawX, rawY].every(v => typeof v === 'number' && Number.isFinite(v))) return null;
  // Reflection belongs in the local sensor frame, before rotation/translation.
  // Use the same transform for grid corners and live target coordinates.
  const right = (sensor.mirror_x?1:-1)*rawX / 100, forward = rawY / 100, a = sensor.yaw * Math.PI / 180;
  return {x: sensor.x + right * Math.cos(a) + forward * Math.sin(a),
    y: sensor.y + right * Math.sin(a) - forward * Math.cos(a)};
}
export function fromWorld(sensor, point) {
  const dx = point.x - sensor.x, dy = point.y - sensor.y, a = sensor.yaw * Math.PI / 180;
  return {x: (sensor.mirror_x?1:-1)*(dx * Math.cos(a) + dy * Math.sin(a)) * 100,
    y: (dx * Math.sin(a) - dy * Math.cos(a)) * 100};
}
export function cellPolygon(sensor, row, col) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= 20 || col < 0 || col >= 16) return null;
  return [[row,col],[row,col+1],[row+1,col+1],[row+1,col]].map(([r,c])=>toWorld(sensor, (8-c)*50, r*50));
}
export function sensorStatus(state, now = Date.now()) {
  if (!state) return {key:'missing', label:'Entität fehlt', live:false};
  if (['unavailable','unknown'].includes(state.state)) return {key:'offline', label:'Offline / unbekannt', live:false};
  const a = state.attributes ?? {};
  if (a.live_tracking === false) return {key:'off', label:'Live-Tracking aus', live:false};
  if (a.live_tracking !== true || !Array.isArray(a.targets)) return {key:'invalid', label:'Keine kompatiblen Positionsdaten', live:false};
  const stamp = a.position_received;
  // Require an explicit timezone. Do not mistake locale/zone-less dates for UTC.
  if (typeof stamp !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(stamp) || !Number.isFinite(Date.parse(stamp))) return {key:'no_data', label:'Keine bestätigte Positionsmeldung', live:false};
  const age = now - Date.parse(stamp);
  if (age < -5000) return {key:'clock', label:'Zeitstempel liegt in der Zukunft', live:false};
  if (age > 15000) return {key:'stale', label:'Positionsdaten älter als 15 s', live:false};
  return {key:'live', label:'Frische Positionsdaten', live:true, age:Math.max(0,age)};
}
export function compatibleEntities(hass, kind) {
  return Object.entries(hass?.states ?? {}).filter(([id,s]) => id.startsWith('sensor.') &&
    (kind === 'targets' ? Array.isArray(s.attributes?.targets) && 'live_tracking' in s.attributes :
      Array.isArray(s.attributes?.zones) && s.attributes?.grid_rows === 20 && s.attributes?.grid_cols === 16));
}
export function deviceError(sensor, hass) {
  if (!sensor.zones_entity) return '';
  const devices = hass?.entities;
  const t = devices?.[sensor.entity]?.device_id, z = devices?.[sensor.zones_entity]?.device_id;
  return t && z && t !== z ? 'Personen und Zonen gehören zu verschiedenen Geräten – Zuordnung korrigieren.' : '';
}
// Ignore unrelated HA changes and heartbeat timestamps while retaining the exact
// freshness boundaries. Bound every input before serializing or transforming it.
export function displayFingerprint(config,hass,editing,points,now=Date.now()){
  const primitive=v=>typeof v==='string'||typeof v==='number'||typeof v==='boolean'?v:null;
  const states=config.sensors.map(sensor=>{
    const target=hass?.states?.[sensor.entity],zones=hass?.states?.[sensor.zones_entity];
    const a=target?.attributes??{},z=zones?.attributes??{};
    const status=deviceError(sensor,hass)?'mismatch':sensorStatus(target,now).key;
    const targets=Array.isArray(a.targets)?a.targets.slice(0,10).map(t=>t?[t.id,t.x,t.y,t.activity].map(primitive):null):null;
    const zoneData=Array.isArray(z.zones)?z.zones.slice(0,8).map(zone=>zone?[
      primitive(zone.id),primitive(zone.enabled),primitive(z.zone_names?.[zone.id]),
      Array.isArray(zone.cells)?zone.cells.slice(0,320).map(c=>Array.isArray(c)?[c.length,...c.slice(0,2).map(primitive)]:null):null,
    ]:null):null;
    return [status,targets,primitive(zones?.state),primitive(z.grid_rows),primitive(z.grid_cols),zoneData];
  });
  return JSON.stringify([config.title,config.plan.width_m,config.plan.height_m,config.plan.image_crop,config.show_coverage,config.sensors,editing,points,states]);
}
export function scene(config, hass, now = Date.now()) {
  return config.sensors.map(sensor => {
    const error = deviceError(sensor, hass);
    const state = hass?.states?.[sensor.entity];
    const status = error ? {key:'mismatch', label:error, live:false} : sensorStatus(state,now);
    const targets = [], keys = new Set(); let invalid = 0, outside = 0;
    if (status.live) for (const t of state.attributes.targets.slice(0,10)) {
      if (!t || !Number.isInteger(t.id) || t.id < 0 || t.id > 65535 || keys.has(t.id) ||
        typeof t.x !== 'number' || typeof t.y !== 'number' || Math.abs(t.x) > 400 || t.y < 0 || t.y > 1000) {invalid++;continue;}
      const point = toWorld(sensor,t.x,t.y);
      if (!point) {invalid++;continue;}
      keys.add(t.id);
      if (point.x < 0 || point.x > config.plan.width_m || point.y < 0 || point.y > config.plan.height_m) {outside++;continue;}
      targets.push({key:`${sensor.entity}#${t.id}`, id:t.id, ...point, activity:t.activity === 'still' ? 'still' : t.activity === 'active' ? 'active' : 'unknown'});
    }
    const zs = hass?.states?.[sensor.zones_entity];
    const zones = [];
    const gridOK = zs?.attributes?.grid_rows === 20 && zs?.attributes?.grid_cols === 16;
    if (!error && sensor.show_zones && gridOK && !['unknown','unavailable'].includes(zs.state)) {
      for (const z of (Array.isArray(zs.attributes.zones) ? zs.attributes.zones : []).slice(0,8)) {
        if (!z || z.enabled === false || !Array.isArray(z.cells)) continue;
        const cells = [], seen = new Set();
        for (const cell of z.cells.slice(0,320)) {
          if (!Array.isArray(cell) || cell.length !== 2) continue;
          const [r,c] = cell, p = cellPolygon(sensor,r,c), k = `${r},${c}`;
          if (p && !seen.has(k)) {cells.push(p);seen.add(k);}
        }
        const name = zs.attributes.zone_names?.[z.id];
        zones.push({id:z.id, name:typeof name === 'string' ? name.slice(0,80) : `Zone ${z.id}`, cells});
      }
    }
    return {sensor,status,targets,zones,invalid,outside,zoneWarning:sensor.zones_entity && (!zs || !gridOK || ['unknown','unavailable'].includes(zs.state)) ? 'Zonen fehlen, sind offline oder das Raster wird nicht unterstützt.' : ''};
  });
}
export function calibrate(config, a, b, distance) {
  number(distance,0.1,100,'Referenzstrecke');
  for (const p of [a,b]) {number(p?.x,0,config.plan.width_m,'Messpunkt X');number(p?.y,0,config.plan.height_m,'Messpunkt Y');}
  const measured = Math.hypot(b.x-a.x,b.y-a.y);
  if (measured < 0.05) throw new Error('Messpunkte liegen zu dicht zusammen.');
  const ratio = distance/measured;
  return normalizeConfig({...config,plan:{...config.plan,width_m:config.plan.width_m*ratio,height_m:config.plan.height_m*ratio},
    sensors:config.sensors.map(s=>({...s,x:s.x*ratio,y:s.y*ratio}))});
}
export class EditSession {
  constructor(config) {this.current = normalizeConfig(config);this.draft = null;this.conflict = false;}
  receive(config) {
    const next = normalizeConfig(config);
    if (this.draft && JSON.stringify(next) !== JSON.stringify(this.current)) this.conflict = true;
    this.current = next;
  }
  begin() {this.draft = structuredClone(this.current);this.conflict = false;return this.draft;}
  cancel() {this.draft = null;this.conflict = false;}
  save() {
    if (!this.draft || this.conflict) throw new Error('Konfiguration wurde extern geändert. Entwurf abbrechen und neu beginnen.');
    const next = normalizeConfig(this.draft);this.current = next;this.cancel();return structuredClone(next);
  }
}
