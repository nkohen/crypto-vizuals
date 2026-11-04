// The pre-computed territory map shipped with the studio. The markdown file is
// the source of truth (it is also the file a learner copies into learning-edge's
// territories/); it is parsed at load, and `npm run check:tex` validates it.
import mapSource from '../../content/territories/crypto-camp-prework.md?raw';
import { parseTerritory, type Territory } from './parse';

export const TERRITORY_SOURCE: string = mapSource;
export const TERRITORY: Territory = parseTerritory(mapSource);

export const nodeById = new Map(TERRITORY.nodes.map((n) => [n.id, n]));

/** Territory nodes that cite a prework item. */
export function nodesForItem(item: string) {
  return TERRITORY.nodes.filter((n) => n.prework.includes(item));
}

/** Nodes whose routes need `id`, with the kind of need. */
export function dependentsOf(id: string) {
  const out: { node: (typeof TERRITORY.nodes)[number]; kind: 'formal' | 'informal' }[] = [];
  for (const n of TERRITORY.nodes) {
    const kinds = n.routes.flatMap((r) => r.needs.filter((x) => x.node === id).map((x) => x.kind));
    if (kinds.length) out.push({ node: n, kind: kinds.includes('formal') ? 'formal' : 'informal' });
  }
  return out;
}
