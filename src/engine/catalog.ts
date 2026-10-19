import type { Card, Catalog, ChangeEvent, DataMeta, ProgrammeNode, TransferEdge } from './types';

export type RawData = {
  cards: Card[];
  transfers: { nodes: ProgrammeNode[]; edges: TransferEdge[] };
  changes: ChangeEvent[];
  meta: DataMeta;
};

/** Indexes the generated data bundle for fast lookups. */
export function buildCatalog(raw: RawData): Catalog {
  const byId = new Map(raw.cards.map((c) => [c.id, c]));
  const nodes = new Map(raw.transfers.nodes.map((n) => [n.id, n]));

  const edgesFrom = new Map<string, TransferEdge[]>();
  for (const edge of raw.transfers.edges) {
    const list = edgesFrom.get(edge.from) ?? [];
    list.push(edge);
    edgesFrom.set(edge.from, list);
  }

  const changesByCard = new Map<string, ChangeEvent[]>();
  for (const change of raw.changes) {
    const list = changesByCard.get(change.cardId) ?? [];
    list.push(change);
    changesByCard.set(change.cardId, list);
  }

  return { cards: raw.cards, byId, nodes, edgesFrom, changesByCard, meta: raw.meta };
}

export function getCard(catalog: Catalog, id: string): Card | undefined {
  return catalog.byId.get(id);
}

/** Simple name search for card pickers ("infinia", "sbi cashback"). */
export function searchCards(catalog: Catalog, query: string, limit = 20): Card[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return catalog.cards
    .filter((c) => {
      const haystack = `${c.name} ${c.issuer} ${c.id}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .slice(0, limit);
}
