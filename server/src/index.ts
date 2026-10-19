/**
 * Aura backend. Start with `npm start` from the server folder.
 * Uses Node's built-in http module, so the only runtime dependencies are the Groq SDK,
 * the Chroma client and the embeddings library.
 */
import { createServer } from 'node:http';

import { config } from './config.ts';
import { handleAuraChat } from './routes/auraChat.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = createServer(async (req, res) => {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  const path = (req.url ?? '/').split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({ ok: true, llm: config.llmProvider, model: config.groqModel || null, groqKeySet: !!config.groqApiKey }),
    );
    return;
  }
  if (req.method === 'POST' && path === '/aura/chat') {
    await handleAuraChat(req, res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Not found' }));
});

server.listen(config.port, config.host, () => {
  console.log(`Aura server listening on http://${config.host}:${config.port}`);
  if (!config.groqApiKey) console.warn('GROQ_API_KEY is not set: /aura/chat will answer with a setup error.');
  if (!config.groqModel) console.warn('GROQ_MODEL is not set: /aura/chat will answer with a setup error.');
});
