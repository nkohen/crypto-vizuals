import { ArrowRight, Compass, PlayCircle, MessagesSquare, ExternalLink, BookOpenText } from 'lucide-react';
import { PREWORK, PREWORK_MACROS } from '../prework/content';
import { TERRITORY, nodeById, weekOf } from '../territory';
import { renderRichText } from '../richText';
import { edgeCandidates, useLearner } from './learner';
import { nextInHandouts, weekProgress, itemFullName } from './names';
import { PROOF_LINKS } from './links';
import { ProofLinkCard } from './Blocks';
import { href } from './route';

const rich = (t: string) => renderRichText(t, PREWORK_MACROS);

export default function HomePage() {
  const st = useLearner();
  const candidates = edgeCandidates(TERRITORY, st, weekOf);
  const reported = Object.keys(st.holdings).length;
  const next = nextInHandouts(st);
  const started = Object.keys(st.items).length > 0;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink-700/60 bg-gradient-to-br from-ink-850 to-ink-900 p-5 sm:p-7">
        <h1 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">Cryptography Camp prework</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-300">
          Seven weeks from modular arithmetic to the security proofs behind Schnorr, MuSig2 and FROST. Work through the handouts here,
          see where each piece sits in the map of what leads where, step through reductions in ReductionLab, and take any piece to
          the learning-edge tutor.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <a
            href={!started ? href.week('1') : next ? href.item(next.id) : href.map()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500/90 px-3.5 py-1.5 font-semibold text-white hover:bg-accent-400"
          >
            {!started ? 'Start with Week 1' : next ? <>Continue: {itemFullName(next.id)}</> : 'Through the last handout: review on the map'}{' '}
            <ArrowRight size={15} />
          </a>
          <a href={href.map()} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600/70 bg-ink-800/60 px-3.5 py-1.5 font-medium text-ink-100 hover:bg-ink-700/60">
            <Compass size={15} /> Open the map
          </a>
        </div>
        <p className="mt-4 text-[11px] text-ink-500">
          Handouts ingested from{' '}
          <a className="text-ink-400 underline underline-offset-2 hover:text-ink-200" href={`https://github.com/${PREWORK.repo}/tree/${PREWORK.commit}`} target="_blank" rel="noreferrer">
            {PREWORK.repo}@{PREWORK.commit.slice(0, 7)} <ExternalLink size={10} className="inline" />
          </a>
          . Your progress stays in this browser.
        </p>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="weeks-h">
          <h2 id="weeks-h" className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Handouts
          </h2>
          <ol className="grid gap-2 sm:grid-cols-2">
            {PREWORK.weeks.map((w) => {
              const p = weekProgress(st, w.id);
              // What this week introduces: nodes the handouts first reach here.
              const rank = PREWORK.weeks.indexOf(w);
              const introduced = TERRITORY.nodes.filter((n) => weekOf(n) === rank);
              const topics = introduced.slice(0, 4);
              return (
                <li key={w.id}>
                  <a href={href.week(w.id)} className="block h-full rounded-xl border border-ink-700/60 bg-ink-900/50 px-4 py-3 hover:border-accent-500/40 hover:bg-ink-900">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-ink-50">{w.title}</span>
                      <span className="text-[11px] text-ink-500">{w.date}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-ink-400">
                      {p.exercises > 0 && (
                        <>
                          {p.exercisesDone}/{p.exercises} exercises done
                          {p.exercisesTouched > p.exercisesDone && `, ${p.exercisesTouched - p.exercisesDone} attempted`}
                        </>
                      )}
                      {p.exercises > 0 && p.readings > 0 && ' · '}
                      {p.readings > 0 && `${p.readingsDone}/${p.readings} readings`}
                    </div>
                    <Bar value={p.exercises ? p.exercisesDone / p.exercises : p.readings ? p.readingsDone / p.readings : 0} />
                    {topics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {topics.map((n) => (
                          <span key={n.id} className="rounded-full bg-ink-800 px-1.5 py-px text-[10px] text-ink-300">
                            {rich(n.title)}
                          </span>
                        ))}
                        {introduced.length > topics.length && (
                          <span className="px-1 py-px text-[10px] text-ink-500">+{introduced.length - topics.length} more</span>
                        )}
                      </div>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="space-y-4">
          {next && started && (
            <section className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-50">
                <BookOpenText size={16} className="text-accent-300" /> Next in the handouts
              </h2>
              <a href={href.item(next.id)} className="mt-2 block rounded-lg border border-ink-600/60 px-3 py-2 text-xs text-ink-200 hover:border-accent-500/50">
                <span className="font-medium text-ink-50">{itemFullName(next.id)}</span>
                {st.items[next.id] && <span className="text-ink-400"> (attempted)</span>}
                <span className="mt-0.5 line-clamp-2 text-ink-400">{rich(next.gist)}</span>
              </a>
              <p className="mt-1.5 text-[11px] text-ink-500">The first item after the furthest one you've marked that isn't done yet.</p>
            </section>
          )}

          <section className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-50">
              <Compass size={16} className="text-jade-400" /> Reachable on the map
            </h2>
            {reported === 0 ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                Nothing claimed yet. On the map, mark how you hold the pieces you already know; the pieces whose formal needs you've
                claimed appear here. They come from your self-report only, and the tutor checks them before teaching.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">
                  Not yet claimed, but everything they need formally is ({reported} claim{reported === 1 ? '' : 's'} so far), earliest in
                  the handouts first. A starting point, not a verdict.
                </p>
                <ul className="mt-2 space-y-1">
                  {candidates.slice(0, 6).map(({ node, missingInformal }) => (
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
                {candidates.length > 6 && (
                  <a href={href.map()} className="mt-1.5 inline-block text-[11px] text-accent-300 hover:text-accent-200">
                    All {candidates.length} on the map
                  </a>
                )}
              </>
            )}
          </section>

          <section className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-50">
              <PlayCircle size={16} className="text-accent-300" /> Reductions to step through
            </h2>
            <div className="mt-2 space-y-2">
              {PROOF_LINKS.map((l) => (
                <div key={l.proof}>
                  <div className="mb-1 text-[11px] text-ink-500">
                    With {l.items.map(itemFullName).join(', ')}
                  </div>
                  <ProofLinkCard link={l} />
                </div>
              ))}
            </div>
          </section>

          <a href={href.tutor()} className="flex items-start gap-3 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-4 hover:border-accent-500/40">
            <MessagesSquare size={18} className="mt-0.5 shrink-0 text-accent-300" />
            <span>
              <span className="block text-sm font-semibold text-ink-50">Learn with the tutor</span>
              <span className="block text-xs leading-relaxed text-ink-400">
                learning-edge interviews you, finds your edge, and teaches there by inquiry. Hand it this map and your self-report.
              </span>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700" aria-hidden="true">
      <div className="h-full rounded-full bg-jade-500/80" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}
