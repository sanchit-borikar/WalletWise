/**
 * Aura backend. Start with `npm start` from the server folder.
 * Uses Node's built-in http module, so the only runtime dependencies are the Groq SDK,
 * the Chroma client and the embeddings library. On Vercel, ./vercel.ts is used instead.
 */
import { createServer } from 'node:http';

import { config } from './config.ts';
import { handleRequest } from './http.ts';

const server = createServer(handleRequest);

server.listen(config.port, config.host, () => {
  console.log(`Aura server listening on http://${config.host}:${config.port}`);
  if (!config.groqApiKey) console.warn('GROQ_API_KEY is not set: /aura/chat will answer with a setup error.');
  if (!config.groqModel) console.warn('GROQ_MODEL is not set: /aura/chat will answer with a setup error.');
});
