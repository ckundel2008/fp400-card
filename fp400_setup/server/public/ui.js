let token = '', state, installing = false, pairing = false, installError = '';
let chosenView = null;
const byId = id => document.getElementById(id);
function showView(view) {
  byId('overview-view').hidden = view !== 'overview';
  byId('setup-view').hidden = view !== 'setup';
  for (const name of ['overview', 'setup']) {
    if (name === view) byId(`nav-${name}`).setAttribute('aria-current', 'page');
    else byId(`nav-${name}`).removeAttribute('aria-current');
  }
}
for (const view of ['overview', 'setup']) byId(`nav-${view}`).addEventListener('click', () => {
  chosenView = view; showView(view);
});
const versionText = value => typeof value === 'string' && value ? value : 'Unbekannt';
const versionMessages = {
  absent: 'Die FP400-Integration ist noch nicht installiert. Weiter unter Einrichtung oder über HACS installieren.',
  same: 'Die installierten Dateien entsprechen der mitgelieferten Integration.',
  newer: 'Die installierte Integration ist neuer als die mitgelieferte Version und wird hier nicht ersetzt. Weitere Updates über HACS prüfen.',
  older: 'Eine ältere Integration ist installiert. Prüfe HACS auf die aktuelle Version oder installiere ausdrücklich die mitgelieferte Version unter Einrichtung.',
  different: 'Die Versionsnummer ist gleich, die Dateien unterscheiden sich. Es wird nichts automatisch ersetzt.',
  unknown: 'Die vorhandene Version lässt sich nicht sicher vergleichen. Eine Installation über diese App ist deshalb gesperrt. Prüfe HACS.',
};
const messages = {
  idle: 'Noch nicht verbunden.', checking: 'Vorhandene Kopplung wird geprüft …',
  discovering: 'Der freigegebene FP400 wird im Netzwerk gesucht …',
  pairing: 'FP400 wird zusätzlich verbunden. Das kann einige Minuten dauern. Bitte warten.',
  paired: 'FP400 ist zusätzlich verbunden. Weiter mit Schritt 4.',
  invalid_code: 'Der Code ist ungültig. Erzeuge einen neuen Freigabecode und kopiere ihn vollständig.',
  one_device_only: 'Bitte nur den Freigabecode eines einzelnen FP400 verwenden.',
  wrong_device: 'Der gefundene Sensor ist kein FP400. Es wurde keine Kopplung gestartet.',
  not_discovered: 'Kein passender FP400 gefunden. Neues Freigabefenster öffnen. Prüfe, ob FP400 und HA im erreichbaren Netzwerk sind.',
  ambiguous_device: 'Mehrere Geräte passen zum Code. Schließe andere Freigabefenster und erzeuge für deinen FP400 einen neuen Code.',
  unexpected_controller_device: 'Dieser Zusatzcontroller enthält ein anderes Gerät. Einrichtung angehalten; nichts wurde entfernt.',
  verification_pending: 'Die Verbindung ist noch nicht bestätigt. Warte kurz und prüfe erneut, bevor du einen neuen Code verwendest.',
  pairing_failed: 'Kopplung nicht bestätigt. Warte eine Minute. Falls der Sensor dann nicht als verbunden erscheint, erzeuge einen neuen Freigabecode. Bei wiederholtem Fehler Netzwerk/IPv6 prüfen; keinen Werksreset durchführen.',
  pairing_uncertain: 'Der Versuch ist nicht eindeutig abgeschlossen. Warte eine Minute. Erscheint der FP400 weiterhin nicht als verbunden, stoppe und starte ausschließlich diese FP400-App. Danach einen neuen Freigabecode erzeugen. Den bisherigen Matter-Server unverändert lassen.',
};
function updateButtons() {
  byId('install').disabled = !byId('backup').checked || installing || state?.integration?.canInstall !== true;
  byId('pair').disabled = !state?.controller || state?.paired !== false || pairing || state?.pairing.phase === 'uncertain' || !byId('only-fp400').checked || !byId('code').value.trim();
}
async function refresh() {
  try {
    const reply = await fetch('api/state', { cache: 'no-store' });
    if (!reply.ok) throw new Error();
    state = await reply.json(); token = state.csrf;
    if (!chosenView) showView(state.defaultView || 'overview');
    pairing = ['checking', 'discovering', 'pairing'].includes(state.pairing.phase);
    byId('controller-state').textContent = state.controller ? 'Bereit' : 'Nicht erreichbar';
    byId('saved-state').textContent = state.paired === true ? 'Gespeichert' : state.paired === false ? 'Noch nicht verbunden' : 'Noch nicht geprüft';
    byId('sensor-state').textContent = state.available === true ? 'Online' : state.available === false ? 'Offline' : 'Unbekannt';
    byId('overview-help').textContent = state.paired === true
      ? state.available === true ? 'Der FP400 ist verbunden. Zonen und Live-Bild findest du in deiner Dashboard-Karte.'
        : 'Die FP400-Kopplung ist gespeichert. Prüfe Stromversorgung und Netzwerk; nicht neu anlernen.'
      : state.paired === false ? 'Noch kein FP400 gespeichert. Öffne Einrichtung, um ihn zusätzlich zu verbinden.'
        : 'Die Kopplung ist noch nicht geprüft. Warte auf den Controller; bei einer bestehenden Einrichtung nicht neu anlernen.';
    byId('app-version').textContent = versionText(state.appVersion);
    byId('app-update').textContent = state.availableAppVersion || 'Hier nicht geprüft';
    byId('integration-version').textContent = state.integration.existing ? versionText(state.integration.installedVersion) : 'Nicht installiert';
    byId('bundled-version').textContent = versionText(state.integration.bundledVersion);
    byId('integration-update').textContent = state.integration.availableVersion || 'Hier nicht geprüft – in HACS nachsehen';
    byId('version-state').textContent = versionMessages[state.integration.relation] || 'Versionsstand unbekannt.';
    byId('connection').textContent = state.controller ? 'Zusatzcontroller bereit · Bestehender Matter-Server unverändert' : 'Zusatzcontroller noch nicht erreichbar. Beim ersten Start kurz warten. Bei dauerhaftem Fehler App-Protokoll prüfen.';
    if (installError) byId('install-state').textContent = installError;
    else byId('install-state').textContent = versionMessages[state.integration.relation] || 'Versionsstand unbekannt.';
    byId('pair-state').textContent = state.paired
      ? state.available ? messages.paired : 'FP400 ist gespeichert, momentan aber nicht erreichbar. Verbindung prüfen; nicht neu anlernen.'
      : state.paired === null ? 'Kopplung noch nicht geprüft. Nicht erneut anlernen.' : messages[state.pairing.error || state.pairing.phase] || 'Status wird geprüft …';
    byId('pair-state').className = state.paired ? 'success' : ['error', 'uncertain'].includes(state.pairing.phase) ? 'error' : '';
  } catch {
    state = undefined;
    byId('connection').textContent = 'Controller-App nicht erreichbar. Nach einem HA-Neustart kurz warten und die Weboberfläche erneut öffnen.';
    byId('controller-state').textContent = 'Nicht erreichbar';
    byId('sensor-state').textContent = 'Unbekannt';
  }
  updateButtons();
}
async function post(endpoint, input) {
  const response = await fetch(`api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FP400-Token': token }, body: JSON.stringify(input) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Schritt fehlgeschlagen.');
  return result;
}
byId('backup').addEventListener('change', updateButtons);
byId('only-fp400').addEventListener('change', updateButtons);
byId('code').addEventListener('input', updateButtons);
byId('install').addEventListener('click', async () => {
  installing = true; installError = ''; updateButtons();
  byId('install-state').textContent = 'Integration wird vorbereitet und geprüft …';
  try {
    const result = await post('install', { backup: byId('backup').checked });
    byId('install-state').textContent = result.changed ? 'Installiert. Bitte jetzt Home Assistant neu starten und den Assistenten erneut öffnen.' : 'Diese Version ist bereits installiert.';
  } catch (error) { installError = error.message; byId('install-state').textContent = error.message; }
  finally { installing = false; await refresh(); }
});
byId('pair-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (byId('pair').disabled) return;
  pairing = true; updateButtons();
  try {
    await post('pair', { code: byId('code').value, onlyFP400: byId('only-fp400').checked });
    byId('code').value = ''; // Never retain or store the pairing code in the browser.
    await refresh();
  } catch (error) {
    pairing = false;
    byId('pair-state').textContent = error.message;
    updateButtons();
  }
});
if (location.protocol === 'file:') {
  showView('setup');
  byId('file-preview').hidden = false;
  byId('connection').textContent = 'Dateivorschau · Keine Verbindung zu Home Assistant';
  byId('backup').disabled = true;
  byId('only-fp400').disabled = true;
  byId('code').disabled = true;
  byId('open-ha').addEventListener('click', () => {
    try {
      const address = new URL(byId('ha-address').value.trim());
      if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password) throw new Error();
      location.href = new URL('/config/app/local_fp400_setup/info', address).href;
    } catch {
      byId('ha-link-state').textContent = 'Bitte deine HA-Adresse vollständig mit http:// oder https:// eingeben.';
    }
  });
} else {
  refresh();
  setInterval(refresh, 5000);
}
