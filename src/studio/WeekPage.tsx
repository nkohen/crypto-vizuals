import { useEffect } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { PREWORK } from '../prework/content';
import Blocks from './Blocks';
import { anchorId, href } from './route';
import { useLearner } from './learner';
import { weekProgress } from './names';

export function WeekNav({ current }: { current?: string }) {
  const st = useLearner();
  return (
    <nav aria-label="Weeks" className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-1.5">
      <h2 className="px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Handouts</h2>
      <ol>
        {PREWORK.weeks.map((w) => {
          const p = weekProgress(st, w.id);
          const active = w.id === current;
          return (
            <li key={w.id}>
              <a
                href={href.week(w.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${active ? 'bg-accent-500/10 text-ink-50' : 'text-ink-300 hover:bg-ink-800/50'}`}
              >
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-mono text-[11px] font-bold ${
                    active ? 'bg-accent-500 text-white' : 'bg-ink-700 text-ink-300'
                  }`}
                >
                  {w.id}
                </span>
                <span className="min-w-0 flex-1 truncate">{w.title}</span>
                {p.exercises > 0 && (
                  <span className="text-[10px] font-mono text-ink-500" title={`${p.exercisesDone} of ${p.exercises} exercises done`}>
                    {p.exercisesDone}/{p.exercises}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function WeekPage({ week: id, anchor }: { week: string; anchor?: string }) {
  const idx = PREWORK.weeks.findIndex((w) => w.id === id);
  const week = PREWORK.weeks[idx];

  useEffect(() => {
    if (anchor) document.getElementById(anchorId(`${id}/${anchor}`))?.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }, [id, anchor]);

  if (!week) return <p className="text-ink-300">No such week.</p>;
  const prev = PREWORK.weeks[idx - 1];
  const next = PREWORK.weeks[idx + 1];
  return (
    // overflow-x-clip: a long inline formula cannot wrap; on a phone it is clipped by a
    // pixel or two instead of scrolling the whole page sideways.
    <article className="min-w-0 overflow-x-clip">
      <header className="mb-2 flex flex-wrap items-end justify-between gap-3 border-b border-ink-700/60 pb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{week.date}</div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">{week.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="lg:hidden">
            <span className="sr-only">Go to week</span>
            <select
              value={week.id}
              onChange={(e) => (window.location.hash = href.week(e.target.value))}
              className="rounded-md border border-ink-600/70 bg-ink-900 px-2 py-1 text-xs text-ink-100"
            >
              {PREWORK.weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </label>
          <a href={week.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200">
            Original PDF <ExternalLink size={12} />
          </a>
        </div>
      </header>
      <Blocks blocks={week.blocks} />
      <footer className="mt-10 flex justify-between gap-3 border-t border-ink-700/60 pt-4 text-sm">
        {prev ? (
          <a href={href.week(prev.id)} className="flex items-center gap-1 text-ink-300 hover:text-ink-50">
            <ChevronLeft size={16} /> {prev.title}
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={href.week(next.id)} className="flex items-center gap-1 text-ink-300 hover:text-ink-50">
            {next.title} <ChevronRight size={16} />
          </a>
        )}
      </footer>
    </article>
  );
}
