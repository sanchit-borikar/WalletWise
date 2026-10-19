/**
 * Starts the whole WalletWise project with one command:  npm start
 *
 *   1. Chroma (card knowledge database)  - skipped if already running; optional
 *   2. Aura server (server/)              - restarts by itself when its code changes
 *   3. Expo dev server (the app)          - QR code and keys (r, j, m) work as usual
 *
 * Extra arguments go to Expo, e.g.  npm start -- -c   (clear the Metro cache).
 * Press Ctrl+C once to stop everything.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, watch } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = join(root, 'server');
const isWindows = process.platform === 'win32';
const AURA_PORT = Number(process.env.AURA_PORT ?? 8787);
const CHROMA_PORT = Number(process.env.CHROMA_PORT ?? 8000);

const COLORS = { chroma: '\x1b[35m', aura: '\x1b[36m', setup: '\x1b[33m' };
const RESET = '\x1b[0m';
const log = (name, text) => {
  for (const line of String(text).split(/\r?\n/)) if (line.trim()) console.log(`${COLORS[name] ?? ''}[${name}]${RESET} ${line}`);
};

const children = [];

/** Runs a background process with its output prefixed, so it does not clash with Expo's screen. */
function background(name, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  child.stdout.on('data', (d) => log(name, d));
  child.stderr.on('data', (d) => log(name, d));
  child.on('exit', (code) => code && !child.stopping && log(name, `stopped (exit code ${code})`));
  children.push(child);
  return child;
}

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Process ids listening on a port (Windows, macOS, Linux). */
function pidsOnPort(port) {
  const out = isWindows
    ? spawnSync('powershell', ['-NoProfile', '-Command', `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess`], { encoding: 'utf8' }).stdout
    : spawnSync('lsof', ['-ti', `:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout;
  return [...new Set(String(out ?? '').split(/\s+/).filter((s) => /^\d+$/.test(s)).map(Number))];
}

function commandLine(pid) {
  return isWindows
    ? spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`], { encoding: 'utf8' }).stdout ?? ''
    : spawnSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).stdout ?? '';
}

function killTree(pid) {
  if (isWindows) spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
  }
}

/** An Aura server left running from an earlier session would serve old code: replace it. */
function stopOldAuraServer() {
  for (const pid of pidsOnPort(AURA_PORT)) {
    const cmd = commandLine(pid);
    if (/register-ts\.mjs.*src[\\/]index\.ts/.test(cmd)) {
      log('setup', `Stopping an older Aura server (pid ${pid}) so the latest code runs.`);
      killTree(pid);
    } else if (cmd.trim()) {
      log('setup', `Port ${AURA_PORT} is used by another program (pid ${pid}). Set AURA_PORT to use a different port.`);
      process.exit(1);
    }
  }
}

let auraServer = null;
const AURA_ARGS = ['--env-file-if-exists=../.env', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--import', '../scripts/register-ts.mjs', 'src/index.ts'];

function startAuraServer() {
  auraServer = background('aura', process.execPath, AURA_ARGS, serverDir);
}

function restartAuraServer(file) {
  log('aura', `code changed (${file.replace(root, '').replace(/^[\\/]/, '')}), restarting…`);
  const old = auraServer;
  if (old?.pid && old.exitCode === null) {
    old.stopping = true;
    old.once('exit', startAuraServer);
    killTree(old.pid);
  } else {
    startAuraServer();
  }
}

/**
 * Calls onChange when a .ts, .md or .json file's contents change. Windows reports
 * reads and timestamp updates as changes too, so files are compared by content hash.
 */
function watchForChanges(dirs, onChange) {
  const hashes = new Map();
  const hash = (file) => {
    try {
      if (!statSync(file).isFile()) return null;
      return createHash('sha1').update(readFileSync(file)).digest('hex');
    } catch {
      return null;
    }
  };
  const relevant = (name) => /\.(ts|md|json)$/.test(name) && !/__tests__/.test(name);
  let timer = null;
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    // Remember every file's current contents, so the first real edit is noticed.
    for (const name of readdirSync(dir, { recursive: true })) {
      if (relevant(String(name))) hashes.set(join(dir, String(name)), hash(join(dir, String(name))));
    }
    watch(dir, { recursive: true }, (_event, name) => {
      if (!name || !relevant(name)) return;
      const file = join(dir, name);
      const next = hash(file);
      if (next === hashes.get(file)) return;
      hashes.set(file, next);
      clearTimeout(timer);
      timer = setTimeout(() => onChange(file), 300);
    });
  }
}

function stopAll() {
  for (const child of children) {
    if (child.pid && child.exitCode === null) {
      child.stopping = true;
      killTree(child.pid);
    }
  }
}

async function main() {
  if (!existsSync(join(serverDir, 'node_modules'))) {
    log('setup', 'Installing the Aura server packages (first run only)…');
    const r = spawnSync(isWindows ? 'npm.cmd' : 'npm', ['install'], { cwd: serverDir, stdio: 'inherit', shell: isWindows });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }

  // 1. Chroma (optional: Aura falls back to the backup index file without it).
  if (await isUp(`http://localhost:${CHROMA_PORT}/api/v2/heartbeat`)) {
    log('chroma', `already running on port ${CHROMA_PORT}`);
  } else {
    const hasVenv = existsSync(join(serverDir, '.venv'));
    if (hasVenv) background('chroma', process.execPath, ['scripts/run-chroma.mjs'], serverDir);
    else log('chroma', 'not installed; Aura will use the backup index file (see server/README.md to install)');
  }

  // Build the knowledge index once if it does not exist yet.
  if (!existsSync(join(serverDir, '.cache', 'knowledge-index.json'))) {
    log('setup', 'Building the card knowledge index (first run only, about 3-4 minutes)…');
    const r = spawnSync(process.execPath, ['--env-file-if-exists=../.env', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--import', '../scripts/register-ts.mjs', 'src/rag/ingest.ts'], {
      cwd: serverDir,
      stdio: 'inherit',
    });
    if (r.status !== 0) log('setup', 'Index build failed; Aura will answer without card knowledge until it is built.');
  }

  // 2. Aura server, restarted automatically when server or engine code really changes.
  stopOldAuraServer();
  startAuraServer();
  watchForChanges([join(serverDir, 'src'), join(root, 'src', 'engine'), join(root, 'src', 'data', 'generated')], restartAuraServer);

  // 3. Expo in the foreground so its QR code and keyboard shortcuts work.
  const expo = spawn(process.execPath, [join(root, 'node_modules', 'expo', 'bin', 'cli'), 'start', ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
  });
  children.push(expo);
  expo.on('exit', (code) => {
    stopAll();
    process.exit(code ?? 0);
  });
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

main();
