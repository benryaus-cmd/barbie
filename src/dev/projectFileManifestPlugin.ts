import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

interface ManifestEntry {
  path: string;
  name: string;
  dir: string;
  ext: string;
  size: number;
  status: 'TEXT' | 'BINARY' | 'FAILED' | 'EMPTY';
  error?: string;
  content?: string;
}

interface Manifest {
  generatedAt: number;
  files: ManifestEntry[];
  folders: string[];
}

const VIRTUAL_ID = 'virtual:project-file-manifest';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.scss',
  '.html',
  '.md',
  '.txt',
  '.yaml',
  '.yml',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.vite',
  '.pnpm',
  '.idea',
  '.vscode',
  'out',
]);

const BLOCKED_FILES = [
  /^\.env/i,
  /^\.env\./i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.crt$/i,
  /\.cer$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)/i,
  /^\.npmrc$/i,
  /^\.netrc$/i,
  /^\.git-credentials$/i,
  /^MEMORY\.md$/i,
  /secret/i,
  /credential/i,
  /(?:access|refresh|auth)[-_.]?tokens?/i,
  /private[-_]?key/i,
];

const MAX_CONTENT_BYTES = 400 * 1024;
const MAX_FILES = 900;

const isBlocked = (name: string): boolean =>
  BLOCKED_FILES.some(pattern => pattern.test(name));

const collectPaths = (root: string): string[] => {
  const found: string[] = [];

  const walk = (dir: string, prefix: string, depth: number): void => {
    if (depth > 12 || found.length >= MAX_FILES) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries.sort()) {
      if (found.length >= MAX_FILES) return;
      if (SKIP_DIRS.has(entry)) continue;
      const full = path.join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      try {
        if (statSync(full).isDirectory()) {
          walk(full, rel, depth + 1);
          continue;
        }
        if (!statSync(full).isFile()) continue;
      } catch {
        continue;
      }
      if (isBlocked(entry)) continue;
      found.push(rel);
    }
  };

  walk(root, '', 0);
  return found;
};

const toEntry = (root: string, relPath: string): ManifestEntry | null => {
  const name = relPath.split('/').pop() ?? relPath;
  const dir = relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : '';
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';

  let size = 0;
  try {
    size = statSync(path.join(root, relPath)).size;
  } catch (error) {
    return {
      path: relPath,
      name,
      dir,
      ext,
      size: 0,
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unable to read file stats',
    };
  }

  const base: ManifestEntry = { path: relPath, name, dir, ext, size, status: 'BINARY' };

  if (!TEXT_EXTENSIONS.has(ext)) return base;
  if (size === 0) return { ...base, status: 'EMPTY', content: '' };
  if (size > MAX_CONTENT_BYTES) {
    return { ...base, status: 'BINARY', error: 'Skipped: file exceeds text preview limit' };
  }

  try {
    const content = readFileSync(path.join(root, relPath), 'utf8');
    return { ...base, status: 'TEXT', content };
  } catch (error) {
    return {
      ...base,
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unable to read file',
    };
  }
};

const buildManifest = (root: string): Manifest => {
  const files: ManifestEntry[] = [];
  const folders = new Set<string>();

  for (const rel of collectPaths(root)) {
    const entry = toEntry(root, rel);
    if (!entry) continue;
    files.push(entry);
    const segments = rel.split('/');
    for (let i = 1; i < segments.length; i += 1) {
      folders.add(segments.slice(0, i).join('/'));
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    generatedAt: Date.now(),
    files,
    folders: [...folders].sort((a, b) => a.localeCompare(b)),
  };
};

export function projectFileManifestPlugin(): Plugin {
  let root = process.cwd();

  return {
    name: 'aippy-project-file-manifest',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null;
      try {
        const manifest = buildManifest(root);
        return `export default ${JSON.stringify(manifest)};`;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'manifest failed';
        return `export default ${JSON.stringify({
          generatedAt: Date.now(),
          files: [],
          folders: [],
          error: message,
        })};`;
      }
    },
  };
}