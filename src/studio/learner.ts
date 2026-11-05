// The student's state in the studio, kept in this browser only.
//
// Grades are learning-edge's acquisition grades (graded by HOW something was
// acquired, never a score). Everything a student enters here is a SELF-REPORT —
// in learning-edge's terms rung `ask`, which its selector does not trust — so the
// studio only ever calls these "claimed", and the exported profile hands them to
// the tutor's interview to probe rather than as settled state.

import { useSyncExternalStore } from 'react';
import type { Territory, TerritoryNode, Route } from '../territory/parse';

export type Grade = 'self-derived' | 'rebuilt' | 'granted' | 'fact-held-why-not' | 'absent';

export const GRADES: { grade: Grade; label: string; prompt: string }[] = [
  { grade: 'self-derived', label: 'Self-derived', prompt: 'I worked it out myself' },
  { grade: 'rebuilt', label: 'Rebuilt', prompt: 'I knew it, and I can reconstruct why' },
  { grade: 'fact-held-why-not', label: 'Fact, not why', prompt: 'I know the statement, not why it holds' },
  { grade: 'granted', label: 'Granted', prompt: 'I’m taking it as given for now' },
  { grade: 'absent', label: 'Not yet', prompt: 'I don’t have this yet' },
];

/** Grades that license USING a fact (learning-edge's `apply`). Only the first two license generalizing from it. */
const HELD: ReadonlySet<Grade> = new Set(['self-derived', 'rebuilt', 'granted', 'fact-held-why-not']);

export type ItemStatus = 'attempted' | 'done';

export interface Holding {
  grade: Grade;
  note?: string;
  at: string;
}

export interface LearnerState {
  version: 1;
  handle: string;
  /** What they want to understand, in their own words (learning-edge: "the goal is theirs"). */
  goal: string;
  background: string;
  holdings: Record<string, Holding>;
  items: Record<string, { status: ItemStatus; at: string }>;
}

const KEY = 'prework-studio:v1';
const EMPTY: LearnerState = { version: 1, handle: '', goal: '', background: '', holdings: {}, items: {} };

function load(): LearnerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const s = JSON.parse(raw) as LearnerState;
    return s.version === 1 ? { ...EMPTY, ...s } : EMPTY;
  } catch {
    return EMPTY;
  }
}

let state: LearnerState = load();
const listeners = new Set<() => void>();

function set(next: LearnerState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / blocked storage: keep the in-memory state for this visit */
  }
  listeners.forEach((l) => l());
}

export function useLearner(): LearnerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export const learner = {
  setGrade(node: string, grade: Grade | null, note?: string) {
    const holdings = { ...state.holdings };
    if (grade) holdings[node] = { grade, note: note ?? holdings[node]?.note, at: today() };
    else delete holdings[node];
    set({ ...state, holdings });
  },
  setNote(node: string, note: string) {
    const h = state.holdings[node];
    if (!h) return;
    set({ ...state, holdings: { ...state.holdings, [node]: { ...h, note } } });
  },
  setItem(item: string, status: ItemStatus | null) {
    const items = { ...state.items };
    if (status) items[item] = { status, at: today() };
    else delete items[item];
    set({ ...state, items });
  },
  setProfile(handle: string, goal: string, background: string) {
    set({ ...state, handle, goal, background });
  },
  reset() {
    set(EMPTY);
  },
};

export const isHeld = (h?: Holding) => !!h && HELD.has(h.grade);

/** An item counts as attempted once the student marked it attempted or done. */
export const attempted = (s: LearnerState, item: string) => !!s.items[item];

export interface Candidate {
  node: TerritoryNode;
  /** The route that makes it reachable: all its formal needs are claimed. */
  route: Route;
  /** That route's informal needs not yet claimed (motivation still missing). */
  missingInformal: string[];
}

/**
 * Candidate next nodes, derived from the self-report (never from the map's
 * order): not yet held, and reachable by some route whose FORMAL needs are all
 * held. Informal needs don't block — they are what makes a node learnable, not
 * what it logically requires.
 *
 * WHICH candidates appear comes from the claims alone. Their ORDER is the week
 * the handouts first reach them (`weekOf`), then fewest unclaimed informal
 * needs. That order is curriculum order, which learning-edge's selector
 * deliberately never uses to pick a lesson; the studio may use it to sort a
 * list, because the studio exists for working through the prework, and a
 * Week 7 topic at the top of a Week 2 student's list reads as advice. It never
 * hides a candidate.
 *
 * This is deliberately weaker than learning-edge's selector (tutor/edge.py): it
 * ignores the apply/generalize distinction and probe-trust, because a
 * self-report carries no probe. The tutor probes before it teaches.
 */
export function edgeCandidates(t: Territory, s: LearnerState, weekOf: (n: TerritoryNode) => number = () => 0): Candidate[] {
  const out: Candidate[] = [];
  for (const node of t.nodes) {
    if (isHeld(s.holdings[node.id])) continue;
    let best: Candidate | null = null;
    for (const route of node.routes) {
      if (!route.entry && route.needs.some((n) => n.kind === 'formal' && !isHeld(s.holdings[n.node]))) continue;
      const missingInformal = route.needs.filter((n) => n.kind === 'informal' && !isHeld(s.holdings[n.node])).map((n) => n.node);
      if (!best || missingInformal.length < best.missingInformal.length) best = { node, route, missingInformal };
    }
    if (best) out.push(best);
  }
  const order = new Map(t.nodes.map((n, i) => [n.id, i]));
  return out.sort(
    (a, b) =>
      weekOf(a.node) - weekOf(b.node) || a.missingInformal.length - b.missingInformal.length || order.get(a.node.id)! - order.get(b.node.id)!,
  );
}
