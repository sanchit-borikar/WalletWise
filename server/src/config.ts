/**
 * Server settings, all from environment variables (see ../.env.example).
 * The Groq key is read here only; it never reaches the phone app.
 */
const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  port: num(process.env.AURA_PORT, 8787),
  host: process.env.AURA_HOST ?? '0.0.0.0',

  /** Which LLM implementation to use. Only "groq" exists today. */
  llmProvider: (process.env.LLM_PROVIDER ?? 'groq').toLowerCase(),
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  groqModel: process.env.GROQ_MODEL ?? '',
  temperature: 0.1,
  /** Retries after a rate limit (429), timeout or 5xx, with exponential backoff. */
  llmMaxRetries: 2,
  llmTimeoutMs: num(process.env.LLM_TIMEOUT_MS, 30000),
  /** Model calls allowed per answer before Aura must reply with what it has. */
  maxToolIterations: 4,

  /** Which embedding implementation to use. Only "local" (all-MiniLM-L6-v2) exists today. */
  embeddingsProvider: (process.env.EMBEDDINGS_PROVIDER ?? 'local').toLowerCase(),
  embeddingsModel: process.env.EMBEDDINGS_MODEL ?? 'Xenova/all-MiniLM-L6-v2',

  chromaHost: process.env.CHROMA_HOST ?? 'localhost',
  chromaPort: num(process.env.CHROMA_PORT, 8000),
  chromaCollection: process.env.CHROMA_COLLECTION ?? 'walletwise_cards',
  /** Cosine similarity below this means "no confident match". */
  ragMinScore: num(process.env.RAG_MIN_SCORE, 0.35),
  ragTopK: 5,

  /** Chat requests allowed per user per minute. */
  rateLimitPerMinute: num(process.env.AURA_RATE_LIMIT_PER_MIN, 20),
  /** Conversation turns sent to the model (one turn = a user and an assistant message). */
  maxTurns: 6,
  maxMessageChars: 2000,
} as const;
