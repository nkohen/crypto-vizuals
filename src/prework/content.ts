// The ingested prework (see scripts/ingest-prework.ts) and the KaTeX macro table
// its math needs: the pseudocode vocabulary plus the handouts' own preambles.
import type { PreworkContent } from './types';
import raw from './content.generated.json';
import { PC_MACROS } from '../pcMacros';

export const PREWORK = raw as unknown as PreworkContent;

export const PREWORK_MACROS: Record<string, string> = { ...PC_MACROS, ...PREWORK.macros };
