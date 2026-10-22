let token = '', state, installing = false, pairing = false, installError = '';
const byId = id => document.getElementById(id);
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
  byId('install').disabled = !byId('backup').checked || installing || state?.integration.installed;
  byId('pair').disabled = !state?.controller || state?.paired || pairing || state?.pairing.phase === 'uncertain' || !byId('only-fp400').checked || !byId('code').value.trim();
}
async function refresh() {
  try {
    const reply = await fetch('api/state', { cache: 'no-store' });
    if (!reply.ok) throw new Error();
    state = await reply.json(); token = state.csrf;
    pairing = ['checking', 'discovering', 'pairing'].includes(state.pairing.phase);
    byId('connection').textContent = state.controller ? 'Zusatzcontroller bereit · Bestehender Matter-Server unverändert' : 'Zusatzcontroller noch nicht erreichbar. Beim ersten Start kurz warten. Bei dauerhaftem Fehler App-Protokoll prüfen.';
    if (installError) byId('install-state').textContent = installError;
    else if (state.integration.installed) byId('install-state').textContent = 'Mitgelieferte Integration ist installiert. Nach der ersten Installation HA neu starten.';
    else if (state.integration.existing) byId('install-state').textContent = 'Eine andere FP400-Version ist vorhanden. Sie wird vor dem Ersetzen gesichert.';
    byId('pair-state').textContent = state.paired
      ? state.available ? messages.paired : 'FP400 ist gespeichert, momentan aber nicht erreichbar. Verbindung prüfen; nicht neu anlernen.'
      : messages[state.pairing.error || state.pairing.phase] || 'Status wird geprüft …';
    byId('pair-state').className = state.paired ? 'success' : ['error', 'uncertain'].includes(state.pairing.phase) ? 'error' : '';
  } catch {
    state = undefined;
    byId('connection').textContent = 'Assistent nicht erreichbar. Nach einem HA-Neustart kurz warten und die Weboberfläche erneut öffnen.';
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
