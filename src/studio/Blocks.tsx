import { BookOpen, PenLine, Lock, PlayCircle, FileText, MapPin, Check, CircleDot } from 'lucide-react';
import type { Block, PreworkItemSummary } from '../prework/types';
import { PREWORK_MACROS } from '../prework/content';
import { renderRichText } from '../richText';
import PseudocodeFigure from '../PseudocodeFigure';
import { nodesForItem } from '../territory';
import { linksForItem, type ProofLink } from './links';
import { learner, useLearner, attempted, type ItemStatus } from './learner';
import { anchorId, href } from './route';
import { PROOFS } from '../proofs';
import { ENV_NAME, itemName, itemFullName, summaries } from './names';

const rich = (t: string) => renderRichText(t, PREWORK_MACROS);

export default function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </>
  );
}

function BlockView({ block: b }: { block: Block }) {
  switch (b.kind) {
    case 'heading':
      return <h2 className="mt-9 mb-3 text-lg font-semibold text-ink-50 tracking-tight">{rich(b.text)}</h2>;
    case 'para':
      return <p className="my-3 leading-relaxed text-ink-200">{rich(b.text)}</p>;
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      const marker = b.marker === '(a)' || b.marker === 'a' ? 'lower-alpha' : b.ordered ? 'decimal' : 'disc';
      return (
        <Tag className="my-3 pl-6 space-y-1.5 text-ink-200" style={{ listStyleType: marker }}>
          {b.items.map((it, i) => (
            <li key={i} className="pl-1 [&>p]:my-1">
              <Blocks blocks={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'item':
      return <ItemCard block={b} />;
    case 'figure':
      return <FigureView block={b} />;
    case 'proof':
      return (
        <details className="my-3 rounded-lg border border-ink-700/60 bg-ink-900/40 px-4 py-2 text-ink-200">
          <summary className="cursor-pointer text-sm font-medium text-ink-300">Proof</summary>
          <div className="pb-1">
            <Blocks blocks={b.body} />
          </div>
        </details>
      );
  }
}

type ItemBlock = Extract<Block, { kind: 'item' }>;

function ItemCard({ block }: { block: ItemBlock }) {
  const s = summaries.get(block.id);
  const tracked = block.env === 'exercise' || block.env === 'reading';
  const isReading = block.env === 'reading';
  const tone = block.env === 'exercise' ? 'border-accent-500/35 bg-accent-500/[0.05]' : isReading ? 'border-jade-500/30 bg-jade-500/[0.04]' : 'border-ink-600/60 bg-ink-900/50';
  const Icon = block.env === 'exercise' ? PenLine : isReading ? BookOpen : CircleDot;
  return (
    <section id={anchorId(block.id)} className={`my-5 scroll-mt-24 rounded-xl border ${tone} px-4 py-3.5`}>
      <header className="flex flex-wrap items-center gap-2">
        <Icon size={15} className={block.env === 'exercise' ? 'text-accent-300' : isReading ? 'text-jade-400' : 'text-ink-300'} />
        <h3 className="text-sm font-semibold text-ink-50">
          {ENV_NAME[block.env]} {block.number}
        </h3>
        {block.note && (
          <span className="rounded border border-amber2-500/30 bg-amber2-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber2-300">
            {rich(block.note)}
          </span>
        )}
        {tracked && <StatusControl id={block.id} reading={isReading} />}
      </header>
      <div className="mt-1.5 text-[0.95rem] [&>p:first-child]:mt-1">
        <Blocks blocks={block.body} />
      </div>
      {s?.sources && s.sources.length > 0 && <Sources item={s} />}
      <ItemFooter id={block.id} />
    </section>
  );
}

function StatusControl({ id, reading }: { id: string; reading: boolean }) {
  const st = useLearner();
  const current = st.items[id]?.status;
  const options: [ItemStatus | null, string][] = reading
    ? [
        [null, 'Not read'],
        ['done', 'Read'],
      ]
    : [
        [null, 'Not started'],
        ['attempted', 'Attempted'],
        ['done', 'Done'],
      ];
  return (
    <div role="radiogroup" aria-label={`Status of ${itemName(id)}`} className="ml-auto flex rounded-lg border border-ink-600/70 bg-ink-900/70 p-0.5 text-[11px]">
      {options.map(([value, label]) => {
        const on = (current ?? null) === value;
        return (
          <button
            key={label}
            role="radio"
            aria-checked={on}
            onClick={() => learner.setItem(id, value)}
            className={`rounded-md px-2 py-1 font-medium transition ${
              on ? (value === 'done' ? 'bg-jade-500/25 text-jade-300' : value ? 'bg-accent-500/25 text-accent-200' : 'bg-ink-700 text-ink-100') : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {on && value === 'done' && <Check size={11} className="mr-0.5 inline -mt-0.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Sources({ item }: { item: PreworkItemSummary }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {item.sources!.map((src) => (
        <a
          key={src.file}
          href={src.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-jade-500/30 bg-ink-900/60 px-2 py-1 text-xs text-jade-300 hover:border-jade-400/60 hover:text-jade-200"
        >
          <FileText size={12} /> {src.file.replace(/\.pdf$/, '')} <span className="text-ink-500">(PDF on GitHub)</span>
        </a>
      ))}
    </div>
  );
}

/** Map chips and ReductionLab links for an item or figure. */
function ItemFooter({ id }: { id: string }) {
  const nodes = nodesForItem(id);
  const links = linksForItem(id);
  if (!nodes.length && !links.length) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-ink-700/50 pt-2.5">
      {links.map((l) => (
        <ProofLinkCard key={l.proof} link={l} />
      ))}
      {nodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="flex items-center gap-1 text-ink-400">
            <MapPin size={11} /> In the map:
          </span>
          {nodes.map((n) => (
            <a key={n.id} href={href.map(n.id)} className="rounded-full border border-ink-600/70 bg-ink-800/70 px-2 py-0.5 text-ink-200 hover:border-accent-500/50 hover:text-accent-200">
              {n.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProofLinkCard({ link }: { link: ProofLink }) {
  const st = useLearner();
  const missing = link.gate.filter((g) => !attempted(st, g));
  const proof = PROOFS[link.proof];
  if (missing.length) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-ink-600/60 bg-ink-900/60 px-3 py-2 text-xs text-ink-300">
        <Lock size={14} className="mt-0.5 shrink-0 text-ink-400" />
        <div>
          <span className="font-medium text-ink-200">A ReductionLab walk-through answers this.</span> It opens once you've marked{' '}
          {missing.map((g, i) => (
            <span key={g}>
              {i > 0 && (i === missing.length - 1 ? ' and ' : ', ')}
              <a className="text-accent-300 underline decoration-accent-500/40 underline-offset-2" href={href.item(g)}>
                {itemFullName(g)}
              </a>
            </span>
          ))}{' '}
          attempted — the handout's own rule: attempt first, then check your work.
        </div>
      </div>
    );
  }
  return (
    <a
      href={href.proof(link.proof)}
      className="group flex items-start gap-2.5 rounded-lg border border-accent-500/35 bg-accent-500/10 px-3 py-2 text-xs text-ink-200 hover:border-accent-400/60"
    >
      <PlayCircle size={15} className="mt-0.5 shrink-0 text-accent-300" />
      <span>
        <span className="font-semibold text-accent-200 group-hover:text-accent-100">ReductionLab · {proof?.title}</span>
        <span className="block text-ink-300">{link.blurb}</span>
      </span>
    </a>
  );
}

type FigureBlock = Extract<Block, { kind: 'figure' }>;

function FigureView({ block }: { block: FigureBlock }) {
  return (
    <figure id={anchorId(block.id)} className="my-5 scroll-mt-24">
      {block.pseudocode && <PseudocodeFigure figure={block.pseudocode} macros={PREWORK_MACROS} showCaption={false} />}
      {block.svg && (
        <div className="overflow-x-auto rounded-xl border border-ink-600/70 bg-white p-3">
          <img src={`${import.meta.env.BASE_URL}${block.svg}`} alt={`Figure ${block.number}. ${stripMarkup(block.caption)}`} className="mx-auto max-w-full" />
        </div>
      )}
      <figcaption className="mt-2 text-xs leading-snug text-ink-400">
        <span className="font-semibold text-ink-300">Figure {block.number}.</span> {rich(block.caption)}
      </figcaption>
      <ItemFooter id={block.id} />
    </figure>
  );
}

/** Caption text for alt attributes: math left as its TeX source, markup dropped. */
function stripMarkup(s: string) {
  return s.replace(/<\/?(em|strong|code)>/g, '').replace(/\$\$?/g, '');
}
