/* Aquivo Dose 3 Card 1.2.0 — HA states/services only; no CDN or direct pump API. */
const FERT3_VERSION = '1.2.0';
const FERT3_DAYS=['Po','Ut','St','Št','Pi','So','Ne'];
const fert3Days=mask=>mask===127?'Každý deň':FERT3_DAYS.filter((_,i)=>mask&(1<<i)).join(' · ');
const FERT3_CACHE = new WeakMap();
const FERT3_COLORS = ['#277e70', '#7474bf', '#b28739'];
const FERT3_ICONS = [
  '<path d="M20 3C8 2 3 7 5 14c6 5 14 1 15-11Z"/><path d="M3 21 15 9M8 15l-1-5m5 1 5 1"/>',
  '<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/><path d="M12 8v5m-2.5-2.5h5"/>',
  '<path d="m12 2 8 5v10l-8 5-8-5V7Z"/><path d="m4 7 8 5 8-5m-8 5v10M8 9.5V6m8 3.5V6"/>',
];
const fert3Icon = index => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + FERT3_ICONS[index] + '</svg>';
const fert3Escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fert3Normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const fert3Valid = state => !!state && !['unknown', 'unavailable'].includes(state.state);
const FERT3_FIELDS = {
  mode: ['binary_output_1', 'Automatické hnojenie', 'switch'],
  clock: ['binary_input_2', 'Čas je overený', 'binary_sensor'],
  web_ip_high: ['analog_input_70', 'Web IPv4 horná časť', 'sensor'],
  web_ip_low: ['analog_input_71', 'Web IPv4 dolná časť', 'sensor'],
  web_ip_check: ['analog_input_72', 'Web IPv4 kontrola', 'sensor'],
  stop: ['binary_output_4', 'SERVICE zastaviť všetko', 'switch'],
};
for (let i = 0; i < 3; i++) {
  const b = 10 + i * 20, prefix = 'p' + (i + 1) + '_', label = 'P' + (i + 1) + ' ';
  for (const [key, property, title, domain] of [
    ['enabled', 'binary_output_' + b, 'Plán zapnutý', 'switch'],
    ['running', 'binary_input_' + (b + 1), 'Pumpa beží', 'binary_sensor'],
    ['percent', 'analog_in_percentage_' + (b + 2), 'Zostatok', 'sensor'],
    ['daily', 'analog_input_' + (b + 3), 'Podané dnes', 'sensor'],
    ['total', 'analog_input_' + (b + 4), 'Podané celkom', 'sensor'],
    ['manual', 'analog_output_' + (b + 5), 'Ručná dávka ml', 'number'],
    ['dose', 'binary_output_' + (b + 6), 'Podať ručnú dávku', 'switch'],
    ['target', 'analog_output_' + (b + 7), 'Denná dávka ml', 'number'],
    ['portions', 'analog_output_' + (b + 8), 'Počet dávok denne', 'number'],
    ['start', 'analog_output_' + (b + 9), 'Prvý čas min od polnoci', 'number'],
    ['end', 'analog_output_' + (b + 10), 'Posledný čas min od polnoci', 'number'],
    ['capacity', 'analog_output_' + (b + 11), 'Objem nádoby ml', 'number'],
    ['remaining', 'analog_output_' + (b + 12), 'Zostatok po doplnení ml', 'number'],
    ['limit', 'analog_output_' + (b + 13), 'Denný limit ml', 'number'],
    ['flow', 'analog_input_' + (b + 14), 'Kalibrovaný prietok', 'sensor'],
    ['fault', 'binary_input_' + (b + 15), 'Alarm', 'binary_sensor'],
    ['weekdays', 'analog_output_' + (b + 16), 'Dni týždňa maska', 'number'],
  ]) FERT3_FIELDS[prefix + key] = [property, label + title, domain];
}
function fert3Devices(registry) {
  return registry.devices.filter(d => fert3Normalize(d.manufacturer) === 'net4u' &&
    (d.model_id === 'NET4U-FERT3-ZB' || /(?:^|[^A-Z0-9])NET4U-FERT3-ZB(?:$|[^A-Z0-9])/.test(d.model || '')));
}
function fert3Map(registry, deviceId) {
  const entities = registry.entities.filter(e => e.device_id === deviceId && !e.disabled_by), result = {};
  for (const [key, [property, label, domain]] of Object.entries(FERT3_FIELDS)) {
    const candidates = entities.filter(e => e.entity_id.startsWith(domain + '.'));
    const exact = candidates.filter(e => new RegExp('(?:^|_)' + property + '(?:_|$)').test(e.unique_id || ''));
    const named = candidates.filter(e => fert3Normalize(e.original_name) === fert3Normalize(label));
    const found = exact.length ? exact : named;
    if (found.length === 1) result[key] = found[0].entity_id;
  }
  return result;
}
async function fert3Registry(hass, force = false) {
  const key = hass.connection || hass, cached = FERT3_CACHE.get(key);
  if (!force && cached && Date.now() - cached.time < 60000) return cached.promise;
  const promise = Promise.all([hass.callWS({type:'config/device_registry/list'}), hass.callWS({type:'config/entity_registry/list'})]).then(([devices, entities]) => ({devices, entities}));
  FERT3_CACHE.set(key, {time:Date.now(), promise});
  promise.catch(() => { if (FERT3_CACHE.get(key)?.promise === promise) FERT3_CACHE.delete(key); });
  return promise;
}
function fert3WebUrl(value) {
  if (!value) return '';
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
const FERT3_STYLE = `
.tabs{display:flex;border-bottom:1px solid var(--f3-line);margin:20px 0 18px;gap:8px}.tabs button{border-radius:0;background:transparent;color:var(--f3-muted);border-bottom:3px solid transparent;padding:12px 20px}.tabs button[aria-selected="true"]{color:#329e88;border-color:#329e88}.service-hint{font-size:11px;line-height:1.6;color:var(--f3-muted);margin:-4px 0 18px}.scheduler{border:1px solid var(--f3-line);border-radius:16px;padding:20px}.scheduler h3{font-size:18px;margin-bottom:15px}.pump-select{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 22px}.pump-select button{flex:1;min-width:100px;border:1px solid var(--f3-line);display:flex;align-items:center;justify-content:center;gap:7px}.pump-select svg{width:20px;height:20px;flex-shrink:0}.pump-select button[aria-pressed="true"]{color:var(--accent);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,transparent)}.schedule-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.check-row{display:flex;gap:10px;align-items:center;margin:8px 0 20px}.check-row input{width:20px;height:20px;margin:0;accent-color:#277e70}.weekday{font-size:12px;background:#277e7012;border-radius:9px;padding:12px;margin:4px 0 16px;line-height:1.7}.weekday{border:0}.weekday legend{font-weight:650}.weekday p{margin:6px 0}.weekdays{display:flex;gap:6px;flex-wrap:wrap}.weekdays label{display:flex;align-items:center;gap:5px;padding:9px;border:1px solid var(--f3-line);border-radius:8px;color:var(--f3-ink);cursor:pointer}.weekdays label:has(input:checked){border-color:#329e88;background:#277e7018}.weekdays input{width:16px;height:16px;margin:0;accent-color:#277e70}.schedule-preview{font-size:12px;line-height:1.7;color:var(--f3-muted);margin:12px 0 18px;overflow-wrap:anywhere}.schedule-actions{display:flex;gap:8px;flex-wrap:wrap}.schedule-actions button{flex:1}.schedule-hint{font-size:12px;line-height:1.7;color:var(--f3-muted)}.schedule-error{color:var(--error-color,#b54a4a);font-size:12px;line-height:1.6;margin-bottom:12px}.schedule-error:empty{display:none}@container(max-width:420px){.schedule-grid{grid-template-columns:1fr}.scheduler{padding:16px}.tabs button{flex:1;padding:12px 9px}.pump-select button{min-width:70px;font-size:11px;padding:10px 7px}}

:host{display:block;container-type:inline-size;--f3-ink:var(--primary-text-color,#183d40);--f3-muted:var(--secondary-text-color,#6d8182);--f3-line:var(--divider-color,#dce6e0);--f3-bg:var(--ha-card-background,var(--card-background-color,#fff))}*{box-sizing:border-box}ha-card{display:block;padding:24px;border-radius:22px;background:var(--f3-bg);color:var(--f3-ink);overflow:hidden}.head{display:flex;align-items:center;gap:12px}.brandmark{width:44px;height:44px;display:grid;place-items:center;background:#277e7018;border-radius:13px;color:#3a9d87}.brandmark svg{width:29px;height:29px}.eyebrow{font-size:10px;letter-spacing:2px;color:var(--f3-muted);font-weight:800}h2{margin:4px 0 0;font-size:22px;line-height:1.3;font-weight:650;letter-spacing:-.4px}.pill{margin-left:auto;font-size:11px;font-weight:700;border-radius:99px;padding:7px 11px;background:#277e7018;white-space:nowrap}.pill.bad{background:#bf50501a;color:var(--error-color,#ba4c4c)}.controls{display:flex;gap:9px;flex-wrap:wrap;margin:17px 0}.controls button{flex:1}.statusline{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--f3-muted);margin:0 0 16px}.dot{display:inline-block;border-radius:50%;width:6px;height:6px;background:var(--f3-muted);margin-right:5px}.dot.on{background:#38b79d}.pumps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.pump{min-width:0;border:1px solid color-mix(in srgb,var(--accent) 24%,var(--f3-line));border-top:3px solid var(--accent);padding:17px;border-radius:15px;background:color-mix(in srgb,var(--accent) 3%,transparent)}.phead{display:flex;align-items:center;gap:9px}.icon{height:35px;width:35px;flex-shrink:0;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 13%,transparent);color:var(--accent)}.icon svg{height:24px;width:24px}.channel{font-size:9px;letter-spacing:1px;font-weight:800;color:var(--f3-muted)}h3{font-size:16px;line-height:1.3;margin:3px 0 0;overflow-wrap:anywhere;font-weight:650}.pstate{font-size:10px;color:var(--f3-muted);margin-top:5px;line-height:1.4}.pstate.running{color:var(--accent);font-weight:700}.reservoir{display:flex;align-items:center;gap:16px;margin:23px 0 18px}.bottle{width:54px;height:83px;border:2px solid color-mix(in srgb,var(--accent) 36%,transparent);border-radius:10px 10px 15px 15px;position:relative;flex-shrink:0;overflow:hidden;background:color-mix(in srgb,var(--accent) 5%,transparent)}.liquid{position:absolute;bottom:0;left:0;right:0;height:calc(var(--fill,0)*1%);background:linear-gradient(155deg,color-mix(in srgb,var(--accent) 65%,transparent),var(--accent));transition:height .5s ease}.bottle svg{position:absolute;width:27px;height:27px;left:11px;top:27px;color:var(--f3-ink);opacity:.65}.percent{font-size:34px;font-weight:650;letter-spacing:-1.5px;font-variant-numeric:tabular-nums;line-height:1.1}.percent small{font-size:15px;color:var(--f3-muted);letter-spacing:0;margin-left:3px}.remaining{font-size:11px;color:var(--f3-muted);margin-top:5px;line-height:1.5}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px}.metric-label{font-size:10px;color:var(--f3-muted);margin-bottom:4px}.metric-value{font-size:17px;font-weight:650;font-variant-numeric:tabular-nums}.metric-value small{font-size:10px;font-weight:400;color:var(--f3-muted)}.plan{font-size:11px;line-height:1.65;min-height:36px;border-top:1px solid color-mix(in srgb,var(--accent) 17%,transparent);padding-top:12px;margin-bottom:12px;color:var(--f3-muted)}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pump button{padding:9px 7px;font-size:11px}.alarm{font-size:11px;color:var(--error-color,#b54a4a);margin:10px 0 0;line-height:1.5}.alarm:empty{display:none}button{font:inherit;font-size:12px;font-weight:600;border:0;border-radius:9px;padding:12px 13px;min-height:40px;cursor:pointer;color:var(--f3-ink);background:#277e7012}button.primary{background:#217c6c;color:white}button.stop{background:#bd555512;border:1px solid #bd55552e}button:disabled{opacity:.38;cursor:default}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #4fb49e;outline-offset:3px}.notice{font-size:12px;border-radius:9px;line-height:1.6;padding:10px 12px;background:#277e7012;margin:0 0 14px}.notice:empty{display:none}.empty{font-size:13px;color:var(--f3-muted);line-height:1.7;padding:20px 0}.footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:17px;padding-top:14px;border-top:1px solid var(--f3-line);font-size:10px;color:var(--f3-muted);line-height:1.6}.footer a{color:var(--f3-ink);font-size:11px;text-decoration:none}.footer a:hover{text-decoration:underline}dialog{color:var(--f3-ink);background:var(--f3-bg);border:1px solid var(--f3-line);border-radius:18px;padding:24px;width:min(420px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto}dialog::backdrop{background:#10242799}dialog h3{font-size:21px;margin:0 0 10px}dialog p{font-size:12px;line-height:1.7;color:var(--f3-muted)}label{display:block;font-size:12px;color:var(--f3-muted)}input,select{font:inherit;color:var(--f3-ink);background:var(--f3-bg);width:100%;padding:12px;border:1px solid var(--f3-line);border-radius:9px;margin:7px 0 15px}input{font-variant-numeric:tabular-nums}.modal-actions{display:grid;gap:8px}.modal-error{font-size:12px;color:var(--error-color,#b54a4a);line-height:1.6;margin-bottom:12px}[hidden]{display:none!important}@container(max-width:700px){.pumps{grid-template-columns:1fr}.pump{padding:17px 19px}.pump-content{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.reservoir{margin:18px 0}.metrics{align-content:center;margin:18px 0}.plan,.buttons,.alarm{grid-column:1/-1}.plan{min-height:0}.buttons{grid-template-columns:1fr 1fr}.pump button{font-size:12px}.phead h3{font-size:17px}}@container(max-width:330px){ha-card{padding:17px}.pump-content{gap:0 10px}.reservoir{gap:10px}.percent{font-size:30px}.bottle{width:45px}.bottle svg{left:7px}.metric-value{font-size:16px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;
class Net4uFert3Card extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'});this._map={};this._message='';this._registryAt=0;this._command=null;this._lastDraw='';this._tab='pumps';this._scheduleIndex=0;this._scheduleLoaded=false; }
  static getConfigElement() { return document.createElement('net4u-fert3-card-editor'); }
  static getStubConfig() { return {type:'custom:net4u-fert3-card',name:'Hnojenie',pump_names:['Makro','Mikro','Draslík']}; }
  getCardSize() { return 13; }
  getGridOptions() { return {columns:12,rows:'auto',min_columns:6}; }
  setConfig(config) {
    if (config.device_id !== undefined && typeof config.device_id !== 'string') throw Error('Vyber správny trojpumpový dávkovač.');
    if (config.pump_names !== undefined && (!Array.isArray(config.pump_names) || config.pump_names.length !== 3 || config.pump_names.some(n=>typeof n!=='string'||n.length>48))) throw Error('Zadaj tri názvy hnojív, každý najviac 48 znakov.');
    if (config.web_url && !fert3WebUrl(config.web_url)) throw Error('Adresa webu musí začínať http:// alebo https://.');
    this._command=null;this._config={...config};this._registryAt=0;this._map={};this._device=null;this._deviceId=null;this._lastDraw='';this._scheduleLoaded=false;this._scheduleDaysLoaded=false;this._create();this._el('modal').close();this._resolve();this._render();
  }
  set hass(hass) { this._hass=hass;this._resolve();this._render(); }
  connectedCallback() { this._create();this._resolve();this._poll ||= setInterval(()=>{if(document.visibilityState!=='hidden')this._resolve(true);},60000); }
  disconnectedCallback() { clearInterval(this._poll);this._poll=null;this._command=null; }
  async _resolve(force=false) {
    if(!this._hass||!this._config||this._loading||(!force&&this._registry&&Date.now()-this._registryAt<60000))return;
    this._loading=true;
    try { const registry=await fert3Registry(this._hass,force);this._registry=registry;this._registryAt=Date.now();const devices=fert3Devices(registry);
      const previousDevice=this._deviceId;this._deviceId=this._config.device_id||(devices.length===1?devices[0].id:null);if(previousDevice!==this._deviceId)this._scheduleLoaded=false;this._device=devices.find(d=>d.id===this._deviceId);
      this._map=this._device?fert3Map(registry,this._deviceId):{};this._registryError='';
    } catch { this._registryError='Entity sa nepodarilo načítať. Obnov stránku.'; }
    finally { this._loading=false;this._lastDraw='';this._render(); }
  }
  _state(key) { return this._hass?.states[this._map[key]]; }
  _number(key) { const s=this._state(key);return fert3Valid(s)&&s.state.trim()!==''&&Number.isFinite(Number(s.state))?Number(s.state):null; }
  _on(key) { return this._state(key)?.state==='on'; }
  _off(key) { return this._state(key)?.state==='off'; }
  _key(i,field) { return 'p'+(i+1)+'_'+field; }
  _n(i,field) { return this._number(this._key(i,field)); }
  _name(i) { return this._config?.pump_names?.[i]?.trim()||['Makro','Mikro','Draslík'][i]; }
  _fmt(value,digits=1) { return value===null?'—':new Intl.NumberFormat(this._hass?.locale?.language||'sk',{maximumFractionDigits:digits}).format(value); }
  _time(minute) { return Number.isInteger(minute)&&minute>=0&&minute<1440?String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'):'—'; }
  _flow(i) { const value=this._n(i,'flow');return value===null?null:/ml\s*\/\s*min/i.test(this._state(this._key(i,'flow'))?.attributes?.unit_of_measurement||'')?value:value*60; }
  _el(id) { return this.shadowRoot.getElementById(id); }
  _webUrl() {
    const keys=['web_ip_high','web_ip_low','web_ip_check'];
    if(keys.some(key=>this._map[key])) {
      if(!this._online())return '';
      const [high,low,check]=keys.map(key=>this._number(key));
      if(![high,low,check].every(n=>Number.isInteger(n)&&n>=0&&n<=65535)||(high^low)!==check)return '';
      const octets=[high>>>8,high&255,low>>>8,low&255];
      if(octets[0]===0||octets[0]===127||octets[0]>=224)return '';
      return 'http://'+octets.join('.')+'/';
    }
    return fert3WebUrl(this._device?.configuration_url)||fert3WebUrl(this._config.web_url);
  }
  _online() { return !!this._device&&fert3Valid(this._state('mode')); }
  _allStopped() { return [0,1,2].every(i=>this._off(this._key(i,'running'))); }
  _autoAllowed() {
    if(!this._online()||!this._on('clock')||!this._allStopped())return false;
    let enabled=false;
    for(let i=0;i<3;i++) {
      const key=this._key(i,'enabled');if(!fert3Valid(this._state(key)))return false;
      if(this._on(key)) { enabled=true;if(!this._off(this._key(i,'fault'))||!(this._n(i,'remaining')>0)||!(this._flow(i)>0)||!(this._n(i,'target')>0))return false; }
    }
    return enabled;
  }
  _canEdit(i,dose=false) {
    if(!this._online()||!this._off('mode')||!this._allStopped()||this._command)return false;
    if(!dose)return !!this._map[this._key(i,'remaining')]&&this._n(i,'capacity')!==null;
    return this._on('clock')&&this._off(this._key(i,'fault'))&&this._flow(i)>0&&this._n(i,'remaining')>0&&this._n(i,'daily')!==null&&this._n(i,'limit')!==null&&!!this._map[this._key(i,'manual')]&&!!this._map[this._key(i,'dose')];
  }
  _weekdayMask(i) {const value=this._n(i,'weekdays');return Number.isInteger(value)&&value>=1&&value<=127?value:null;}
  _canSchedule() {
    const i=this._scheduleIndex;
    return this._online()&&this._off('mode')&&this._allStopped()&&!this._command&&
      ['target','portions','start','end','limit'].every(f=>this._n(i,f)!==null)&&
      (!this._map[this._key(i,'weekdays')]||this._weekdayMask(i)!==null)&&
      fert3Valid(this._state(this._key(i,'enabled')))&&
      ['target','portions','start','end','enabled'].every(f=>!!this._map[this._key(i,f)]);
  }
  _switchTab(tab) {
    this._tab=tab;
    if(tab==='schedule'&&!this._scheduleLoaded)this._loadSchedule(this._scheduleIndex);
    this._lastDraw='';this._render();
  }
  _loadSchedule(i) {
    if(this._command)return;
    this._scheduleIndex=i;this._scheduleDaysLoaded=this._weekdayMask(i)!==null;
    for(let day=0;day<7;day++)this._el('schedule-day'+day).checked=!!((this._weekdayMask(i)??127)&(1<<day));
    this._el('schedule-target').value=this._n(i,'target')??'';
    this._el('schedule-portions').value=this._n(i,'portions')??'';
    for(const field of ['start','end']) {const value=this._n(i,field);this._el('schedule-'+field).value=value===null?'':this._time(value);}
    this._el('schedule-enabled').checked=this._on(this._key(i,'enabled'));this._el('schedule-target').max=this._n(i,'limit')??2000;
    this._scheduleLoaded=['target','portions','start','end'].every(f=>this._n(i,f)!==null);
    this._el('schedule-error').textContent='';this._scheduleSummary();this._lastDraw='';this._render();
  }
  _scheduleValues() {
    const value=id=>this._el('schedule-'+id).value.trim();
    const minute=raw=>/^\d{2}:\d{2}$/.test(raw)&&Number(raw.slice(0,2))<24&&Number(raw.slice(3))<60?Number(raw.slice(0,2))*60+Number(raw.slice(3)):NaN;
    return {target:value('target')?Number(value('target')):NaN,portions:value('portions')?Number(value('portions')):NaN,
      start:minute(value('start')),end:Number(value('portions'))===1?minute(value('start')):minute(value('end')),enabled:!!this._el('schedule-enabled').checked,weekdays:[0,1,2,3,4,5,6].reduce((mask,day)=>mask|(this._el('schedule-day'+day).checked?(1<<day):0),0)};
  }
  _scheduleError(v) {
    if(!Number.isInteger(v.weekdays)||v.weekdays<1||v.weekdays>127)return 'Vyber aspoň jeden deň v týždni.';
    if(!Number.isFinite(v.target)||v.target<0||v.target>2000||Math.abs(v.target*10-Math.round(v.target*10))>1e-5)return 'Zadaj denný objem 0–2 000 ml, najviac na jedno desatinné miesto.';
    if(v.target>this._n(this._scheduleIndex,'limit'))return 'Denný objem presahuje denný limit pumpy. Limit môžeš upraviť na webe.';
    if(!Number.isInteger(v.portions)||v.portions<1||v.portions>24)return 'Počet dávok musí byť 1–24.';
    if(!Number.isInteger(v.start)||!Number.isInteger(v.end)||v.start<0||v.end>1439||v.start>1439||v.end<0||
      (v.portions>1&&v.end<v.start+v.portions-1))return 'Zadaj platné časy. Pri viacerých dávkach musí byť posledný čas neskôr, aspoň minútu medzi dávkami.';
    if(v.target>0&&v.target/v.portions<.1-1e-9)return 'Jedna plánovaná dávka musí mať aspoň 0,1 ml.';
    const duration=v.target*60000/(v.portions*this._flow(this._scheduleIndex));
    if(v.enabled&&v.target/v.portions>500)return 'Jedna plánovaná dávka môže mať najviac 500 ml. Zvýš počet dávok.';
    if(v.enabled&&(!(v.target>0)||!(this._flow(this._scheduleIndex)>0)||duration<200||duration>600000))return 'Zapnutý plán potrebuje kalibráciu a dávky trvajúce 0,2 s až 10 minút.';
    return '';
  }
  _scheduleSummary() {
    const v=this._scheduleValues(),error=this._scheduleError(v);
    this._el('schedule-end-row').hidden=v.portions===1;
    this._el('schedule-preview').textContent=error?'Vyplň denný objem a časy dávok.':
      Array.from({length:v.portions},(_,n)=>this._time(v.portions===1?v.start:v.start+Math.floor((v.end-v.start)*n/(v.portions-1)))).join(' · ')+
      ' · '+this._fmt(v.target/v.portions,2)+' ml na dávku · '+fert3Days(v.weekdays);
  }
  async _saveSchedule() {
    if(!this._canSchedule())return false;
    const i=this._scheduleIndex,v=this._scheduleValues(),error=this._scheduleError(v);
    this._el('schedule-error').textContent=error;if(error)return false;
    const success=await this._transaction('schedule',async token=>{
      // Single-attribute Zigbee writes must each form a valid firmware config.
      // One portion permits moving both times without an invalid intermediate range.
      const writes=[['portions',1],['start',v.start],['end',v.end],['target',v.target],['portions',v.portions]];
      if(this._map[this._key(i,'weekdays')])writes.push(['weekdays',v.weekdays]);
      writes.push(['enabled',v.enabled?'on':'off']);
      for(const [field,value] of writes) {
        if(!this._online()||!this._off('mode')||!this._allStopped())throw Error('Stav sa zmenil. Ukladanie plánu bolo prerušené.');
        const key=this._key(i,field),binary=field==='enabled';
        if(binary?this._state(key)?.state===value:this._number(key)===value)continue;
        await this._call(token,binary?'switch':'number',binary?(v.enabled?'turn_on':'turn_off'):'set_value',
          binary?{entity_id:this._map[key]}:{entity_id:this._map[key],value});
        await this._wait(token,key,value,!binary);
      }
      for(const field of ['target','portions','start','end','weekdays','enabled']) {
        if(field==='weekdays'&&!this._map[this._key(i,'weekdays')])continue;
        const key=this._key(i,field),expected=field==='enabled'?(v.enabled?'on':'off'):v[field];
        if(field==='enabled'?this._state(key)?.state!==expected:this._number(key)===null||Math.abs(this._number(key)-expected)>.011)throw Error('Niektorá hodnota sa zmenila. Načítaj a skontroluj plán.');
      }
    });
    if(success){this._message='Plán je uložený. SERVICE zostáva zapnutý; automatické dávkovanie spustíš cez AUTO.';this._loadSchedule(i);}
    else {this._el('schedule-error').textContent='Plán sa neuložil celý. Niektoré hodnoty už mohli byť zmenené. Načítaj stav zo zariadenia a skontroluj ho.';}
    this._lastDraw='';this._render();return success;
  }
  _create() {
    if(this._el('card'))return;
    const pumps=[0,1,2].map(i=>`<section class="pump" style="--accent:${FERT3_COLORS[i]}" aria-labelledby="p${i}-name"><div class="phead"><span class="icon">${fert3Icon(i)}</span><div><div class="channel">PUMPA ${i+1}</div><h3 id="p${i}-name"></h3><div id="p${i}-state" class="pstate"></div></div></div><div class="pump-content"><div class="reservoir"><div class="bottle"><div class="liquid" id="p${i}-liquid"></div>${fert3Icon(i)}</div><div><div class="percent"><span id="p${i}-percent">—</span><small>%</small></div><div class="remaining" id="p${i}-remaining"></div></div></div><div class="metrics"><div><div class="metric-label">Podané dnes</div><div class="metric-value"><span id="p${i}-daily">—</span> <small>ml</small></div></div><div><div class="metric-label">Denný plán</div><div class="metric-value"><span id="p${i}-target">—</span> <small>ml</small></div></div></div><div class="plan" id="p${i}-plan"></div><div class="buttons"><button id="p${i}-dose">Ručná dávka</button><button id="p${i}-refill">Doplniť nádobu</button></div><p class="alarm" id="p${i}-alarm"></p></div></section>`).join('');
    this.shadowRoot.innerHTML=`<style>${FERT3_STYLE}</style><ha-card id="card"><header class="head"><div class="brandmark">${fert3Icon(0)}</div><div><div class="eyebrow">AQUIVO DOSE 3</div><h2 id="title">Hnojenie</h2></div><span class="pill" id="status">Načítavam</span></header><div class="empty" id="empty"></div><div id="body"><div class="controls"><button class="primary" id="auto">Zapnúť AUTO</button><button class="stop" id="service">SERVICE / zastaviť všetko</button></div><div class="statusline"><span id="clock"></span><span id="activity"></span></div><div class="notice" id="notice" role="status" aria-live="polite"></div><nav class="tabs" role="tablist" aria-label="Ovládanie dávkovača"><button id="tab-pumps" role="tab" aria-controls="panel-pumps" aria-selected="true">Pumpy</button><button id="tab-schedule" role="tab" aria-controls="panel-schedule" aria-selected="false">Plánovanie</button></nav><section id="panel-pumps" role="tabpanel" aria-labelledby="tab-pumps"><p class="service-hint" id="service-hint"></p><div class="pumps">${pumps}</div></section><section id="panel-schedule" class="scheduler" role="tabpanel" aria-labelledby="tab-schedule" hidden><h3>Nastavenie automatických dávok</h3><div class="pump-select" role="group" aria-label="Vyber pumpu">${[0,1,2].map(i=>`<button id="schedule-pump${i}" style="--accent:${FERT3_COLORS[i]}" aria-pressed="false">${fert3Icon(i)}<span id="schedule-name${i}"></span></button>`).join('')}</div><label class="check-row"><input id="schedule-enabled" type="checkbox">Automatický plán tejto pumpy</label><div class="schedule-grid"><label for="schedule-target">Denný objem (ml)<input id="schedule-target" type="number" min="0" max="2000" step="0.1" inputmode="decimal"></label><label for="schedule-portions">Počet dávok denne<input id="schedule-portions" type="number" min="1" max="24" step="1" inputmode="numeric"></label><label for="schedule-start">Prvý čas dávkovania<input id="schedule-start" type="time" step="60"></label><label id="schedule-end-row" for="schedule-end">Posledný čas dávkovania<input id="schedule-end" type="time" step="60"></label></div><fieldset class="weekday"><legend>Dni automatického dávkovania</legend><div class="weekdays">${FERT3_DAYS.map((name,i)=>`<label><input id="schedule-day${i}" type="checkbox" checked>${name}</label>`).join('')}</div><p id="schedule-days-hint"></p><span>Časy zariadenia: Europe/Bratislava. Denný objem platí pre každý označený deň.</span></fieldset><div id="schedule-preview" class="schedule-preview"></div><div id="schedule-error" class="schedule-error" role="status"></div><div class="schedule-actions"><button id="schedule-save" class="primary">Uložiť plán</button><button id="schedule-reload">Načítať zo zariadenia</button></div><p id="schedule-hint" class="schedule-hint"></p></section><footer class="footer"><span>Odhad podľa kalibrácie · dnešný objem zahŕňa aj ručné dávky a kalibráciu.</span><a id="web" target="_blank" rel="noopener noreferrer" hidden>Web dávkovača ↗</a></footer></div></ha-card><dialog id="modal" aria-labelledby="modal-title"><h3 id="modal-title"></h3><p id="modal-description"></p><label id="modal-label" for="amount"></label><input id="amount" type="number" min="0" step="0.1" inputmode="decimal"><div class="modal-error" id="modal-error" role="status"></div><div class="modal-actions"><button class="primary" id="modal-save"></button><button id="modal-full" hidden>Vyplniť plný objem</button><button id="modal-cancel">Späť</button><button class="stop" id="modal-stop">SERVICE / zastaviť všetko</button></div></dialog>`;
    this._el('auto').onclick=()=>this._mode(true);this._el('service').onclick=()=>this._mode(false);
    for(const tab of ['pumps','schedule']) {
      this._el('tab-'+tab).onclick=()=>this._switchTab(tab);
      this._el('tab-'+tab).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'pumps':event.key==='End'?'schedule':tab==='pumps'?'schedule':'pumps';this._switchTab(next);this._el('tab-'+next).focus();}});
    }
    for(let i=0;i<3;i++)this._el('schedule-pump'+i).onclick=()=>this._loadSchedule(i);
    for(const field of ['target','portions','start','end','enabled'])this._el('schedule-'+field).oninput=()=>this._scheduleSummary();
    for(let day=0;day<7;day++)this._el('schedule-day'+day).oninput=()=>this._scheduleSummary();
    this._el('schedule-save').onclick=()=>this._saveSchedule();this._el('schedule-reload').onclick=()=>this._loadSchedule(this._scheduleIndex);

    for(let i=0;i<3;i++){this._el('p'+i+'-dose').onclick=()=>this._openModal(i,'dose');this._el('p'+i+'-refill').onclick=()=>this._openModal(i,'refill');}
    this._el('modal-save').onclick=()=>this._saveModal();this._el('modal-cancel').onclick=()=>this._closeModal();
    this._el('modal-stop').onclick=()=>{this._closeModal(true);this._mode(false);};
    this._el('modal-full').onclick=()=>{const capacity=this._n(this._modalIndex,'capacity');if(capacity!==null)this._el('amount').value=capacity;};
    this._el('modal').addEventListener('cancel',event=>{if(this._command){event.preventDefault();this._el('modal-error').textContent='Príkaz už prebieha. Na prerušenie použi SERVICE.';}});
  }
  _render() {
    if(!this._config||!this._hass||!this._el('card'))return;
    const signature=JSON.stringify([this._config,this._deviceId,this._registryError,this._message,!!this._command,Object.entries(this._map).map(([key,id])=>[key,id,this._hass.states[id]?.state,this._hass.states[id]?.attributes?.unit_of_measurement])]);
    if(signature===this._lastDraw)return;this._lastDraw=signature;
    this._el('title').textContent=this._config.name||this._device?.name_by_user||'Hnojenie';
    const empty=this._registryError||(!this._registry?'Načítavam dávkovač…':!this._device?'V editore karty vyber dávkovač Aquivo Dose 3.':!this._map.mode?'Entity sa ešte nenačítali. Skontroluj Zigbee2MQTT.':'');
    this._el('empty').textContent=empty;this._el('empty').hidden=!empty;this._el('body').hidden=!!empty;
    const online=this._online(),automatic=this._on('mode'),fault=[0,1,2].some(i=>this._on(this._key(i,'fault'))),running=[0,1,2].filter(i=>this._on(this._key(i,'running')));
    this._el('status').textContent=empty?'Nastavenie':!online?'Offline':fault?'Alarm':automatic?'AUTO':'SERVICE';this._el('status').classList.toggle('bad',!empty&&(!online||fault));
    this._el('clock').textContent=!online?'Čas neoverený':this._on('clock')?'● Čas overený':'Čakám na overenie času';
    this._el('activity').textContent=!online?'Stav púmp neznámy':running.length?'Beží '+running.map(i=>this._name(i)).join(', '):this._allStopped()?'Všetky pumpy stoja':'Stav niektorej pumpy neznámy';
    this._el('auto').disabled=!!this._command||automatic||!this._autoAllowed();this._el('auto').textContent=automatic?'AUTO je zapnuté':'Zapnúť AUTO';
    this._el('service').disabled=!this._map.mode&&!this._map.stop;
    this._el('notice').textContent=this._message||(!online?'Zariadenie je nedostupné. SERVICE zostáva dostupný na pokus o zastavenie.':!this._on('clock')?'Automatický plán čaká na overenie času v zariadení.':'');
    for(let i=0;i<3;i++){
      const prefix='p'+i+'-',percent=this._n(i,'percent'),remaining=this._n(i,'remaining'),capacity=this._n(i,'capacity'),isRunning=this._on(this._key(i,'running')),hasFault=this._on(this._key(i,'fault'));
      this._el(prefix+'name').textContent=this._name(i);this._el(prefix+'state').textContent=!online?'Nedostupná':hasFault?'Alarm':isRunning?'Pumpa beží':this._off(this._key(i,'running'))?'V pokoji':'Stav neznámy';
      this._el(prefix+'state').classList.toggle('running',online&&isRunning);this._el(prefix+'percent').textContent=online?this._fmt(percent):'—';
      this._el(prefix+'liquid').style.setProperty('--fill',online&&percent!==null?Math.max(0,Math.min(100,percent)):0);
      this._el(prefix+'remaining').textContent=online?this._fmt(remaining)+' / '+this._fmt(capacity)+' ml':'— ml';
      this._el(prefix+'daily').textContent=online?this._fmt(this._n(i,'daily'),2):'—';this._el(prefix+'target').textContent=online?this._fmt(this._n(i,'target')):'—';
      const portions=this._n(i,'portions'),start=this._n(i,'start'),end=this._n(i,'end');let plan='Plán zatiaľ nie je načítaný';
      if(!online)plan='Časy a stav plánu nie sú potvrdené';
      else if(this._off(this._key(i,'enabled')))plan='Automatický plán je vypnutý';
      else if(this._on(this._key(i,'enabled'))&&Number.isInteger(portions)&&portions>=1&&portions<=24&&start!==null&&end!==null){
        const times=Array.from({length:portions},(_,n)=>this._time(portions===1?start:start+Math.floor((end-start)*n/(portions-1))));
        plan=portions+'× denne · '+(portions<=3?times.join(' · '):times[0]+' – '+times.at(-1));
      }
      const days=this._weekdayMask(i);
      if(online&&this._on(this._key(i,'enabled'))&&days!==null)plan=fert3Days(days)+' · '+plan;
      this._el(prefix+'plan').textContent=plan;
      this._el(prefix+'alarm').textContent=online&&hasFault?'Dávkovanie blokuje alarm. Podrobnosti a potvrdenie nájdeš na webe.':'';
      this._el(prefix+'dose').disabled=!this._canEdit(i,true);this._el(prefix+'refill').disabled=!this._canEdit(i,false);
      this._el(prefix+'dose').title=automatic?'Pre ručnú dávku v karte najprv zvoľ SERVICE.':'';this._el(prefix+'refill').title=automatic?'Nádobu doplníš v SERVICE.':'';
    }
    this._el('service-hint').textContent=automatic?'Automatický plán je aktívny. Pre samostatnú ručnú dávku zvoľ SERVICE.':'SERVICE pozastavuje automatický plán. Ručné dávkovanie je dostupné pri zastavených pumpách aj s vypnutým plánom pumpy.';
    for(const tab of ['pumps','schedule']) {const selected=this._tab===tab;this._el('panel-'+tab).hidden=!selected;this._el('tab-'+tab).setAttribute('aria-selected',String(selected));this._el('tab-'+tab).tabIndex=selected?0:-1;}
    for(let i=0;i<3;i++) {this._el('schedule-name'+i).textContent=this._name(i);this._el('schedule-pump'+i).setAttribute('aria-pressed',String(i===this._scheduleIndex));this._el('schedule-pump'+i).disabled=!!this._command;}
    const canSchedule=this._canSchedule();
    for(const field of ['target','portions','start','end','enabled'])this._el('schedule-'+field).disabled=!canSchedule;
    const daysMask=this._weekdayMask(this._scheduleIndex);
    if(!this._scheduleDaysLoaded&&daysMask!==null){for(let day=0;day<7;day++)this._el('schedule-day'+day).checked=!!(daysMask&(1<<day));this._scheduleDaysLoaded=true;this._scheduleSummary();}
    for(let day=0;day<7;day++)this._el('schedule-day'+day).disabled=!canSchedule||daysMask===null;
    this._el('schedule-days-hint').textContent=daysMask===null?'Výber dní čaká na nový firmvér a načítanie nových Zigbee entít. Aktuálny rozvrh dní ešte nie je potvrdený.':'V neoznačený deň sa automaticky nedávkuje. Ručné dávky sú dostupné v SERVICE.';
    this._el('schedule-save').disabled=!canSchedule;this._el('schedule-reload').disabled=!!this._command||!online;
    this._el('schedule-hint').textContent=!online?'Plán vyžaduje dostupné zariadenie.':automatic?'Pre úpravu plánu zvoľ SERVICE. Ručné dávky potom zostávajú dostupné.':!this._allStopped()?'Počkaj na zastavenie všetkých púmp.':'Ukladá sa do zariadenia cez Zigbee. Po uložení zostáva SERVICE. AUTO dobehne dnešné vynechané dávky, ak je dnešný deň označený; minulé dni nedobieha.';
    if(this._tab==='schedule'&&!this._scheduleLoaded&&['target','portions','start','end'].every(f=>this._n(this._scheduleIndex,f)!==null))this._loadSchedule(this._scheduleIndex);
    const web=this._webUrl();this._el('web').hidden=!web;if(web)this._el('web').href=web;else this._el('web').removeAttribute('href');
    this._el('modal-save').disabled=!!this._command||!online||!this._off('mode')||!this._allStopped();this._el('modal-cancel').disabled=!!this._command;
    this._el('modal-full').disabled=!!this._command;this._el('amount').disabled=!!this._command;
  }
  _active(token) { return this._command===token&&!!this._device&&this._deviceId===token.deviceId&&JSON.stringify(this._map)===token.mapping; }
  async _call(token,domain,service,data) {
    if(!this._active(token))throw Error('Príkaz bol prerušený.');
    if(typeof data.entity_id!=='string'||!data.entity_id.startsWith(domain+'.')||!token.targets.has(data.entity_id))throw Error('Nejednoznačný cieľ príkazu. Obnov entity karty.');
    let timer;try { await Promise.race([this._hass.callService(domain,service,data),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Odpoveď neprišla. Skontroluj skutočný stav pred opakovaním.')),10000);})]); } finally { clearTimeout(timer); }
    if(!this._active(token))throw Error('Príkaz bol prerušený.');
  }
  async _wait(token,key,expected,numeric=false) {
    const deadline=Date.now()+9000;
    while(this._active(token)) {
      if(numeric ? this._number(key)!==null&&Math.abs(this._number(key)-expected)<.011 : this._state(key)?.state===expected)return;
      if(Date.now()>=deadline)throw Error('Zariadenie nepotvrdilo hodnotu. Over ju pred ďalším pokusom.');
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    throw Error('Príkaz bol prerušený.');
  }
  async _transaction(kind,operation,urgent=false) {
    if(this._command&&!urgent)return false;
    const token={kind,deviceId:this._deviceId,mapping:JSON.stringify(this._map),targets:new Set(Object.values(this._map))};this._command=token;this._message='Odosielam príkaz…';this._lastDraw='';this._render();
    try { await operation(token);if(!this._active(token))return false;this._command=null;this._message=kind==='dose'?'Dávka bola odoslaná. Podané množstvo potvrdzuje zariadenie.':'Stav v HASS zodpovedá požiadavke.';this._lastDraw='';this._render();return true; }
    catch(error) {if(this._command===token){this._command=null;this._message=error.message||'Príkaz sa nepodaril.';this._el('modal-error').textContent=this._message;this._lastDraw='';this._render();}return false;}
  }
  async _mode(on) {
    if(on&&!this._autoAllowed())return false;
    if(!this._map.mode&&!(!on&&this._map.stop))return false;
    return this._transaction('mode',async token=>{
      if(this._map.mode){await this._call(token,'switch',on?'turn_on':'turn_off',{entity_id:this._map.mode});await this._wait(token,'mode',on?'on':'off');}
      else await this._call(token,'switch','turn_on',{entity_id:this._map.stop});
    },!on);
  }
  _openModal(index,kind) {
    if(!this._canEdit(index,kind==='dose'))return;
    this._modalIndex=index;this._modalKind=kind;this._el('modal-error').textContent='';
    const dose=kind==='dose';this._el('modal-title').textContent=(dose?'Ručná dávka · ':'Doplnenie · ')+this._name(index);
    this._el('modal-description').textContent=dose?'Ručná dávka je navyše k plánu a započíta sa do denného limitu. Karta ju automaticky neopakuje.':'Zadaj celkové množstvo, ktoré je teraz v nádobe. Dnešná spotreba ani plán sa tým nevynulujú.';
    this._el('modal-label').textContent=dose?'Objem dávky (ml)':'Skutočný zostatok po doplnení (ml)';this._el('amount').min=dose ? 0.1 : 0;
    this._el('amount').max=dose?Math.min(500,this._n(index,'remaining'),this._n(index,'limit')-this._n(index,'daily')):this._n(index,'capacity');
    this._el('amount').value=dose?(this._n(index,'manual')??1):'';this._el('modal-full').hidden=dose;this._el('modal-save').textContent=dose?'Podať jednu dávku':'Uložiť skutočný zostatok';
    this._el('modal').showModal();this._el('amount').focus();this._lastDraw='';this._render();
  }
  _closeModal(force=false) { if(this._command&&!force)return;this._el('modal').close(); }
  async _saveModal() {
    const i=this._modalIndex,kind=this._modalKind,raw=this._el('amount').value.trim(),value=Number(raw);
    if(!this._canEdit(i,kind==='dose'))return false;
    let error=!raw||!Number.isFinite(value)||Math.abs(value*10-Math.round(value*10))>1e-5?'Zadaj objem v ml, najviac na jedno desatinné miesto.':'';
    if(!error&&kind==='refill'&&(value<0||value>this._n(i,'capacity')))error='Zostatok musí byť v rozsahu nádoby.';
    if(!error&&kind==='dose') {
      const duration=value*60000/this._flow(i);
      if(value<.1||value>500||value>this._n(i,'remaining')||value+this._n(i,'daily')>this._n(i,'limit')+.0001||duration<200||duration>600000)error='Skontroluj objem, zostatok a denný limit. Dávka musí trvať 0,2 s až 10 minút.';
    }
    this._el('modal-error').textContent=error;if(error)return false;
    const success=await this._transaction(kind,async token=>{
      const field=this._key(i,kind==='dose'?'manual':'remaining');
      await this._call(token,'number','set_value',{entity_id:this._map[field],value});await this._wait(token,field,value,true);
      // Never trigger the dose until its selected amount is confirmed. STOP or
      // a device/config change cancels this second phase, without an auto-retry.
      if(kind==='dose') {
        if(!this._online()||!this._off('mode')||!this._allStopped()||!this._on('clock'))throw Error('Stav sa medzitým zmenil. Dávka nebola spustená.');
        await this._call(token,'switch','turn_on',{entity_id:this._map[this._key(i,'dose')]});
      }
    });
    if(success)this._closeModal();return success;
  }
}

class Net4uFert3CardEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});}
  setConfig(config){this._config={...config};this._draw();this._resolve();}
  set hass(hass){this._hass=hass;this._resolve();}
  async _resolve(){if(!this._hass||this._loading)return;this._loading=true;try{this._devices=fert3Devices(await fert3Registry(this._hass));this._draw();}catch{}finally{this._loading=false;}}
  _draw(){
    if(!this._config)return;
    const selected=this._config.device_id||((this._devices||[]).length===1?this._devices[0].id:'');
    this.shadowRoot.innerHTML=`<style>:host{display:block;font-family:inherit}label{display:block;margin:16px 0 5px;font-size:13px}input,select{width:100%;padding:10px;border:1px solid var(--divider-color,#ccc);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);font:inherit;box-sizing:border-box}p{font-size:12px;color:var(--secondary-text-color,#777);line-height:1.6}.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}</style><label for="device">Trojpumpový dávkovač</label><select id="device"><option value="">${(this._devices||[]).length===1?'Automaticky · '+fert3Escape(this._devices[0].name_by_user||this._devices[0].name||'FERT3'):'Vyber zariadenie'}</option>${(this._devices||[]).map(d=>`<option value="${fert3Escape(d.id)}" ${d.id===selected?'selected':''}>${fert3Escape(d.name_by_user||d.name||'NET4U FERT3')}</option>`).join('')}</select><label for="name">Názov karty</label><input id="name" value="${fert3Escape(this._config.name||'Hnojenie')}"><div class="row">${[0,1,2].map(i=>`<div><label for="pump${i}">Hnojivo P${i+1}</label><input id="pump${i}" maxlength="48" value="${fert3Escape(this._config.pump_names?.[i]||['Makro','Mikro','Draslík'][i])}"></div>`).join('')}</div><p>Zigbee prenáša stále kanály P1–P3. Názvy pre túto kartu nastav tu; premenovanie zariadenia v HASS nezmení priradenie kanálov.</p><label for="web">Web dávkovača (automaticky; voliteľná náhradná adresa)</label><input id="web" type="url" placeholder="Automaticky zo zariadenia" value="${fert3Escape(this._config.web_url||'')}"><p>Na webe je kalibrácia a úplné nastavenie. Karta používa existujúce Zigbee entity; nepripája sa priamo k pumpám a nič sama nedávkuje.</p>`;
    for(const id of ['device','name','pump0','pump1','pump2','web'])this.shadowRoot.getElementById(id).onchange=()=>this._changed();
  }
  _changed(){const value=id=>this.shadowRoot.getElementById(id).value;this._config={...this._config,name:value('name'),pump_names:[value('pump0'),value('pump1'),value('pump2')],web_url:value('web')};const device=value('device');if(device)this._config.device_id=device;else delete this._config.device_id;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));}
}
if(!customElements.get('net4u-fert3-card'))customElements.define('net4u-fert3-card',Net4uFert3Card);
if(!customElements.get('net4u-fert3-card-editor'))customElements.define('net4u-fert3-card-editor',Net4uFert3CardEditor);
window.customCards=window.customCards||[];
if(!window.customCards.some(card=>card.type==='net4u-fert3-card'))window.customCards.push({type:'net4u-fert3-card',name:'Aquivo Dose 3',description:'Tri farebné hnojivá, zostatky, plány, ručné dávky a AUTO/SERVICE.',preview:true});
console.info('AQUIVO DOSE 3 CARD '+FERT3_VERSION);
