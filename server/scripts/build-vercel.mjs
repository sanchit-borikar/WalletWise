/**
 * Builds the Aura server for Vercel using the Build Output API:
 *
 *   .vercel/output/config.json                    every path goes to the one function
 *   .vercel/output/functions/aura.func/
 *     index.mjs                                   src/vercel.ts and the engine, bundled
 *     aura.system.md                              system prompt (read at start-up)
 *     knowledge-index.json                        Gemini knowledge index
 *     .vc-config.json                             Node.js runtime, streaming on
 *
 * Run by Vercel as the build command (see ../../vercel.json), or locally with
 * `npm run build:vercel` from the server folder. chromadb and the local embedding model
 * are left out: on Vercel the file index and Gemini embeddings are used instead.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(serverDir, '..', '.vercel', 'output');
const funcDir = join(outDir, 'functions', 'aura.func');
const indexFile = join(serverDir, 'index', 'knowledge-index.gemini.json');

if (!existsSync(indexFile)) {
  console.error(`Missing ${indexFile}.\nBuild it with Gemini embeddings first (see server/DEPLOY.md):\n  EMBEDDINGS_PROVIDER=gemini VECTOR_STORE=file npm run aura:ingest`);
  process.exit(1);
}
const indexModel = JSON.parse(readFileSync(indexFile, 'utf8')).model;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

// Runs before any bundled module, so config.ts sees these defaults. Values set in the
// Vercel project settings win. `require` is for CommonJS code inside dependencies.
const banner = `
import { createRequire as __auraCreateRequire } from 'node:module';
import { fileURLToPath as __auraFileURLToPath } from 'node:url';
const require = __auraCreateRequire(import.meta.url);
process.env.EMBEDDINGS_PROVIDER ??= 'gemini';
process.env.EMBEDDINGS_MODEL ??= ${JSON.stringify(indexModel)};
process.env.VECTOR_STORE ??= 'file';
process.env.KNOWLEDGE_INDEX_FILE ??= __auraFileURLToPath(new URL('./knowledge-index.json', import.meta.url));
`;

const result = await build({
  entryPoints: [join(serverDir, 'src', 'vercel.ts')],
  outfile: join(funcDir, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  banner: { js: banner },
  // Only loaded with VECTOR_STORE=chroma or EMBEDDINGS_PROVIDER=local, never on Vercel.
  external: ['chromadb', '@huggingface/transformers'],
  metafile: true,
  logLevel: 'warning',
});

copyFileSync(join(serverDir, 'src', 'agent', 'aura.system.md'), join(funcDir, 'aura.system.md'));
copyFileSync(indexFile, join(funcDir, 'knowledge-index.json'));

writeFileSync(
  join(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      // An answer is capped at 60 s by the route itself; Hobby allows up to 300 s.
      maxDuration: 120,
    },
    null,
    2,
  ),
);

// The function reads the original path (/health, /aura/chat) and routes it itself.
writeFileSync(join(outDir, 'config.json'), JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/aura' }] }, null, 2));

const inputs = Object.keys(result.metafile.inputs);
for (const banned of ['node_modules/chromadb', 'node_modules/@huggingface', 'node_modules/onnxruntime']) {
  if (inputs.some((p) => p.includes(banned))) {
    console.error(`The bundle unexpectedly contains ${banned}.`);
    process.exit(1);
  }
}
const mb = (f) => (statSync(join(funcDir, f)).size / 1e6).toFixed(1);
console.log(`Built .vercel/output: index.mjs ${mb('index.mjs')} MB, knowledge-index.json ${mb('knowledge-index.json')} MB (${indexModel}).`);
