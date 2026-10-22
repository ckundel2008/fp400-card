import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const DOMAIN = 'aqara_fp400';
export async function filesBelow(root) {
  const files = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) throw new Error('unsafe_path');
    if (entry.isDirectory()) {
      for (const child of await filesBelow(path.join(root, entry.name))) files.push(path.join(entry.name, child));
    } else files.push(entry.name);
  }
  return files.sort();
}
export async function digestTree(root) {
  const hash = createHash('sha256');
  for (const file of await filesBelow(root)) {
    // HA creates bytecode at runtime; it is not part of the release identity.
    if (file.split(path.sep).includes('__pycache__') || file.endsWith('.pyc')) continue;
    hash.update(file.split(path.sep).join('/') + '\0');
    hash.update(await fs.readFile(path.join(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}
async function exists(file) {
  try { await fs.lstat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
async function safeDirectory(directory) {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('unsafe_path');
  if (await fs.realpath(directory) !== path.resolve(directory)) throw new Error('unsafe_path');
}

export class Installer {
  constructor(configRoot, sourceRoot) {
    this.configRoot = configRoot;
    this.sourceRoot = sourceRoot;
    this.target = path.join(configRoot, 'custom_components', DOMAIN);
    this.backups = path.join(configRoot, 'fp400-sicherungen');
    this.journal = path.join(this.backups, 'installation.json');
    this.busy = false;
  }
  async prepare() {
    await safeDirectory(this.configRoot);
    const components = path.dirname(this.target);
    if (!await exists(components)) await fs.mkdir(components);
    await safeDirectory(components);
    if (!await exists(this.backups)) await fs.mkdir(this.backups, { mode: 0o700 });
    await safeDirectory(this.backups);
    if (await exists(this.target)) await safeDirectory(this.target);
  }
  async recover() {
    await this.prepare();
    if (!await exists(this.journal)) return;
    const record = JSON.parse(await fs.readFile(this.journal, 'utf8'));
    if (!/^[0-9a-f-]{36}$/.test(record.id)) throw new Error('unsafe_journal');
    const backup = path.join(this.backups, record.id, DOMAIN);
    if (!await exists(this.target) && await exists(backup)) {
      await safeDirectory(backup);
      await fs.rename(backup, this.target);
    }
    // A completed rename means either the original or the new integration is intact.
    await fs.unlink(this.journal);
  }
  async status() {
    await this.prepare();
    const present = await exists(this.target);
    const installed = present && await digestTree(this.target) === await digestTree(this.sourceRoot);
    return { installed, existing: present, backupDirectory: '/config/fp400-sicherungen' };
  }
  async install() {
    if (this.busy) throw new Error('installation_busy');
    this.busy = true;
    let staging;
    try {
      await this.recover();
      if ((await this.status()).installed) return { installed: true, changed: false };
      const id = randomUUID();
      staging = path.join(path.dirname(this.target), `.fp400-stage-${id}`);
      await filesBelow(this.sourceRoot);
      await fs.cp(this.sourceRoot, staging, { recursive: true, errorOnExist: true, force: false });
      if (await digestTree(staging) !== await digestTree(this.sourceRoot)) throw new Error('copy_verification_failed');
      const hadOriginal = await exists(this.target);
      const backup = path.join(this.backups, id, DOMAIN);
      if (hadOriginal) {
        await filesBelow(this.target); // Refuse symlinks before moving any original file.
        await fs.mkdir(path.dirname(backup), { mode: 0o700 });
      }
      const pendingJournal = `${this.journal}.${id}.tmp`;
      const handle = await fs.open(pendingJournal, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify({ id })); await handle.sync(); }
      finally { await handle.close(); }
      await fs.rename(pendingJournal, this.journal);
      if (hadOriginal) await fs.rename(this.target, backup);
      try { await fs.rename(staging, this.target); }
      catch (error) {
        if (hadOriginal) await fs.rename(backup, this.target);
        throw error;
      }
      await fs.unlink(this.journal);
      return { installed: true, changed: true, backup: hadOriginal ? `/config/fp400-sicherungen/${id}/aqara_fp400` : null };
    } finally {
      if (staging) await fs.rm(staging, { recursive: true, force: true });
      this.busy = false;
    }
  }
}
