import { config } from '../config.ts';
import { GroqClient } from './groqClient.ts';
import { LLMConfigError } from './LLMClient.ts';
import type { LLMClient } from './LLMClient.ts';

export * from './LLMClient.ts';

let client: LLMClient | null = null;

/**
 * The configured LLM. To add a provider (a local model, another API): implement
 * LLMClient in a new file, add a case here, and set LLM_PROVIDER.
 */
export function getLLMClient(): LLMClient {
  if (client) return client;
  switch (config.llmProvider) {
    case 'groq':
      client = new GroqClient();
      return client;
    default:
      throw new LLMConfigError(`Unknown LLM_PROVIDER "${config.llmProvider}"`);
  }
}
