/**
 * The one interface the agent uses to talk to a language model. Groq implements it
 * today (groqClient.ts); another provider only needs a new file that implements
 * `LLMClient` and a case in ./index.ts selected by the LLM_PROVIDER env var.
 */

export type ToolCall = { id: string; name: string; arguments: string };

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export type ToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  parameters: Record<string, unknown>;
};

/** Events streamed back from one model call. */
export type LLMStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_calls'; calls: ToolCall[] }
  | { type: 'done' };

export type ChatOptions = {
  /** "none" forces a plain-text answer (used when the tool budget is spent). */
  toolChoice?: 'auto' | 'none';
  signal?: AbortSignal;
};

export interface LLMClient {
  chat(messages: ChatMessage[], tools: ToolDefinition[], options?: ChatOptions): AsyncIterable<LLMStreamEvent>;
}

/** The model is rate limited, timed out or erroring after retries. Shown as "Aura is busy". */
export class LLMBusyError extends Error {
  constructor(message = 'Aura is busy, please try again') {
    super(message);
    this.name = 'LLMBusyError';
  }
}

/** The server is missing or has a wrong API key or model name. */
export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMConfigError';
  }
}

/**
 * Runs `attempt` and retries it on retryable errors with exponential backoff
 * (base 500 ms, doubling, plus jitter). Provider-neutral, so every LLMClient behaves the same.
 */
export async function withBackoff<T>(
  attempt: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  maxRetries: number,
  signal?: AbortSignal,
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (error) {
      if (i >= maxRetries || !isRetryable(error) || signal?.aborted) throw error;
      const delay = 500 * 2 ** i + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
