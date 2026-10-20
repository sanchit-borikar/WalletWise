/**
 * Finds which catalog card a question is about, before the vector search.
 *
 * Vector similarity alone cannot tell a real card from a made-up one: "Zorbit Platinum
 * Ultra" scores close to real platinum cards. So the search first checks the card name:
 *  - names a known card  -> search only that card's documents
 *  - names an unknown card -> "no confident match"
 *  - no card named (a general question) -> search everything
 */
import { catalog } from '../../../src/data/catalog';

const STOP = new Set(
  'a an the of for on in to my me i is are was be does do did give gives get got how much many what whats which who tell about explain details detail info information with and or vs versus compare it its this that there should worth good best better any your you can could would please card cards credit bank banks new'.split(
    ' ',
  ),
);
/** Finance words that describe what is asked, not which card. */
const TOPIC = new Set(
  'fee fees annual joining charge charges reward rewards point points rate rates earn earning lounge lounges access transfer transfers partner partners benefit benefits redeem redemption value cashback forex markup interest limit eligibility income milestone milestones offer offers travel dining fuel grocery groceries shopping online international domestic airport minimum due amount bill billing statement emi upi cap caps'.split(
    ' ',
  ),
);
/** Product words shared by many cards: they help but cannot identify a card alone. */
const WEAK = new Set('platinum gold black signature select premium metal edition classic prime plus elite privilege world rewards titanium'.split(' '));

const ISSUER_WORDS: Record<string, string[]> = {
  HDFC: ['hdfc'],
  SBI: ['sbi'],
  AXIS: ['axis'],
  ICICI: ['icici'],
  AMEX: ['amex', 'american', 'express'],
  KOTAK: ['kotak'],
  IDFC: ['idfc', 'first'],
  INDUSIND: ['indusind'],
  YES: ['yes'],
  RBL: ['rbl'],
  AU: ['au'],
  BOB: ['bob', 'bobcard', 'baroda'],
  SC: ['sc', 'standard', 'chartered'],
  HSBC: ['hsbc'],
  FEDERAL: ['federal'],
};
const ALL_ISSUER_WORDS = new Set(Object.values(ISSUER_WORDS).flat());

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9+ ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

// Name words per card, computed once.
const CARD_WORDS = catalog.cards.map((c) => ({
  id: c.id,
  issuer: c.issuer,
  words: new Set([...words(c.name), ...c.id.split('-')].filter((w) => !STOP.has(w))),
}));
const VOCABULARY = new Set(CARD_WORDS.flatMap((c) => [...c.words]));

/** Capitalised words that are not the first word: likely part of a product name. */
function properNouns(query: string): Set<string> {
  const tokens = query.split(/\s+/).slice(1);
  return new Set(tokens.filter((t) => /^[A-Z][a-zA-Z0-9+]+/.test(t)).map((t) => t.toLowerCase().replace(/[^a-z0-9+]/g, '')));
}

export type CardMention = { kind: 'none' } | { kind: 'known'; cardIds: string[] } | { kind: 'unknown'; words: string[] };

export function detectCardMention(query: string): CardMention {
  const q = words(query).filter((w) => !STOP.has(w) && !TOPIC.has(w));
  const strong = q.filter((w) => !WEAK.has(w) && !ALL_ISSUER_WORDS.has(w));
  const issuerWords = q.filter((w) => ALL_ISSUER_WORDS.has(w));
  if (strong.length === 0 && q.length === 0) return { kind: 'none' };

  // A capitalised name word that no card uses ("Zorbit"): the user means a card we do not know.
  const unknownNames = strong.filter((w) => !VOCABULARY.has(w) && properNouns(query).has(w));
  if (unknownNames.length > 0) return { kind: 'unknown', words: unknownNames };

  let best = 0;
  let ids: string[] = [];
  for (const card of CARD_WORDS) {
    const strongHits = strong.filter((w) => card.words.has(w)).length;
    if (strongHits === 0) continue;
    const weakHits = q.filter((w) => WEAK.has(w) && card.words.has(w)).length;
    const issuerHit = issuerWords.some((w) => ISSUER_WORDS[card.issuer]?.includes(w)) ? 1 : 0;
    // An issuer named in the question must match the card's issuer.
    if (issuerWords.length > 0 && !issuerHit) continue;
    const score = strongHits * 2 + weakHits + issuerHit;
    if (score > best) {
      best = score;
      ids = [card.id];
    } else if (score === best) {
      ids.push(card.id);
    }
  }
  if (ids.length > 0) return { kind: 'known', cardIds: ids.slice(0, 5) };

  // Specific words that match no card, in a question that names a card: an unknown card.
  const namesACard = /\bcards?\b/i.test(query) || issuerWords.length > 0 || q.some((w) => WEAK.has(w));
  if (strong.length > 0 && namesACard) return { kind: 'unknown', words: strong };
  return { kind: 'none' };
}
