import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Compass, Sparkles, Copy, Check, ShieldCheck, X } from 'lucide-react';
import { TERRITORY, nodeById, dependentsOf, weekOf } from '../territory';
import type { TerritoryNode } from '../territory/parse';
import { mdInline, mdToBlocks } from '../territory/markdown';
import { PREWORK_MACROS } from '../prework/content';
import { renderRichText } from '../richText';
import Blocks from './Blocks';
import { itemName } from './names';
import { GRADES, edgeCandidates, isHeld, learner, useLearner, type Candidate, type Grade } from './learner';
import { href } from './route';

// Map text is markdown-flavoured (`code`, **bold**, *italic*) around TeX.
const rich = (t: string) => renderRichText(mdInline(t), PREWORK_MACROS);

const GRADE_STYLE: Record<Grade, string> = {
  'self-derived': 'bg-jade-500/25 text-jade-200 border-jade-500/50',
  rebuilt: 'bg-jade-500/15 text-jade-200 border-jade-500/40',
  'fact-held-why-not': 'bg-amber2-500/15 text-amber2-300 border-amber2-500/40',
  granted: 'bg-accent-500/15 text-accent-200 border-accent-500/40',
  absent: 'bg-ink-700/70 text-ink-300 border-ink-500/60',
};

export default function MapPage({ selected }: { selected?: string }) {
  const st = useLearner();
  const node = selected ? nodeById.get(selected) : undefined;
  const ranked = edgeCandidates(TERRITORY, st, weekOf);
  const candidates = new Set(ranked.map((c) => c.node.id));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">{TERRITORY.title}</h1>
          <p className="mt-1 text-sm text-ink-300">{rich(TERRITORY.goal)}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber2-500/25 bg-amber2-500/[0.07] px-2 py-1 text-[11px] text-amber2-300">
            <ShieldCheck size={12} /> {rich(TERRITORY.status.replace(/\*\*/g, ''))}
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-ink-400">
            A map of what there is to learn on the way to the goal and how the pieces bear on each other. It is not a syllabus: the
            handouts' order is one path through it. Select a node to see what it needs.
          </p>
          <Legend />
        </header>
        <MapCanvas selected={node} candidates={candidates} />
        <MapExtras />
      </div>
      <aside className={`${node ? 'order-first lg:order-none' : ''} lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto scroll-thin`}>
        {node ? <NodePanel node={node} candidate={candidates.has(node.id)} /> : <CandidatesPanel candidates={ranked} />}
      </aside>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-400">
      <span className="flex items-center gap-1.5">
        <svg width="26" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="26" y2="4" stroke="#38bdf8" strokeWidth="2" />
        </svg>
        formal need (can't state it, or follow this route's proof, without)
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="26" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="26" y2="4" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        informal (motivation, intuition)
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="26" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="26" y2="4" stroke="#fbbf24" strokeWidth="1.5" />
        </svg>
        needed by
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-5 rounded border border-dashed border-jade-400" /> reachable from your claims
      </span>
    </div>
  );
}

interface Curve {
  d: string;
  kind: 'formal' | 'informal' | 'dependent';
}

function MapCanvas({ selected, candidates }: { selected?: TerritoryNode; candidates: Set<string> }) {
  const st = useLearner();
  const wrap = useRef<HTMLDivElement>(null);
  const chips = useRef(new Map<string, HTMLElement>());
  const [curves, setCurves] = useState<Curve[]>([]);

  const needs = new Map<string, 'formal' | 'informal'>();
  for (const r of selected?.routes ?? [])
    for (const n of r.needs) if (needs.get(n.node) !== 'formal') needs.set(n.node, n.kind);
  const dependents = new Map(selected ? dependentsOf(selected.id).map((d) => [d.node.id, d.kind]) : []);

  const layout = useCallback(() => {
    const box = wrap.current?.getBoundingClientRect();
    const target = selected && chips.current.get(selected.id)?.getBoundingClientRect();
    if (!box || !target || !selected) return setCurves([]);
    const rel = (r: DOMRect) => ({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height });
    const t = rel(target);
    const out: Curve[] = [];
    const link = (from: DOMRect, to: { x: number; y: number; w: number; h: number }, kind: Curve['kind']) => {
      const f = rel(from);
      // Leave from the side facing the other chip, top/bottom when they are on different rows.
      const down = f.y + f.h <= to.y + 2;
      const up = to.y + to.h <= f.y + 2;
      const sx = f.x + f.w / 2;
      const sy = down ? f.y + f.h : up ? f.y : f.y + f.h / 2;
      const ex = to.x + to.w / 2;
      const ey = down ? to.y : up ? to.y + to.h : to.y + to.h / 2;
      const bend = Math.max(24, Math.abs(ey - sy) / 2);
      const c1 = down ? sy + bend : up ? sy - bend : sy - 40;
      const c2 = down ? ey - bend : up ? ey + bend : ey - 40;
      out.push({ d: `M${sx},${sy} C${sx},${c1} ${ex},${c2} ${ex},${ey}`, kind });
    };
    for (const [id, kind] of needs) {
      const el = chips.current.get(id);
      if (el) link(el.getBoundingClientRect(), t, kind);
    }
    for (const id of dependents.keys()) {
      const el = chips.current.get(id);
      if (el) link(target, rel(el.getBoundingClientRect()), 'dependent');
    }
    setCurves(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useLayoutEffect(() => {
    layout();
    const ro = new ResizeObserver(layout);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [layout]);

  return (
    <div ref={wrap} className="relative rounded-2xl border border-ink-700/60 bg-ink-900/40 p-3 sm:p-4">
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#38bdf8" />
          </marker>
          <marker id="map-arrow-dep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#fbbf24" />
          </marker>
        </defs>
        {curves.map((c, i) => (
          <path
            key={i}
            d={c.d}
            fill="none"
            stroke={c.kind === 'dependent' ? '#fbbf24' : '#38bdf8'}
            strokeOpacity={c.kind === 'dependent' ? 0.7 : 0.9}
            strokeWidth={c.kind === 'dependent' ? 1.4 : 2}
            strokeDasharray={c.kind === 'informal' ? '5 4' : undefined}
            markerEnd={`url(#${c.kind === 'dependent' ? 'map-arrow-dep' : 'map-arrow'})`}
          />
        ))}
      </svg>
      <div className="space-y-3">
        {TERRITORY.sections.map((sec) => (
          <section key={sec.letter} aria-labelledby={`sec-${sec.letter}`} className="rounded-xl border border-ink-700/40 bg-ink-950/40 px-3 py-2.5">
            <h2 id={`sec-${sec.letter}`} className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              {sec.letter}. {rich(sec.title)}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {sec.nodes.map((id) => {
                const n = nodeById.get(id)!;
                const h = st.holdings[id];
                const isSel = selected?.id === id;
                const need = needs.get(id);
                const dep = dependents.get(id);
                const ring = isSel
                  ? 'border-accent-400 bg-accent-500/20 ring-2 ring-accent-400/50'
                  : need === 'formal'
                    ? 'border-accent-400/80 bg-accent-500/10'
                    : need === 'informal'
                      ? 'border-dashed border-accent-400/80 bg-accent-500/[0.06]'
                      : dep
                        ? 'border-amber2-400/70 bg-amber2-500/[0.07]'
                        : candidates.has(id)
                          ? 'border-dashed border-jade-400/80 bg-ink-850'
                          : 'border-ink-600/70 bg-ink-850';
                return (
                  <li key={id}>
                    <a
                      ref={(el) => {
                        if (el) chips.current.set(id, el);
                        else chips.current.delete(id);
                      }}
                      href={isSel ? href.map() : href.map(id)}
                      aria-current={isSel ? 'true' : undefined}
                      className={`relative z-20 flex max-w-[15rem] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs leading-snug text-ink-100 transition hover:border-accent-300 ${ring}`}
                    >
                      {h && <span className={`h-2 w-2 shrink-0 rounded-full border ${GRADE_STYLE[h.grade]}`} title={`${h.grade} (claimed)`} />}
                      <span className={n.informal ? 'italic' : undefined}>{rich(n.title)}</span>
                      {candidates.has(id) && <span className="sr-only">(candidate)</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function NodePanel({ node, candidate }: { node: TerritoryNode; candidate: boolean }) {
  const st = useLearner();
  const h = st.holdings[node.id];
  const deps = dependentsOf(node.id);
  const section = TERRITORY.sections.find((s) => s.letter === node.section);
  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            {node.section}. {section?.title}
          </div>
          <h2 className="mt-0.5 text-lg font-semibold leading-tight text-ink-50">{rich(node.title)}</h2>
        </div>
        <a href={href.map()} aria-label="Close" className="rounded-md p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-100">
          <X size={16} />
        </a>
      </div>
      {node.informal && (
        <span className="mt-1.5 inline-block rounded border border-ink-500/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-300">informal concept</span>
      )}
      <p className="mt-2 text-sm leading-relaxed text-ink-200">{rich(node.prose)}</p>

      <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{node.routes.length > 1 ? `${node.routes.length} routes here` : 'What it needs'}</h3>
      <div className="mt-1.5 space-y-2.5">
        {node.routes.map((r, i) => (
          <div key={i} className={node.routes.length > 1 ? 'rounded-lg border border-ink-700/60 px-2.5 py-2' : undefined}>
            {node.routes.length > 1 && <div className="mb-1 text-xs font-medium text-ink-100">{rich(r.name)}</div>}
            {r.entry ? (
              <p className="text-xs text-ink-400">Nothing else in the map: an entry point (see the map's entry assumptions).</p>
            ) : (
              <ul className="space-y-1">
                {r.needs.map((n, j) => {
                  const other = nodeById.get(n.node);
                  return (
                    <li key={j} className="text-xs leading-snug text-ink-300">
                      <span className={`mr-1.5 rounded px-1 py-px text-[10px] font-semibold uppercase ${n.kind === 'formal' ? 'bg-accent-500/20 text-accent-200' : 'border border-dashed border-accent-500/50 text-accent-300'}`}>
                        {n.kind}
                      </span>
                      <a href={href.map(n.node)} className="font-medium text-ink-100 underline decoration-ink-500 underline-offset-2 hover:text-accent-200">
                        {other ? rich(other.title) : n.node}
                      </a>
                      {isHeld(st.holdings[n.node]) && <Check size={11} className="ml-1 inline text-jade-400" aria-label="held (claimed)" />}
                      {n.why && <span className="text-ink-400"> — {rich(n.why)}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {deps.length > 0 && (
        <>
          <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Needed by</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {deps.map((d) => (
              <a key={d.node.id} href={href.map(d.node.id)} className="rounded-full border border-amber2-500/40 px-2 py-0.5 text-[11px] text-amber2-300 hover:bg-amber2-500/10">
                {rich(d.node.title)}
                {d.kind === 'informal' && <span className="text-ink-400"> (informal)</span>}
              </a>
            ))}
          </div>
        </>
      )}

      {node.prework.length > 0 && (
        <>
          <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-400">In the handouts</h3>
          <ul className="mt-1.5 space-y-1">
            {node.prework.map((p) => (
              <li key={p} className="flex items-center gap-2 text-xs">
                <a href={href.item(p)} className="text-accent-300 hover:text-accent-200">
                  Week {p.split('/')[0]} · {itemName(p)}
                </a>
                {st.items[p] && <span className="text-[10px] text-jade-400">{st.items[p].status}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5 rounded-xl border border-ink-700/60 bg-ink-950/50 p-3">
        <h3 className="text-xs font-semibold text-ink-100">How do you hold this?</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-400">
          Your own report, kept in this browser. The tutor treats it as a claim and checks it before teaching from it.
        </p>
        <div role="radiogroup" aria-label={`How you hold ${node.title}`} className="mt-2 grid grid-cols-1 gap-1">
          {GRADES.map((g) => {
            const on = h?.grade === g.grade;
            return (
              <button
                key={g.grade}
                role="radio"
                aria-checked={on}
                onClick={() => learner.setGrade(node.id, on ? null : g.grade)}
                className={`flex items-baseline gap-2 rounded-md border px-2 py-1 text-left text-xs transition ${on ? GRADE_STYLE[g.grade] : 'border-transparent text-ink-300 hover:bg-ink-800/70'}`}
              >
                <span className="w-24 shrink-0 font-medium">{g.label}</span>
                <span className={on ? '' : 'text-ink-400'}>{g.prompt}</span>
              </button>
            );
          })}
        </div>
        {h && (
          <textarea
            key={node.id}
            aria-label="Note for the tutor"
            placeholder="Optional note for the tutor: what you remember, where you got stuck…"
            defaultValue={h.note}
            onBlur={(e) => learner.setNote(node.id, e.target.value)}
            className="mt-2 w-full rounded-md border border-ink-600/70 bg-ink-900 px-2 py-1.5 text-xs text-ink-100 placeholder:text-ink-500 focus:border-accent-500/60 focus:outline-none"
            rows={2}
          />
        )}
        {candidate && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-jade-300">
            <Sparkles size={12} className="mt-0.5 shrink-0" /> From your claims, everything this needs formally (on some route) is in hand.
          </p>
        )}
        <TutorCommand node={node} />
      </div>
    </div>
  );
}

function TutorCommand({ node }: { node: TerritoryNode }) {
  const [copied, setCopied] = useState(false);
  const cmd = `/lesson ${node.title.replace(/\$/g, '')}`;
  return (
    <div className="mt-3 border-t border-ink-700/50 pt-2.5">
      <div className="text-[11px] text-ink-400">
        Work on it with the learning-edge tutor (<a className="text-accent-300 hover:text-accent-200" href={href.tutor()}>setup</a>):
      </div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(cmd);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked: the command is visible to copy by hand */
          }
        }}
        className="mt-1 flex w-full items-center gap-2 rounded-md border border-ink-600/70 bg-ink-900 px-2 py-1.5 text-left font-mono text-[11px] text-ink-100 hover:border-accent-500/50"
      >
        <span className="min-w-0 flex-1 truncate">{cmd}</span>
        {copied ? <Check size={12} className="text-jade-400" /> : <Copy size={12} className="text-ink-400" />}
      </button>
    </div>
  );
}

function CandidatesPanel({ candidates }: { candidates: Candidate[] }) {
  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/60 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-50">
        <Compass size={16} className="text-jade-400" /> Reachable from your claims
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">
        Nodes you haven't claimed whose formal needs (on some route) you have. Listed by where the handouts first reach them,
        then by how much of their intuition you've also claimed. They come from your own report only; the tutor finds your actual edge by asking and
        probing, so treat these as a starting point, not a verdict.
      </p>
      {candidates.length === 0 ? (
        <p className="mt-3 text-xs text-ink-400">Nothing yet: select a node you already know and record how you hold it.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {candidates.map(({ node, missingInformal }) => (
            <li key={node.id}>
              <a href={href.map(node.id)} className="block rounded-md border border-dashed border-jade-500/40 px-2 py-1 text-xs text-ink-100 hover:bg-jade-500/10">
                {rich(node.title)}
                {missingInformal.length > 0 && (
                  <span className="block text-[11px] text-ink-400">
                    intuition from: {missingInformal.map((id) => nodeById.get(id)?.title ?? id).join(', ')}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-ink-500">Select any node to record how you hold it.</p>
    </div>
  );
}

// What a student sees of the map file's prose sections. The rest (notes for the
// tutor, the audit, the adversarial ledger) is addressed to the tutor and to
// maintainers: it stays in the file the student downloads, not on this page.
const STUDENT_EXTRAS = /^(Out of scope|Sources)$/i;

function MapExtras() {
  const shown = TERRITORY.extras.filter((e) => STUDENT_EXTRAS.test(e.heading));
  return (
    <div className="mt-5 space-y-2">
      {TERRITORY.entryAssumptions && (
        <details className="rounded-xl border border-ink-700/60 bg-ink-900/40 px-4 py-2 text-sm text-ink-200">
          <summary className="cursor-pointer text-sm font-medium text-ink-200">Entry assumptions</summary>
          <p className="my-2 text-ink-300">{rich(TERRITORY.entryAssumptions)}</p>
        </details>
      )}
      {shown.map((e) => (
        <details key={e.heading} className="rounded-xl border border-ink-700/60 bg-ink-900/40 px-4 py-2 text-sm">
          <summary className="cursor-pointer text-sm font-medium text-ink-200">{e.heading}</summary>
          <div className="pb-1 text-[0.9rem]">
            <Blocks blocks={mdToBlocks(e.markdown)} />
          </div>
        </details>
      ))}
    </div>
  );
}
