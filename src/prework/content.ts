// The ingested prework (see scripts/ingest-prework.ts) and the KaTeX macro table
// its math needs: the pseudocode vocabulary plus the handouts' own preambles.
import type { PreworkContent } from './types';
import type { PreworkIndex } from '../territory/parse';
import raw from './content.generated.json';
import { PC_MACROS } from '../pcMacros';

export const PREWORK = raw as unknown as PreworkContent;

export const PREWORK_MACROS: Record<string, string> = { ...PC_MACROS, ...PREWORK.macros };

const figureIds = PREWORK.weeks.flatMap((w) => w.blocks.flatMap((b) => (b.kind === 'figure' ? [b.id] : [])));

/** What the territory map is checked against (see validateTerritory). */
export const PREWORK_INDEX: PreworkIndex = {
  covered: new Set(PREWORK.items.map((i) => i.id)),
  citable: new Set([...PREWORK.items.map((i) => i.id), ...figureIds]),
  weekRank: new Map(PREWORK.weeks.map((w, i) => [w.id, i])),
};
