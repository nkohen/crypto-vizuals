// Parse a learning-edge territory map (markdown) into the studio's data.
//
// The map stays a valid learning-edge territory file — that is its first job, so
// the tutor can use it unchanged. The studio reads a disciplined subset of it:
//
//   ## A. Section title
//   ### `node-id` · Node title
//   Prose…  (ends with *(informal concept)* for an informal node)
//   - **Prework:** `3/reading-1`, `3/exercise-1`
//   - **First met:** Week 2a — where, when the handouts introduce it in prose
//     before any item cites it (optional)
//   - **Route:** Route name            (or "entry": nothing needed inside the map)
//     - formal ← `other-id` — how it bears
//     - informal ← `other-id` — how it bears
//
// Every other `##` section (Out of scope, Sources, Notes for the tutor, Audit,
// Adversarial ledger, Prework not mapped) is kept as markdown.
//
// Errors carry line numbers. `validateTerritory` checks references; the studio
// and `npm run check:tex` both run it, so a malformed map fails the check
// instead of quietly drawing a wrong dependency.

export type NeedKind = 'formal' | 'informal';

export interface Need {
  kind: NeedKind;
  node: string;
  /** How the needed node bears on this one (rich text). */
  why: string;
}

export interface Route {
  name: string;
  /** Nothing inside the map is needed: an entry point. */
  entry: boolean;
  needs: Need[];
}

export interface TerritoryNode {
  id: string;
  title: string;
  section: string;
  prose: string;
  informal: boolean;
  prework: string[];
  /** Week id the handouts first introduce it in, when that is earlier than any cited item. */
  firstMet?: string;
  /** Where, in the handouts' prose, it is first met. */
  firstMetWhere?: string;
  routes: Route[];
  line: number;
}

export interface TerritorySection {
  letter: string;
  title: string;
  nodes: string[];
}

export interface Territory {
  title: string;
  status: string;
  goal: string;
  entryAssumptions: string;
  intro: string;
  sections: TerritorySection[];
  nodes: TerritoryNode[];
  /** Unlettered `##` sections, by heading, as markdown. */
  extras: { heading: string; markdown: string }[];
  /** Item ids the map lists under "Prework not mapped". */
  notMapped: string[];
}

export class TerritoryError extends Error {}

const SECTION_RE = /^## ([A-Z])\. (.+)$/;
const EXTRA_RE = /^## (.+)$/;
const NODE_RE = /^### `([a-z0-9][a-z0-9-]*)` · (.+)$/;
const PREWORK_RE = /^- \*\*Prework:\*\*\s*(.*)$/;
const ROUTE_RE = /^- \*\*Route:\*\*\s*(.+)$/;
const FIRST_MET_RE = /^- \*\*First met:\*\*\s*Week (\w+)\s*(?:—\s*(.*))?$/;
const NEED_RE = /^\s+- (formal|informal) ← `([a-z0-9][a-z0-9-]*)`\s*(?:—\s*(.*))?$/;
const TICKS_RE = /`([^`]+)`/g;

export function parseTerritory(md: string): Territory {
  const lines = md.split('\n');
  const t: Territory = {
    title: '',
    status: '',
    goal: '',
    entryAssumptions: '',
    intro: '',
    sections: [],
    nodes: [],
    extras: [],
    notMapped: [],
  };
  const fail = (i: number, msg: string): never => {
    throw new TerritoryError(`line ${i + 1}: ${msg}\n  ${lines[i]}`);
  };

  let section: TerritorySection | null = null;
  let node: TerritoryNode | null = null;
  let route: Route | null = null;
  let extra: { heading: string; markdown: string } | null = null;
  const intro: string[] = [];
  let headerField: 'status' | 'goal' | 'entryAssumptions' | null = null;

  let inComment = false;

  const field = (line: string, label: string) => {
    const m = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.*)$`).exec(line);
    return m?.[1];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (i === 0) {
      if (!line.startsWith('# ')) fail(i, 'a territory map starts with "# <title>"');
      t.title = line.slice(2).replace(/^Territory map — /, '');
      return;
    }
    // HTML comments (maintainer notes) are invisible to the studio, as in markdown.
    if (!extra && (inComment || line.trimStart().startsWith('<!--'))) {
      inComment = !line.includes('-->');
      return;
    }
    let m: RegExpExecArray | null;
    if ((m = SECTION_RE.exec(line))) {
      section = { letter: m[1], title: m[2], nodes: [] };
      t.sections.push(section);
      node = route = extra = null;
      return;
    }
    if ((m = EXTRA_RE.exec(line))) {
      extra = { heading: m[1], markdown: '' };
      t.extras.push(extra);
      section = node = route = null;
      return;
    }
    if (extra) {
      if (NODE_RE.test(line)) fail(i, `node under "## ${extra.heading}", which is not a lettered "## X. Title" section`);
      extra.markdown += raw + '\n';
      return;
    }
    if ((m = NODE_RE.exec(line))) {
      if (!section) fail(i, 'node outside a lettered section');
      node = { id: m[1], title: m[2], section: section!.letter, prose: '', informal: false, prework: [], routes: [], line: i + 1 };
      section!.nodes.push(node.id);
      t.nodes.push(node);
      route = null;
      return;
    }
    if (!node) {
      // the header: description, status, goal, entry assumptions. A field runs
      // on over continuation lines until a blank line.
      const status = field(line, 'Status');
      const goal = field(line, 'Goal this map serves');
      const entry = field(line, 'Entry assumptions');
      if (status !== undefined) headerField = 'status';
      else if (goal !== undefined) headerField = 'goal';
      else if (entry !== undefined) headerField = 'entryAssumptions';
      const value = status ?? goal ?? entry;
      if (value !== undefined) t[headerField!] = value;
      else if (!line) headerField = null;
      else if (headerField) t[headerField] += ' ' + line.trim();
      else if (!section && line !== '---') intro.push(line);
      return;
    }
    if ((m = PREWORK_RE.exec(line))) {
      node.prework.push(...[...m[1].matchAll(TICKS_RE)].map((x) => x[1]));
      route = null;
      return;
    }
    if ((m = FIRST_MET_RE.exec(line))) {
      node.firstMet = m[1];
      node.firstMetWhere = m[2]?.trim();
      route = null;
      return;
    }
    if ((m = ROUTE_RE.exec(line))) {
      const name = m[1].trim();
      route = { name, entry: name.toLowerCase() === 'entry', needs: [] };
      node.routes.push(route);
      return;
    }
    if ((m = NEED_RE.exec(raw))) {
      if (!route) fail(i, 'a need must sit under a "- **Route:**" line');
      if (route!.entry) fail(i, 'an entry route needs nothing');
      route!.needs.push({ kind: m[1] as NeedKind, node: m[2], why: (m[3] ?? '').trim() });
      return;
    }
    if (/^\s*- /.test(raw)) fail(i, 'unrecognised bullet inside a node (expected Prework, Route, or an indented need)');
    if (line === '' || line === '---') return;
    if (route) fail(i, 'prose after a route; node prose goes before the bullets');
    node.prose += (node.prose ? ' ' : '') + line.trim();
  });

  t.intro = intro.join('\n').trim();
  for (const n of t.nodes) {
    const tag = /\s*\*\(informal concept\)\*\s*$/;
    if (tag.test(n.prose)) {
      n.informal = true;
      n.prose = n.prose.replace(tag, '').trim();
    }
    if (!n.routes.length) throw new TerritoryError(`line ${n.line}: node ${n.id} has no "- **Route:**" (use "entry")`);
  }
  const nm = t.extras.find((e) => /^Prework not mapped/i.test(e.heading));
  if (nm) t.notMapped = [...nm.markdown.matchAll(/^- `([^`]+)`/gm)].map((x) => x[1]);
  if (!t.status) throw new TerritoryError('missing **Status:** line');
  return t;
}

/** What the map is checked against: the ingested handouts. */
export interface PreworkIndex {
  /** Items every map must account for (cite, or list under "Prework not mapped"). */
  covered: Set<string>;
  /** Everything a node may cite: the covered items plus figures. */
  citable: Set<string>;
  /** Position of each week in the handouts' order ("1" → 0, "2a" → 1, …). */
  weekRank: Map<string, number>;
}

/** Reference checks: returns a list of problems (empty when the map is sound). */
export function validateTerritory(t: Territory, prework?: PreworkIndex): string[] {
  const problems: string[] = [];
  const ids = new Map<string, TerritoryNode>();
  for (const n of t.nodes) {
    if (ids.has(n.id)) problems.push(`line ${n.line}: duplicate node id ${n.id}`);
    ids.set(n.id, n);
  }
  for (const n of t.nodes) {
    for (const r of n.routes)
      for (const need of r.needs) {
        if (!ids.has(need.node)) problems.push(`line ${n.line}: ${n.id} needs unknown node ${need.node}`);
        if (need.node === n.id) problems.push(`line ${n.line}: ${n.id} needs itself`);
      }
    if (prework) for (const p of n.prework) if (!prework.citable.has(p)) problems.push(`line ${n.line}: ${n.id} cites unknown prework item ${p}`);
    if (prework && n.firstMet && !prework.weekRank.has(n.firstMet)) problems.push(`line ${n.line}: ${n.id} is "First met" in unknown week ${n.firstMet}`);
  }
  // A formal cycle can only be a cycle through every route of each node on it
  // to be fatal, but even one cyclic route is a modelling error worth flagging.
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      problems.push(`formal cycle: ${[...path.slice(path.indexOf(id)), id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const r of ids.get(id)?.routes ?? []) for (const need of r.needs) if (need.kind === 'formal') visit(need.node, [...path, id]);
    state.set(id, 'done');
  };
  for (const n of t.nodes) visit(n.id, []);
  if (prework) {
    const cited = new Set([...t.nodes.flatMap((n) => n.prework), ...t.notMapped]);
    for (const item of prework.covered) if (!cited.has(item)) problems.push(`prework item ${item} is neither cited by a node nor under "Prework not mapped"`);
    problems.push(...orderProblems(t, ids, prework));
  }
  return problems;
}

/** The handout week a node is first met in: its earliest citation, or its "First met" week if earlier. */
export function firstWeek(n: TerritoryNode, weekRank: Map<string, number>): number | undefined {
  const weeks = [...n.prework.map((p) => p.split('/')[0]), ...(n.firstMet ? [n.firstMet] : [])];
  const ranks = weeks.map((w) => weekRank.get(w)).filter((r): r is number => r !== undefined);
  return ranks.length ? Math.min(...ranks) : undefined;
}

// Two checks that keep the map usable as navigation alongside the handouts.
//  - Anchored: every node cites a handout item, or a student working from the
//    handouts never meets it (and nothing that formally needs it can become a
//    candidate until they find it on the map by themselves).
//  - Reachable in the handouts' order: some route's formal needs are all first
//    met no later than the node itself. A "formal" need first met in a later
//    week contradicts the legend ("cannot state it as the handouts first state
//    it"): the handouts did state it without that need.
function orderProblems(t: Territory, ids: Map<string, TerritoryNode>, prework: PreworkIndex): string[] {
  const out: string[] = [];
  for (const n of t.nodes) {
    const week = firstWeek(n, prework.weekRank);
    if (week === undefined) {
      out.push(`line ${n.line}: ${n.id} cites no handout item (add a "- **Prework:**" line)`);
      continue;
    }
    const late = n.routes.map((r) =>
      r.needs.filter((need) => {
        const other = ids.get(need.node); // unknown ids are reported above
        const w = need.kind === 'formal' && other ? firstWeek(other, prework.weekRank) : undefined;
        return w !== undefined && w > week;
      }),
    );
    if (late.every((l) => l.length > 0))
      out.push(
        `line ${n.line}: ${n.id} is first met in the handouts before some formal need on every route: ` +
          late.map((l) => l.map((x) => x.node).join(', ')).join(' | '),
      );
  }
  return out;
}
