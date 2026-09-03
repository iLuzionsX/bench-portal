import fs from 'node:fs';
import path from 'node:path';

const GAME_ROOT = 'games/onslaught-fable-5.1';
const SOURCE_ROOT = `${GAME_ROOT}/source-reconstruction`;

const PATCH_EXACT = new Set([
  `${GAME_ROOT}/index.html`,
  `${GAME_ROOT}/game.json`,
  'scripts/smoke-onslaught.mjs',
]);

const CONTEXT_ONLY = new Set([
  `${GAME_ROOT}/assets/mobile-controls.js`,
  `${GAME_ROOT}/assets/mobile-fire-look.js`,
  `${GAME_ROOT}/assets/mobile-settings.js`,
  `${GAME_ROOT}/assets/mobile-controls.css`,
]);

const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.txt']);
const DENIED_SEGMENTS = new Set(['.git', '.github', '.muse', 'dist', 'node_modules']);
const MAX_FILE_BYTES = 180_000;
const MAX_CONTEXT_BYTES = 800_000;

function normalizeRepoPath(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').trim();
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0')) throw new Error(`Invalid repository path: ${value}`);
  const parts = normalized.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe repository path: ${value}`);
  return parts.join('/');
}

function isSecretLike(repoPath) {
  if (repoPath.split('/').some(part => DENIED_SEGMENTS.has(part))) return true;
  return /\/(?:\.env(?:\.|$)|[^/]*(?:secret|credential|private[-_]?key)[^/]*)/i.test(`/${repoPath}`);
}

export function isAllowedPath(value) {
  let repoPath;
  try { repoPath = normalizeRepoPath(value); } catch { return false; }
  if (isSecretLike(repoPath)) return false;
  return PATCH_EXACT.has(repoPath) || repoPath.startsWith(`${SOURCE_ROOT}/`);
}

export function isContextPath(value) {
  let repoPath;
  try { repoPath = normalizeRepoPath(value); } catch { return false; }
  if (isSecretLike(repoPath)) return false;
  return isAllowedPath(repoPath) || CONTEXT_ONLY.has(repoPath);
}

function patchPath(raw) {
  const value = String(raw || '').trim().split('\t', 1)[0].trim();
  if (!value || value === '/dev/null') return null;
  return value.replace(/^[ab]\//, '');
}

export function validatePatchScope(patch) {
  const text = String(patch || '');
  if (!text.trim()) return { ok: true, paths: [] };
  if (Buffer.byteLength(text, 'utf8') > 300_000) return { ok: false, error: 'Patch exceeds the 300 KB safety limit.', paths: [] };

  const paths = new Set();
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.startsWith('diff --git ')) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (!match) return { ok: false, error: `Malformed diff header: ${line}`, paths: [...paths] };
      paths.add(match[1]);
      paths.add(match[2]);
      continue;
    }
    if (line.startsWith('+++ ') || line.startsWith('--- ')) {
      const candidate = patchPath(line.slice(4));
      if (candidate) paths.add(candidate);
    }
  }

  if (!paths.size) return { ok: false, error: 'Patch contains no recognizable file paths.', paths: [] };
  const unsafe = [...paths].filter(candidate => !isAllowedPath(candidate));
  if (unsafe.length) return { ok: false, error: `Patch touches files outside the allowlist: ${unsafe.join(', ')}`, paths: [...paths] };
  return { ok: true, paths: [...paths].sort() };
}

function shouldInclude(repoPath, stat) {
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES || !isContextPath(repoPath)) return false;
  const base = path.posix.basename(repoPath);
  if (base === 'package-lock.json' || base === 'pnpm-lock.yaml' || base === 'yarn.lock') return false;
  return TEXT_EXTENSIONS.has(path.posix.extname(repoPath).toLowerCase()) || base === 'Dockerfile';
}

function walk(rootDir, absoluteDir, out) {
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || DENIED_SEGMENTS.has(entry.name)) continue;
    const absolute = path.join(absoluteDir, entry.name);
    const repoPath = path.relative(rootDir, absolute).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (repoPath.startsWith(`${SOURCE_ROOT}/`) || repoPath === SOURCE_ROOT) walk(rootDir, absolute, out);
      continue;
    }
    const stat = fs.statSync(absolute);
    if (shouldInclude(repoPath, stat)) out.push({ path: repoPath, bytes: stat.size, content: fs.readFileSync(absolute, 'utf8') });
  }
}

export function collectContext(rootDir) {
  const files = [];
  const sourceDir = path.join(rootDir, ...SOURCE_ROOT.split('/'));
  if (!fs.existsSync(sourceDir)) throw new Error(`Expected game source directory not found: ${SOURCE_ROOT}`);
  walk(rootDir, sourceDir, files);

  for (const repoPath of new Set([...PATCH_EXACT, ...CONTEXT_ONLY])) {
    const absolute = path.join(rootDir, ...repoPath.split('/'));
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.statSync(absolute);
    if (shouldInclude(repoPath, stat)) files.push({ path: repoPath, bytes: stat.size, content: fs.readFileSync(absolute, 'utf8') });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  const selected = [];
  let total = 0;
  for (const file of files) {
    if (total + file.bytes > MAX_CONTEXT_BYTES) continue;
    selected.push(file);
    total += file.bytes;
  }
  return { files: selected, totalBytes: total };
}

export const AGENT_SCOPE = Object.freeze({
  gameRoot: GAME_ROOT,
  sourceRoot: SOURCE_ROOT,
  exactAllowed: [...PATCH_EXACT].sort(),
  contextOnly: [...CONTEXT_ONLY].sort(),
  maxContextBytes: MAX_CONTEXT_BYTES,
  maxFileBytes: MAX_FILE_BYTES,
});
