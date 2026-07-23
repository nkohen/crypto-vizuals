import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2 } from 'lucide-react';
import type { Proof, ProofStep } from './types';

interface Props {
  proof: Proof;
  step: ProofStep;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

function renderNarration(text: string): React.ReactNode {
  // minimal inline <code> and <strong> parsing
  const parts = text.split(/(<code>.*?<\/code>|<strong>.*?<\/strong>|<em>.*?<\/em>)/g);
  return parts.map((part, i) => {
    if (part.startsWith('<code>') && part.endsWith('</code>')) {
      return (
        <code key={i} className="font-mono text-[0.82em] text-accent-300 bg-ink-800/80 rounded px-1.5 py-0.5">
          {part.slice(6, -7)}
        </code>
      );
    }
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      return (
        <strong key={i} className="font-semibold text-ink-100">
          {part.slice(8, -9)}
        </strong>
      );
    }
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      return (
        <em key={i} className="italic text-ink-100">
          {part.slice(4, -5)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function StepPanel({ proof, step, index, total, onPrev, onNext }: Props) {
  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-2.5 px-6 pt-6 pb-3 border-b border-ink-700/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 border border-accent-500/30 text-accent-300">
          <BookOpen size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-ink-400 font-medium">{step.tag}</div>
          <h2 className="text-lg font-semibold text-ink-100 leading-tight truncate">{step.title}</h2>
        </div>
      </div>

      {/* scrollable narration */}
      <div className="flex-1 overflow-y-auto scroll-thin px-6 py-5 prose-narr text-sm leading-relaxed text-ink-200">
        {step.narration.map((p, i) => (
          <p key={i} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            {renderNarration(p)}
          </p>
        ))}

        {/* claim callout */}
        <div className="mt-5 rounded-xl border border-jade-500/25 bg-jade-500/8 p-3.5 animate-fade-up" style={{ animationDelay: `${step.narration.length * 60}ms` }}>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-jade-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-jade-400 font-semibold mb-0.5">Claim</div>
              <p className="text-sm text-ink-100 font-medium leading-snug">{step.claim}</p>
            </div>
          </div>
        </div>
      </div>

      {/* footer / nav */}
      <div className="border-t border-ink-700/60 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-ink-400">
            Step <span className="text-ink-100 font-mono font-semibold">{index + 1}</span> /{' '}
            <span className="font-mono">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={index === 0}
              className="flex items-center gap-1 rounded-lg border border-ink-600/70 bg-ink-800/60 px-3 py-1.5 text-sm font-medium text-ink-200 transition hover:bg-ink-700/60 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              onClick={onNext}
              disabled={index === total - 1}
              className="flex items-center gap-1 rounded-lg bg-accent-500/90 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
