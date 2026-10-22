// Local UI/HTTP acceptance environment. Never contacts any actual Matter device.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Installer } from '../fp400_setup/server/install.mjs';
import { Pairer, FP400_VENDOR, FP400_PRODUCT } from '../fp400_setup/server/pair.mjs';
import { createWizard } from '../fp400_setup/server/http.mjs';
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fp400-preview-')));
await fs.mkdir(path.join(root, 'config'));
let paired = false;
const pairer = new Pairer(async command => {
  if (command === 'get_nodes') return paired ? [{ available: true, attributes: { '0/40/2': FP400_VENDOR, '0/40/4': FP400_PRODUCT } }] : [];
  if (command === 'parse_onboarding_payload') return { type: 'manual', short_discriminator: 15, setup_pin_code: 20202021 };
  if (command === 'discover') return [{ vendor_id: FP400_VENDOR, product_id: FP400_PRODUCT, long_discriminator: 3840 }];
  if (command === 'commission_on_network') { await new Promise(resolve => setTimeout(resolve, 1200)); paired = true; return {}; }
  throw new Error('unexpected');
});
const installer = new Installer(path.join(root, 'config'), path.resolve('custom_components/aqara_fp400'));
await installer.prepare();
const server = createWizard({ installer, pairer, controllerReady: () => true, allowAddress: address => address === '127.0.0.1' });
server.listen(18744, '127.0.0.1', () => console.log('Local mock preview: http://127.0.0.1:18744'));
