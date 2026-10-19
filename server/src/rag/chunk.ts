/**
 * Splits a markdown card document into chunks by section ("## Fees", "## Rewards"...).
 * Long sections are split by paragraph into pieces of about 300-500 tokens with a
 * small overlap, so a fact near a boundary appears in both pieces.
 */

export type DocMeta = { cardId: string; cardName: string; bank: string; last_updated: string; source: string };
export type Chunk = { id: string; text: string; section: string; meta: DocMeta };

/** Rough token count for English text (about 0.75 words per token). */
export const estimateTokens = (text: string) => Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75);

const MAX_TOKENS = 450;
const OVERLAP_TOKENS = 50;

/** Reads "key: value" front matter between --- lines. */
export function parseFrontMatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: match[2] };
}

function splitLong(text: string): string[] {
  if (estimateTokens(text) <= MAX_TOKENS) return [text];
  const paragraphs = text.split(/\n\s*\n/);
  const pieces: string[] = [];
  let current: string[] = [];
  for (const p of paragraphs) {
    if (current.length && estimateTokens([...current, p].join('\n\n')) > MAX_TOKENS) {
      pieces.push(current.join('\n\n'));
      // Overlap: carry the tail of the previous piece into the next.
      const words = current.join(' ').split(/\s+/);
      current = [words.slice(-Math.floor(OVERLAP_TOKENS * 0.75)).join(' ')];
    }
    current.push(p);
  }
  if (current.length) pieces.push(current.join('\n\n'));
  return pieces;
}

export function chunkMarkdown(body: string, meta: DocMeta): Chunk[] {
  const sections = body.split(/^## +/m);
  const intro = sections.shift()?.trim();
  const named = sections.map((s) => {
    const [title, ...rest] = s.split(/\r?\n/);
    return { title: title.trim(), text: rest.join('\n').trim() };
  });
  if (intro) named.unshift({ title: 'Overview', text: intro.replace(/^# .*\r?\n?/, '').trim() });

  const chunks: Chunk[] = [];
  for (const section of named) {
    if (!section.text) continue;
    splitLong(section.text).forEach((piece, i) => {
      chunks.push({
        id: `${meta.cardId}::${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}::${i}`,
        // The card and section name are part of the text so the embedding knows the context.
        text: `${meta.cardName} (${meta.bank}) — ${section.title}\n${piece}`,
        section: section.title,
        meta,
      });
    });
  }
  return chunks;
}
