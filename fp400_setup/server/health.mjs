import { pathToFileURL } from 'node:url';
import { rpc } from './rpc.mjs';
import fs from 'node:fs/promises';

export async function healthy(request = rpc) {
  try {
    const info = await request('server_info', {}, 3500);
    return Number(info.fabric_id) === 400;
  } catch { return false; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = JSON.parse(await fs.readFile('/data/options.json', 'utf8'));
    if (options.migration_mode === 'export' && await fs.readFile('/data/migration-export-ready', 'utf8') === 'ready') process.exit(0);
  } catch { /* Normal controller readiness check below. */ }
  process.exit(await healthy() ? 0 : 1);
}
