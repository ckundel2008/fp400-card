import { pathToFileURL } from 'node:url';
import { rpc } from './rpc.mjs';

export async function healthy(request = rpc) {
  try {
    const info = await request('server_info', {}, 3500);
    return Number(info.fabric_id) === 400;
  } catch { return false; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await healthy() ? 0 : 1);
}
