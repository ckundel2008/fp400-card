import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const SOURCE = 'fp400-setup-local:/data/matter';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const absent = async p => {
  try { return await fs.lstat(p); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};

async function readFile(p) {
  const file = await fs.open(p, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    if (!(await file.stat()).isFile()) throw new Error('Unsafe migration file');
    return await file.readFile();
  } finally { await file.close(); }
}

// Check every ancestor too: a safe final component does not make a symlinked
// /config or /data subtree safe. Only ordinary directories are accepted.
async function directory(p, create = false) {
  p = path.resolve(p);
  if (path.dirname(p) !== p) await directory(path.dirname(p), create);
  let stat = await absent(p);
  if (!stat && create) { await fs.mkdir(p, { mode: 0o700 }); stat = await fs.lstat(p); }
  if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new Error('Unsafe or missing migration directory');
}

async function inventory(root, prefix = '') {
  const entries = [];
  for (const name of (await fs.readdir(root)).sort()) {
    const relative = prefix ? `${prefix}/${name}` : name;
    validPath(relative);
    const p = path.join(root, name);
    const stat = await fs.lstat(p);
    if (stat.isSymbolicLink()) throw new Error('Symlinks are not allowed in migration data');
    if (stat.isDirectory()) {
      entries.push({ path: relative, type: 'directory' });
      entries.push(...await inventory(p, relative));
    } else if (stat.isFile()) {
      const bytes = await readFile(p);
      entries.push({ path: relative, type: 'file', size: bytes.length, sha256: hash(bytes) });
    } else throw new Error('Only ordinary files and directories can be migrated');
  }
  return entries;
}

function validPath(p) {
  if (typeof p !== 'string' || !p || p.includes('\\') || p.includes('\0') ||
      p.split('/').some(part => !part || part === '.' || part === '..'))
    throw new Error('Invalid migration path');
}

function validate(manifest) {
  if (manifest.version !== 1 || manifest.source !== SOURCE || !Array.isArray(manifest.entries))
    throw new Error('Invalid migration manifest or source');
  const seen = new Map();
  for (const e of manifest.entries) {
    validPath(e.path);
    if (seen.has(e.path) || !['directory', 'file'].includes(e.type)) throw new Error('Invalid manifest entry');
    if (e.type === 'file' && (!Number.isSafeInteger(e.size) || e.size < 0 || !/^[a-f0-9]{64}$/.test(e.sha256)))
      throw new Error('Invalid file digest');
    seen.set(e.path, e.type);
  }
  for (const e of manifest.entries) {
    const parent = path.posix.dirname(e.path);
    if (parent !== '.' && seen.get(parent) !== 'directory') throw new Error('Invalid manifest parent');
  }
}

const canonical = entries => JSON.stringify(entries.map(e => e.type === 'directory'
  ? { path: e.path, type: e.type }
  : { path: e.path, type: e.type, size: e.size, sha256: e.sha256 })
  .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

async function verify(root, entries) {
  await directory(root);
  if (canonical(await inventory(root)) !== canonical(entries)) throw new Error('Migration data or digest mismatch');
}

async function copyVerified(source, target, entries) {
  for (const e of [...entries].sort((a, b) => a.path.split('/').length - b.path.split('/').length)) {
    const dest = path.join(target, e.path);
    if (e.type === 'directory') await fs.mkdir(dest, { mode: 0o700 });
    else {
      const src = path.join(source, e.path);
      await directory(path.dirname(src));
      const stat = await fs.lstat(src);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Source file changed');
      const bytes = await readFile(src);
      if (bytes.length !== e.size || hash(bytes) !== e.sha256) throw new Error('Source file changed');
      await fs.writeFile(dest, bytes, { flag: 'wx', mode: 0o600 });
    }
  }
  await verify(target, entries);
}

/** Caller must invoke before spawning the Matter controller; export remains idle.
 * Only /data/matter is transferred. Credentials/options outside it never leave dataRoot.
 * Exceptions are fatal to startup. Neither source nor transfer is automatically removed.
 */
export async function runMigration({ mode = 'none', dataRoot = '/data', transferRoot = '/homeassistant/fp400-migration' } = {}) {
  if (mode === 'none') return { exported: false, imported: false };
  if (!['export', 'import'].includes(mode)) throw new Error('Invalid migration mode');
  const matter = path.join(path.resolve(dataRoot), 'matter');
  transferRoot = path.resolve(transferRoot);
  if (transferRoot === matter || transferRoot.startsWith(`${matter}/`) || matter.startsWith(`${transferRoot}/`))
    throw new Error('Migration paths must be separate');
  await directory(dataRoot);
  await directory(path.dirname(transferRoot), mode === 'export');
  const lock = `${transferRoot}.lock`;
  await fs.mkdir(lock, { mode: 0o700 });
  let stage;
  try {
    if (mode === 'export') {
      if (await absent(transferRoot)) throw new Error('Migration transfer already exists');
      await directory(matter);
      const entries = await inventory(matter);
      stage = `${transferRoot}.stage-${randomUUID()}`;
      await fs.mkdir(stage, { mode: 0o700 });
      await fs.mkdir(path.join(stage, 'matter'), { mode: 0o700 });
      await copyVerified(matter, path.join(stage, 'matter'), entries);
      await verify(matter, entries);
      await fs.writeFile(path.join(stage, 'manifest.json'), JSON.stringify({ version: 1, source: SOURCE, entries }), { mode: 0o600, flag: 'wx' });
      if (await absent(transferRoot)) throw new Error('Migration transfer already exists');
      await fs.rename(stage, transferRoot);
      stage = undefined;
      return { exported: true, imported: false };
    }
    await directory(transferRoot);
    const names = (await fs.readdir(transferRoot)).sort();
    if (JSON.stringify(names) !== JSON.stringify(['manifest.json', 'matter'])) throw new Error('Unexpected transfer contents');
    const manifestPath = path.join(transferRoot, 'manifest.json');
    const stat = await fs.lstat(manifestPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Unsafe manifest');
    const manifest = JSON.parse((await readFile(manifestPath)).toString('utf8'));
    validate(manifest);
    const source = path.join(transferRoot, 'matter');
    await verify(source, manifest.entries);
    if (await absent(matter)) {
      await directory(matter);
      if ((await fs.readdir(matter)).length) {
        await verify(matter, manifest.entries);
        return { exported: false, imported: true, alreadyImported: true };
      }
    }
    stage = path.join(path.resolve(dataRoot), `.matter-import-${randomUUID()}`);
    await fs.mkdir(stage, { mode: 0o700 });
    await copyVerified(source, stage, manifest.entries);
    await verify(source, manifest.entries);
    if (await absent(matter)) {
      await directory(matter);
      if ((await fs.readdir(matter)).length) throw new Error('Destination is no longer empty');
    }
    await fs.rename(stage, matter);
    stage = undefined;
    return { exported: false, imported: true, alreadyImported: false };
  } finally {
    if (stage) await fs.rm(stage, { recursive: true, force: true });
    await fs.rmdir(lock);
  }
}
