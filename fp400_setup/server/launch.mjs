import fs from 'node:fs/promises';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { Installer } from './install.mjs';
import { Pairer } from './pair.mjs';
import { rpc } from './rpc.mjs';
import { createWizard } from './http.mjs';
import { runMigration } from './migrate.mjs';

async function freePort(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise(resolve => probe.close(resolve));
}
try {
  const reply = await fetch('http://supervisor/addons/self/info', {
    headers: { Authorization: `Bearer ${process.env.SUPERVISOR_TOKEN}` }, signal: AbortSignal.timeout(10000),
  });
  if (!reply.ok) throw new Error('Supervisor nicht erreichbar.');
  const { data } = await reply.json();
  if (!Number.isInteger(data.ingress_port) || data.ingress_port < 62000 || data.ingress_port > 65500)
    throw new Error('Kein gültiger Einrichtungs-Port.');
  await freePort(5581);
  const options = JSON.parse(await fs.readFile('/data/options.json', 'utf8'));
  await fs.rm('/data/migration-export-ready', { force: true });
  const migration = await runMigration({ mode: options.migration_mode || 'none' });
  if (migration.exported) {
    await fs.writeFile('/data/migration-export-ready', 'ready', { mode: 0o600 });
    console.log('FP400-Migration: Export vollständig geprüft. Controller bleibt angehalten. Diese App vor dem Import stoppen.');
    setInterval(() => {}, 60000);
    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
    await new Promise(() => {});
  }
  if (migration.imported || migration.alreadyImported) console.log('FP400-Migration: Kopplungsdaten geprüft übernommen.');
  const network = options.network_interface || '';
  if (network && !/^[a-zA-Z0-9_.:-]{1,40}$/.test(network)) throw new Error('Ungültige Netzwerkschnittstelle.');
  await fs.mkdir('/data/matter', { recursive: true, mode: 0o700 });
  const installer = new Installer('/homeassistant', '/opt/fp400/integration/aqara_fp400');
  await installer.recover();
  let ready = false;
  // Do not pass the Supervisor token to the independent Matter server process.
  const env = { ...process.env, ...(network ? { PRIMARY_INTERFACE: network } : {}) };
  delete env.SUPERVISOR_TOKEN;
  delete env.HASSIO_TOKEN;
  const controller = spawn(process.execPath, ['/app/node_modules/matter-server/dist/esm/MatterServer.js'], {
    env, stdio: ['ignore', 'inherit', 'inherit'],
  });
  const pairer = new Pairer(rpc);
  const wizard = createWizard({ installer, pairer, controllerReady: () => ready });
  await new Promise((resolve, reject) => {
    wizard.once('error', reject);
    wizard.listen(data.ingress_port, '172.30.32.1', resolve);
  });
  const check = setInterval(async () => {
    try { const info = await rpc('server_info', {}, 4000); ready = Number(info.fabric_id) === 400; }
    catch { ready = false; }
  }, 5000);
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    clearInterval(check);
    wizard.close();
    controller.kill('SIGTERM');
    setTimeout(() => { controller.kill('SIGKILL'); process.exit(1); }, 50000).unref();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  controller.on('error', () => { console.error('FP400-Zusatzcontroller konnte nicht starten.'); stop(); });
  controller.on('exit', code => { clearInterval(check); wizard.close(); process.exit(stopping ? 0 : code || 1); });
  console.log('FP400-Assistent gestartet. Öffne die Weboberfläche in Home Assistant.');
} catch (error) {
  console.error(error.code === 'EADDRINUSE'
    ? 'Port 5581 ist belegt. Vorhandenen Zusatzcontroller prüfen; den normalen Matter-Server nicht verändern.'
    : 'Start fehlgeschlagen. Prüfe Supervisor-Verbindung, Konfigurationsordner und App-Protokoll.');
  process.exit(1);
}
