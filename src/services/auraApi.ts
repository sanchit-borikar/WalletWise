/**
 * Client for the Aura backend (server/, POST /aura/chat). The Groq key lives only on
 * the server; the app sends the conversation and its wallet (card ids and points) and
 * reads the answer as a stream of newline-delimited JSON events.
 */
import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';

export type AuraCta = { label: string; route: string; params?: Record<string, string> };
export type AuraTurn = { role: 'user' | 'assistant'; content: string };
export type AuraWallet = {
  cards: { catalogId: string; points: number }[];
  profile?: { experience?: string; repayment?: string; monthlySpend?: Record<string, number> };
};

export type AuraErrorKind = 'offline' | 'timeout' | 'busy' | 'setup' | 'failed';
export class AuraError extends Error {
  kind: AuraErrorKind;
  constructor(kind: AuraErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

type Handlers = {
  onStatus?: (message: string) => void;
  onText?: (delta: string) => void;
  onCta?: (cta: AuraCta) => void;
};

/** Whole answer must arrive within this time. */
const TIMEOUT_MS = 60000;
const SERVER_PORT = 8787;

/**
 * Backend address: EXPO_PUBLIC_AURA_API_URL if set, otherwise the computer running
 * the Expo dev server (same IP, port 8787), which is where `npm start` in server/ listens.
 */
export function auraBaseUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_AURA_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${SERVER_PORT}` : null;
}

function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  // Fallback for runtimes without TextDecoder.
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let cp: number;
    let len: number;
    if (b < 0x80) [cp, len] = [b, 1];
    else if (b >> 5 === 0x6) [cp, len] = [b & 0x1f, 2];
    else if (b >> 4 === 0xe) [cp, len] = [b & 0x0f, 3];
    else [cp, len] = [b & 0x07, 4];
    for (let j = 1; j < len; j++) cp = (cp << 6) | (bytes[i + j] & 0x3f);
    out += String.fromCodePoint(cp);
    i += len;
  }
  return out;
}

/** Sends one question and streams the answer. Resolves with the final text and button. */
export async function askAura(
  input: { userId: string; messages: AuraTurn[]; wallet: AuraWallet; language?: 'en' | 'hi'; simple?: boolean },
  handlers: Handlers = {},
): Promise<{ text: string; cta: AuraCta | null }> {
  const base = auraBaseUrl();
  if (!base) throw new AuraError('setup', 'Aura server address is not set. Add EXPO_PUBLIC_AURA_API_URL to .env.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${base}/aura/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw controller.signal.aborted
      ? new AuraError('timeout', 'Aura took too long to answer. Please try again.')
      : new AuraError('offline', "Can't reach Aura. Check your internet connection and try again.");
  }

  if (res.status === 429) {
    clearTimeout(timer);
    throw new AuraError('busy', 'Aura is busy, please try again in a moment.');
  }
  if (!res.ok || !res.body) {
    clearTimeout(timer);
    throw new AuraError('failed', 'Something went wrong. Please try again.');
  }

  const reader = res.body.getReader();
  let pending = new Uint8Array(0);
  let text = '';
  let cta: AuraCta | null = null;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    switch (event.type) {
      case 'status':
        handlers.onStatus?.(event.message);
        break;
      case 'text':
        text += event.delta;
        handlers.onText?.(event.delta);
        break;
      case 'cta':
        cta = event.cta;
        handlers.onCta?.(event.cta);
        break;
      case 'done':
        text = event.text || text;
        cta = event.cta ?? cta;
        break;
      case 'error':
        throw new AuraError(event.code === 'busy' ? 'busy' : event.code === 'config' ? 'setup' : 'failed', event.message);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Join with leftovers and split on newline bytes ("\n" never occurs inside a UTF-8 character).
      const merged = new Uint8Array(pending.length + value.length);
      merged.set(pending);
      merged.set(value, pending.length);
      let start = 0;
      for (let i = 0; i < merged.length; i++) {
        if (merged[i] === 10) {
          handleLine(decodeUtf8(merged.subarray(start, i)));
          start = i + 1;
        }
      }
      pending = merged.slice(start);
    }
    if (pending.length) handleLine(decodeUtf8(pending));
  } catch (error) {
    if (error instanceof AuraError) throw error;
    throw controller.signal.aborted
      ? new AuraError('timeout', 'Aura took too long to answer. Please try again.')
      : new AuraError('offline', 'The connection to Aura dropped. Please try again.');
  } finally {
    clearTimeout(timer);
  }
  return { text, cta };
}
