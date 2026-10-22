export const FP400_VENDOR = 0x115f;
export const FP400_PRODUCT = 0x2009;
export function fp400(node) {
  return node?.attributes?.['0/40/2'] === FP400_VENDOR && node?.attributes?.['0/40/4'] === FP400_PRODUCT;
}
export function normalizeCode(value) {
  if (typeof value !== 'string' || value.length > 100) throw new Error('invalid_code');
  const code = value.trim();
  if (code.startsWith('MT:')) return code;
  if (!/^[\d\s-]+$/.test(code)) throw new Error('invalid_code');
  const digits = code.replace(/[\s-]/g, '');
  if (![11, 21].includes(digits.length)) throw new Error('invalid_code');
  return digits;
}
export function selectDevice(parsed, discovered) {
  let payload;
  if (parsed?.type === 'qr') {
    if (parsed.payloads?.length !== 1) throw new Error('one_device_only');
    payload = parsed.payloads[0];
  } else if (parsed?.type === 'manual') payload = parsed;
  else throw new Error('invalid_code');
  if ((payload.vendor_id && payload.vendor_id !== FP400_VENDOR) ||
      (payload.product_id && payload.product_id !== FP400_PRODUCT)) throw new Error('wrong_device');
  if (!Number.isInteger(payload.setup_pin_code)) throw new Error('invalid_code');
  const matching = discovered.filter(device => payload.discriminator !== undefined
    ? device.long_discriminator === payload.discriminator
    : Number.isInteger(device.long_discriminator) &&
      (device.long_discriminator >> 8) === payload.short_discriminator);
  // Include all matching advertisements, not just Aqara: never guess between devices.
  if (!matching.length) throw new Error('not_discovered');
  if (matching.length !== 1) throw new Error('ambiguous_device');
  const device = matching[0];
  if (device.vendor_id !== FP400_VENDOR || device.product_id !== FP400_PRODUCT) throw new Error('wrong_device');
  if (!Number.isInteger(device.long_discriminator) || device.long_discriminator < 0 || device.long_discriminator > 4095)
    throw new Error('not_discovered');
  return { setup_pin_code: payload.setup_pin_code, filter_type: 2, filter: device.long_discriminator, discovery_timeout_s: 90 };
}

export class Pairer {
  constructor(rpc) {
    this.rpc = rpc;
    this.state = { phase: 'idle' };
    this.running = false;
  }
  async nodes() {
    const nodes = await this.rpc('get_nodes');
    if (!Array.isArray(nodes) || nodes.length > 1 || nodes.some(node => !fp400(node))) throw new Error('unexpected_controller_device');
    return nodes;
  }
  start(input) {
    if (this.running) throw new Error('pairing_busy');
    if (this.state.phase === 'uncertain') throw new Error('pairing_uncertain');
    const code = normalizeCode(input);
    this.running = true;
    this.state = { phase: 'checking' };
    this.task = this.run(code).finally(() => { this.running = false; });
  }
  async run(code) {
    let commissionStarted = false;
    try {
      const existing = await this.nodes();
      if (existing.length) { this.state = { phase: 'paired' }; return; }
      const parsed = await this.rpc('parse_onboarding_payload', { code });
      this.state = { phase: 'discovering' };
      const discovered = await this.rpc('discover', {}, 20000);
      const args = selectDevice(parsed, discovered);
      this.state = { phase: 'pairing' };
      commissionStarted = true;
      await this.rpc('commission_on_network', args, 240000);
      const nodes = await this.nodes();
      if (nodes.length !== 1 || !nodes[0].available) throw new Error('verification_pending');
      this.state = { phase: 'paired' };
    } catch (error) {
      // A timed-out command may have completed on the server. Check before permitting retry.
      try {
        const nodes = await this.nodes();
        if (nodes.length === 1 && nodes[0].available) { this.state = { phase: 'paired' }; return; }
      } catch { /* No success without evidence. */ }
      const known = new Set(['invalid_code', 'one_device_only', 'wrong_device', 'not_discovered',
        'ambiguous_device', 'unexpected_controller_device', 'verification_pending']);
      this.state = { phase: commissionStarted ? 'uncertain' : 'error',
        error: commissionStarted ? 'pairing_uncertain' : known.has(error.message) ? error.message : 'pairing_failed' };
    }
  }
}
