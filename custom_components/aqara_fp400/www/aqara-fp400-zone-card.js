/*
 * Aqara FP400 zone card — paints detection zones and the entry/exit, interference and
 * monitoring regions on the sensor's 20 x 16 grid, and shows tracked people live.
 *
 * Config:
 *   type: custom:aqara-fp400-zone-card
 *   entity: sensor.<device>_zones          (required; the "Zones" sensor of this integration)
 *   regions_entity: sensor.<device>_regions (optional; derived from `entity` when omitted)
 *   targets_entity: sensor.<device>_tracked_people   (optional; derived from `entity` when omitted)
 *   title: Living room                      (optional)
 *   sensor_at: top | bottom                 (optional; default top, like the Aqara app)
 *   view_mode: radar | room                 (optional; default radar)
 *   room_width / room_height: metres        (room view, default 8 / 10)
 *   sensor_x / sensor_y: metres from left / top (room view)
 */

// Defaults; the Zones sensor reports grid_cols/grid_rows and the card follows those.
let COLS = 16;
let ROWS = 20;
// column 8 is straight ahead of the sensor (x ≈ -25 cm); columns grow as x decreases
const AHEAD_COL = 8.5 - 25 / 50;
const CELL_CM = 50;
const GUTTER = 1.6; // left gutter (grid units) for the distance labels
// Cool hues only, so a zone is never mistaken for the green/red/amber region outlines.
const ZONE_COLORS = ["#4f8ef7", "#a35bf7", "#19b5c9", "#e0409a", "#6e6cf0", "#7fb3ff", "#c084fc", "#ff8ad8"];
const REGION_KEYS = ["entry_exit", "interference", "monitoring"];
const REGION_META = {
  entry_exit: { label: "Entry/Exit", color: "#3bbf6a", dash: "", help: "Where people walk in and out. Paint the doorway cells." },
  interference: { label: "Interference", color: "#f75f4f", dash: "", help: "Things that fool the radar (fans, curtains). Paint them to ignore them." },
  monitoring: { label: "Monitoring", color: "#f2b600", dash: "0.35 0.25", help: "The area the sensor watches. Cells outside it are ignored." },
};
const SVG_NS = "http://www.w3.org/2000/svg";

// Presentation only. Sensor coordinates and saved cell indexes are never changed.
function fp400Room(config) {
  if(config.view_mode!==undefined&&!['radar','room'].includes(config.view_mode))throw new Error('view_mode: radar / room');
  if(config.view_mode!=='room')return null;
  const number=(key,fallback,min,max)=>{
    const raw=config[key]===undefined?fallback:config[key];
    const value=Number(raw);
    if(raw===null||typeof raw==='boolean'||String(raw).trim()===''||!Number.isFinite(value)||value<min||value>max)throw new Error(`${key}: ${min}–${max} m`);
    return value;
  };
  const width=number('room_width',8,.5,30),height=number('room_height',10,.5,30);
  return {width,height,x:number('sensor_x',width/2,0,width),y:number('sensor_y',config.sensor_at==='bottom'?height:0,0,height)};
}

// Identify sensors by their payload, not translated entity IDs.
function fp400Entities(hass, kind) {
  return Object.entries(hass?.states || {}).filter(([id, state]) => {
    if (!id.startsWith("sensor.")) return false;
    const a = state.attributes || {};
    if (kind === "zones") return Array.isArray(a.zones) && "grid_rows" in a;
    if (kind === "targets") return Array.isArray(a.targets) && "live_tracking" in a;
    return a.regions && typeof a.regions === "object" && "grid_rows" in a;
  }).map(([id]) => id);
}

function fp400Companion(hass, zoneId, kind) {
  const candidates = fp400Entities(hass, kind);
  const device = hass?.entities?.[zoneId]?.device_id;
  if (device) {
    const sameDevice = candidates.filter(id => hass.entities[id]?.device_id === device);
    return sameDevice.length === 1 ? sameDevice[0] : undefined;
  }
  // Compatibility for frontends without an entity registry: exact legacy naming only.
  const legacy = zoneId?.replace(/_zones$/, kind === "targets" ? "_tracked_people" : "_regions");
  return legacy !== zoneId && candidates.includes(legacy) ? legacy : undefined;
}

class AqaraFp400ZoneCardEditor extends HTMLElement {
  _t(de, en) { return (this._hass?.language || 'de').startsWith('de') ? de : en; }
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }

  _change(key, value) {
    const config = { ...this._config, type: "custom:aqara-fp400-zone-card" };
    if(key==='map_rotation') { value=Number(value);if(!Number.isFinite(value)||value < -180||value > 180)return; }
    if(['room_width','room_height','sensor_x','sensor_y'].includes(key)&&value!=='')value=Number(value);
    if (value!==''&&value!==undefined&&value!==null&&!(key==='map_rotation'&&value===0)) config[key] = value; else delete config[key];
    try{fp400Room(config);}catch(error){const field=this._fields?.[key]?.field;field?.setCustomValidity?.(error.message);field?.reportValidity?.();return;}
    for(const {field} of Object.values(this._fields??{}))field.setCustomValidity?.('');
    if (key === "entity") {
      for (const [field, kind] of [["targets_entity", "targets"], ["regions_entity", "regions"]]) {
        delete config[field];
        const companion = fp400Companion(this._hass, value, kind);
        if (companion) config[field] = companion;
      }
    }
    this._config = config;
    this._render();
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config }, bubbles: true, composed: true,
    }));
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `<style>
        :host{display:block;color:var(--primary-text-color)}
        label{display:block;margin:16px 0 6px;font-weight:500}
        select,input{box-sizing:border-box;width:100%;min-width:0;padding:12px;border:1px solid var(--divider-color,#888);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);font:inherit}
        p{line-height:1.5;color:var(--secondary-text-color)}
        small{display:block;margin-top:6px;color:var(--secondary-text-color)}
      </style><p>${this._t('Zuerst die Zonen des gewünschten FP400 auswählen. Eindeutig zugehörige Personen- und Bereiche-Sensoren werden vorausgewählt.', 'Select the zones sensor of your FP400 first. Matching people and regions sensors are selected automatically when unambiguous.')}</p>`;
      this._fields = {};
      for (const [key, label, kind] of [
        ["entity", this._t('Zonen','Zones'), "zones"],
        ["targets_entity", this._t('Verfolgte Personen','Tracked people'), "targets"],
        ["regions_entity", this._t('Bereiche (Ein-/Ausgang, Überwachung, Interferenz)','Regions (entry/exit, monitoring, interference)'), "regions"],
        ["title", this._t('Titel','Title'), null],
        ["sensor_at", this._t('Sensor in der Darstellung','Sensor position in the view'), "orientation"],
        ["map_rotation", this._t('Kartendrehung (−180° bis 180°)','Map rotation (−180° to 180°)'), null],
        ["view_mode", this._t('Sichtbarer Ausschnitt','Visible viewport'), "viewport"],
        ["room_width", this._t('Ausschnittbreite (m)','Viewport width (m)'), null],
        ["room_height", this._t('Ausschnitttiefe (m)','Viewport depth (m)'), null],
        ["sensor_x", this._t('Sensor-X ab linkem Rand (m)','Sensor X from left edge (m)'), null],
        ["sensor_y", this._t('Sensor-Y ab oberem Rand (m)','Sensor Y from top edge (m)'), null],
      ]) {
        const labelEl = document.createElement("label");
        labelEl.htmlFor = key; labelEl.textContent = label;
        const field = document.createElement(kind ? "select" : "input");
        field.id = key;
        if(key==='map_rotation'){field.type='number';field.min='-180';field.max='180';field.step='1';}
        if(['room_width','room_height','sensor_x','sensor_y'].includes(key)){field.type='number';field.min=key.startsWith('room_')?'.5':'0';field.max='30';field.step='any';}
        field.addEventListener("change", event => this._change(key, event.target.value));
        root.append(labelEl, field);
        this._fields[key] = { field, kind };
      }
      const presets=document.createElement('div');
      for(const angle of [-45,0,45]){const b=document.createElement('button');b.textContent=`${angle>0?'+':''}${angle}°`;b.addEventListener('click',()=>this._change('map_rotation',angle));presets.appendChild(b);}
      root.append(presets);
      const note = document.createElement("small");
      note.textContent = this._t('Alle Entitäten müssen zum selben FP400 gehören. Der Raumausschnitt blendet nur die Anzeige außerhalb aus; er verändert keine Sensorflächen oder Live-Daten. Im Raumausschnitt dreht die Karte um den Sensor: „Oben“ blickt bei 0° nach unten, „Unten“ nach oben. Positive Winkel drehen im Uhrzeigersinn. X/Y ab linkem/oberem Ausschnittrand; die Vorschau zeigt Montagepunkt und Richtung.', 'All entities must belong to the same FP400. The room viewport only clips the display; sensor areas and live data stay unchanged. Room view rotates around the sensor: Top faces down at 0°, Bottom faces up. Positive angles rotate clockwise. X/Y are measured from the left/top viewport edge; the preview shows position and direction.');
      root.append(note);
    }
    for (const [key, { field, kind }] of Object.entries(this._fields)) {
      if (!kind) {
        const defaults={map_rotation:0,room_width:8,room_height:10,sensor_x:Number(this._config.room_width??8)/2,sensor_y:this._config.sensor_at==='bottom'?Number(this._config.room_height??10):0};
        const value=String(this._config[key]??defaults[key]??'');
        field.disabled=['room_width','room_height','sensor_x','sensor_y'].includes(key)&&this._config.view_mode!=='room';
        if(this.shadowRoot.activeElement!==field&&field.value!==value)field.value=value;continue;
      }
      const options = kind === "orientation"
        ? [["top", this._t('Oben','Top')], ["bottom", this._t('Unten','Bottom')]]
        : kind === 'viewport' ? [['radar',this._t('Vollständiges Radar (Standard)','Full radar (default)')],['room',this._t('Raumausschnitt und freie Sensorposition','Room viewport and free sensor position')]]
        : [["", key === "entity" ? this._t('Zonen-Entität auswählen','Select zones entity') : this._t('Automatisch (gleiches Gerät)','Automatic (same device)')],
          ...fp400Entities(this._hass, kind).map(id => [id, `${this._hass.states[id].attributes.friendly_name || id} — ${id}`])];
      const selected = this._config[key] || (kind === "orientation" ? "top" : kind==='viewport'?'radar':"");
      if (selected && !options.some(([value]) => value === selected)) options.push([selected, `${selected} (${this._t('nicht verfügbar oder unpassender Sensor','unavailable or incompatible sensor')})`]);
      const signature = JSON.stringify(options);
      if (signature !== field._options) {
        field.replaceChildren(...options.map(([value, text]) => {
          const option = document.createElement("option"); option.value = value; option.textContent = text; return option;
        }));
        field._options = signature;
      }
      field.value = selected;
    }
  }
}

class AqaraFp400ZoneCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("aqara-fp400-zone-card-editor");
  }

  static getStubConfig(hass) {
    const candidates = fp400Entities(hass, "zones");
    if (candidates.length !== 1) return { title: "FP400", sensor_at: "top" };
    const entity = candidates[0];
    return { entity, targets_entity: fp400Companion(hass, entity, "targets"),
      regions_entity: fp400Companion(hass, entity, "regions"), sensor_at: "top" };
  }

  setConfig(config) {
    const rotation=Number(config.map_rotation??0);
    if(!Number.isFinite(rotation)||rotation < -180||rotation > 180)throw new Error('map_rotation must be between -180 and 180 degrees');
    const room=fp400Room(config);
    this._rotation=rotation;
    this._room=room;
    this._editing = false;
    this._conflict = false;
    this._guard = null;
    this._nameDrafts = {};
    this._pendingNames = {};
    this._renameRequests = {};
    this._forget = null;
    this._controlsKey = null;
    this._config = config;
    this._top = config.sensor_at !== "bottom"; // sensor drawn at the top, room extends downward (as in the Aqara app)
    this._mode = "zones"; // "zones" or a REGION_KEYS entry
    this._edit = null; // zones edit: Map<id, {cells:Set, enabled, type}>
    this._regionEdit = null; // region edit: {key, cells:Set}
    this._active = 1;
    this._pointerDown = false;
    this._paintValue = null;
    if (!this.shadowRoot) this._build();else this._buildGrid();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 8;
  }

  _t(de, en) { return (this._hass?.language || 'de').startsWith('de') ? de : en; }
  _zoneNameValue(id) { return this._pendingNames?.[id]?.name ?? this._hass?.states[this._config.entity]?.attributes?.zone_names?.[String(id)] ?? ''; }
  _zoneName(id) { return this._zoneNameValue(id) || `Zone ${id}`; }
  _trackingStatus() {
    if(!this._config)return {kind:'offline',received:null};
    const state=this._hass?.states?.[this._targetsEntity()];
    const zone=this._hass?.states?.[this._config.entity];
    const raw=state?.attributes?.position_received;
    const received=typeof raw==='string'?Date.parse(raw):NaN;
    const age=Number.isFinite(received)?Date.now()-received:null;
    let kind='live';
    if(!state||!zone||[state.state,zone.state].some(s=>['unknown','unavailable'].includes(s)))kind='offline';
    else if(state.attributes.live_tracking!==true)kind='tracking_off';
    else if(age===null)kind='no_reports';
    else if(age < -5000)kind='clock_skew';
    else if(age>=15000)kind='stale';
    return {kind,received:Number.isFinite(received)?received:null};
  }

  _selectedFreshTarget(id=this._forget) {
    if(this._trackingStatus().kind!=='live')return null;
    return this._hass.states[this._targetsEntity()]?.attributes?.targets?.find(t=>t.id===id) || null;
  }
  _dirty() { return !!(this._edit || this._regionEdit); }
  _nameSaveDrafts() { const drafts={...this._nameDrafts};for(const id of Object.keys(this._renameRequests||{}))drafts[id]??=this._zoneNameValue(id);return drafts; }
  _available() {
    const ids = [this._config.entity]; if (this._mode !== 'zones') ids.push(this._regionsEntity());
    return ids.every(id => { const s = this._hass?.states?.[id]; return s && !['unavailable', 'unknown'].includes(s.state); });
  }
  _pending() {
    const a=this._hass?.states?.[this._mode === 'zones' ? this._config.entity : this._regionsEntity()]?.attributes;
    return !!(this._mode === 'zones' ? a?.pending : a?.pending?.[this._mode]);
  }
  _canEdit() { return this._editing && !this.preview && !this._saving && !this._awaiting && !this._conflict && !this._pending() && this._available(); }
  _snapshot(mode = this._mode) {
    const zones = mode === 'zones' ? this._entityZones() : null;
    return JSON.stringify(zones ? [...zones].sort(([a],[b]) => a-b).map(([id,z]) => [id,z.enabled,z.type,[...z.cells].sort((a,b)=>a-b)]) : [...this._entityRegions()[mode]].sort((a,b)=>a-b));
  }
  _draftSnapshot() {
    return JSON.stringify(this._mode === 'zones' ? [...this._zones()].sort(([a],[b])=>a-b).map(([id,z])=>[id,z.enabled,z.type,[...z.cells].sort((a,b)=>a-b)]) : [...this._regions()[this._mode]].sort((a,b)=>a-b));
  }
  _beginEditing() {
    if (this.preview || !this._available() || this._pending()) return;
    this._editing = true; this._baseline = this._snapshot(); this._nameBaseline = {...this._hass.states[this._config.entity]?.attributes?.zone_names};
    for (const [id,pending] of Object.entries(this._pendingNames || {})) this._nameBaseline[id]=pending.name;
    this._forget = null; this._conflict = false; this._render();
  }
  _leave(mode = null) {
    if (this._saving || this._awaiting) return;
    if (this._dirty() || Object.keys(this._nameSaveDrafts()).length) { this._guard = {mode}; this._render(); return; }
    this._finishEdit(mode);
  }
  _finishEdit(mode = null) {
    clearTimeout(this._confirmationTimer);
    this._edit = null; this._regionEdit = null; this._nameDrafts = {}; this._renameRequests={}; this._guard = null;
    this._conflict = false; this._confirmedEmpty = false; this._awaiting = null;
    if (mode) { this._mode = mode; this._baseline = this._snapshot(); } else this._editing = false;
    this._controlsKey = null; this._render();
  }
  _checkState() {
    const targetState = this._hass?.states[this._targetsEntity()];
    if (!this._available() || !targetState || !this._selectedFreshTarget()) this._forget = null;
    const names=this._hass.states[this._config.entity]?.attributes?.zone_names || {};
    for(const [id,pending] of Object.entries(this._pendingNames || {})) {
      const current=names[id] || '';
      const zoneState=this._hass.states[this._config.entity];
      const deleted=zoneState && !['unknown','unavailable'].includes(zoneState.state) && !zoneState.attributes.pending && !zoneState.attributes.error && !this._entityZones().has(Number(id));
      if(deleted || current===pending.name || !pending.previous.includes(current)) delete this._pendingNames[id];
    }
    if (!this._editing) return;
    if (!this._saving) for (const id of Object.keys(this._nameDrafts || {})) {
      if (String(this._writingName) !== id && this._zoneNameValue(id) !== (this._nameBaseline?.[id] || '')) this._conflict=true;
    }
    for (const id of new Set([...Object.keys(names),...Object.keys(this._nameBaseline || {})])) {
      if (!(id in (this._nameDrafts || {}))) (this._nameBaseline ||= {})[id]=this._zoneNameValue(id);
    }
    if (this._awaiting) {
      const a = this._hass.states[this._mode === 'zones' ? this._config.entity : this._regionsEntity()]?.attributes || {};
      const pending = this._mode === 'zones' ? a.pending : a.pending?.[this._mode];
      const error = this._mode === 'zones' ? a.error : a.error?.[this._mode];
      if (error && !pending) { this._awaiting = null; this.shadowRoot.querySelector('.error').textContent = error; }
      else if (!pending && this._available() && this._snapshot() === this._awaiting.expected) {
        const next = this._awaiting.next; this._awaiting = null; this._finishEdit(next); return;
      } else if (Date.now() > this._awaiting.deadline) {
        this._awaiting = null; this.shadowRoot.querySelector('.error').textContent = this._t('Keine Sensorbestätigung erhalten. Entwurf bleibt erhalten.', 'No sensor confirmation received. Your draft is retained.');
      }
    } else if (!this._saving && this._snapshot() !== this._baseline) {
      if (this._dirty()) this._conflict = true;
      else this._baseline = this._snapshot();
    }
  }

  // ---------------------------------------------------------------- build

  _build() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { display: block; padding: 16px; container-type: inline-size; }
        * { box-sizing: border-box; }

        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .title { font-size: 1.15em; font-weight: 500; line-height: 1.3; }
        .sub { color: var(--secondary-text-color); font-size: 0.85em; margin-top: 2px; display: flex; align-items: center; gap: 6px; }
        .header > div {min-width:0}
        .sub-text {white-space:pre-line;overflow-wrap:anywhere}
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--secondary-text-color); opacity: 0.5; }
        .live-dot.on { background: #3bbf6a; opacity: 1; box-shadow: 0 0 0 3px rgba(59, 191, 106, 0.25); }
        .sync { flex: none; font-size: 0.8em; padding: 4px 10px; border-radius: 12px; background: var(--secondary-background-color); color: var(--secondary-text-color); white-space: nowrap; }
        .sync.dirty { color: #b98300; background: rgba(242, 182, 0, 0.16); }
        .sync.busy { color: var(--primary-color); }
        .sync.bad { color: var(--error-color, #db4437); background: rgba(219, 68, 55, 0.14); }

        .layers { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; border-radius: 12px; background: var(--secondary-background-color); margin-bottom: 12px; }
        .layer { flex: 1 1 0; min-width: 0; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 9px; cursor: pointer; font-size: 0.88em; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background 0.15s, color 0.15s; }
        .layer:hover { color: var(--primary-text-color); }
        .layer.active { background: var(--card-background-color); color: var(--primary-text-color); font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18); }
        .layer .dot { flex: none; width: 10px; height: 10px; border-radius: 50%; }
        .layer .dot.zones { background: linear-gradient(135deg, #4f8ef7 50%, #a35bf7 50%); }
        .layer .dot.ring { background: none; border: 2.5px solid currentColor; }
        @container (max-width: 380px) { .layer { flex-basis: calc(50% - 2px); } }

        .grid { position: relative; width: 100%; aspect-ratio: ${COLS + GUTTER} / ${ROWS}; touch-action: pan-y; user-select: none; border-radius: 10px; background: var(--secondary-background-color); overflow: hidden; }
        .grid.editing { touch-action: none; outline: 3px solid var(--primary-color); }
        .grid:not(.editing) .cell { cursor: default; }
        .selection-ring { fill:none;stroke:#fff;stroke-width:.13;pointer-events:none; }
        .selection-ring.outer {stroke:#111;stroke-width:.16;}
        .selection-label {font-size:.48px;fill:var(--primary-text-color);paint-order:stroke;stroke:var(--card-background-color);stroke-width:.12;pointer-events:none;}
        .name-editor {display:flex;flex-wrap:wrap;gap:8px;width:100%;align-items:center}
        .name-editor input {font:inherit;max-width:100%;padding:8px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px}
        .guard {display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
        .guard:empty {display:none}
        svg { width: 100%; height: 100%; display: block; }
        .cell { stroke: var(--divider-color, rgba(127,127,127,0.3)); stroke-width: 0.025; fill: var(--primary-text-color); fill-opacity: 0; cursor: crosshair; transition: fill-opacity 0.1s; }
        .cell.outside { fill-opacity: 0.07; }
        .cell.painted { fill-opacity: 0.6; }
        .cell.painted.disabled { fill-opacity: 0.18; }
        .cell.region-tint { fill-opacity: 0.16; }
        .cell.region-fill { fill-opacity: 0.45; }
        .cell.hover-zone:hover { fill-opacity: 0.35; }
        .gridline { stroke: var(--primary-text-color); stroke-opacity: 0.12; stroke-width: 0.04; }
        .ahead { stroke: var(--primary-text-color); stroke-opacity: 0.12; stroke-width: 0.04; stroke-dasharray: 0.3 0.3; }
        .label { fill: var(--secondary-text-color); font-size: 0.55px; font-family: inherit; }
        .sensor { fill: var(--primary-text-color); }
        .sensor-halo { fill: var(--primary-text-color); fill-opacity: 0.08; }
        .region-outline { fill: none; stroke-width: 0.16; stroke-linecap: square; stroke-linejoin: round; }
        .region-outline.dim { stroke-opacity: 0.55; }
        .target { fill: var(--primary-color); stroke: var(--card-background-color, #fff); stroke-width: 0.1; cursor: pointer; }
        .target.still { fill: var(--card-background-color, #fff); stroke: var(--primary-color); stroke-width: 0.12; }
        .target-halo { fill: var(--primary-color); fill-opacity: 0.18; }
        .grid.stale .target,.grid.stale .target-halo {opacity:.35}

        .tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; }
        .chip { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 14px 6px 10px; border-radius: 20px; cursor: pointer; font-size: 0.92em; border: 2px solid transparent; background: var(--secondary-background-color); color: var(--primary-text-color); transition: border-color 0.15s, background 0.15s; }
        .chip:hover { border-color: var(--divider-color); }
        .chip .dot { width: 14px; height: 14px; border-radius: 50%; }
        .chip .n { color: var(--secondary-text-color); font-size: 0.85em; }
        .chip.active { border-color: var(--primary-text-color); }
        .chip.active .n { color: inherit; }
        .chip.new { border-style: dashed; border-color: var(--divider-color); }
        .chip.new.active { border-color: var(--primary-text-color); }
        .chip.new .dot { opacity: 0.5; }
        .chip.erase .dot { background: none; border: 2px solid currentColor; opacity: 0.5; }

        .panel { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--divider-color); font-size: 0.9em; }
        .panel:empty { display: none; }
        .panel .name { font-weight: 600; display: inline-flex; align-items: center; gap: 8px; }
        .panel .name .dot { width: 12px; height: 12px; border-radius: 50%; }
        .panel .meta { color: var(--secondary-text-color); }
        .panel .spacer { flex: 1; min-width: 8px; }
        .panel .btns { display: flex; gap: 8px; flex: none; }

        button { font: inherit; background: var(--primary-color); color: var(--text-primary-color, #fff); border: 0; border-radius: 8px; padding: 8px 16px; min-height: 40px; cursor: pointer; font-size: 0.92em; }
        button.secondary { background: var(--secondary-background-color); color: var(--primary-text-color); }
        button.ghost { background: transparent; color: var(--primary-text-color); border: 1px solid var(--divider-color); }
        button.danger { color: var(--error-color, #db4437); }
        button:disabled { opacity: 0.4; cursor: default; }
        button.small { min-height: 34px; padding: 6px 12px; font-size: 0.86em; }
        button.layer { background:transparent;color:var(--secondary-text-color);border:0; }
        button.layer.active { background:var(--card-background-color);color:var(--primary-text-color); }
        button:focus-visible,.target:focus-visible,.cell:focus-visible {outline:2px solid var(--primary-color);outline-offset:2px;}

        .footer { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--divider-color); }
        .footer .hint { flex: 1; color: var(--secondary-text-color); font-size: 0.82em; line-height: 1.35; }
        .footer.dirty .hint { color: var(--primary-text-color); }
        .footer.warn .hint { color: var(--error-color, #db4437); font-weight: 500; }
        .footer .actions { display: flex; gap: 8px; flex: none; }
        .error { color: var(--error-color); font-size: 0.85em; margin-top: 8px; }
        .error:empty { display: none; }
      </style>
      <ha-card>
        <div class="header">
          <div>
            <div class="title"></div>
            <div class="sub"><span class="live-dot"></span><span class="sub-text"></span></div>
          </div>
          <span class="sync"></span>
        </div>
        <div class="layers"></div>
        <div class="viewport-note sub"></div>
        <div class="grid"><svg></svg></div>
        <div class="tools"></div>
        <div class="panel"></div>
        <div class="guard" role="alert"></div>
        <div class="footer"><span class="hint"></span><span class="actions"></span></div>
        <div class="error"></div>
      </ha-card>`;
    this._svg = root.querySelector("svg");
    this._buildGrid();

    const grid = root.querySelector(".grid");
    grid.addEventListener("pointerdown", (ev) => this._onPointer(ev, true));
    grid.addEventListener("pointermove", (ev) => this._onPointer(ev, false));
    grid.addEventListener("pointerup", () => (this._pointerDown = false));
    grid.addEventListener("pointercancel", () => (this._pointerDown = false));
    grid.addEventListener("pointerleave", () => (this._pointerDown = false));
  }

  _el(tag, attrs = {}, cls = "") {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (cls) el.setAttribute("class", cls);
    return el;
  }

  // y of a row's top edge in the SVG: row 0 is nearest the sensor, at the top (default) or the bottom
  _rowY(r) {
    return this._top ? r : ROWS - 1 - r;
  }

  // y of a distance from the sensor in cm
  _distY(cm) {
    return this._top ? cm / CELL_CM : ROWS - cm / CELL_CM;
  }

  _rotationBounds() {
    if(this._room)return {left:0,top:0,width:this._room.width*2,height:this._room.height*2};
    const angle=(this._rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=COLS/2,cy=ROWS/2;
    const points=[[-GUTTER-.5,-1.5],[COLS+.5,-1.5],[-GUTTER-.5,ROWS+1.5],[COLS+.5,ROWS+1.5]].map(([x,y])=>[cx+(x-cx)*c-(y-cy)*s,cy+(x-cx)*s+(y-cy)*c]);
    const left=Math.min(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1]));
    return {left,top,width:Math.max(...points.map(p=>p[0]))-left,height:Math.max(...points.map(p=>p[1]))-top};
  }

  _upright(el,x,y) { el.setAttribute('transform',`rotate(${-this._rotation||0} ${x} ${y})`); }

  _mapTransform() {
    if(!this._room)return `rotate(${this._rotation||0} ${COLS/2} ${ROWS/2})`;
    const sy=this._top?0:ROWS;
    return `translate(${this._room.x*2-AHEAD_COL} ${this._room.y*2-sy}) rotate(${this._rotation||0} ${AHEAD_COL} ${sy})`;
  }

  _inViewport(x,y) {
    if(!this._room)return true;
    const sy=this._top?0:ROWS,a=(this._rotation||0)*Math.PI/180;
    const wx=this._room.x*2+(x-AHEAD_COL)*Math.cos(a)-(y-sy)*Math.sin(a);
    const wy=this._room.y*2+(x-AHEAD_COL)*Math.sin(a)+(y-sy)*Math.cos(a);
    return wx>=0&&wy>=0&&wx<=this._room.width*2&&wy<=this._room.height*2;
  }

  _cellAtPointer(ev) {
    try {
      const matrix=this._mapLayer?.getScreenCTM?.();
      if(matrix && this._svg?.createSVGPoint) {
        const p=this._svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;
        const local=p.matrixTransform(matrix.inverse());
        // Pointer capture keeps delivering moves outside the clipped SVG.
        // Check the actual point, not the centre of its possibly partial cell.
        if(!Number.isFinite(local.x)||!Number.isFinite(local.y)||!this._inViewport(local.x,local.y))return null;
        const col=Math.floor(local.x),visualRow=Math.floor(local.y);
        if(col<0||col>=COLS||visualRow<0||visualRow>=ROWS)return null;
        return (this._top?visualRow:ROWS-1-visualRow)*COLS+col;
      }
    } catch { return null; }
    // A captured event target can be the old cell even while the pointer is
    // outside the room. Never guess clipped coordinates from that target.
    if(this._room)return null;
    const cell=this.shadowRoot.elementFromPoint?.(ev.clientX,ev.clientY)||ev.target;
    return cell?.dataset?.index === undefined ? null : Number(cell.dataset.index);
  }

  _keyboardCell(index,key) {
    const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
    if(!direction)return null;
    const [dx,dy]=direction,a=(this._rotation||0)*Math.PI/180;
    const dc=Math.round(dx*Math.cos(a)+dy*Math.sin(a)),dr=Math.round(-dx*Math.sin(a)+dy*Math.cos(a))*(this._top?1:-1);
    const next=Math.max(0,Math.min(ROWS-1,Math.floor(index/COLS)+dr))*COLS+Math.max(0,Math.min(COLS-1,index%COLS+dc));
    return this._inViewport(next%COLS+.5,this._rowY(Math.floor(next/COLS))+.5)?next:index;
  }

  _buildGrid() {
    this._gridDims = `${COLS}x${ROWS}`;
    this._svg.innerHTML = "";
    const bounds=this._rotationBounds();
    const note=this.shadowRoot.querySelector('.viewport-note');
    if(note){note.hidden=!this._room;note.textContent=this._room?this._t(`Raumausschnitt ${this._room.width} × ${this._room.height} m · außerhalb liegende Zellen und Ziele ausgeblendet. Live-Anzahl gilt für das gesamte Radar.`,`Room viewport ${this._room.width} × ${this._room.height} m · outside cells and targets clipped. Live count covers the full radar.`):'';}
    this._svg.setAttribute('viewBox',`${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`);
    this._svg.style.overflow='hidden';
    this.shadowRoot.querySelector('.grid').style.aspectRatio=`${bounds.width} / ${bounds.height}`;
    this._mapLayer=this._el('g',{transform:this._mapTransform()});
    this._svg.appendChild(this._mapLayer);

    // distance labels + guide lines every metre (2 rows), and the straight-ahead line
    const guides = this._el("g");
    for (let r = 2; r < ROWS; r += 2) {
      const y = this._distY(r * CELL_CM);
      guides.appendChild(this._el("line", { x1: 0, y1: y, x2: COLS, y2: y }, "gridline"));
      const t = this._el("text", { x: -0.25, y: y + 0.2, "text-anchor": "end" }, "label");
      t.textContent = `${r / 2} m`;
      this._upright(t,-.25,y+.2);
      guides.appendChild(t);
    }
    guides.appendChild(this._el("line", { x1: AHEAD_COL, y1: 0, x2: AHEAD_COL, y2: ROWS }, "ahead"));
    this._mapLayer.appendChild(guides);

    this._cells = [];
    const cellLayer = this._el("g");
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const rect = this._el("rect", { x: c, y: this._rowY(r), width: 1, height: 1 }, "cell");
        rect.dataset.index = r * COLS + c;
        rect.setAttribute('role','button');
        rect.setAttribute('aria-label', `${r+1}, ${c+1}`);
        rect.addEventListener('keydown', ev => {
          if (!this._canEdit()) return;
          const idx = Number(rect.dataset.index);
          const next=this._keyboardCell(idx,ev.key);
          if (next !== null) { ev.preventDefault(); this._cells[next].focus(); }
          else if (ev.key === ' ' || ev.key === 'Enter') {ev.preventDefault();if(this._mode==='zones')this._paintZone(idx,true);else this._paintRegion(idx,true);this._render();}
        });
        cellLayer.appendChild(rect);
        this._cells.push(rect);
      }
    }
    this._mapLayer.appendChild(cellLayer);

    this._regionLayer = this._el("g");
    this._mapLayer.appendChild(this._regionLayer);

    const sensor = this._el("g");
    const sy = this._top ? 0 : ROWS; // sensor edge
    const tip = this._top ? 0.65 : ROWS - 0.65; // triangle points into the room
    sensor.appendChild(this._el("circle", { cx: AHEAD_COL, cy: sy, r: 1.4 }, "sensor-halo"));
    sensor.appendChild(this._el("path", { d: `M ${AHEAD_COL - 0.55} ${sy} L ${AHEAD_COL} ${tip} L ${AHEAD_COL + 0.55} ${sy} Z` }, "sensor"));
    this._mapLayer.appendChild(sensor);

    this._targetLayer = this._el("g");
    this._mapLayer.appendChild(this._targetLayer);
  }

  // ---------------------------------------------------------------- state (zones)

  _entityZones() {
    const state = this._hass?.states[this._config.entity];
    const zones = new Map();
    for (const zone of state?.attributes?.zones || []) {
      zones.set(zone.id, { cells: new Set(zone.cells.map(([r, c]) => r * COLS + c)), enabled: zone.enabled !== false, type: zone.type || 0 });
    }
    return zones;
  }

  _zones() {
    return this._edit ? this._edit.zones : this._entityZones();
  }

  _startEdit() {
    if (!this._edit) {
      const zones = new Map();
      for (const [id, zone] of this._entityZones()) zones.set(id, { ...zone, cells: new Set(zone.cells) });
      this._edit = { zones };
    }
    return this._edit.zones;
  }

  // ---------------------------------------------------------------- state (regions)

  _regionsEntity() {
    return this._config.regions_entity || fp400Companion(this._hass, this._config.entity, "regions");
  }

  _entityRegions() {
    const attrs = this._hass?.states[this._regionsEntity()]?.attributes?.regions || {};
    const out = {};
    for (const key of REGION_KEYS) {
      out[key] = new Set((attrs[key] || []).map(([r, c]) => r * COLS + c));
    }
    return out;
  }

  // cells of every region, with the one being edited overridden
  _regions() {
    const out = this._entityRegions();
    if (this._regionEdit) out[this._regionEdit.key] = this._regionEdit.cells;
    return out;
  }

  _startRegionEdit(key) {
    if (!this._regionEdit || this._regionEdit.key !== key) {
      this._regionEdit = { key, cells: new Set(this._entityRegions()[key]) };
    }
    return this._regionEdit.cells;
  }

  _targetsEntity() {
    return this._config.targets_entity || fp400Companion(this._hass, this._config.entity, "targets");
  }

  _deviceId() {
    return this._hass?.entities?.[this._config.entity]?.device_id;
  }

  _maxZones() {
    return this._hass?.states[this._config.entity]?.attributes?.max_zones || 8;
  }

  _zoneColor(id) {
    return ZONE_COLORS[(id - 1) % ZONE_COLORS.length];
  }

  // ---------------------------------------------------------------- render

  _render() {
    if (!this._hass || !this.shadowRoot) return;
    this._checkState();
    const root = this.shadowRoot;
    root.querySelector('.grid').classList.toggle('editing', !!this._editing);
    const state = this._hass.states[this._config.entity];
    const cols = Number(state?.attributes?.grid_cols) || COLS;
    const rows = Number(state?.attributes?.grid_rows) || ROWS;
    if (`${cols}x${rows}` !== this._gridDims) {
      COLS = cols;
      ROWS = rows;
      this._buildGrid();
    }
    root.querySelector(".title").textContent = this._config.title || state?.attributes?.friendly_name?.replace(/ Zones$/, "") || "FP400";
    const targetsState = this._hass.states[this._targetsEntity()];
    const targets = targetsState?.attributes?.targets || [];
    const trackingKnown = targetsState && !["unknown", "unavailable"].includes(targetsState.state)
      && typeof targetsState.attributes?.live_tracking === "boolean";
    const tracking=this._trackingStatus();
    const live = tracking.kind==='live';
    root.querySelector('.grid').classList.toggle('stale',!live);
    root.querySelector(".live-dot").classList.toggle("on", live);
    const activity = targetsState?.attributes?.activity_state;
    const statusText={live:this._t('live','live'),offline:this._t('Nicht verbunden','Offline'),tracking_off:this._t('Live-Tracking aus','Live tracking off'),no_reports:this._t('Noch keine Positionsmeldung','No position report yet'),clock_skew:this._t('Zeitabweichung – Aktualität der Position unbekannt','Clock mismatch — position freshness unknown'),stale:this._t('Positionsdaten veraltet – keine Aussage zur Anwesenheit','Position data stale — presence unknown')}[tracking.kind];
    const last=tracking.received===null?this._t('Letzte Positionsmeldung: noch keine','Last position report: none'):this._t('Letzte Positionsmeldung: ','Last position report: ')+new Date(tracking.received).toLocaleString(this._hass.language||'de');
    root.querySelector('.sub-text').textContent=state?`${live?`${targets.length} ${this._t(targets.length===1?'Person':'Personen',targets.length===1?'person':'people')} · `:''}${statusText}\n${last}`:this._t('Bitte Zonen-Entität auswählen','Select a zones entity');
    this._renderSync(state);

    const zones = this._zones();
    const regions = this._regions();
    const editingRegion = this._mode !== "zones" ? this._mode : null;
    const monitored = regions.monitoring;
    const shadeOutside = monitored.size > 0 && editingRegion !== "monitoring";

    const owner = new Array(ROWS * COLS).fill(null);
    for (const [id, zone] of zones) for (const idx of zone.cells) owner[idx] = id;

    this._cells.forEach((rect, idx) => {
      const visible=this._inViewport(idx%COLS+.5,this._rowY(Math.floor(idx/COLS))+.5);
      rect.setAttribute('tabindex', this._editing&&visible ? '0' : '-1');
      rect.setAttribute('aria-hidden',visible?'false':'true');
      rect.setAttribute("class", "cell");
      rect.style.fill = "";
      const zoneId = owner[idx];
      if (editingRegion && regions[editingRegion].has(idx)) {
        rect.classList.add("region-fill");
        rect.style.fill = REGION_META[editingRegion].color;
      } else if (zoneId !== null) {
        rect.classList.add(editingRegion ? "region-tint" : "painted");
        if (!editingRegion) rect.classList.toggle("disabled", zones.get(zoneId).enabled === false);
        rect.style.fill = this._zoneColor(zoneId);
      } else if (shadeOutside && !monitored.has(idx)) {
        rect.classList.add("outside");
      }
      if (this._editing && !editingRegion && this._active > 0 && zoneId === null && !rect.classList.contains("outside")) {
        rect.classList.add("hover-zone");
        rect.style.fill = this._zoneColor(this._active);
      }
    });

    // regions are drawn as a single outline around their area (the edited one is solid, above)
    this._regionLayer.innerHTML = "";
    for (const key of REGION_KEYS) {
      if (key === editingRegion || regions[key].size === 0) continue;
      const path = this._regionOutline(regions[key], REGION_META[key]);
      if (editingRegion) path.classList.add("dim");
      this._regionLayer.appendChild(path);
    }

    const focusedTarget = root.activeElement?.dataset?.targetId;
    this._targetLayer.innerHTML = "";
    for (const t of targets) {
      const cx = Math.min(COLS - 0.3, Math.max(0.3, AHEAD_COL - t.x / CELL_CM));
      const cy = Math.min(ROWS - 0.3, Math.max(0.3, this._distY(t.y)));
      const still = t.activity === "still";
      if (this._forget === t.id) {
        this._targetLayer.appendChild(this._el('circle', {cx,cy,r:.65}, 'selection-ring outer'));
        this._targetLayer.appendChild(this._el('circle', {cx,cy,r:.5}, 'selection-ring'));
        const label = this._el('text', {x: Math.min(COLS-5,Math.max(0,cx-2)),y:cy < 1.3 ? cy+1.1 : cy-.85}, 'selection-label');
        this._upright(label,Math.min(COLS-5,Math.max(0,cx-2)),cy < 1.3 ? cy+1.1 : cy-.85);
        label.textContent = this._t('Ausgewählt: Erkennung ', 'Selected: track ') + t.id;
        this._targetLayer.appendChild(label);
      }
      if (!still) this._targetLayer.appendChild(this._el("circle", { cx, cy, r: 0.7 }, "target-halo"));
      const dot = this._el("circle", { cx, cy, r: 0.36 }, "target" + (still ? " still" : ""));
      dot.dataset.targetId = t.id;
      const title = this._el("title");
      title.textContent = this._targetDescription(t);
      dot.appendChild(title);
      // a click on a dot offers to forget it (ghosts); stop it reaching the painting handler
      const visible=this._inViewport(cx,cy);
      dot.setAttribute('tabindex', this._editing||!visible ? '-1' : '0');
      dot.setAttribute('aria-hidden',visible?'false':'true');
      dot.setAttribute('role','button'); dot.setAttribute('aria-label', title.textContent);
      const select = ev => { ev.stopPropagation(); if (this._editing || this.preview || !live || !this._available()) return; this._forget = t.id; this._controlsKey = null; this._render(); };
      dot.addEventListener('click', select);
      dot.addEventListener('pointerdown', select);
      dot.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') {ev.preventDefault();select(ev);} });
      this._targetLayer.appendChild(dot);
      if (focusedTarget === String(t.id)) dot.focus();
    }

    // Rebuild the controls only when their inputs change: hass updates arrive several times a
    // second while live tracking is on, and replacing a button between mousedown and mouseup
    // swallows the click.
    const key = JSON.stringify([
      this._mode, this._active, !!this._saving, !!this._edit, this._regionEdit?.key, !!this._confirmedEmpty, this._forget, this._editing, this._conflict, this._guard, !!this._awaiting, !!this._available(), !!this.preview, this._pending(),
      state?.attributes?.zone_names, !!this._hass.services?.aqara_fp400?.set_zone_name, this._hass.language,
      state?.attributes?.zone_entity_names,!!this._hass.user?.is_admin,tracking.kind,
      [...zones].map(([id, z]) => [id, z.cells.size, z.enabled]),
      REGION_KEYS.map((k) => regions[k].size),
      state?.attributes?.max_zones,
    ]);
    if (key !== this._controlsKey) {
      this._controlsKey = key;
      this._renderLayers(zones, regions);
      this._renderTools(zones, regions, state);
      this._renderGuard();
    }
    const position = root.querySelector('.selected-position');
    if (position) position.textContent = this._targetDescription(targets.find(t=>t.id === this._forget));
  }

  _targetDescription(t) {
    if (!t) return '';
    return `${this._t('Erkennung','Track')} ${t.id}: ${(t.y/100).toFixed(1)} m ${this._t('voraus','ahead')}, ${Math.abs(t.x/100).toFixed(1)} m ${t.x < 0 ? this._t('rechts','right') : this._t('links','left')}${t.zones?.length ? ' · ' + t.zones.map(id=>this._zoneName(id)).join(', ') : ''}`;
  }

  // an SVG path tracing the perimeter of a set of cells (boundary edges only)
  _regionOutline(cells, meta) {
    const has = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS && cells.has(r * COLS + c);
    const seg = [];
    for (const idx of cells) {
      const r = Math.floor(idx / COLS);
      const c = idx % COLS;
      const yTop = this._rowY(r);
      const yBot = yTop + 1;
      const [yNear, yFar] = this._top ? [yTop, yBot] : [yBot, yTop]; // edges toward / away from the sensor
      if (!has(r + 1, c)) seg.push(`M ${c} ${yFar} L ${c + 1} ${yFar}`);
      if (!has(r - 1, c)) seg.push(`M ${c} ${yNear} L ${c + 1} ${yNear}`);
      if (!has(r, c - 1)) seg.push(`M ${c} ${yTop} L ${c} ${yBot}`);
      if (!has(r, c + 1)) seg.push(`M ${c + 1} ${yTop} L ${c + 1} ${yBot}`);
    }
    const attrs = { d: seg.join(" "), stroke: meta.color };
    if (meta.dash) attrs["stroke-dasharray"] = meta.dash;
    return this._el("path", attrs, "region-outline");
  }

  _renderSync(state) {
    const el = this.shadowRoot.querySelector(".sync");
    let text = this._t('Synchronisiert','Synced');
    let cls = "";
    const dirty = this._mode === "zones" ? !!this._edit : !!(this._regionEdit && this._regionEdit.key === this._mode);
    if (this._conflict) { text = this._t('Konflikt: Daten wurden extern geändert','Conflict: data changed elsewhere'); cls = 'bad';
    } else if (this._saving || this._awaiting) {
      text = this._t('Sensorbestätigung abwarten…','Waiting for sensor confirmation…');
      cls = "busy";
    } else if (dirty) {
      text = this._t('Ungespeicherte Änderungen','Unsaved changes');
      cls = "dirty";
    } else if (this._mode === "zones") {
      if (state?.attributes?.pending) [text, cls] = [this._t('Prüfung…','Verifying…'), "busy"];
      else if (state?.attributes?.error) [text, cls] = [this._t('Fehler: ','Error: ') + state.attributes.error, "bad"];
    } else {
      const rstate = this._hass.states[this._regionsEntity()]?.attributes;
      if (rstate?.pending?.[this._mode]) [text, cls] = [this._t('Prüfung…','Verifying…'), "busy"];
      else if (rstate?.error?.[this._mode]) [text, cls] = [this._t('Fehler: ','Error: ') + rstate.error[this._mode], "bad"];
    }
    el.textContent = text;
    el.className = "sync " + cls;
  }

  _renderLayers(zones, regions) {
    const bar = this.shadowRoot.querySelector(".layers");
    bar.innerHTML = "";
    const mk = (key, label, dotHtml, tip) => {
      const b = document.createElement("button");
      b.className = "layer" + (this._mode === key ? " active" : "");
      b.innerHTML = dotHtml + `<span>${label}</span>`;
      b.title = tip;
      b.addEventListener("click", () => {
        if (this._mode === key) return;
        if (this._editing) { this._leave(key); return; }
        this._mode = key;
        if (key === "zones" && !zones.has(this._active)) this._active = [...zones.keys()].sort((a, b) => a - b)[0] || 1;
        this._render();
      });
      bar.appendChild(b);
    };
    mk("zones", `${this._t('Zonen','Zones')}${zones.size ? ` (${zones.size})` : ""}`, `<span class="dot zones"></span>`, this._t('Erfassungszonen – jede Zone erhält einen Anwesenheitssensor','Detection zones — each one becomes an occupancy sensor'));
    for (const key of REGION_KEYS) {
      const m = REGION_META[key];
      mk(key, this._regionLabel(key), `<span class="dot ring" style="color:${m.color}${regions[key].size ? "" : ";opacity:0.4"}"></span>`, this._regionHelp(key));
    }
  }

  _renderTools(zones, regions, state) {
    const focused = this.shadowRoot.activeElement;
    const focusName = focused?.dataset?.zoneName;
    const selection = focusName ? [focused.selectionStart, focused.selectionEnd] : null;
    const tools = this.shadowRoot.querySelector(".tools");
    const panel = this.shadowRoot.querySelector(".panel");
    tools.innerHTML = "";
    panel.innerHTML = "";
    panel.className = "panel";
    if (this._mode === "zones") this._zoneTools(tools, panel, zones, state);
    else this._regionTools(tools, panel, regions);
    if (this._forget != null) this._forgetPanel(panel);
    if (focusName && !this._saving && !this._awaiting) {
      const input = panel.querySelector(`input[data-zone-name="${focusName}"]`);
      if (input && !input.disabled) { input.focus(); input.setSelectionRange(...selection); }
    }
  }

  // offered after a click on a target dot: the sensor drops that track (a real person comes back)
  _forgetPanel(panel) {
    const id = this._forget;
    if (!Number.isInteger(id) || id < 0 || id > 255) return;
    panel.innerHTML = `<span class="name"></span><span class="selected-position"></span><span class="meta"></span><span class="spacer"></span>`;
    panel.querySelector?.('.name') && (panel.querySelector('.name').textContent = this._t('Ausgewählt: Erkennung ','Selected: track ') + id);
    panel.querySelector?.('.meta') && (panel.querySelector('.meta').textContent = this._t('Diese Spur verwerfen? Anwesende Personen können erneut erkannt werden. Wiederkehrende Störungen im Interferenzbereich ausblenden.', 'Discard this track? People who are present may be detected again. Use an interference region for recurring disturbances.'));
    const group = document.createElement("span");
    group.className = "btns";
    const cancel = document.createElement("button");
    cancel.className = "secondary small";
    cancel.textContent = this._t('Abbrechen','Cancel');
    cancel.addEventListener("click", () => { this._forget = null; this._render(); });
    group.appendChild(cancel);
    const forget = document.createElement("button");
    forget.className = "secondary small danger";
    forget.textContent = this._t('Diese Erkennung verwerfen','Discard this track');
    forget.disabled = this._saving || this.preview || this._editing;
    forget.addEventListener("click", async () => {
      if (this._forget !== id || this._editing) return;
      if (await this._runService("remove_target", { target_id: id })) this._forget = null;
      this._render();
    });
    group.appendChild(forget);
    const mark=document.createElement('button');mark.className='secondary small';mark.textContent=this._t('Stelle als Interferenz markieren','Mark this spot as interference');
    mark.disabled=!!(this._saving||this.preview||this._editing||!this._selectedFreshTarget());
    mark.addEventListener('click',()=>this._markInterference(id));group.appendChild(mark);
    panel.appendChild(group);
  }

  _markInterference(id) {
    const t=this._selectedFreshTarget(id);
    const state=this._hass?.states?.[this._regionsEntity()];
    if(!t||this._forget!==id||this.preview||this._editing||this._saving||!state||['unknown','unavailable'].includes(state.state)||state.attributes.pending?.interference)return false;
    const x=AHEAD_COL-t.x/CELL_CM,y=t.y/CELL_CM;
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>=COLS||y<0||y>=ROWS)return false;
    this._mode='interference';this._beginEditing();
    if(!this._canEdit())return false;
    const cells=this._startRegionEdit('interference');
    const firstCol=Math.floor(x-.5),firstRow=Math.floor(y-.5);
    for(let row=firstRow;row<firstRow+2;row++)for(let col=firstCol;col<firstCol+2;col++)if(row>=0&&row<ROWS&&col>=0&&col<COLS)cells.add(row*COLS+col);
    this._controlsKey=null;this._render();return true;
  }

  _zoneTools(tools, panel, zones, state) {
    const max = state?.attributes?.max_zones || 8;
    // show a chip only for zones that exist, plus the empty one currently being added
    const ids = [...zones.keys()].sort((a, b) => a - b);
    const adding = this._editing && this._active > 0 && !zones.has(this._active);
    if (adding) ids.push(this._active);
    for (const id of ids) {
      const exists = zones.has(id);
      const chip = document.createElement("button");
      chip.className = "chip" + (this._active === id ? " active" : "") + (exists ? "" : " new");
      const disabled = exists && zones.get(id).enabled === false;
      chip.innerHTML = `<span class="dot" style="background:${this._zoneColor(id)}"></span><span>Zone ${id}</span>` + (exists ? `<span class="n">${disabled ? "off" : zones.get(id).cells.size}</span>` : "");
      chip.children[1].textContent = this._zoneName(id);
      chip.title = exists ? this._zoneName(id) : this._t('Neue Zone – Zellen zeichnen','New zone — paint cells on the grid');
      chip.addEventListener("click", () => { this._active = id; this._render(); });
      tools.appendChild(chip);
    }
    if (this._editing && zones.size) {
      const erase = document.createElement("button");
      erase.className = "chip erase" + (this._active === 0 ? " active" : "");
      erase.innerHTML = `<span class="dot"></span><span>${this._t('Radieren','Erase')}</span>`;
      erase.title = this._t('Zellen aus Zonen entfernen','Drag over cells to remove them from any zone');
      erase.addEventListener("click", () => { this._active = 0; this._render(); });
      tools.appendChild(erase);
    }
    const nextId = this._freeZoneId(zones, max);
    if (this._editing && !adding) {
      const add = document.createElement("button");
      add.className = "ghost";
      add.textContent = this._t('+ Zone hinzufügen','+ Add zone');
      add.disabled = !nextId || !this._canEdit();
      add.title = nextId ? "" : this._t(`Alle ${max} Zonen sind belegt`, `All ${max} zones are in use`);
      add.addEventListener("click", () => { this._active = nextId; this._render(); });
      tools.appendChild(add);
    }

    // detail panel for the selected zone
    if (zones.has(this._active)) {
      const zone = zones.get(this._active);
      panel.innerHTML = `<span class="name"><span class="dot" style="background:${this._zoneColor(this._active)}"></span>Zone ${this._active}</span>
        <span class="meta">${zone.cells.size} ${this._t('Zellen','cells')} · ${zone.enabled ? this._t('aktiviert','enabled') : this._t('deaktiviert','disabled')}</span><span class="spacer"></span>`;
      panel.querySelector('.name').appendChild(document.createTextNode(' · ' + this._zoneName(this._active)));
      const group = document.createElement("span");
      group.className = "btns";
      const toggle = document.createElement("button");
      toggle.className = "secondary small";
      toggle.textContent = zone.enabled ? this._t('Deaktivieren','Disable') : this._t('Aktivieren','Enable');
      toggle.disabled = !this._canEdit();
      toggle.addEventListener("click", () => this._toggleEnabled(this._active));
      group.appendChild(toggle);
      const del = document.createElement("button");
      del.className = "secondary small danger";
      del.textContent = this._t('Löschen','Delete');
      del.disabled = !this._canEdit();
      del.addEventListener("click", () => this._deleteZone(this._active));
      group.appendChild(del);
      if (this._editing) { panel.appendChild(group); this._nameEditor(panel, this._active); }
    } else if (adding) {
      panel.innerHTML = `<span class="name">${this._t('Neue Zone','New zone')} ${this._active}</span><span class="meta">${this._t('Zellen zeichnen, dann speichern und benennen','Paint cells, then save and name the zone')}</span>`;
    } else if (this._active === 0) {
      panel.innerHTML = `<span class="name">${this._t('Radieren','Erase')}</span><span class="meta">${this._t('Zellen aus Zonen entfernen','Drag over cells to remove them from zones')}</span>`;
    }

    const hint = zones.size || adding
      ? this._t('Bearbeitung aktiv: Zellen zeichnen. Übermalte Zellen wechseln die Zone.', 'Editing enabled: paint cells. Painting over another zone moves those cells.')
      : this._t('Noch keine Zonen. Jede Zone erhält einen eigenen Anwesenheitssensor.', 'No zones yet. Each zone becomes its own occupancy sensor.');
    const removingAll = this._confirmedEmpty && this._zones().size === 0;
    this._actionButtons(hint, !!this._edit, null, () => this._save(), removingAll ? this._t('Alle Zonen werden gelöscht. Zum Bestätigen erneut speichern.', 'All zones will be deleted. Save again to confirm.') : null);
  }

  _freeZoneId(zones, max) {
    for (let id = 1; id <= max; id++) if (!zones.has(id)) return id;
    return 0;
  }

  _deleteZone(id) {
    if (!this._canEdit()) return;
    const zones = this._startEdit();
    zones.delete(id);
    this._active = [...zones.keys()].sort((a, b) => a - b)[0] || this._freeZoneId(zones, this._maxZones());
    this._render();
  }

  _regionTools(tools, panel, regions) {
    const key = this._mode;
    const meta = REGION_META[key];
    const count = regions[key].size;
    panel.innerHTML = `<span class="name"><span class="dot" style="background:${meta.color}"></span>${this._regionLabel(key)}</span><span class="meta">${count} ${this._t('Zellen','cells')} · ${this._regionHelp(key)}</span><span class="spacer"></span>`;
    const clear = document.createElement("button");
    clear.className = "secondary small";
    const inverted = key === "monitoring";
    clear.textContent = inverted ? this._t('Gesamter Bereich','Full range') : this._t('Leeren','Clear');
    clear.title = inverted ? this._t('Gesamtes Raster überwachen','Monitor the whole grid') : this._t('Alle Zellen dieses Bereichs entfernen','Remove every cell of this region');
    clear.disabled = !this._canEdit() || (inverted ? count === ROWS * COLS : count === 0);
    clear.addEventListener("click", () => {
      if (!this._canEdit()) return;
      const cells = this._startRegionEdit(key);
      cells.clear();
      if (inverted) for (let i = 0; i < ROWS * COLS; i++) cells.add(i);
      this._render();
    });
    if (this._editing) panel.appendChild(clear);

    const dirty = !!(this._regionEdit && this._regionEdit.key === key);
    this._actionButtons(this._t('Bearbeitung aktiv: Zellen zeichnen oder radieren.', 'Editing enabled: paint or erase cells.'), dirty, null, () => this._saveRegion());
  }

  _regionLabel(key) { return this._t({entry_exit:'Ein-/Ausgang',interference:'Interferenz',monitoring:'Überwachung'}[key], REGION_META[key].label); }
  _regionHelp(key) { return this._t({entry_exit:'Türöffnungen und Durchgänge markieren.',interference:'Störquellen wie Ventilatoren oder Vorhänge ausblenden.',monitoring:'Zellen außerhalb dieses Bereichs werden ignoriert.'}[key], REGION_META[key].help); }

  _nameEditor(panel, id) {
    if (!this._entityZones().has(id)) return;
    const row = document.createElement('div'); row.className = 'name-editor';
    const title = document.createElement('span'); title.textContent = this._t('Zonenname','Zone name'); row.appendChild(title);
    if (!this._hass.services?.aqara_fp400?.set_zone_name) { title.textContent = this._t('Zum Benennen die FP400-Integration über HACS aktualisieren.', 'Update the FP400 integration in HACS to name zones.'); panel.appendChild(row); return; }
    const input = document.createElement('input'); input.maxLength = 80; input.dataset.zoneName = id;
    input.setAttribute('aria-label',this._t('Zonenname','Zone name'));
    input.value = this._nameDrafts[id] ?? this._zoneNameValue(id);
    input.placeholder = `Zone ${id}`; input.disabled = !this._canEdit();
    input.addEventListener('input', () => {
      const stored = this._zoneNameValue(id);
      if (input.value === stored) delete this._nameDrafts[id]; else this._nameDrafts[id] = input.value;
      updateRename();
    });
    row.appendChild(input);
    const save = document.createElement('button'); save.textContent = this._t('Name speichern','Save name'); save.disabled = !this._canEdit();
    save.addEventListener('click', async () => { await this._saveName(id, input.value); }); row.appendChild(save);
    const candidate=this._hass.states[this._config.entity]?.attributes?.zone_entity_names?.[id];
    const option=document.createElement('label');option.style.width='100%';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=!!this._renameRequests[id];
    const description=document.createElement('span');description.textContent=this._t('Auch den HA-Anwesenheitssensor umbenennen (nur diesmal)','Also rename the HA occupancy sensor (this save only)');
    option.appendChild(checkbox);option.appendChild(description);row.appendChild(option);
    const preview=document.createElement('span');preview.style.width='100%';row.appendChild(preview);
    const updateRename=()=>{
      checkbox.disabled=!this._canEdit()||!this._hass.user?.is_admin||!candidate||!input.value.trim();
      if(!input.value.trim()){delete this._renameRequests[id];checkbox.checked=false;}
      const selected=this._renameRequests[id]||candidate;
      preview.textContent=!candidate?this._t('Keine eindeutig zugeordnete HA-Entität.','No unambiguous HA entity mapping.'):!this._hass.user?.is_admin?this._t('Das Umbenennen der HA-Entität benötigt Administratorrechte.','Renaming the HA entity requires administrator access.'):!input.value.trim()?this._t('Ein leerer Name setzt nur den Kartennamen zurück.','An empty name resets only the card name.'):checkbox.checked?`${selected.display_name||selected.entity_id} → ${input.value.trim()} (${selected.entity_id})`:this._t('HA-Entitätsname bleibt unverändert.','HA entity name remains unchanged.');
    };
    checkbox.addEventListener('change',()=>{if(checkbox.checked&&!checkbox.disabled)this._renameRequests[id]={entity_id:candidate.entity_id,name:candidate.name??null,display_name:candidate.display_name};else delete this._renameRequests[id];updateRename();});
    updateRename();panel.appendChild(row);
  }

  async _saveName(id, name) {
    if (!this._canEdit() || !this._entityZones().has(id)) return false;
    const rename=this._renameRequests[id];
    if(rename&&(!this._hass.user?.is_admin||!name.trim()))return false;
    const previous=[...(this._pendingNames[id]?.previous || []),this._zoneNameValue(id),this._hass.states[this._config.entity]?.attributes?.zone_names?.[id] || ''];
    this._writingName=id;
    const ok=await this._runService('set_zone_name', {zone_id:id,name:name.trim(),...(rename?{rename_entity:true,expected_entity_id:rename.entity_id,expected_entity_name:rename.name}: {})});
    delete this._renameRequests[id];
    if(ok){delete this._nameDrafts[id];this._pendingNames[id]={name:name.trim(),previous};this._nameBaseline[id]=name.trim();}
    this._writingName=null;this._controlsKey = null; this._render(); return ok;
  }

  _renderGuard() {
    const root = this.shadowRoot.querySelector('.guard'); root.replaceChildren();
    if (!this._guard) return;
    const text = document.createElement('span'); text.textContent = this._t('Ungespeicherte Änderungen: speichern oder verwerfen?', 'Unsaved changes: save or discard?'); root.appendChild(text);
    for (const [label, action] of [
      [this._t('Speichern','Save'), async () => {
        if (!this._canEdit()) return;
        // Area saves also persist surviving name drafts and skip deleted zones.
        // Keep one path so leaving the editor cannot rename a zone being deleted.
        if (this._dirty()) { await (this._mode === 'zones' ? this._save() : this._saveRegion()); return; }
        for (const [id,name] of Object.entries(this._nameSaveDrafts())) if (!await this._saveName(Number(id),name)) return;
        this._finishEdit(this._guard?.mode);
      }],
      [this._t('Verwerfen','Discard'), () => this._finishEdit(this._guard.mode)],
      [this._t('Weiter bearbeiten','Keep editing'), () => {this._guard=null;this._render();}],
    ]) { const b=document.createElement('button');b.textContent=label;b.disabled=!!(this._saving||this._awaiting);if(label===this._t('Speichern','Save'))b.disabled||=!this._canEdit();b.addEventListener('click',action);root.appendChild(b); }
  }

  _actionButtons(hint, dirty, onRevert, onSave, warning = null) {
    const footer = this.shadowRoot.querySelector(".footer");
    footer.classList.toggle("dirty", dirty);
    footer.classList.toggle("warn", !!warning);
    footer.querySelector(".hint").textContent = !this._editing ? this._t('Live-Ansicht: Zum Ändern „Bereiche bearbeiten“ wählen.', 'Live view: choose “Edit areas” to make changes.') : this._conflict ? this._t('Extern geändert. Entwurf verwerfen und neu beginnen.', 'Changed elsewhere. Discard the draft and start again.') : warning || (dirty ? this._t('Bearbeitung aktiv · Ungespeicherte Änderungen', 'Editing enabled · Unsaved changes') : hint);
    const actions = footer.querySelector(".actions");
    actions.innerHTML = "";

    if (!this._editing) {
      const edit = document.createElement('button'); edit.textContent = this._t('Bereiche bearbeiten','Edit areas'); edit.disabled = !!this.preview || !this._available() || this._pending(); edit.addEventListener('click',()=>this._beginEditing()); actions.appendChild(edit); return;
    }

    const revert = document.createElement("button");
    revert.className = "ghost";
    revert.textContent = this._t('Abbrechen','Cancel');
    revert.disabled = this._saving || !!this._awaiting;
    revert.addEventListener("click", () => this._leave());
    actions.appendChild(revert);

    const save = document.createElement("button");
    save.textContent = this._saving || this._awaiting ? this._t('Bestätigung…','Confirming…') : warning ? this._t('Löschen bestätigen','Confirm deletion') : this._t('Speichern','Save');
    save.disabled = !dirty || !this._canEdit();
    save.addEventListener("click", onSave);
    actions.appendChild(save);
  }

  // ---------------------------------------------------------------- editing

  _onPointer(ev, down) {
    if (!this._canEdit()) {
      if (down && !this._editing && this._mode === 'zones') {
        const idx = this._cellAtPointer(ev);
        if (idx !== null) for (const [id,z] of this._entityZones()) if (z.cells.has(idx)) { this._active=id;this._render();break; }
      }
      return;
    }
    if (!down && !this._pointerDown) return;
    const index=this._cellAtPointer(ev);
    if(index === null)return;
    if (down) {
      this._pointerDown = true;
      ev.target.setPointerCapture?.(ev.pointerId);
    }
    if (this._mode === "zones") this._paintZone(index, down);
    else this._paintRegion(index, down);
    this._render();
  }

  _paintZone(index, down) {
    if (!this._canEdit()) return;
    const zones = this._startEdit();
    if (down) {
      // first cell decides whether this stroke paints or erases the active zone
      this._paintValue = this._active !== 0 && !zones.get(this._active)?.cells.has(index);
    }
    for (const zone of zones.values()) zone.cells.delete(index);
    if (this._active !== 0 && this._paintValue) {
      if (!zones.has(this._active)) zones.set(this._active, { cells: new Set(), enabled: true, type: 0 });
      zones.get(this._active).cells.add(index);
    }
    for (const [id, zone] of [...zones]) if (zone.cells.size === 0) zones.delete(id);
  }

  _paintRegion(index, down) {
    if (!this._canEdit()) return;
    const cells = this._startRegionEdit(this._mode);
    if (down) this._paintValue = !cells.has(index);
    if (this._paintValue) cells.add(index);
    else cells.delete(index);
  }

  _toggleEnabled(id) {
    if (!this._canEdit()) return;
    const zones = this._startEdit();
    if (zones.has(id)) zones.get(id).enabled = !zones.get(id).enabled;
    this._render();
  }

  _cellsToRowCol(set) {
    return [...set].sort((a, b) => a - b).map((idx) => [Math.floor(idx / COLS), idx % COLS]);
  }

  async _runService(service, data) {
    const error = this.shadowRoot.querySelector(".error");
    error.textContent = "";
    if (this.preview) {
      error.textContent = this._t('Vorschau: Änderungen am Sensor sind hier deaktiviert.', 'Preview: sensor changes are disabled.');
      return false;
    }
    if (['set_zones','set_region','set_zone_name'].includes(service) && !this._canEdit()) return false;
    if (service === 'remove_target' && (this._editing || data.target_id !== this._forget)) return false;
    if (service === 'remove_target' && (!this._available() || !this._selectedFreshTarget(data.target_id)))return false;
    const deviceId = this._deviceId();
    if (!deviceId) {
      error.textContent = this._t('Gerät nicht gefunden: ', 'Cannot resolve device: ') + this._config.entity;
      return false;
    }
    this._saving = true;
    this._render();
    try {
      await this._hass.callService("aqara_fp400", service, { device_id: deviceId, ...data });
      return true;
    } catch (err) {
      error.textContent = err?.message || String(err);
      return false;
    } finally {
      this._saving = false;
      this._render();
    }
  }

  async _save() {
    if (!this._canEdit()) return;
    if (this._zones().size === 0 && this._entityZones().size > 0 && !this._confirmedEmpty) {
      this._confirmedEmpty = true; // next Save goes through; the footer explains
      this._controlsKey = null;
      this._render();
      return;
    }
    this._confirmedEmpty = false;
    const zones = [...this._zones()].map(([id, zone]) => ({
      id,
      enabled: zone.enabled,
      type: zone.type || 0,
      cells: this._cellsToRowCol(zone.cells),
    }));
    await this._saveConfirmed('set_zones', {zones});
  }

  async _saveRegion() {
    if (!this._canEdit()) return;
    const key = this._mode;
    const cells = this._cellsToRowCol(this._regions()[key]);
    await this._saveConfirmed('set_region', {region:key,cells});
  }

  async _saveConfirmed(service, data) {
    for (const [id,name] of Object.entries(this._nameSaveDrafts())) {
      if (!this._zones().has(Number(id))) { delete this._nameDrafts[id];delete this._renameRequests[id];continue; }
      if (!await this._saveName(Number(id),name)) return;
    }
    const expected = this._draftSnapshot(); const next = this._guard?.mode || null;
    const ok = await this._runService(service,data);
    if (ok) { this._awaiting = {expected,next,deadline:Date.now()+30000}; this._conflict=false;
      clearTimeout(this._confirmationTimer);
      this._confirmationTimer=setTimeout(()=>{this._controlsKey=null;this._render();},30100);
    }
    this._controlsKey=null; this._render();
  }

  connectedCallback() { clearInterval(this._freshnessTimer);this._freshnessTimer=setInterval(()=>this._render(),1000); }
  disconnectedCallback() { clearTimeout(this._confirmationTimer);clearInterval(this._freshnessTimer); }
}

customElements.define("aqara-fp400-zone-card-editor", AqaraFp400ZoneCardEditor);
customElements.define("aqara-fp400-zone-card", AqaraFp400ZoneCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "aqara-fp400-zone-card",
  name: "FP400 Radar – Zonen und Personen",
  description: "Zonen, Live-Positionen und Bereiche. Entitäten bequem im visuellen Editor auswählen.",
  preview: true,
  documentationURL: "https://github.com/ckundel2008/fp400-card#karte-anzeigen",
});

;(()=>{
// Standalone read-only display model. No Home Assistant service calls.
const VERSION = '1.4.0';
const CARD_TAG = 'aqara-fp400-floorplan-card';
const EDITOR_TAG = 'aqara-fp400-floorplan-card-editor';
const TYPE = `custom:${CARD_TAG}`;
const MAX_IMAGE_LENGTH = 1200000;
function imageDimensions(buffer, mime) {
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
function imageSource(value = '') {
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
function normalizeConfig(raw) {
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
function imagePlacement(plan){
  const crop=plan.image_crop??{x:0,y:0,width:1,height:1};
  return {x:-crop.x*plan.width_m/crop.width+0,y:-crop.y*plan.height_m/crop.height+0,
    width:plan.width_m/crop.width,height:plan.height_m/crop.height};
}
function toWorld(sensor, rawX, rawY) {
  if (![rawX, rawY].every(v => typeof v === 'number' && Number.isFinite(v))) return null;
  // Reflection belongs in the local sensor frame, before rotation/translation.
  // Use the same transform for grid corners and live target coordinates.
  const right = (sensor.mirror_x?1:-1)*rawX / 100, forward = rawY / 100, a = sensor.yaw * Math.PI / 180;
  return {x: sensor.x + right * Math.cos(a) + forward * Math.sin(a),
    y: sensor.y + right * Math.sin(a) - forward * Math.cos(a)};
}
function fromWorld(sensor, point) {
  const dx = point.x - sensor.x, dy = point.y - sensor.y, a = sensor.yaw * Math.PI / 180;
  return {x: (sensor.mirror_x?1:-1)*(dx * Math.cos(a) + dy * Math.sin(a)) * 100,
    y: (dx * Math.sin(a) - dy * Math.cos(a)) * 100};
}
function cellPolygon(sensor, row, col) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= 20 || col < 0 || col >= 16) return null;
  return [[row,col],[row,col+1],[row+1,col+1],[row+1,col]].map(([r,c])=>toWorld(sensor, (8-c)*50, r*50));
}
function sensorStatus(state, now = Date.now()) {
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
function compatibleEntities(hass, kind) {
  return Object.entries(hass?.states ?? {}).filter(([id,s]) => id.startsWith('sensor.') &&
    (kind === 'targets' ? Array.isArray(s.attributes?.targets) && 'live_tracking' in s.attributes :
      Array.isArray(s.attributes?.zones) && s.attributes?.grid_rows === 20 && s.attributes?.grid_cols === 16));
}
function deviceError(sensor, hass) {
  if (!sensor.zones_entity) return '';
  const devices = hass?.entities;
  const t = devices?.[sensor.entity]?.device_id, z = devices?.[sensor.zones_entity]?.device_id;
  return t && z && t !== z ? 'Personen und Zonen gehören zu verschiedenen Geräten – Zuordnung korrigieren.' : '';
}
// Ignore unrelated HA changes and heartbeat timestamps while retaining the exact
// freshness boundaries. Bound every input before serializing or transforming it.
function displayFingerprint(config,hass,editing,points,now=Date.now()){
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
function scene(config, hass, now = Date.now()) {
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
function calibrate(config, a, b, distance) {
  number(distance,0.1,100,'Referenzstrecke');
  for (const p of [a,b]) {number(p?.x,0,config.plan.width_m,'Messpunkt X');number(p?.y,0,config.plan.height_m,'Messpunkt Y');}
  const measured = Math.hypot(b.x-a.x,b.y-a.y);
  if (measured < 0.05) throw new Error('Messpunkte liegen zu dicht zusammen.');
  const ratio = distance/measured;
  return normalizeConfig({...config,plan:{...config.plan,width_m:config.plan.width_m*ratio,height_m:config.plan.height_m*ratio},
    sensors:config.sensors.map(s=>({...s,x:s.x*ratio,y:s.y*ratio}))});
}
class EditSession {
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


const NS='http://www.w3.org/2000/svg';
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
const svg=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
const button=(text,fn)=>{const n=el('button',text,{type:'button'});n.addEventListener('click',fn);return n;};
const styles=`
 :host{display:block;color:var(--primary-text-color,#172635);font:14px system-ui,sans-serif}*{box-sizing:border-box}
 ha-card,.surface{display:block;background:var(--card-background-color,#fff);border-radius:16px;padding:16px;border:1px solid var(--divider-color,#d7e0e5)}
 h2{font-size:20px;margin:4px 0 8px}h3{font-size:15px;margin:10px 0}p{line-height:1.5;margin:8px 0}.muted{color:var(--secondary-text-color,#526575)}
 .badge{font-size:11px;font-weight:750;letter-spacing:.08em;color:#946000}.map{width:100%;display:block;background:#eff3f5;border:1px solid #bfcdd5;border-radius:10px;max-height:70vh}
 .map.editable{cursor:crosshair;outline:2px solid #0086a9;outline-offset:2px}.map text{font-family:system-ui,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:.07px;stroke-linejoin:round;fill:#172635}
 .legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:12px}.item{border-left:4px solid;padding:8px 10px;background:var(--secondary-background-color,#f1f5f7);border-radius:5px;overflow-wrap:anywhere}
 .item strong{display:block}.item small{display:block;line-height:1.6}.notice{background:#fff4d9;color:#714b00;padding:10px;border-radius:8px;line-height:1.5}.error{color:var(--error-color,#b3261e);white-space:pre-wrap;overflow-wrap:anywhere}
 button,input,select,textarea{font:inherit}button{cursor:pointer;border:1px solid #aebfc9;border-radius:7px;background:var(--card-background-color,#fff);color:inherit;min-height:40px;padding:8px 12px}button:disabled{opacity:.5;cursor:default}button.primary{background:#007fa8;color:white;border-color:#007fa8}
 .actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:10px 0}label{display:flex;flex-direction:column;gap:5px;min-width:0}input,select,textarea{min-width:0;width:100%;padding:8px;border:1px solid #aebfc9;border-radius:6px;background:var(--card-background-color,#fff);color:inherit}input[type=checkbox]{width:auto;align-self:start}input[type=color]{height:40px}fieldset{min-width:0;border:1px solid #bfcdd5;border-radius:8px;margin:12px 0;padding:12px}textarea{min-height:110px} .small{font-size:12px}
 @media(max-width:420px){ha-card,.surface{padding:12px}.fields{grid-template-columns:1fr}.legend{grid-template-columns:1fr}h2{font-size:18px}}
`;

class FP400FloorplanTest extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this._config=normalizeConfig({});this._editing=false;}
  static getConfigElement(){return document.createElement(EDITOR_TAG);}
  static getStubConfig(){return normalizeConfig({});}
  setConfig(config){this._config=normalizeConfig(config);this._render();}
  set hass(value){this._hass=value;this._render();}
  set placement(value){this._editing=value===true;this._render();}
  set calibrationPoints(value){this._points=value;this._render();}
  setPreview(config,hass,editing,points){this._config=normalizeConfig(config);this._hass=hass;this._editing=editing;this._points=points;this._render();}
  connectedCallback(){if(!this._timer)this._timer=setInterval(()=>this._render(),1000);this._render();}
  disconnectedCallback(){clearInterval(this._timer);this._timer=null;}
  getCardSize(){return 6;}
  _render(){
    const signature=displayFingerprint(this._config,this._hass,this._editing,this._points);
    if(signature===this._signature&&this._lastImage===this._config.plan.image)return;
    this._signature=signature;this._lastImage=this._config.plan.image;
    const root=this.shadowRoot;root.replaceChildren(el('style',styles));
    const card=el('ha-card');root.append(card);
    card.append(el('div',`FP400 · Grundriss · ${VERSION}`,{class:'badge'}),el('h2',this._config.title));
    card.append(el('p','Gemeinsame Anzeige mehrerer FP400 · nur lesend',{class:'muted small'}));
    const {width_m:w,height_m:h,image}=this._config.plan;
    const map=svg('svg',{viewBox:`0 0 ${w} ${h}`,class:`map${this._editing?' editable':''}`,overflow:'hidden',role:'img','aria-label':`Grundriss ${w.toFixed(2)} × ${h.toFixed(2)} Meter`});
    map.style.maxWidth=`min(100%, ${70*w/h}vh)`;map.style.marginInline='auto';
    map.append(svg('rect',{width:w,height:h,fill:'#eff3f5'}));
    if(image){
      const img=svg('image',{href:image,...imagePlacement(this._config.plan),preserveAspectRatio:'none',opacity:'.85'});
      img.addEventListener('error',()=>{if(img.isConnected){img.remove();card.append(el('p','Grundrissbild konnte nicht geladen werden. Bildpfad und Dateiformat prüfen.',{class:'error'}));}});
      // A wide outer SVG can letterbox a portrait plan: clipping only the outer
      // viewport would still expose adjacent floors/house halves in its margins.
      const imageViewport=svg('svg',{x:0,y:0,width:w,height:h,viewBox:`0 0 ${w} ${h}`,overflow:'hidden'});
      imageViewport.append(img);map.append(imageViewport);
    }else{
      for(let x=1;x<w;x++)map.append(svg('line',{x1:x,x2:x,y1:0,y2:h,stroke:'#d7e0e5','stroke-width':'.015'}));
      for(let y=1;y<h;y++)map.append(svg('line',{x1:0,x2:w,y1:y,y2:y,stroke:'#d7e0e5','stroke-width':'.015'}));
    }
    const data=scene(this._config,this._hass);
    const size=Math.max(w,h)/65;
    const label=(text,x,y,color='#172635')=>{const t=svg('text',{x,y,'font-size':size*1.5,fill:color});t.textContent=text;return t;};
    for(const {sensor:s,zones} of data){
      if(this._config.show_coverage){
        const points=[toWorld(s,400,0),toWorld(s,-400,0),toWorld(s,-400,1000),toWorld(s,400,1000)];
        map.append(svg('polygon',{points:points.map(p=>`${p.x},${p.y}`).join(' '),fill:s.color,'fill-opacity':'.035',stroke:s.color,'stroke-opacity':'.4','stroke-dasharray':'.12 .1','stroke-width':'.025'}));
      }
      for(const zone of zones){
        const path=svg('path',{d:zone.cells.map(c=>`M${c.map(p=>`${p.x},${p.y}`).join('L')}Z`).join(''),fill:s.color,'fill-opacity':'.12',stroke:s.color,'stroke-width':'.012'});
        const title=svg('title');title.textContent=`${s.name} · ${zone.name} (gespeicherte Zone)`;path.append(title);map.append(path);
      }
    }
    for(const {sensor:s,targets} of data){
      const p=toWorld(s,0,Math.max(w,h)*5);
      map.append(svg('line',{x1:s.x,y1:s.y,x2:p.x,y2:p.y,stroke:s.color,'stroke-width':size*.35}));
      map.append(svg('circle',{cx:s.x,cy:s.y,r:size*.65,fill:s.color,stroke:'#fff','stroke-width':size*.2}));
      map.append(label(s.name,Math.max(size,Math.min(w-size*10,s.x+size)),Math.max(size*2,Math.min(h-size,s.y-size))));
      for(const t of targets){
        const dot=svg('circle',{cx:t.x,cy:t.y,r:size*.85,fill:s.color,stroke:t.activity==='still'?'#fff':'#172635','stroke-width':size*.2});
        const title=svg('title');title.textContent=`${s.name} · Ziel ${t.id} · ${t.activity} · ${t.x.toFixed(2)}, ${t.y.toFixed(2)} m`;dot.append(title);map.append(dot);
        map.append(label(String(t.id),t.x+size,t.y-size));
      }
    }
    for(const [i,p] of (this._points??[]).entries()){
      map.append(svg('circle',{cx:p.x,cy:p.y,r:size,fill:'#d33232'}),label(String(i+1),p.x+size,p.y));
    }
    if(this._editing)map.addEventListener('click',event=>{
      const matrix=map.getScreenCTM();if(!matrix)return;
      const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      if(point.x<0||point.y<0||point.x>w||point.y>h)return;
      this.dispatchEvent(new CustomEvent('plan-point',{detail:{x:point.x,y:point.y},bubbles:true,composed:true}));
    });
    card.append(map,el('p',`${w.toFixed(2)} × ${h.toFixed(2)} m · 0° = oben · 90° = rechts`,{class:'muted small'}));
    const legend=el('div',undefined,{class:'legend'});card.append(legend);
    for(const row of data){
      const item=el('div',undefined,{class:'item'});item.style.borderColor=row.sensor.color;
      item.append(el('strong',row.sensor.name),el('small',row.status.label));
      if(row.sensor.mirror_x)item.append(el('small','Links/rechts gespiegelt (Zonen und Ziele)'));
      if(row.status.live)item.append(el('small',`${row.targets.length} angezeigte Ziele dieses Sensors`));
      if(row.invalid||row.outside)item.append(el('small',`${row.invalid} ungültig · ${row.outside} außerhalb des Grundrisses`));
      if(row.zoneWarning)item.append(el('small',row.zoneWarning));
      if(row.zones.length)item.append(el('small',`Zonen: ${row.zones.map(z=>z.name).join(', ')}`));
      legend.append(item);
    }
    if(!data.length)card.append(el('p','Noch keine FP400 zugeordnet. Im visuellen Karteneditor „Grundriss bearbeiten“ wählen.',{class:'notice'}));
    card.append(el('p','Ziele können bei überlappenden Sensoren doppelt erscheinen. Keine gemeinsame Personenzahl, Personenidentität oder Tier-/Babyklassifizierung. Gespeicherte Zonen sind keine Live-Belegung.',{class:'notice small'}));
  }
}

class FP400FloorplanEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this.session=new EditSession({});this._selected=0;this._points=[];this._mode='place';this._uploadToken=0;this._uploading=false;}
  setConfig(config){this.session.receive(config);this._render();}
  set hass(value){this._hass=value;if(this._preview)this._preview.hass=value;}
  _error(message){const box=this.shadowRoot.querySelector('.error');if(box)box.textContent=message;}
  _field(parent,label,value,change,type='text',options){
    const wrap=el('label',label);const input=el(options?'select':'input',undefined,options?{}:{type});
    if(options)for(const [v,name] of options){const o=el('option',name);o.value=v;input.append(o);}
    if(type==='checkbox')input.checked=value;else input.value=value;
    input.addEventListener('change',()=>{try{change(type==='checkbox'?input.checked:type==='number'?Number(input.value):input.value);this._error('');this._updatePreview();}catch(e){this._error(e.message);}});
    wrap.append(input);parent.append(wrap);return input;
  }
  _updatePreview(){
    if(!this._preview)return;
    const config=this.session.draft??this.session.current;
    try {this._preview.setPreview(config,this._hass,!!this.session.draft,this._points);}
    catch(e){this._error(e.message);}
  }
  _syncUploadStatus(){
    if(this._saveButton)this._saveButton.disabled=this._uploading||this.session.conflict;
    if(this._uploadNotice)this._uploadNotice.textContent=this._uploading?'Bild wird geladen und verarbeitet. Bitte vor dem Übernehmen warten.':'';
  }
  _invalidateUpload(){this._uploadToken++;this._uploading=false;this._syncUploadStatus();}
  _begin(){this._invalidateUpload();this.session.begin();this._points=[];this._mode='place';this._render();}
  _cancel(){this._invalidateUpload();this.session.cancel();this._points=[];this._render();}
  _save(){
    try{
      if(this._uploading)throw new Error('Bild wird noch geladen oder verarbeitet. Bitte warten.');
      if(this._mode==='calibrate'&&this._points.length)throw new Error('Kalibrierung zuerst anwenden oder mit „Sensor per Klick platzieren“ verwerfen.');
      const config=normalizeConfig(this.session.draft);
      for(const sensor of config.sensors){const error=deviceError(sensor,this._hass);if(error)throw new Error(error);}
      const next=this.session.save();this._render();
      this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));
    }catch(e){this._error(e.message);}
  }
  async _upload(file){
    if(!this.session.draft||!file)return;
    const sessionDraft=this.session.draft,token=++this._uploadToken;
    this._uploading=true;this._syncUploadStatus();let bitmap;
    const active=()=>token===this._uploadToken&&this.session.draft===sessionDraft;
    try{
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10000000)throw new Error('PNG/JPEG/WebP bis 10 MB auswählen.');
      const bytes=await file.arrayBuffer();if(!active())return;
      const dimensions=imageDimensions(bytes,file.type);
      const decodeScale=Math.min(1,1600/Math.max(dimensions.width,dimensions.height));
      bitmap=await createImageBitmap(file,{resizeWidth:Math.max(1,Math.round(dimensions.width*decodeScale)),resizeHeight:Math.max(1,Math.round(dimensions.height*decodeScale)),resizeQuality:'high'});
      if(!active())return;
      if(bitmap.width*bitmap.height>30000000)throw new Error('Bild hat zu viele Pixel (maximal 30 Megapixel).');
      const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const image=canvas.toDataURL('image/jpeg',.82);
      if(image.length>MAX_IMAGE_LENGTH)throw new Error('Bild ist auch verkleinert zu groß. Bitte einen einfacheren Grundriss wählen.');
      // A pending decode must never resurrect a cancelled/replaced edit session.
      if(!active())return;
      const height=sessionDraft.plan.width_m*bitmap.height/bitmap.width;
      const {image_crop:oldCrop,...plan}=sessionDraft.plan;
      const candidate=normalizeConfig({...sessionDraft,plan:{...plan,image,height_m:height}});
      this.session.draft=candidate;this._points=[];this._render();
    }catch(error){if(token===this._uploadToken&&this.session.draft)throw error;}
    finally{bitmap?.close();if(token===this._uploadToken){this._uploading=false;this._syncUploadStatus();}}
  }
  _point(point){
    if(!this.session.draft)return;
    if(this._mode==='calibrate'){this._points=this._points.length>=2?[point]:[...this._points,point];this._updatePreview();this._measurement.textContent=`${this._points.length}/2 Messpunkte gesetzt`;return;}
    const s=this.session.draft.sensors[this._selected];
    if(!s){this._error('Zuerst einen Sensor hinzufügen.');return;}
    s.x=+point.x.toFixed(3);s.y=+point.y.toFixed(3);this._render();
  }
  _render(){
    this._saveButton=null;this._measurement=null;
    this.shadowRoot.replaceChildren(el('style',styles));const body=el('div',undefined,{class:'surface'});this.shadowRoot.append(body);
    body.append(el('div',`FP400 · Grundriss · ${VERSION}`,{class:'badge'}),el('h2','Grundriss & mehrere FP400'));
    const editing=!!this.session.draft;
    body.append(el('p',editing?'Entwurf: Änderungen gelten erst nach „Entwurf übernehmen“ und anschließendem Speichern der HA-Karte.':'Ansicht gesperrt. Zum Platzieren und Kalibrieren Bearbeitung ausdrücklich öffnen.',{class:'muted'}));
    const actions=el('div',undefined,{class:'actions'});body.append(actions);
    if(!editing){actions.append(button('Grundriss bearbeiten',()=>this._begin()));}
    else{
      const save=button('Entwurf übernehmen',()=>this._save());save.className='primary';save.disabled=this.session.conflict||this._uploading;this._saveButton=save;
      actions.append(save,button('Abbrechen',()=>this._cancel()));
      if(this.session.conflict)body.append(el('p','Konfiguration wurde außerhalb dieses Editors geändert. Bitte abbrechen und neu beginnen.',{class:'notice'}));
    }
    const error=el('p','',{class:'error',role:'alert'});body.append(error);
    this._uploadNotice=el('p','',{class:'muted',role:'status'});body.append(this._uploadNotice);this._syncUploadStatus();
    if(editing){
      const c=this.session.draft;
      const fields=el('div',undefined,{class:'fields'});body.append(fields);
      this._field(fields,'Kartentitel',c.title,v=>c.title=v);
      this._field(fields,'Grundrissbreite (m)',c.plan.width_m,v=>c.plan.width_m=v,'number');
      this._field(fields,'Grundrisshöhe (m)',c.plan.height_m,v=>c.plan.height_m=v,'number');
      this._field(fields,'Lokale Bilddatei (/local/...)',c.plan.image.startsWith('/local/')?c.plan.image:'',v=>{c.plan.image=v;delete c.plan.image_crop;});
      this._field(fields,'Technisches Koordinatenfeld anzeigen (keine garantierte Reichweite)',c.show_coverage,v=>c.show_coverage=v,'checkbox');
      const upload=el('label','Grundriss hochladen (PNG/JPEG/WebP, bleibt in deiner HA-Konfiguration)');const file=el('input',undefined,{type:'file',accept:'image/png,image/jpeg,image/webp'});upload.append(file);body.append(upload);
      file.addEventListener('change',()=>this._upload(file.files[0]).catch(e=>this._error(e.message)));
      body.append(button('Hintergrund entfernen',()=>{this._invalidateUpload();c.plan.image='';delete c.plan.image_crop;this._points=[];this._render();}));
      if(c.plan.image_crop)body.append(el('p','Diese Ansicht verwendet einen Bildausschnitt des unveränderten Originals. Maße und Kalibrierung beziehen sich auf diesen Ausschnitt. Ein neues Bild setzt den Ausschnitt zurück.',{class:'notice small'}));
      const mode=el('div',undefined,{class:'actions'});body.append(mode);
      mode.append(button('Sensor per Klick platzieren',()=>{this._mode='place';this._points=[];this._render();}),button('Zwei-Punkt-Kalibrierung',()=>{this._mode='calibrate';this._points=[];this._render();}));
      body.append(el('p',this._mode==='place'?'Im Grundriss klicken, um den ausgewählten Sensor zu platzieren. Die Pfeillinie zeigt seine Blickrichtung.':'Zwei Endpunkte einer bekannten Strecke im Grundriss anklicken. Danach ihre reale Länge eingeben. Sensorpositionen werden gleichmäßig mit skaliert.',{class:'notice'}));
      if(this._mode==='calibrate'){
        this._measurement=el('p',`${this._points.length}/2 Messpunkte gesetzt`);body.append(this._measurement);
        let length=1;this._field(body,'Bekannte Strecke (m)',length,v=>length=v,'number');
        body.append(button('Maßstab im Entwurf anwenden',()=>{try{
          if(this._points.length!==2)throw new Error('Zuerst zwei Messpunkte anklicken.');
          this.session.draft=calibrate(this.session.draft,this._points[0],this._points[1],length);this._points=[];this._mode='place';this._render();
        }catch(e){this._error(e.message);}}));
      }
      const options=compatibleEntities(this._hass,'targets').map(([id,s])=>[id,`${s.attributes.friendly_name??id} · ${id}`]);
      const zoptions=[['','Keine Zonen'],...compatibleEntities(this._hass,'zones').map(([id,s])=>[id,`${s.attributes.friendly_name??id} · ${id}`])];
      c.sensors.forEach((s,i)=>{
        const fieldset=el('fieldset');fieldset.append(el('legend',`${i+1}. ${s.name}`));body.append(fieldset);
        fieldset.append(button(this._selected===i?'Für Platzierung ausgewählt':'Diesen Sensor platzieren',()=>{this._selected=i;this._mode='place';this._render();}));
        const group=el('div',undefined,{class:'fields'});fieldset.append(group);
        const include=(opts,id)=>id&&!opts.some(([v])=>v===id)?[...opts,[id,`${id} (derzeit nicht verfügbar)`]]:opts;
        this._field(group,'Name',s.name,v=>{s.name=v;});
        this._field(group,'Verfolgte Personen',s.entity,v=>s.entity=v,'text',include(options,s.entity));
        this._field(group,'Zonen desselben Geräts (optional)',s.zones_entity,v=>s.zones_entity=v,'text',include(zoptions,s.zones_entity));
        this._field(group,'X ab linkem Rand (m)',s.x,v=>s.x=v,'number');
        this._field(group,'Y ab oberem Rand (m)',s.y,v=>s.y=v,'number');
        this._field(group,'Blickrichtung (−180° bis 180°)',s.yaw,v=>s.yaw=v,'number');
        this._field(group,'Links/rechts spiegeln (Zonen und Ziele)',s.mirror_x,v=>s.mirror_x=v,'checkbox');
        this._field(group,'Farbe',s.color,v=>s.color=v,'color');
        this._field(group,'Gespeicherte Zonen anzeigen',s.show_zones,v=>s.show_zones=v,'checkbox');
        fieldset.append(button('Sensor aus dieser Karte entfernen',()=>{c.sensors.splice(i,1);this._selected=Math.max(0,Math.min(this._selected,c.sensors.length-1));this._render();}));
      });
      const add=button('FP400 hinzufügen',()=>{
        try{
        const available=options.find(([id])=>!c.sensors.some(s=>s.entity===id));
        if(!available){this._error('Keine weitere kompatible Personenentität vorhanden. Erst Zusatzintegration prüfen.');return;}
        const next=normalizeConfig({...c,sensors:[...c.sensors,{entity:available[0],name:`FP400 ${c.sensors.length+1}`}]});
        this.session.draft=next;this._selected=next.sensors.length-1;this._render();
        }catch(error){this._error(error.message);}
      });add.disabled=c.sensors.length>=16;body.append(add);
      const json=el('textarea',undefined,{'aria-label':'Kartenkonfiguration als JSON',placeholder:'JSON zum Importieren hier einfügen (maximal 2 MB)'});
      const details=el('details');details.append(el('summary','Konfiguration sichern / importieren'),el('p','Enthält den privaten Grundriss. Export nicht öffentlich teilen.',{class:'small'}),json);body.append(details);
      const transfer=el('div',undefined,{class:'actions'});details.append(transfer);
      transfer.append(button('Entwurf als JSON anzeigen',()=>{json.value=JSON.stringify(this.session.draft,null,2);}),button('JSON als Entwurf laden',()=>{
        try{if(json.value.length>2000000)throw new Error('JSON ist zu groß.');const next=normalizeConfig(JSON.parse(json.value));this._invalidateUpload();this.session.draft=next;this._points=[];this._render();}catch(e){this._error(e.message);}
      }));
    }
    this._preview=document.createElement(CARD_TAG);this._preview.addEventListener('plan-point',e=>this._point(e.detail));body.append(this._preview);this._updatePreview();
  }
}

if(!customElements.get(CARD_TAG))customElements.define(CARD_TAG,FP400FloorplanTest);
if(!customElements.get(EDITOR_TAG))customElements.define(EDITOR_TAG,FP400FloorplanEditor);
// Preserve saved lab dashboards; saving through the new editor emits TYPE.
for(const legacy of ['fp400-floorplan-test-v5','fp400-floorplan-test'])if(!customElements.get(legacy))customElements.define(legacy,class extends FP400FloorplanTest {});
window.customCards=window.customCards??[];
if(!window.customCards.some(c=>c.type===CARD_TAG))window.customCards.push({type:CARD_TAG,name:'FP400 Grundriss – Wohnung und mehrere Sensoren',description:'Eigener Grundriss mit Positionen und Zonen mehrerer FP400, ausschließlich lesend.',preview:true,documentationURL:'https://github.com/ckundel2008/fp400-card/blob/main/docs/grundriss.md'});

})();
