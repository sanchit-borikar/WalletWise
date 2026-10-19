// Lets `node --test` load the app's TypeScript modules the way Metro does:
// imports without an extension resolve to .ts files, and JSON files can be
// imported without an import attribute. Node strips the types itself.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
import { readFile } from 'node:fs/promises';

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith('.') && !/\\.[cm]?[jt]sx?$/.test(specifier)) {
      for (const suffix of ['.ts', '/index.ts']) {
        try {
          return await next(specifier + suffix, context);
        } catch {}
      }
    }
    throw error;
  }
}

export async function load(url, context, next) {
  if (url.endsWith('.json')) {
    const text = await readFile(new URL(url), 'utf8');
    return { format: 'module', source: 'export default ' + text, shortCircuit: true };
  }
  return next(url, context);
}`),
  import.meta.url,
);
