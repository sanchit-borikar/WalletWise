import { config } from '../config.ts';
import { detectCardMention } from './cardMention.ts';
import { embed } from './embeddings.ts';
import { queryChunks } from './store.ts';
import type { ScoredChunk } from './store.ts';

export type KnowledgeResult =
  | {
      ok: true;
      status: 'match';
      chunks: { card: string; cardId: string; bank: string; section: string; last_updated: string; source: string; score: number; text: string }[];
    }
  | { ok: true; status: 'no_confident_match'; best_score: number | null; message: string }
  | { ok: false; error: 'knowledge_unavailable'; message: string };

let queryFn: typeof queryChunks = queryChunks;

/** Lets tests replace the vector store with a fake. */
export function setQueryForTests(fn: typeof queryChunks | null) {
  queryFn = fn ?? queryChunks;
}

/**
 * Embeds the question, finds the top 5 chunks (optionally for one card) and returns
 * them with scores. Below RAG_MIN_SCORE the answer is "no_confident_match", so Aura
 * says it has no verified info instead of guessing.
 */
export async function searchCardKnowledge(query: string, cardId?: string): Promise<KnowledgeResult> {
  // Without an explicit card, check whether the question names a known card first.
  let cardIds: string[] | undefined = cardId ? [cardId] : undefined;
  if (!cardIds) {
    const mention = detectCardMention(query);
    if (mention.kind === 'unknown') {
      return {
        ok: true,
        status: 'no_confident_match',
        best_score: null,
        message: `No card matching "${mention.words.join(' ')}" is in the knowledge base. Tell the user: I don't have verified info on this card yet.`,
      };
    }
    if (mention.kind === 'known') cardIds = mention.cardIds;
  }

  let hits: ScoredChunk[];
  try {
    const [vector] = await embed([query]);
    if (cardIds) {
      hits = await queryFn(vector, config.ragTopK, cardIds);
    } else {
      // A general question: prefer the credit-card basics document when it matches.
      const [basics, all] = await Promise.all([queryFn(vector, 2, ['general']), queryFn(vector, config.ragTopK)]);
      const goodBasics = basics.filter((h) => h.score >= config.ragMinScore);
      const seen = new Set(goodBasics.map((h) => h.id));
      hits = [...goodBasics, ...all.filter((h) => !seen.has(h.id))].slice(0, config.ragTopK);
    }
  } catch (error) {
    console.error('[aura] knowledge search failed:', error instanceof Error ? error.message : error);
    return { ok: false, error: 'knowledge_unavailable', message: 'Card knowledge search is not available right now.' };
  }

  const top = hits[0]?.score ?? null;
  if (top === null || top < config.ragMinScore) {
    return {
      ok: true,
      status: 'no_confident_match',
      best_score: top === null ? null : Math.round(top * 100) / 100,
      message: "No verified information matched. Tell the user: I don't have verified info on this card yet.",
    };
  }
  return {
    ok: true,
    status: 'match',
    chunks: hits
      .filter((h) => h.score >= config.ragMinScore)
      .map((h) => ({
        card: h.metadata.cardName,
        cardId: h.metadata.cardId,
        bank: h.metadata.bank,
        section: h.metadata.section,
        last_updated: h.metadata.last_updated,
        source: h.metadata.source,
        score: Math.round(h.score * 100) / 100,
        text: h.text,
      })),
  };
}
