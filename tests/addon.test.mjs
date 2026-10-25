import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Installer, digestTree } from '../fp400_setup/server/install.mjs';
import { Pairer, normalizeCode, selectDevice, FP400_VENDOR, FP400_PRODUCT } from '../fp400_setup/server/pair.mjs';
import { createWizard, trustedAddress } from '../fp400_setup/server/http.mjs';
import { rpc } from '../fp400_setup/server/rpc.mjs';
import { healthy } from '../fp400_setup/server/health.mjs';

const node = (available = true) => ({ node_id: 1, available, attributes: { '0/40/2': FP400_VENDOR, '0/40/4': FP400_PRODUCT } });
// Actual discover WS response shape in matterjs-server 1.5.2 (not SDK-internal camelCase).
const device = { vendor_id: FP400_VENDOR, product_id: FP400_PRODUCT, long_discriminator: 3840 };
const payload = { type: 'manual', short_discriminator: 15, setup_pin_code: 20202021 };
test('container readiness requires the dedicated controller, not a running wrapper', async () => {
  assert.equal(await healthy(async () => ({ fabric_id: 400 })), true);
  assert.equal(await healthy(async () => ({ fabric_id: 2 })), false);
  assert.equal(await healthy(async () => { throw new Error('not ready'); }), false);
});
async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fp400-test-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const config = path.join(root, 'config'), source = path.join(root, 'source');
  await fs.mkdir(config); await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'manifest.json'), '{"version":"1.3.0"}');
  await fs.writeFile(path.join(source, 'config_flow.py'), '# new\n');
  const installer = new Installer(config, source);
  return { root, config, source, installer };
}
test('installer preserves main Matter and all unrelated configuration; backup is exact', async t => {
  const { config, installer } = await fixture(t);
  await fs.mkdir(installer.target, { recursive: true });
  await fs.writeFile(path.join(installer.target, 'manifest.json'), '{"version":"1.0.0"}');
  await fs.writeFile(path.join(installer.target, 'old.py'), 'user modification');
  await fs.mkdir(path.join(config, '.storage'));
  const matter = JSON.stringify({ secret: 'private', devices: Array.from({ length: 32 }, (_, id) => ({ id })) });
  await fs.writeFile(path.join(config, '.storage', 'matter'), matter);
  await fs.writeFile(path.join(config, 'configuration.yaml'), 'unchanged');
  const result = await installer.install();
  const backup = result.backup.replace('/config', config);
  assert.equal(await fs.readFile(path.join(backup, 'old.py'), 'utf8'), 'user modification');
  assert.equal(await fs.readFile(path.join(config, '.storage', 'matter'), 'utf8'), matter);
  assert.equal(await fs.readFile(path.join(config, 'configuration.yaml'), 'utf8'), 'unchanged');
  assert.equal((await installer.status()).installed, true);
  assert.equal((await installer.install()).changed, false);
});
test('bytecode does not cause a needless reinstall', async t => {
  const { installer } = await fixture(t); await installer.install();
  await fs.mkdir(path.join(installer.target, '__pycache__'));
  await fs.writeFile(path.join(installer.target, '__pycache__', 'flow.pyc'), 'bytecode');
  assert.equal((await installer.status()).installed, true);
});
test('symlink in existing integration blocks replacement without touching target', async t => {
  const { installer, config } = await fixture(t);
  await fs.mkdir(installer.target, { recursive: true });
  await fs.writeFile(path.join(config, 'private'), 'secret');
  await fs.symlink(path.join(config, 'private'), path.join(installer.target, 'link'));
  await assert.rejects(installer.install(), /unsafe_path/);
  assert.equal((await fs.lstat(path.join(installer.target, 'link'))).isSymbolicLink(), true);
});
test('symlinked config directory cannot redirect writes', async t => {
  const { installer, config, root } = await fixture(t);
  const outside = path.join(root, 'outside'); await fs.mkdir(outside);
  await fs.symlink(outside, path.join(config, 'custom_components'));
  await assert.rejects(installer.install(), /unsafe_path/);
  assert.deepEqual(await fs.readdir(outside), []);
});
test('interruption between renames restores the original integration', async t => {
  const { installer } = await fixture(t); await installer.prepare();
  const id = '11111111-1111-4111-8111-111111111111';
  const backup = path.join(installer.backups, id, 'aqara_fp400');
  await fs.mkdir(backup, { recursive: true }); await fs.writeFile(path.join(backup, 'original.py'), 'original');
  await fs.writeFile(installer.journal, JSON.stringify({ id }));
  await installer.recover();
  assert.equal(await fs.readFile(path.join(installer.target, 'original.py'), 'utf8'), 'original');
});
test('no code, invalid code and multiple QR payloads fail closed', () => {
  for (const code of [null, '', 'not a code', '123', '1'.repeat(101)]) assert.throws(() => normalizeCode(code), /invalid_code/);
  assert.equal(normalizeCode('3532-5335-079'), '35325335079');
  assert.throws(() => selectDevice({ type: 'qr', payloads: [{}, {}] }, []), /one_device_only/);
});
test('pair selection never targets another device or guesses between advertisements', () => {
  assert.throws(() => selectDevice(payload, []), /not_discovered/);
  assert.throws(() => selectDevice(payload, [{ ...device, product_id: 1 }]), /wrong_device/);
  assert.throws(() => selectDevice(payload, [device, { ...device, vendor_id: 123 }]), /ambiguous_device/);
  assert.throws(() => selectDevice(payload, [{ ...device, long_discriminator: 3839 }]), /not_discovered/);
  assert.deepEqual(selectDevice({ type: 'qr', payloads: [{ discriminator: 3840, setup_pin_code: 20202021 }] }, [device]),
    { setup_pin_code: 20202021, filter_type: 2, filter: 3840, discovery_timeout_s: 90 });
  assert.deepEqual(selectDevice(payload, [device]), { setup_pin_code: 20202021, filter_type: 2, filter: 3840, discovery_timeout_s: 90 });
});
test('only local secondary controller gets a network-only filtered commission command', async () => {
  const calls = []; let paired = false;
  const pairer = new Pairer(async (command, args) => {
    calls.push({ command, args });
    if (command === 'get_nodes') return paired ? [node()] : [];
    if (command === 'parse_onboarding_payload') return payload;
    if (command === 'discover') return [device];
    if (command === 'commission_on_network') { paired = true; return node(); }
    assert.fail('Unexpected command');
  });
  pairer.start('35325335079');
  assert.throws(() => pairer.start('35325335079'), /pairing_busy/);
  await pairer.task;
  assert.equal(pairer.state.phase, 'paired');
  assert.deepEqual(calls.map(call => call.command), ['get_nodes', 'parse_onboarding_payload', 'discover', 'commission_on_network', 'get_nodes']);
  assert.equal(calls[3].args.filter_type, 2);
  assert.equal(JSON.stringify(pairer.state).includes('20202021'), false);
});
test('existing paired FP400 is never commissioned again', async () => {
  const calls = [];
  const pairer = new Pairer(async command => { calls.push(command); return [node()]; });
  pairer.start('35325335079'); await pairer.task;
  assert.deepEqual(calls, ['get_nodes']);
  assert.equal(pairer.state.phase, 'paired');
});
test('wrong device prevents commission; error state contains no pairing secrets', async () => {
  const commands = [];
  const pairer = new Pairer(async command => {
    commands.push(command);
    if (command === 'get_nodes') return [];
    if (command === 'parse_onboarding_payload') return payload;
    if (command === 'discover') return [{ ...device, vendor_id: 10 }];
    assert.fail('Must not commission');
  });
  pairer.start('35325335079'); await pairer.task;
  assert.equal(pairer.state.error, 'wrong_device');
  assert.equal(commands.includes('commission_on_network'), false);
});
test('ambiguous result after timeout reconciles paired node instead of retrying', async () => {
  let paired = false;
  const pairer = new Pairer(async command => {
    if (command === 'get_nodes') return paired ? [node()] : [];
    if (command === 'parse_onboarding_payload') return payload;
    if (command === 'discover') return [device];
    paired = true; throw new Error('controller_timeout');
  });
  pairer.start('35325335079'); await pairer.task;
  assert.equal(pairer.state.phase, 'paired');
});
test('unresolved commissioning blocks new attempts until controller restart', async () => {
  let commissions = 0;
  const pairer = new Pairer(async command => {
    if (command === 'get_nodes') return [];
    if (command === 'parse_onboarding_payload') return payload;
    if (command === 'discover') return [device];
    commissions++; throw new Error('controller_timeout');
  });
  pairer.start('35325335079'); await pairer.task;
  assert.equal(pairer.state.phase, 'uncertain');
  assert.throws(() => pairer.start('35325335079'), /pairing_uncertain/);
  assert.equal(commissions, 1);
});
test('ingress allows only Supervisor, not spoofed LAN/localhost connections', () => {
  assert.equal(trustedAddress('172.30.32.2'), true);
  assert.equal(trustedAddress('::ffff:172.30.32.2'), true);
  for (const address of ['127.0.0.1', '172.30.32.1', '192.168.1.2', undefined]) assert.equal(trustedAddress(address), false);
});
test('HTTP mutations require ingress, CSRF, JSON and explicit backup confirmation', async t => {
  const { installer } = await fixture(t);
  const pairer = new Pairer(async () => []);
  const server = createWizard({ installer, pairer, controllerReady: () => true, allowAddress: address => address === '127.0.0.1' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.equal((await fetch(`${base}/api/install`, { method: 'POST', body: '{}' })).status, 403);
  const headers = { 'Content-Type': 'application/json', 'X-FP400-Token': state.csrf };
  assert.equal((await fetch(`${base}/api/install`, { method: 'POST', headers, body: '{}' })).status, 400);
  assert.equal((await fetch(`${base}/api/install`, { method: 'POST', headers, body: '{bad' })).status, 400);
  const response = await fetch(`${base}/api/install`, { method: 'POST', headers, body: '{"backup":true}' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).installed, true);
  assert.equal((await fetch(`${base}/api/pair`, { method: 'POST', headers, body: '{"code":"35325335079"}' })).status, 400);
  assert.equal((await fetch(`${base}/../private`)).status, 404);
});
test('RPC correlates requests and redacts device error details', async () => {
  class FakeSocket extends EventTarget {
    constructor(url) { super(); assert.equal(url, 'ws://127.0.0.1:5581/ws'); queueMicrotask(() => this.dispatchEvent(new Event('open'))); }
    send(raw) {
      const request = JSON.parse(raw);
      queueMicrotask(() => {
        this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ message_id: 'unrelated', result: 'wrong' }) }));
        this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ message_id: request.message_id, error_code: 8, details: 'private 35325335079' }) }));
      });
    }
    close() { this.dispatchEvent(new Event('close')); }
  }
  await assert.rejects(rpc('parse_onboarding_payload', {}, 100, FakeSocket), error => error.message === 'controller_error_8');
});
