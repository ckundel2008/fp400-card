import {VERSION,TYPE,CARD_TAG,EDITOR_TAG,MAX_IMAGE_LENGTH,normalizeConfig,toWorld,scene,compatibleEntities,deviceError,calibrate,EditSession,imageDimensions,displayFingerprint,imagePlacement} from './model.mjs';

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

export class FP400FloorplanTest extends HTMLElement {
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

export class FP400FloorplanEditor extends HTMLElement {
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
