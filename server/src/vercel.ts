/**
 * Vercel function entry. `npm run build:vercel` bundles this file with esbuild into
 * .vercel/output (Vercel's Build Output API), next to the system prompt and the Gemini
 * knowledge index. The bundle sets these defaults before any module reads them
 * (Vercel project settings override them):
 *   EMBEDDINGS_PROVIDER=gemini, VECTOR_STORE=file, KNOWLEDGE_INDEX_FILE=<bundled index>
 * See ../DEPLOY.md.
 */
import { handleRequest } from './http.ts';

export default handleRequest;
