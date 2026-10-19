// Starts a local Chroma server on port 8000 with data in server/.chroma.
// Tries, in order: the Python Chroma installed in server/.venv, a `chroma` command on
// PATH, then Docker. (Chroma's npm launcher does not support Windows x64.)
//
// One-time setup for the Python option:
//   python -m venv .venv
//   .venv/Scripts/python -m pip install "chromadb==1.5.9"     (Windows)
//   .venv/bin/python -m pip install "chromadb==1.5.9"         (macOS / Linux)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, '.chroma');
const port = process.env.CHROMA_PORT ?? '8000';
mkdirSync(dataDir, { recursive: true });

const venvChroma = join(root, '.venv', process.platform === 'win32' ? 'Scripts/chroma.exe' : 'bin/chroma');
const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['chroma'], { encoding: 'utf8' }).status === 0;

let cmd;
let args;
if (existsSync(venvChroma)) {
  [cmd, args] = [venvChroma, ['run', '--path', dataDir, '--port', port]];
} else if (onPath) {
  [cmd, args] = ['chroma', ['run', '--path', dataDir, '--port', port]];
} else {
  // Same server version as the Python option.
  [cmd, args] = ['docker', ['run', '--rm', '-p', `${port}:8000`, '-v', `${dataDir}:/data`, 'chromadb/chroma:1.5.9']];
}

console.log(`Starting Chroma: ${cmd} ${args.join(' ')}`);
const child = spawn(cmd, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
