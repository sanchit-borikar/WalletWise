import { buildCatalog } from '../engine';
import type { Card, ChangeEvent, DataMeta, ProgrammeNode, TransferEdge } from '../engine';

import cards from './generated/cards.json';
import changes from './generated/changes.json';
import meta from './generated/meta.json';
import transfers from './generated/transfers.json';

/**
 * The app's card catalog, built from the bundled CardAdvisor data (CC BY 4.0).
 * Regenerate with `npm run build:data` after refreshing datasets/.
 */
export const catalog = buildCatalog({
  cards: cards as unknown as Card[],
  transfers: transfers as unknown as { nodes: ProgrammeNode[]; edges: TransferEdge[] },
  changes: changes as unknown as ChangeEvent[],
  meta: meta as unknown as DataMeta,
});

export const DATA_ATTRIBUTION = catalog.meta.attribution;
