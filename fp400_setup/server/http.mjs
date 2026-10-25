import http from 'node:http';
import fs from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function trustedAddress(address) { return address === '172.30.32.2' || address === '::ffff:172.30.32.2'; }
const errors = {
  unsafe_path: 'Ein Ordner enthält eine Verknüpfung. Zum Schutz deiner Dateien wurde nichts ersetzt.',
  invalid_code: 'Bitte den neuen Freigabecode des FP400 eingeben, nicht den Code vom Aufkleber.',
  installation_busy: 'Die Installation läuft bereits.', pairing_busy: 'Die Kopplung läuft bereits.',
  pairing_uncertain: 'Der letzte Versuch ist nicht eindeutig abgeschlossen. Nur diese FP400-App stoppen und wieder starten, bevor du es erneut versuchst.',
  integration_downgrade: 'Die installierte Integration ist neuer als die mitgelieferte Version. Sie wird nicht ersetzt. Updates erhältst du über HACS.',
  integration_version_unknown: 'Die vorhandene Version lässt sich nicht sicher vergleichen. Sie wird nicht ersetzt. Prüfe die Integration in HACS.',
  integration_changed: 'Die Integration wurde während der Vorbereitung geändert. Es wurde nichts ersetzt. Bitte den Versionsstand erneut prüfen.',
};
export function createWizard({ installer, pairer, controllerReady, appVersion = null, availableAppVersion = null, allowAddress = trustedAddress }) {
  const csrf = randomBytes(32).toString('hex');
  let knownPaired = null;
  const json = (response, status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
  };
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'");
    if (!allowAddress(request.socket.remoteAddress)) return json(response, 403, { error: 'Nur über Home Assistant öffnen.' });
    const pathname = new URL(request.url, 'http://local').pathname;
    try {
      if (request.method === 'GET' && pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
      if (request.method === 'GET' && ['/', '/ui.js', '/style.css'].includes(pathname)) {
        const file = pathname === '/' ? 'index.html' : pathname.slice(1);
        response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8');
        return response.end(await fs.readFile(fileURLToPath(new URL(`./public/${file}`, import.meta.url))));
      }
      if (request.method === 'GET' && pathname === '/api/state') {
        let nodes = [], ready = false;
        try { ready = controllerReady(); if (ready) nodes = await pairer.nodes(); }
        catch { ready = false; }
        if (ready) knownPaired = nodes.length === 1;
        return json(response, 200, { csrf, controller: ready, integration: await installer.status(),
          appVersion, availableAppVersion, defaultView: knownPaired === false ? 'setup' : 'overview',
          pairing: pairer.state, paired: knownPaired, available: ready && nodes.length === 1 ? nodes[0].available === true : null });
      }
      if (request.method !== 'POST') return json(response, 404, { error: 'Nicht gefunden.' });
      const token = request.headers['x-fp400-token'];
      if (typeof token !== 'string' || token.length !== csrf.length ||
          !timingSafeEqual(Buffer.from(token), Buffer.from(csrf)) || request.headers['content-type'] !== 'application/json')
        return json(response, 403, { error: 'Bitte die Seite neu öffnen.' });
      let body = '';
      for await (const chunk of request) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 4096) return json(response, 413, { error: 'Eingabe zu lang.' });
      }
      let input;
      try { input = JSON.parse(body); } catch { return json(response, 400, { error: 'Ungültige Eingabe.' }); }
      if (pathname === '/api/install') {
        if (input.backup !== true) return json(response, 400, { error: 'Bitte zuerst die vollständige HA-Sicherung bestätigen.' });
        return json(response, 200, await installer.install());
      }
      if (pathname === '/api/pair') {
        if (input.onlyFP400 !== true) return json(response, 400, { error: 'Bitte bestätigen, dass der Freigabecode zum FP400 gehört.' });
        if (!controllerReady()) return json(response, 503, { error: 'Der Zusatzcontroller startet noch.' });
        pairer.start(input.code);
        return json(response, 202, { started: true });
      }
      return json(response, 404, { error: 'Nicht gefunden.' });
    } catch (error) {
      return json(response, 400, { error: errors[error.message] || 'Der Schritt konnte nicht abgeschlossen werden. Die vorhandene Matter-Einrichtung wird nicht geändert.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
