// The pre-computed territory map shipped with the studio. The markdown file is
// the source of truth (it is also the file a learner copies into learning-edge's
// territories/); it is parsed at load, and `npm run check:tex` validates it.
import mapSource from '../../content/territories/crypto-camp-prework.md?raw';
import { firstWeek, parseTerritory, type Territory, type TerritoryNode } from './parse';
import { PREWORK_INDEX } from '../prework/content';

export const TERRITORY_SOURCE: string = mapSource;
export const TERRITORY: Territory = parseTerritory(mapSource);

export const nodeById = new Map(TERRITORY.nodes.map((n) => [n.id, n]));

/** Territory nodes that cite a prework item. */
export function nodesForItem(item: string) {
  return TERRITORY.nodes.filter((n) => n.prework.includes(item));
}

/**
 * How a node needs another, across ALL its routes: `formal` only when every
 * route needs it formally, `informal` when none does, and `some-routes` when
 * one route needs it formally and another does not (needs it informally, or not
 * at all). Collapsing to the strongest kind would draw a Week 3 concept as a
 * hard prerequisite of a Week 2 node that has a route without it.
 */
export type NeedStrength = 'formal' | 'informal' | 'some-routes';

export function needStrength(n: TerritoryNode, id: string): NeedStrength | undefined {
  const per = n.routes.map((r) => r.needs.find((x) => x.node === id)?.kind);
  if (per.every((k) => k === undefined)) return undefined;
  if (per.every((k) => k === 'formal')) return 'formal';
  if (per.every((k) => k !== 'formal')) return 'informal';
  return 'some-routes';
}

/** Nodes whose routes need `id`, with how strongly (see needStrength). */
export function dependentsOf(id: string) {
  const out: { node: TerritoryNode; kind: NeedStrength }[] = [];
  for (const n of TERRITORY.nodes) {
    const kind = needStrength(n, id);
    if (kind) out.push({ node: n, kind });
  }
  return out;
}

/** Where the handouts first reach a node (week position; nodes always cite one, see validateTerritory). */
export const weekOf = (n: TerritoryNode) => firstWeek(n, PREWORK_INDEX.weekRank) ?? Number.MAX_SAFE_INTEGER;
