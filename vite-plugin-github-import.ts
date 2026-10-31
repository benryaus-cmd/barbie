import type { Plugin } from 'vite';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

type Entry = { destination: string; url: string; size: number; sha256: string };
type Update = Entry & { strategy: string; keys?: string[] };
type Manifest = { schemaVersion: number; repository: string; sourceCommit: string; files: Entry[]; assetConfigUpdate?: Update; assetConfigWrapper?: Update; requiredDependencies?: Record<string,string>; obsoleteGameFiles?: string[] };
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const protectedPath = (p: string) => p === 'src/main.tsx' || p.startsWith('src/dev/') || p.startsWith('src/types/') || /^src\/components\/(ProjectFileViewer|ProjectFilePreview|DevUnlockOverlay)\./.test(p);

async function download(url: string): Promise<Buffer> {
  let cause: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
      if (!response.ok) {
        const error = new Error(`${url}: HTTP ${response.status}; remaining requests ${response.headers.get('x-ratelimit-remaining') ?? 'unknown'}`);
        if (response.status !== 429 && response.status < 500) throw Object.assign(error, { permanent: true });
        throw error;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      cause = error;
      if ((error as { permanent?: boolean }).permanent) break;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    } finally { clearTimeout(timer); }
  }
  throw new Error(`GitHub import download failed: ${url}`, { cause });
}

export function githubImportPlugin(): Plugin {
  return {
    name: 'dreamland-manifest-import', enforce: 'pre',
    async config(viteConfig, env) {
      if (env.command !== 'build') return;
      const root = path.resolve(viteConfig.root || process.cwd());
      const configPath = path.join(root, 'github-import.config.json');
      let config: { enabled?: boolean; mode?: string; repository?: string; manifestUrl?: string; manifestSha256?: string; sourceCommit?: string; requestId?: string };
      try { config = JSON.parse(await fs.readFile(configPath, 'utf8')); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw new Error('Cannot read github-import.config.json', { cause: error });
      }
      if (!config.enabled) return;
      const { repository, manifestUrl, manifestSha256, sourceCommit, requestId } = config;
      if (config.mode !== 'manifest' || repository !== 'benryaus-cmd/barbie' || !requestId || !/^[a-f0-9]{40}$/.test(sourceCommit || '') || !/^[a-f0-9]{64}$/.test(manifestSha256 || '')) throw new Error('Active importer requires manifest mode, exact Barbie repository, requestId, sourceCommit and manifestSha256.');
      const manifestPattern = /^https:\/\/raw\.githubusercontent\.com\/benryaus-cmd\/barbie\/[a-f0-9]{40}\/aippy-import-manifest\.json$/;
      if (!manifestPattern.test(manifestUrl || '')) throw new Error('Manifest URL must use an immutable commit on the Barbie repository.');
      const stateDir = path.join(root, '.github-import-state');
      const receiptPath = path.join(stateDir, 'receipt.json');
      let receipt: { requestId?: string; manifestSha256?: string } | null = null;
      try { receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Unreadable import receipt; refusing to overwrite it.', { cause: error }); }
      if (receipt?.requestId === requestId) {
        if (receipt.manifestSha256 !== manifestSha256) throw new Error('A completed requestId cannot be reused for a different manifest.');
        console.log(`[github-import] ${requestId} already completed; preserving local edits.`);
        return;
      }
      const bytes = await download(manifestUrl!);
      if (sha256(bytes) !== manifestSha256) throw new Error('Manifest SHA-256 mismatch; no local files changed.');
      const manifest: Manifest = JSON.parse(bytes.toString('utf8'));
      if (manifest.schemaVersion !== 1 || manifest.repository !== repository || manifest.sourceCommit !== sourceCommit || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error('Manifest identity/schema mismatch.');
      if (manifest.obsoleteGameFiles?.length) throw new Error('This import contains obsolete paths; review deletions explicitly before enabling them.');
      const safePath = async (relative: string) => {
        if (typeof relative !== 'string' || !/^(src|public)\//.test(relative) || /[\\\0]/.test(relative) || relative.split('/').some(p => !p || p === '.' || p === '..') || protectedPath(relative)) throw new Error(`Protected or unsafe destination: ${relative}`);
        const full = path.resolve(root, relative);
        if (!full.startsWith(root + path.sep)) throw new Error(`Destination escapes root: ${relative}`);
        let current = root;
        for (const part of relative.split('/')) {
          current = path.join(current, part);
          try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Symlink destination rejected: ${relative}`); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
        return full;
      };
      const extras = [manifest.assetConfigUpdate, manifest.assetConfigWrapper].filter(Boolean) as Update[];
      const entries = [...manifest.files, ...extras];
      const seen = new Set<string>();
      for (const entry of entries) {
        await safePath(entry.destination);
        if (seen.has(entry.destination)) throw new Error(`Duplicate import path: ${entry.destination}`);
        seen.add(entry.destination);
        if (!Number.isSafeInteger(entry.size) || entry.size < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Bad file metadata: ${entry.destination}`);
        const expected = `https://raw.githubusercontent.com/${repository}/${sourceCommit}/${entry.destination}`;
        if (entry.url !== expected) throw new Error(`File URL is not pinned to source commit: ${entry.destination}`);
        if (entry.destination.startsWith('src/config/assets.') && !extras.includes(entry as Update)) throw new Error('Asset registry must use the explicit merge/create strategy.');
      }
      const localPackage = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
      const missing = Object.entries(manifest.requiredDependencies || {}).filter(([name, required]) => {
        const declared = localPackage.dependencies?.[name] || localPackage.devDependencies?.[name];
        if (typeof declared !== 'string') return true;
        if (declared === required || declared === '*') return false;
        const have = declared.match(/(\d+)\.(\d+)\.(\d+)/);
        const need = required.match(/(\d+)\.(\d+)\.(\d+)/);
        if (!have || !need) return true;
        const a = have.slice(1).map(Number), b = need.slice(1).map(Number);
        // Conservative: never silently accept a breaking major/minor (for 0.x) upgrade.
        if (a[0] !== b[0] || (b[0] === 0 && a[1] !== b[1])) return true;
        return a[1] < b[1] || (a[1] === b[1] && a[2] < b[2]);
      });
      if (missing.length) throw new Error(`Before building, add these dependencies through the host package manager: ${missing.map(([n,v]) => `${n}@${v}`).join(', ')}`);
      const stage = path.join(root, '.github-import-staging');
      await fs.rm(stage, { recursive: true, force: true });
      await fs.mkdir(stage, { recursive: true });
      const verified = new Map<string, Buffer>();
      let cursor = 0;
      let downloadFailure: unknown;
      const worker = async () => {
        while (cursor < entries.length && !downloadFailure) {
          const entry = entries[cursor++];
          try {
            const data = await download(entry.url);
            if (data.length !== entry.size || sha256(data) !== entry.sha256) throw new Error(`Size/hash mismatch: ${entry.destination}`);
            const staged = path.join(stage, entry.destination);
            await fs.mkdir(path.dirname(staged), { recursive: true });
            await fs.writeFile(staged, data);
            verified.set(entry.destination, data);
          } catch (error) { downloadFailure = error; }
        }
      };
      await Promise.allSettled(Array.from({ length: Math.min(4, entries.length) }, worker));
      if (downloadFailure) { await fs.rm(stage, { recursive: true, force: true }); throw new Error('Import staging failed; all workers stopped and no live files changed.', { cause: downloadFailure }); }
      const output = new Map<string, Buffer>(manifest.files.map(e => [e.destination, verified.get(e.destination)!]));
      const update = manifest.assetConfigUpdate;
      if (update) {
        if (update.destination !== 'src/config/assets.json' || update.strategy !== 'merge-json-object' || !Array.isArray(update.keys)) throw new Error('Invalid asset merge strategy.');
        const source = JSON.parse(verified.get(update.destination)!.toString('utf8'));
        let local: Record<string, unknown> = {};
        try { local = JSON.parse(await fs.readFile(path.join(root, update.destination), 'utf8')); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Local assets.json is invalid; no promotion attempted.', { cause: error }); }
        if (!local || Array.isArray(local) || typeof local !== 'object') throw new Error('Local assets.json must be an object.');
        for (const key of update.keys) {
          if (['__proto__', 'prototype', 'constructor'].includes(key) || typeof source[key] !== 'string') throw new Error(`Invalid asset key: ${key}`);
          local[key] = source[key];
        }
        output.set(update.destination, Buffer.from(JSON.stringify(local, null, 2) + '\n'));
      }
      const wrapper = manifest.assetConfigWrapper;
      if (wrapper) {
        if (wrapper.destination !== 'src/config/assets.ts' || wrapper.strategy !== 'create-if-missing') throw new Error('Invalid asset wrapper strategy.');
        try { await fs.access(path.join(root, wrapper.destination)); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; output.set(wrapper.destination, verified.get(wrapper.destination)!); }
      }
      const backups = new Map<string, Buffer | null>();
      const changed: string[] = [];
      try {
        for (const [relative, data] of output) {
          const full = await safePath(relative);
          let previous: Buffer | null = null;
          try { previous = await fs.readFile(full); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          backups.set(relative, previous);
          if (previous?.equals(data)) continue;
          const diskBackup = path.join(stage, '.backup', relative);
          if (previous) { await fs.mkdir(path.dirname(diskBackup), { recursive: true }); await fs.writeFile(diskBackup, previous); }
          await fs.mkdir(path.dirname(full), { recursive: true });
          changed.push(relative);
          await fs.writeFile(full + '.github-import-tmp', data);
          await fs.rename(full + '.github-import-tmp', full);
          if (sha256(await fs.readFile(full)) !== sha256(data)) throw new Error(`Promoted file verification failed: ${relative}`);
        }
        await fs.mkdir(stateDir, { recursive: true });
        const result = { requestId, manifestUrl, manifestSha256, sourceCommit, completedAt: new Date().toISOString(), files: [...output].map(([destination, data]) => ({ destination, sha256: sha256(data), size: data.length })), protected: ['src/main.tsx', 'src/dev/**', 'src/types/**', 'hidden viewer' ] };
        await fs.writeFile(receiptPath + '.tmp', JSON.stringify(result, null, 2));
        await fs.rename(receiptPath + '.tmp', receiptPath);
      } catch (error) {
        const failures: string[] = [];
        for (const relative of changed.reverse()) {
          const full = path.join(root, relative);
          try {
            const backup = backups.get(relative);
            if (backup === null) await fs.rm(full, { force: true });
            else if (backup) await fs.writeFile(full, backup);
            await fs.rm(full + '.github-import-tmp', { force: true });
          } catch { failures.push(relative); }
        }
        if (failures.length) throw new Error(`Import rollback failed for ${failures.join(', ')}. Recovery files retained at ${stage}`, { cause: error });
        throw new Error('Import failed and live files were rolled back.', { cause: error });
      }
      await fs.rm(stage, { recursive: true, force: true });
      console.log(`[github-import] Verified ${output.size} files; promoted ${changed.length}; source ${sourceCommit}; request ${requestId}.`);
    },
  };
}
